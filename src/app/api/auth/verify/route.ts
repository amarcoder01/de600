import { NextRequest, NextResponse } from 'next/server'
import { createSecureApi } from '@/lib/secure-api-wrapper'
import { verifyToken } from '@/lib/auth-security'
import { SecureUserOperations } from '@/lib/secure-database'
import { logSecurityEvent, SecurityEventType, SecuritySeverity } from '@/lib/security-monitoring'

/**
 * Secure token verification endpoint
 * Enhanced with comprehensive security measures
 */
export const POST = createSecureApi(
  async (request: NextRequest, context) => {
    try {
      // Get token from Authorization header
      const authHeader = request.headers.get('authorization')
      const token = authHeader?.replace('Bearer ', '')
      
      if (!token) {
        await logSecurityEvent(
          SecurityEventType.UNAUTHORIZED_ACCESS,
          SecuritySeverity.MEDIUM,
          request,
          { reason: 'No token provided' },
          context.userId
        )
        
        return NextResponse.json(
          { success: false, error: 'No token provided' },
          { status: 401 }
        )
      }

      // Verify and decode JWT token
      let decoded: any
      try {
        decoded = verifyToken(token)
      } catch (error) {
        await logSecurityEvent(
          SecurityEventType.UNAUTHORIZED_ACCESS,
          SecuritySeverity.MEDIUM,
          request,
          { reason: 'Invalid token', error: error instanceof Error ? error.message : 'Unknown error' },
          context.userId
        )
        
        return NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 401 }
        )
      }

      // Get user from database using secure operations
      const userResult = await SecureUserOperations.getUserById(decoded.userId)
      
      if (!userResult.success || userResult.rows.length === 0) {
        await logSecurityEvent(
          SecurityEventType.UNAUTHORIZED_ACCESS,
          SecuritySeverity.HIGH,
          request,
          { reason: 'User not found', userId: decoded.userId },
          decoded.userId
        )
        
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 401 }
        )
      }

      const user = userResult.rows[0]

      // Check if account is disabled or locked
      if (user.isAccountDisabled) {
        await logSecurityEvent(
          SecurityEventType.UNAUTHORIZED_ACCESS,
          SecuritySeverity.HIGH,
          request,
          { reason: 'Account disabled', userId: user.id },
          user.id
        )
        
        return NextResponse.json(
          { success: false, error: 'Account is disabled' },
          { status: 403 }
        )
      }

      if (user.isAccountLocked && user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
        await logSecurityEvent(
          SecurityEventType.ACCOUNT_LOCKED,
          SecuritySeverity.HIGH,
          request,
          { reason: 'Account locked', userId: user.id, lockoutUntil: user.lockoutUntil },
          user.id
        )
        
        return NextResponse.json(
          { success: false, error: 'Account is temporarily locked' },
          { status: 423 }
        )
      }

      // Log successful verification
      await logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        SecuritySeverity.LOW,
        request,
        { reason: 'Token verification successful', userId: user.id },
        user.id
      )

      // Token is valid and user is active
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        }
      })

    } catch (error) {
      console.error('Token verification error:', error)
      
      await logSecurityEvent(
        SecurityEventType.ERROR,
        SecuritySeverity.MEDIUM,
        request,
        { reason: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
        context.userId
      )
      
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  {
    requireAuth: false, // This endpoint verifies auth, so it can't require it
    rateLimit: true,
    validateInput: false, // Token verification doesn't need input validation
    allowedMethods: ['POST']
  }
)