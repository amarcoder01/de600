import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 Google OAuth callback received')
    
    // Get the session from NextAuth
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      console.log('❌ No session found in Google OAuth callback')
      return NextResponse.redirect(new URL('/login?error=NoSession', request.url))
    }

    console.log('✅ Google OAuth session found:', { 
      email: session.user.email,
      name: session.user.name 
    })

    // Generate JWT tokens compatible with our existing auth system
    const accessToken = jwt.sign(
      { 
        userId: (session.user as any).id, 
        email: session.user.email,
        provider: 'google'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    const refreshToken = jwt.sign(
      { 
        userId: (session.user as any).id, 
        type: 'refresh',
        provider: 'google'
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    console.log('✅ JWT tokens generated for Google OAuth user')

    // Create response with redirect to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    
    // Set cookies compatible with our existing auth system
    response.cookies.set('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    })
    
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    })

    console.log('✅ Google OAuth callback completed successfully')
    return response

  } catch (error) {
    console.error('❌ Google OAuth callback error:', error)
    return NextResponse.redirect(new URL('/login?error=CallbackError', request.url))
  }
}
