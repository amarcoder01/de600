import { NextRequest, NextResponse } from 'next/server'
import { EmailVerificationService } from '@/lib/email-verification-service'
import { logSecurityEvent, SecurityEventType, SecuritySeverity } from '@/lib/security-monitoring'

export async function POST(request: NextRequest) {
  try {
    const { userId, email, code } = await request.json()

    // Validate input
    if (!userId || !email || !code) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: 'Invalid code format' },
        { status: 400 }
      )
    }

    console.log(`📧 Email verification attempt for user ${userId}`)

    // Verify the code
    const result = await EmailVerificationService.verifyCode(userId, email, code)

    if (result.success) {
      // Log successful verification
      await logSecurityEvent(
        SecurityEventType.EMAIL_VERIFIED,
        SecuritySeverity.LOW,
        request,
        { userId, email },
        userId
      )

      console.log(`✅ Email verified successfully for user ${userId}`)
      
      return NextResponse.json({
        success: true,
        message: 'Email verified successfully'
      })
    } else {
      // Log failed verification attempt
      await logSecurityEvent(
        SecurityEventType.EMAIL_VERIFICATION_FAILED,
        SecuritySeverity.MEDIUM,
        request,
        { userId, email, error: result.error },
        userId
      )

      console.log(`❌ Email verification failed for user ${userId}: ${result.error}`)
      
      return NextResponse.json({
        success: false,
        error: result.error,
        remainingAttempts: result.remainingAttempts
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Email verification error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}