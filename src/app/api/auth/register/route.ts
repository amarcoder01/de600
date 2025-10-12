import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth-security'
import { EmailVerificationService } from '@/lib/email-verification-service'
import { logSecurityEvent, SecurityEventType, SecuritySeverity } from '@/lib/security-monitoring'
import { AuthValidator } from '@/lib/auth-validation'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'

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

    const { email, password, firstName, lastName, privacyPolicyAccepted } = body

    // Validate payload using shared validator (strong server-side enforcement)
    const validation = AuthValidator.validateRegistration({
      email,
      password,
      firstName,
      lastName,
      confirmPassword: password, // server doesn't persist this, just to satisfy schema match
      privacyPolicyAccepted,
    })

    if (!validation.success) {
      const response = NextResponse.json(
        {
          success: false,
          type: 'VALIDATION_ERROR',
          error: 'Validation failed',
          details: { errors: validation.errors }
        },
        { status: 400 }
      )
      response.cookies.set('token', '', { httpOnly: true, maxAge: 0, path: '/' })
      response.cookies.set('refreshToken', '', { httpOnly: true, maxAge: 0, path: '/' })
      return response
    }

    const normalizedEmail = (validation.data?.email || String(email)).toLowerCase().trim()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      // Create response for existing user error
      const response = NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      )
      
      // Clear any existing auth cookies to prevent authentication confusion
      response.cookies.set('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0, // Expire immediately
        path: '/'
      })
      
      response.cookies.set('refreshToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0, // Expire immediately
        path: '/'
      })
      
      return response
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        isEmailVerified: false,
        isAccountLocked: false,
        isAccountDisabled: false,
        failedLoginAttempts: 0,
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedAt: new Date(),
        preferences: JSON.stringify({
          theme: 'system',
          currency: 'USD',
          timezone: 'UTC',
          notifications: {
            email: true,
            push: true,
            sms: false
          },
          security: {
            mfaEnabled: false,
            trustedDevices: [],
            lastPasswordChange: new Date().toISOString()
          }
        })
      }
    })

    // Create and send verification code
    const verificationResult = await EmailVerificationService.createVerificationCode(
      user.id,
      user.email
    )

    if (!verificationResult.success || !verificationResult.code) {
      console.error('Failed to create verification code for user:', user.id)
      // Continue with registration even if verification email fails
      // User can request a new verification code later
    } else {
      // Send verification email
      const emailSent = await EmailVerificationService.sendVerificationEmail(
        user.email,
        user.firstName,
        verificationResult.code
      )

      if (!emailSent) {
        console.error('Failed to send verification email to:', user.email)
        // Continue with registration - user can request resend later
      } else {
        console.log('✅ Verification email sent to:', user.email)
      }
    }

    // Generate JWT token
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    // Log successful registration
    await logSecurityEvent(
      SecurityEventType.USER_REGISTRATION,
      SecuritySeverity.LOW,
      request,
      { 
        reason: 'User registration successful', 
        userId: user.id, 
        email: user.email,
        emailVerificationSent: verificationResult.success && verificationResult.code
      },
      user.id
    )

    // Create success response
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt
        },
        accessToken,
        message: 'Account created successfully. Please check your email for verification code.',
        emailVerificationSent: verificationResult.success && verificationResult.code
      }
    }, { status: 201 })

    // Set cookies
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

    return response

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
