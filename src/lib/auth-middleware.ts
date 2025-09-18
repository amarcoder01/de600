import { NextRequest, NextResponse } from 'next/server'
import { ensureDatabaseReady } from './db'
import { verifyToken } from './auth-security'
import { prisma } from './db'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    isEmailVerified: boolean
  }
}

/**
 * Authentication middleware that ensures database connectivity and validates tokens
 */
export async function authenticateRequest(
  request: NextRequest,
  requireAuth: boolean = true
): Promise<{ 
  success: boolean
  user?: any
  error?: string
  statusCode: number
}> {
  try {
    // Ensure database is ready before any operations
    await ensureDatabaseReady()
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('token')?.value ||
                  request.nextUrl?.searchParams.get('token')

    if (!token) {
      if (requireAuth) {
        return {
          success: false,
          error: 'Authentication token required',
          statusCode: 401
        }
      }
      return { success: true, statusCode: 200 }
    }

    try {
      // Verify token
      const decoded = verifyToken(token)
      
      if (!decoded || !decoded.userId) {
        return {
          success: false,
          error: 'Invalid authentication token',
          statusCode: 401
        }
      }

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isEmailVerified: true,
          isAccountDisabled: true,
          isAccountLocked: true,
          lockoutUntil: true
        }
      })

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          statusCode: 401
        }
      }

      // Check if account is disabled
      if (user.isAccountDisabled) {
        return {
          success: false,
          error: 'Account is disabled',
          statusCode: 403
        }
      }

      // Check if account is locked
      if (user.isAccountLocked && user.lockoutUntil && user.lockoutUntil > new Date()) {
        return {
          success: false,
          error: 'Account is temporarily locked',
          statusCode: 423
        }
      }

      return {
        success: true,
        user,
        statusCode: 200
      }

    } catch (tokenError) {
      return {
        success: false,
        error: 'Invalid authentication token',
        statusCode: 401
      }
    }

  } catch (dbError) {
    console.error('❌ Authentication middleware database error:', dbError)
    
    // Check if it's a connection issue
    if (dbError instanceof Error && dbError.message.includes('Engine is not yet connected')) {
      return {
        success: false,
        error: 'Database service is starting up. Please try again in a moment.',
        statusCode: 503
      }
    }
    
    return {
      success: false,
      error: 'Database connection error',
      statusCode: 503
    }
  }
}

/**
 * Higher-order function to wrap API routes with authentication
 */
export function withAuth(handler: Function, requireAuth: boolean = true) {
  return async (request: NextRequest, context: any) => {
    try {
      const authResult = await authenticateRequest(request, requireAuth)
      
      if (!authResult.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: authResult.error,
            timestamp: new Date().toISOString()
          },
          { status: authResult.statusCode }
        )
      }

      // Add user to request context
      const authenticatedRequest = request as AuthenticatedRequest
      if (authResult.user) {
        authenticatedRequest.user = authResult.user
      }

      // Call the original handler
      return handler(authenticatedRequest, context)
      
    } catch (error) {
      console.error('❌ Authentication wrapper error:', error)
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Create an authenticated response with proper headers
 */
export function createAuthenticatedResponse(data: any, status: number = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Auth-Status': 'authenticated'
    }
  })
}

/**
 * Create an error response with proper formatting
 */
export function createErrorResponse(
  error: string, 
  statusCode: number = 500, 
  details?: string
): NextResponse {
  return NextResponse.json({
    success: false,
    error,
    details,
    timestamp: new Date().toISOString()
  }, {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  })
}
