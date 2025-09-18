import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth-service'
import { AuthError, AuthErrorType, verifyToken, SECURITY_CONFIG } from '@/lib/auth-security'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          message: 'No authentication token provided',
          type: 'INVALID_TOKEN'
        },
        { status: 401 }
      )
    }

    // Extract token
    const token = authHeader.substring(7)

    // Verify token
    const decoded = verifyToken(token, SECURITY_CONFIG.auth.jwtSecret) as { userId: string; email: string }
    
    // Find user
    const user = await AuthService.getUserById(decoded.userId)
    if (!user) {
      return NextResponse.json(
        { 
          message: 'User not found',
          type: 'USER_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    // Return user data
    return NextResponse.json({
      user
    })

  } catch (error) {
    console.error('Auth check error:', error)

    if (error instanceof AuthError) {
      return NextResponse.json(
        { 
          message: error.message,
          type: error.type
        },
        { status: error.code }
      )
    }

    return NextResponse.json(
      { 
        message: 'Authentication failed',
        type: 'AUTHENTICATION_ERROR'
      },
      { status: 401 }
    )
  }
}
