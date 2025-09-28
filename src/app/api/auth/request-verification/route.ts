import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { EmailVerificationService } from '@/lib/email-verification-service'
import { logSecurityEvent, SecurityEventType, SecuritySeverity } from '@/lib/security-monitoring'
import { AUTH_MESSAGES } from '@/lib/auth-messages'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      await logSecurityEvent(
        SecurityEventType.EMAIL_VERIFICATION_RESEND_FAILED,
        SecuritySeverity.MEDIUM,
        request,
        { reason: 'Missing email for verification request', email: !!email }
      )
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (!user) {
      await logSecurityEvent(
        SecurityEventType.EMAIL_VERIFICATION_RESEND_FAILED,
        SecuritySeverity.MEDIUM,
        request,
        { reason: 'User not found for verification request', email: email.toLowerCase().trim() }
      )
      // Don't reveal if user exists or not for security (prevent user enumeration)
      return NextResponse.json({
        success: true,
        message: AUTH_MESSAGES.EMAIL_VERIFICATION.GENERIC_SUCCESS
      })
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      await logSecurityEvent(
        SecurityEventType.EMAIL_VERIFICATION_RESEND_FAILED,
        SecuritySeverity.LOW,
        request,
        { reason: 'Email already verified', userId: user.id, email: user.email }
      )
      // Return success but indicate email is already verified
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: AUTH_MESSAGES.EMAIL_VERIFICATION.ALREADY_VERIFIED
      })
    }

    // Check if user is locked or disabled
    if (user.isAccountLocked || user.isAccountDisabled) {
      await logSecurityEvent(
        SecurityEventType.EMAIL_VERIFICATION_RESEND_FAILED,
        SecuritySeverity.HIGH,
        request,
        { reason: 'Account locked or disabled', userId: user.id, email: user.email, isLocked: user.isAccountLocked, isDisabled: user.isAccountDisabled }
      )
      // Return generic success message even for locked/disabled accounts
      return NextResponse.json({
        success: true,
        message: AUTH_MESSAGES.EMAIL_VERIFICATION.GENERIC_SUCCESS
      })
    }

    // Create and send verification code
    const verificationResult = await EmailVerificationService.createVerificationCode(
      user.id,
      user.email
    )

    if (!verificationResult.success) {
      await logSecurityEvent(
        SecurityEventType.EMAIL_VERIFICATION_RESEND_FAILED,
        SecuritySeverity.HIGH,
        request,
        { reason: 'Failed to create verification code', userId: user.id, email: user.email, error: verificationResult.error }
      )
      return NextResponse.json(
        { success: false, error: 'Failed to create verification code' },
        { status: 500 }
      )
    }

    // Send verification email
    const emailSent = await EmailVerificationService.sendVerificationEmail(
      user.email,
      user.firstName,
      verificationResult.code!
    )

    if (!emailSent) {
      await logSecurityEvent(
        SecurityEventType.EMAIL_VERIFICATION_RESEND_FAILED,
        SecuritySeverity.HIGH,
        request,
        { reason: 'Failed to send verification email', userId: user.id, email: user.email }
      )
      return NextResponse.json(
        { success: false, error: 'Failed to send verification email' },
        { status: 500 }
      )
    }

    await logSecurityEvent(
      SecurityEventType.EMAIL_VERIFICATION_RESENT,
      SecuritySeverity.LOW,
      request,
      { reason: 'Verification email sent successfully', userId: user.id, email: user.email }
    )

    return NextResponse.json({
      success: true,
      message: AUTH_MESSAGES.EMAIL_VERIFICATION.GENERIC_SUCCESS,
      // Only return user data for legitimate requests (when email was actually sent)
      userId: user.id,
      email: user.email
    })

  } catch (error) {
    console.error('Error in /api/auth/request-verification:', error)
    await logSecurityEvent(
      SecurityEventType.ERROR,
      SecuritySeverity.CRITICAL,
      request,
      { reason: 'Internal server error during verification request', originalError: error instanceof Error ? error.message : String(error) }
    )
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
