/**
 * Secure API Wrapper
 * Provides secure wrapper functions for API endpoints with built-in security measures
 */

import { NextRequest, NextResponse } from 'next/server'
import { withSecurity, SecurityContext } from './api-security'
import { validateRequestBody, VALIDATION_SCHEMAS } from './input-validator'
import { secureQuery, SecureUserOperations } from './secure-database'
import { AuthError, AuthErrorType, verifyToken } from './auth-security'
import crypto from 'crypto'

export interface SecureApiOptions {
  requireAuth?: boolean
  rateLimit?: boolean
  validateInput?: boolean
  inputSchema?: Record<string, any>
  allowedMethods?: string[]
  adminOnly?: boolean
}

/**
 * Secure API wrapper with comprehensive security measures
 */
export function createSecureApi<T extends any[]>(
  handler: (request: NextRequest, context: SecurityContext, ...args: T) => Promise<NextResponse>,
  options: SecureApiOptions = {}
) {
  return withSecurity(async (request: NextRequest, context: SecurityContext, ...args: T) => {
    try {
      // Additional authentication checks for admin endpoints
      if (options.adminOnly) {
        const isAdmin = await checkAdminPermissions(context.userId)
        if (!isAdmin) {
          return NextResponse.json(
            { success: false, error: 'Admin privileges required' },
            { status: 403 }
          )
        }
      }

      // Execute the handler
      return await handler(request, context, ...args)
      
    } catch (error) {
      console.error('🚨 Secure API error:', error)
      
      if (error instanceof AuthError) {
        return NextResponse.json(
          { success: false, error: error.message, type: error.type },
          { status: error.code }
        )
      }
      
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }, options)
}

/**
 * Check admin permissions
 */
async function checkAdminPermissions(userId?: string): Promise<boolean> {
  if (!userId) return false
  
  try {
    const result = await secureQuery(
      'SELECT "isAdmin" FROM "User" WHERE id = $1',
      [userId]
    )
    
    return result.success && result.rows[0]?.isAdmin === true
  } catch (error) {
    console.error('Error checking admin permissions:', error)
    return false
  }
}

/**
 * Secure user authentication endpoint
 */
export const secureUserAuth = createSecureApi(
  async (request: NextRequest, context: SecurityContext) => {
    const { method } = request
    
    switch (method) {
      case 'POST':
        return handleUserLogin(request, context)
      case 'PUT':
        return handleUserRegistration(request, context)
      case 'DELETE':
        return handleUserLogout(request, context)
      default:
        return NextResponse.json(
          { success: false, error: 'Method not allowed' },
          { status: 405 }
        )
    }
  },
  {
    requireAuth: false,
    rateLimit: true,
    validateInput: true,
    inputSchema: VALIDATION_SCHEMAS.userLogin
  }
)

/**
 * Handle user login securely
 */
async function handleUserLogin(request: NextRequest, context: SecurityContext): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { email, password } = body
    
    // Get user with secure query
    const userResult = await SecureUserOperations.getUserByEmail(email)
    if (!userResult.success || userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    const user = userResult.rows[0]
    
    // Check if account is locked
    if (user.isAccountLocked && user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      return NextResponse.json(
        { success: false, error: 'Account is temporarily locked' },
        { status: 423 }
      )
    }
    
    // Verify password
    const bcrypt = require('bcryptjs')
    const isValidPassword = await bcrypt.compare(password, user.password)
    
    if (!isValidPassword) {
      // Increment failed attempts
      const newAttempts = (user.failedLoginAttempts || 0) + 1
      const lockoutUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null
      
      await SecureUserOperations.updateLoginAttempts(user.id, newAttempts, lockoutUntil || undefined)
      
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    // Reset login attempts on successful login
    await SecureUserOperations.resetLoginAttempts(user.id)
    
    // Generate tokens
    const { generateTokens } = require('./auth-security')
    const { accessToken, refreshToken } = generateTokens(user.id, user.email)
    
    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified
      }
    })
    
    // Set secure cookies
    response.cookies.set('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 // 24 hours
    })
    
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })
    
    return response
    
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle user registration securely
 */
async function handleUserRegistration(request: NextRequest, context: SecurityContext): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName } = body
    
    // Check if user already exists
    const existingUserResult = await SecureUserOperations.getUserByEmail(email)
    if (existingUserResult.success && existingUserResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'User already exists' },
        { status: 409 }
      )
    }
    
    // Hash password
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 14)
    
    // Create user
    const userId = require('crypto').randomUUID()
    const createResult = await SecureUserOperations.createUser({
      id: userId,
      email,
      password: hashedPassword,
      firstName,
      lastName
    })
    
    if (!createResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: createResult.rows[0]
    })
    
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle user logout securely
 */
async function handleUserLogout(request: NextRequest, context: SecurityContext): Promise<NextResponse> {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' })
  
  // Clear cookies
  response.cookies.set('token', '', { httpOnly: true, maxAge: 0 })
  response.cookies.set('refreshToken', '', { httpOnly: true, maxAge: 0 })
  
  return response
}

/**
 * Secure portfolio management endpoints
 */
export const securePortfolioApi = createSecureApi(
  async (request: NextRequest, context: SecurityContext, { params }: { params: { id?: string } }) => {
    const { method } = request
    const portfolioId = params?.id
    
    switch (method) {
      case 'GET':
        return handleGetPortfolios(request, context, portfolioId)
      case 'POST':
        return handleCreatePortfolio(request, context)
      case 'PUT':
        return handleUpdatePortfolio(request, context, portfolioId)
      case 'DELETE':
        return handleDeletePortfolio(request, context, portfolioId)
      default:
        return NextResponse.json(
          { success: false, error: 'Method not allowed' },
          { status: 405 }
        )
    }
  },
  {
    requireAuth: true,
    rateLimit: true,
    validateInput: true,
    inputSchema: VALIDATION_SCHEMAS.portfolio
  }
)

/**
 * Handle get portfolios
 */
async function handleGetPortfolios(
  request: NextRequest, 
  context: SecurityContext, 
  portfolioId?: string
): Promise<NextResponse> {
  try {
    if (portfolioId) {
      // Get specific portfolio
      const result = await secureQuery(
        'SELECT * FROM "Portfolio" WHERE id = $1 AND "userId" = $2',
        [portfolioId, context.userId!]
      )
      if (!result.success || result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Portfolio not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: result.rows[0]
      })
    } else {
      // Get all user portfolios
      const result = await secureQuery(
        'SELECT * FROM "Portfolio" WHERE "userId" = $1 ORDER BY "createdAt" DESC',
        [context.userId!]
      )
      return NextResponse.json({
        success: true,
        data: result.rows
      })
    }
  } catch (error) {
    console.error('Get portfolios error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch portfolios' },
      { status: 500 }
    )
  }
}

/**
 * Handle create portfolio
 */
async function handleCreatePortfolio(
  request: NextRequest, 
  context: SecurityContext
): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { name } = body
    
    const result = await secureQuery(
      'INSERT INTO "Portfolio" ("id", "userId", "name", "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
      [crypto.randomUUID(), context.userId!, name]
    )
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to create portfolio' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Create portfolio error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create portfolio' },
      { status: 500 }
    )
  }
}

/**
 * Handle update portfolio
 */
async function handleUpdatePortfolio(
  request: NextRequest, 
  context: SecurityContext, 
  portfolioId?: string
): Promise<NextResponse> {
  if (!portfolioId) {
    return NextResponse.json(
      { success: false, error: 'Portfolio ID required' },
      { status: 400 }
    )
  }
  
  try {
    const body = await request.json()
    const { name } = body
    
    const result = await secureQuery(
      'UPDATE "Portfolio" SET name = $1, "updatedAt" = NOW() WHERE id = $2 AND "userId" = $3 RETURNING *',
      [name, portfolioId, context.userId!]
    )
    if (!result.success || result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Portfolio not found or update failed' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Update portfolio error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update portfolio' },
      { status: 500 }
    )
  }
}

/**
 * Handle delete portfolio
 */
async function handleDeletePortfolio(
  request: NextRequest, 
  context: SecurityContext, 
  portfolioId?: string
): Promise<NextResponse> {
  if (!portfolioId) {
    return NextResponse.json(
      { success: false, error: 'Portfolio ID required' },
      { status: 400 }
    )
  }
  
  try {
    const result = await secureQuery(
      'DELETE FROM "Portfolio" WHERE id = $1 AND "userId" = $2',
      [portfolioId, context.userId!]
    )
    if (!result.success || result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Portfolio not found or delete failed' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Portfolio deleted successfully'
    })
  } catch (error) {
    console.error('Delete portfolio error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete portfolio' },
      { status: 500 }
    )
  }
}

/**
 * Secure trade management endpoints
 */
export const secureTradeApi = createSecureApi(
  async (request: NextRequest, context: SecurityContext, { params }: { params: { id: string } }) => {
    const { method } = request
    const portfolioId = params.id
    
    switch (method) {
      case 'GET':
        return handleGetTrades(request, context, portfolioId)
      case 'POST':
        return handleCreateTrade(request, context, portfolioId)
      default:
        return NextResponse.json(
          { success: false, error: 'Method not allowed' },
          { status: 405 }
        )
    }
  },
  {
    requireAuth: true,
    rateLimit: true,
    validateInput: true,
    inputSchema: VALIDATION_SCHEMAS.trade
  }
)

/**
 * Handle get trades
 */
async function handleGetTrades(
  request: NextRequest, 
  context: SecurityContext, 
  portfolioId: string
): Promise<NextResponse> {
  try {
    const result = await secureQuery(
      'SELECT * FROM "Trade" WHERE "portfolioId" = $1 AND "userId" = $2 ORDER BY "createdAt" DESC',
      [portfolioId, context.userId!]
    )
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch trades' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Get trades error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trades' },
      { status: 500 }
    )
  }
}

/**
 * Handle create trade
 */
async function handleCreateTrade(
  request: NextRequest, 
  context: SecurityContext, 
  portfolioId: string
): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { symbol, type, quantity, price, notes } = body
    
    // Validate trade type
    if (!['buy', 'sell'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid trade type' },
        { status: 400 }
      )
    }
    
    const amount = quantity * price
    
    const result = await secureQuery(
      'INSERT INTO "Trade" ("id", "portfolioId", "userId", symbol, type, quantity, price, amount, notes, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING *',
      [
        crypto.randomUUID(),
        portfolioId,
        context.userId!,
        symbol.toUpperCase(),
        type,
        quantity,
        price,
        amount,
        notes || null
      ]
    )
    
    if (!result.success || result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to create trade or portfolio not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Create trade error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create trade' },
      { status: 500 }
    )
  }
}

