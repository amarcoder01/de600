import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, hashPassword } from '@/lib/auth-security'
import jwt from 'jsonwebtoken'
import { AuthValidator } from '@/lib/auth-validation'
const JWT_SECRET = process.env.JWT_SECRET

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error('JSON parsing failed:', error)
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = body

    // Basic validation
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    // Strong password validation
    const validation = AuthValidator.validatePasswordChange({ currentPassword, newPassword })
    if (!validation.success) {
      const strength = AuthValidator.validatePasswordStrength(newPassword)
      const requirements = [
        'Be between 8 and 128 characters long',
        'Include at least one uppercase letter',
        'Include at least one lowercase letter',
        'Include at least one number',
        'Include at least one special character (!@#$%^&* etc.)',
        'Not be a common or easily guessable password',
        'Be different from your current password'
      ]
      return NextResponse.json(
        { 
          success: false, 
          error: 'Your new password is too weak. Please follow the requirements below.', 
          errors: validation.errors,
          requirements,
          strength: {
            score: strength.score,
            feedback: strength.feedback,
            suggestions: strength.suggestions
          }
        },
        { status: 400 }
      )
    }

    // Extract token from Authorization header or cookies
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('token')?.value ||
                  request.cookies.get('accessToken')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No authentication token provided' },
        { status: 401 }
      )
    }

    // Verify token and get user
    if (!JWT_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Server misconfiguration: missing JWT secret' },
        { status: 500 }
      )
    }
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        return NextResponse.json(
          {
            success: false,
            errorCode: 'TOKEN_EXPIRED',
            error: 'Your session timed out for security. Sign in again to continue.'
          },
          { status: 401 }
        )
      }
      return NextResponse.json(
        { success: false, errorCode: 'INVALID_TOKEN', error: 'Authentication is required.' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Check if new password is different from current
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: 'New password must be different from current password' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword)

    // Update password in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date()
      }
    })

    // Invalidate all sessions for the user
    await prisma.userSession.deleteMany({
      where: { userId: user.id }
    })

    return NextResponse.json({
      success: true,
      data: {
        message: 'Password updated successfully'
      }
    })

  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
