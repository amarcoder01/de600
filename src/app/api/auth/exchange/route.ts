import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: 'No NextAuth session' }, { status: 401 })
    }

    const accessToken = jwt.sign(
      {
        userId: (session.user as any).id,
        email: session.user.email,
        provider: 'google',
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    const refreshToken = jwt.sign(
      {
        userId: (session.user as any).id,
        type: 'refresh',
        provider: 'google',
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    const response = NextResponse.json({ success: true, accessToken })
    response.cookies.set('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    })
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })

    // Helper for client migration
    response.cookies.set('token_client', accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60,
      path: '/',
    })

    return response
  } catch (e) {
    console.error('❌ /api/auth/exchange error:', e)
    return NextResponse.json({ success: false, message: 'Exchange failed' }, { status: 500 })
  }
}
