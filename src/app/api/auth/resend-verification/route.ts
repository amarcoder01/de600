import { NextRequest, NextResponse } from 'next/server'
import { EmailVerificationService } from '@/lib/email-verification-service'
import { logSecurityEvent, SecurityEventType, SecuritySeverity } from '@/lib/security-monitoring'

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    // Validate input
    if (!userId || !email) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`📧 Resend verification request for user ${userId}`)

    // Resend verification code
    const result = await EmailVerificationService.resendVerificationCode(userId, email)

    if (result.success) {
      // Log successful resend
      await logSecurityEvent(
        SecurityEventType.EMAIL_VERIFICATION_RESENT,
        SecuritySeverity.LOW,
        request,
        { userId, email },
        userId
      )

      console.log(`✅ Verification code resent successfully for user ${userId}`)
      
      return NextResponse.json({
        success: true,
        message: 'Verification code sent successfully'
      })
    } else {
      // Log failed resend attempt
      await logSecurityEvent(
        SecurityEventType.EMAIL_VERIFICATION_RESEND_FAILED,
        SecuritySeverity.MEDIUM,
        request,
        { userId, email, error: result.error },
        userId
      )

      console.log(`❌ Failed to resend verification code for user ${userId}: ${result.error}`)
      
      return NextResponse.json({
        success: false,
        error: result.error,
        cooldownRemaining: result.cooldownRemaining
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Resend verification error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}