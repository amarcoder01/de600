import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth-service'
import { AuthError } from '@/lib/auth-security'

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookies
    const refreshToken = request.cookies.get('refreshToken')?.value

    if (!refreshToken) {
      return NextResponse.json(
        { 
          message: 'No refresh token provided',
          type: 'INVALID_TOKEN'
        },
        { status: 401 }
      )
    }

    // Refresh tokens
    const result = await AuthService.refreshToken(refreshToken, request)

    // Create response
    const response = NextResponse.json({
      accessToken: result.accessToken,
      user: result.user
    })

    // Update refresh token cookie
    response.cookies.set('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Token refresh error:', error)

    if (error instanceof AuthError) {
      const response = NextResponse.json(
        { 
          message: error.message,
          type: error.type
        },
        { status: error.code }
      )

      // Clear invalid refresh token
      response.cookies.set('refreshToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      })

      return response
    }

    return NextResponse.json(
      { 
        message: 'Failed to refresh authentication token',
        type: 'REFRESH_ERROR'
      },
      { status: 500 }
    )
  }
}
