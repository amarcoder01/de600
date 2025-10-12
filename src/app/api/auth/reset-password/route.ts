import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { AUTH_MESSAGES } from '@/lib/auth-messages'

export async function POST(request: NextRequest) {
  console.log('🔧 Reset Password API: POST request received')
  try {
    const { token, password } = await request.json()
    console.log('🔧 Reset Password API: Token and password received')

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: 'Token and password are required' },
        { status: 400 }
      )
    }

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date()
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: AUTH_MESSAGES.PASSWORD_RESET.INVALID_TOKEN },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    const isSameAsCurrent = await bcrypt.compare(password, user.password)
    if (isSameAsCurrent) {
      return NextResponse.json(
        { success: false, error: 'New password must be different from the current password' },
        { status: 400 }
      )
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0, // Reset failed login attempts
        lockoutUntil: null // Clear any lockout
      }
    })

    console.log(`🔐 Password reset successful for user ${user.email}`)

    return NextResponse.json({
      success: true,
      message: AUTH_MESSAGES.PASSWORD_RESET.SUCCESS
    })

  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}

// Verify reset token endpoint
export async function GET(request: NextRequest) {
  console.log('🔧 Reset Password API: GET request received')
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    console.log('🔧 Reset Password API: Token from URL:', token)

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    // Check if token is valid and not expired
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date()
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: AUTH_MESSAGES.PASSWORD_RESET.INVALID_TOKEN },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Token is valid',
      data: {
        email: user.email,
        firstName: user.firstName
      }
    })

  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify token' },
      { status: 500 }
    )
  }
}
