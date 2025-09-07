import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle Google OAuth callback to set JWT tokens
  if (pathname === '/api/auth/callback/google') {
    console.log('🔐 Middleware: Google OAuth callback detected, allowing route handler to process')
    // Let the route handler process the callback
    return NextResponse.next()
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