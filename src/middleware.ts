import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle Google OAuth callback to set JWT tokens
  if (pathname === '/api/auth/callback/google') {
    try {
      console.log('🔐 Middleware: Google OAuth callback detected')
      
      // Get the NextAuth token
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      console.log('🔍 Middleware: NextAuth token check:', {
        hasToken: !!token,
        email: token?.email,
        userId: token?.userId
      })
      
      if (token?.email && token?.userId) {
        console.log('✅ Middleware: NextAuth token found, generating JWT tokens')
        
        // Generate JWT tokens compatible with our existing auth system
        const accessToken = jwt.sign(
          { 
            userId: token.userId, 
            email: token.email,
            provider: 'google'
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        )

        const refreshToken = jwt.sign(
          { 
            userId: token.userId, 
            type: 'refresh',
            provider: 'google'
          },
          JWT_SECRET,
          { expiresIn: '30d' }
        )

        console.log('✅ Middleware: JWT tokens generated')

        // Create response with redirect to dashboard
        const response = NextResponse.redirect(new URL('/dashboard', request.url))
        
        // Set cookies compatible with our existing auth system
        response.cookies.set('token', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60, // 24 hours
          path: '/'
        })
        
        response.cookies.set('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60, // 30 days
          path: '/'
        })

        console.log('✅ Middleware: JWT cookies set, redirecting to dashboard')
        return response
      } else {
        console.log('❌ Middleware: No NextAuth token found')
        return NextResponse.redirect(new URL('/login?error=NoSession', request.url))
      }
    } catch (error) {
      console.error('❌ Middleware: Error in Google OAuth callback:', error)
      return NextResponse.redirect(new URL('/login?error=CallbackError', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/auth/callback/google',
    '/dashboard/:path*',
    '/login',
    '/register'
  ]
}