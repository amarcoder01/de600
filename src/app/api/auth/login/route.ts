import { NextRequest, NextResponse } from 'next/server'
import { prisma, testDatabaseConnection } from '@/lib/db'
import { ensureDatabaseInitialized } from '@/lib/db-init'
import { verifyPassword, hashPassword } from '@/lib/auth-security'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'

// Global error handler to ensure JSON responses
const handleError = (error: any, context: string) => {
  console.error(`❌ Login API - ${context}:`, error)
  
  let errorMessage = 'An unexpected error occurred'
  let statusCode = 500
  
  if (error instanceof Error) {
    if (error.message.includes('DATABASE_URL')) {
      errorMessage = 'Database configuration error. Please contact support.'
      statusCode = 500
    } else if (error.message.includes('connection')) {
      errorMessage = 'Database connection failed. Please try again later.'
      statusCode = 503
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timeout. Please try again.'
      statusCode = 408
    } else if (error.message.includes('Engine is not yet connected')) {
      errorMessage = 'Database service is starting up. Please try again in a moment.'
      statusCode = 503
    } else {
      errorMessage = error.message
    }
  }
  
  return new NextResponse(
    JSON.stringify({ 
      success: false, 
      error: errorMessage,
      details: 'Please try again later or contact support if the issue persists.',
      context: context
    }),
    { 
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    // Ensure database is initialized before proceeding
    console.log('🔍 Login API - Ensuring database initialization...')
    try {
      await ensureDatabaseInitialized()
      console.log('✅ Login API - Database initialization confirmed')
    } catch (initError) {
      console.error('❌ Login API - Database initialization failed:', initError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database service is starting up. Please try again in a moment.',
          details: 'The database is initializing and will be ready shortly.'
        },
        { status: 503 }
      )
    }

    // Test database connection
    console.log('🔍 Login API - Testing database connection...')
    const isDatabaseConnected = await testDatabaseConnection()
    
    if (!isDatabaseConnected) {
      console.error('❌ Login API - Database connection failed')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection failed. Please try again later.',
          details: 'The database service is temporarily unavailable.'
        },
        { status: 503 }
      )
    }
    
    console.log('✅ Login API - Database connection successful')

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error('❌ Login API - JSON parsing failed:', error)
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      )
    }

    const { email, password } = body

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    console.log('🔍 Login API - Attempting login for:', email)

    // Find user with connection retry
    let user
    try {
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() }
      })
    } catch (dbError) {
      return handleError(dbError, 'Database query failed')
    }

    if (!user) {
      console.log('❌ Login API - User not found:', email)
      return NextResponse.json(
        { success: false, error: 'Email is not registered', type: 'USER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if account is disabled
    if (user.isAccountDisabled) {
      console.log('❌ Login API - Account disabled:', email)
      return NextResponse.json(
        { success: false, error: 'Account is disabled' },
        { status: 403 }
      )
    }

    // Check if account is locked
    if (user.isAccountLocked && user.lockoutUntil && user.lockoutUntil > new Date()) {
      console.log('❌ Login API - Account locked:', email)
      return NextResponse.json(
        { success: false, error: 'Account is temporarily locked' },
        { status: 423 }
      )
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      console.log('❌ Login API - Email not verified:', email)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Please verify your email address before signing in',
          requiresEmailVerification: true,
          userId: user.id,
          email: user.email
        },
        { status: 403 }
      )
    }

    // Verify password
    let isValidPassword
    try {
      isValidPassword = await verifyPassword(password, user.password)
    } catch (passwordError) {
      return handleError(passwordError, 'Password verification failed')
    }

    if (!isValidPassword) {
      console.log('❌ Login API - Invalid password for:', email)
      
      // Update failed login attempts
      const newFailedAttempts = user.failedLoginAttempts + 1
      const shouldLockAccount = newFailedAttempts >= 5

      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newFailedAttempts,
            lockoutUntil: shouldLockAccount ? new Date(Date.now() + 15 * 60 * 1000) : null,
            isAccountLocked: shouldLockAccount
          }
        })
      } catch (updateError) {
        console.error('❌ Login API - Failed to update login attempts:', updateError)
        // Continue with login failure response even if update fails
      }

      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    console.log('✅ Login API - Password verified successfully for:', email)

    // Reset failed login attempts on successful login
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockoutUntil: null,
          isAccountLocked: false,
          lastLoginAt: new Date()
        }
      })
    } catch (updateError) {
      console.error('❌ Login API - Failed to reset login attempts:', updateError)
      // Continue with successful login even if update fails
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

    console.log('✅ Login API - Login successful for:', email)

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
          lastLoginAt: user.lastLoginAt
        },
        accessToken,
        requiresMFA: false,
        suspiciousActivity: false
      }
    })

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
    return handleError(error, 'Unexpected error')
  }
}
