import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 Google OAuth callback received')
    
    // Get the session from NextAuth
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.log('❌ No session or email found in Google OAuth callback')
      return NextResponse.redirect(new URL('/login?error=NoSession', request.url))
    }

    console.log('✅ Google OAuth session found:', { 
      email: session.user.email,
      name: session.user.name,
      id: (session.user as any).id
    })

    // Get or create user in our database
    let user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      console.log('❌ User not found in database after Google OAuth')
      return NextResponse.redirect(new URL('/login?error=UserNotFound', request.url))
    }

    // Update user's last login time and reset failed attempts
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockoutUntil: null,
        isAccountLocked: false
      }
    })

    console.log('✅ User login updated:', user.id)

    // Generate JWT tokens compatible with our existing auth system
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        provider: 'google'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    const refreshToken = jwt.sign(
      { 
        userId: user.id, 
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
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    })
    
    // Also set a short-lived, non-HTTP-only cookie so the client can populate
    // localStorage for the Zustand-based auth store. This will be cleared by
    // the client after it is read.
    response.cookies.set('token_client', accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60, // 5 minutes is enough for hydration
      path: '/'
    })
    
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    })

    console.log('✅ Google OAuth callback completed successfully - redirecting to dashboard')
    return response

  } catch (error) {
    console.error('❌ Google OAuth callback error:', error)
    return NextResponse.redirect(new URL('/login?error=CallbackError', request.url))
  }
}
