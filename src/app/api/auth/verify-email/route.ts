/**
 * Email Verification API Endpoint
 * Handles email verification code validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSecureApi } from '@/lib/secure-api-wrapper'
import { EmailVerificationService } from '@/lib/email-verification-service'
import { logSecurityEvent, SecurityEventType, SecuritySeverity } from '@/lib/security-monitoring'
import { validateRequestBody } from '@/lib/input-validator'

/**
 * Verify email with verification code
 */
export const POST = createSecureApi(
  async (request: NextRequest, context) => {
    try {
      const body = await request.json()
      const { userId, email, code } = body
      
      // Validate input
      const validation = validateRequestBody(body, {
        userId: { required: true, sanitize: true },
        email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, sanitize: true },
        code: { required: true, pattern: /^\d{6}$/, sanitize: true }
      })
      
      if (!validation.isValid) {
        await logSecurityEvent(
          SecurityEventType.UNAUTHORIZED_ACCESS,
          SecuritySeverity.MEDIUM,
          request,
          { reason: 'Invalid verification input', errors: validation.errors },
          userId
        )
        
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: validation.errors },
          { status: 400 }
        )
      }
      
      const sanitizedData = validation.sanitizedValue
      
      // Verify the code
      const verificationResult = await EmailVerificationService.verifyCode(
        sanitizedData.userId,
        sanitizedData.email,
        sanitizedData.code
      )
      
      if (!verificationResult.success) {
        await logSecurityEvent(
          SecurityEventType.UNAUTHORIZED_ACCESS,
          SecuritySeverity.MEDIUM,
          request,
          { 
            reason: 'Email verification failed', 
            error: verificationResult.error,
            userId,
            email: sanitizedData.email
          },
          userId
        )
        
        return NextResponse.json(
          { 
            success: false, 
            error: verificationResult.error,
            remainingAttempts: verificationResult.remainingAttempts
          },
          { status: 400 }
        )
      }
      
      // Log successful verification
      await logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        SecuritySeverity.LOW,
        request,
        { reason: 'Email verification successful', userId, email: sanitizedData.email },
        userId
      )
      
      return NextResponse.json({
        success: true,
        message: 'Email verified successfully'
      })
      
    } catch (error) {
      console.error('Email verification error:', error)
      
      await logSecurityEvent(
        SecurityEventType.ERROR,
        SecuritySeverity.MEDIUM,
        request,
        { reason: 'Email verification internal error', error: error instanceof Error ? error.message : 'Unknown error' },
        context.userId
      )
      
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  {
    requireAuth: false, // User might not be fully authenticated yet
    rateLimit: true,
    validateInput: true,
    allowedMethods: ['POST']
  }
)
