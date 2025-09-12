/**
 * Resend Email Verification Code API Endpoint
 * Handles resending verification codes to users
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSecureApi } from '@/lib/secure-api-wrapper'
import { EmailVerificationService } from '@/lib/email-verification-service'
import { logSecurityEvent, SecurityEventType, SecuritySeverity } from '@/lib/security-monitoring'
import { validateRequestBody } from '@/lib/input-validator'

/**
 * Resend verification code
 */
export const POST = createSecureApi(
  async (request: NextRequest, context) => {
    try {
      const body = await request.json()
      const { userId, email } = body
      
      // Validate input
      const validation = validateRequestBody(body, {
        userId: { required: true, sanitize: true },
        email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, sanitize: true }
      })
      
      if (!validation.isValid) {
        await logSecurityEvent(
          SecurityEventType.UNAUTHORIZED_ACCESS,
          SecuritySeverity.MEDIUM,
          request,
          { reason: 'Invalid resend verification input', errors: validation.errors },
          userId
        )
        
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: validation.errors },
          { status: 400 }
        )
      }
      
      const sanitizedData = validation.sanitizedValue
      
      // Resend verification code
      const resendResult = await EmailVerificationService.resendVerificationCode(
        sanitizedData.userId,
        sanitizedData.email
      )
      
      if (!resendResult.success) {
        // Check if it's a cooldown issue
        if (resendResult.cooldownRemaining) {
          return NextResponse.json(
            { 
              success: false, 
              error: resendResult.error,
              cooldownRemaining: resendResult.cooldownRemaining
            },
            { status: 429 } // Too Many Requests
          )
        }
        
        await logSecurityEvent(
          SecurityEventType.UNAUTHORIZED_ACCESS,
          SecuritySeverity.MEDIUM,
          request,
          { 
            reason: 'Resend verification failed', 
            error: resendResult.error,
            userId,
            email: sanitizedData.email
          },
          userId
        )
        
        return NextResponse.json(
          { success: false, error: resendResult.error },
          { status: 400 }
        )
      }
      
      // Log successful resend
      await logSecurityEvent(
        SecurityEventType.INFO,
        SecuritySeverity.LOW,
        request,
        { reason: 'Verification code resent successfully', userId, email: sanitizedData.email },
        userId
      )
      
      return NextResponse.json({
        success: true,
        message: 'Verification code sent successfully'
      })
      
    } catch (error) {
      console.error('Resend verification error:', error)
      
      await logSecurityEvent(
        SecurityEventType.ERROR,
        SecuritySeverity.MEDIUM,
        request,
        { reason: 'Resend verification internal error', error: error instanceof Error ? error.message : 'Unknown error' },
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
