import { prisma } from './db'
import { query } from '@/lib/pg'
import { 
  AuthError, 
  AuthErrorType, 
  validatePassword, 
  validateEmail, 
  validateUserData,
  hashPassword, 
  verifyPassword, 
  generateTokens, 
  verifyToken,
  generateDeviceFingerprint,
  authRateLimiter,
  logSecurityEvent,
  detectSuspiciousActivity,
  sanitizeInput,
  generateRecoveryCode,
  generateSecureRandom,
  SECURITY_CONFIG,
  type User,
  type CreateUserData,
  type LoginAttempt
} from './auth-security'
import { NextRequest } from 'next/server'

// Use shared Prisma client from './db' to avoid multiple connections in dev/serverless

export class AuthService {
  // Enhanced user creation with comprehensive validation
  static async createUser(userData: CreateUserData, request: NextRequest): Promise<User> {
    try {
      // Sanitize input data
      const sanitizedData = {
        email: sanitizeInput(userData.email.toLowerCase()),
        password: userData.password,
        firstName: sanitizeInput(userData.firstName),
        lastName: sanitizeInput(userData.lastName)
      }

      // Comprehensive validation
      const validation = validateUserData(sanitizedData)
      if (!validation.isValid) {
        throw new AuthError(
          AuthErrorType.VALIDATION_ERROR,
          'Invalid user data provided',
          400,
          { errors: validation.errors }
        )
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: sanitizedData.email }
      })

      if (existingUser) {
        throw new AuthError(
          AuthErrorType.VALIDATION_ERROR,
          'User with this email already exists',
          409
        )
      }

      // Hash password with enhanced security
      const hashedPassword = await hashPassword(sanitizedData.password)

      // Create user with security fields
      const user = await prisma.user.create({
        data: {
          email: sanitizedData.email,
          password: hashedPassword,
          firstName: sanitizedData.firstName,
          lastName: sanitizedData.lastName,
          isEmailVerified: false,
          isAccountLocked: false,
          isAccountDisabled: false,
          failedLoginAttempts: 0,
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

      // Log successful registration
      const deviceFingerprint = generateDeviceFingerprint(request)
      await logSecurityEvent({
        userId: user.id,
        email: user.email,
        ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
        deviceFingerprint,
        success: true,
        timestamp: new Date()
      })

      // Return user without password
      const { password, ...userWithoutPassword } = user
      return userWithoutPassword as User

    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }

      // Handle database errors
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new AuthError(
          AuthErrorType.VALIDATION_ERROR,
          'User with this email already exists',
          409
        )
      }

      console.error('User creation error:', error)
      throw new AuthError(
        AuthErrorType.DATABASE_ERROR,
        'Failed to create user account',
        500,
        { originalError: error }
      )
    }
  }

  // Enhanced login with comprehensive security checks
  static async loginUser(email: string, password: string, request: NextRequest): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
    requiresMFA: boolean;
    suspiciousActivity: boolean;
    suspiciousReasons: string[];
  }> {
    try {
      // Sanitize email
      const sanitizedEmail = sanitizeInput(email.toLowerCase())
      const ipAddress = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
      const userAgent = request.headers.get('user-agent') || ''
      const deviceFingerprint = generateDeviceFingerprint(request)

      // Rate limiting check
      const rateLimitKey = `login:${ipAddress}:${sanitizedEmail}`
      const rateLimitResult = authRateLimiter.isAllowed(rateLimitKey)
      
      if (!rateLimitResult.allowed) {
        throw new AuthError(
          AuthErrorType.RATE_LIMIT_EXCEEDED,
          'Too many login attempts. Please try again later.',
          429,
          { retryAfter: rateLimitResult.retryAfter }
        )
      }

      // Find user with password
      const user = await prisma.user.findUnique({
        where: { email: sanitizedEmail }
      })

      if (!user) {
        await this.handleFailedLogin(sanitizedEmail, ipAddress, userAgent, deviceFingerprint, 'User not found')
        throw new AuthError(
          AuthErrorType.INVALID_CREDENTIALS,
          'Invalid email or password',
          401
        )
      }

      // Check if account is disabled
      if (user.isAccountDisabled) {
        await this.handleFailedLogin(sanitizedEmail, ipAddress, userAgent, deviceFingerprint, 'Account disabled')
        throw new AuthError(
          AuthErrorType.ACCOUNT_DISABLED,
          'This account has been disabled. Please contact support.',
          403
        )
      }

      // Check if account is locked
      if (user.isAccountLocked && user.lockoutUntil && user.lockoutUntil > new Date()) {
        await this.handleFailedLogin(sanitizedEmail, ipAddress, userAgent, deviceFingerprint, 'Account locked')
        throw new AuthError(
          AuthErrorType.ACCOUNT_LOCKED,
          'Account is temporarily locked due to multiple failed login attempts',
          423,
          { lockoutUntil: user.lockoutUntil }
        )
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        await this.handleFailedLogin(sanitizedEmail, ipAddress, userAgent, deviceFingerprint, 'Email not verified')
        throw new AuthError(
          AuthErrorType.EMAIL_NOT_VERIFIED,
          'Please verify your email address before signing in',
          403,
          { userId: user.id, email: user.email }
        )
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.password)
      if (!isValidPassword) {
        await this.handleFailedLogin(sanitizedEmail, ipAddress, userAgent, deviceFingerprint, 'Invalid password')
        throw new AuthError(
          AuthErrorType.INVALID_CREDENTIALS,
          'Invalid email or password',
          401
        )
      }

      // Check for suspicious activity
      const suspiciousActivity = await detectSuspiciousActivity(user.id, ipAddress, deviceFingerprint)

      // Reset failed login attempts on successful login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockoutUntil: null,
          lastLoginAt: new Date()
        }
      })

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.id, user.email)

      // Create or update session
      await this.createUserSession(user.id, refreshToken, deviceFingerprint, ipAddress, userAgent)

      // Log successful login
      await logSecurityEvent({
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        deviceFingerprint,
        success: true,
        timestamp: new Date()
      })

      // Reset rate limiter on successful login
      authRateLimiter.reset(rateLimitKey)

      // Return user without password
      const { password: _, ...userWithoutPassword } = user

      return {
        user: userWithoutPassword as User,
        accessToken,
        refreshToken,
        requiresMFA: false, // TODO: Implement MFA
        suspiciousActivity: suspiciousActivity.suspicious,
        suspiciousReasons: suspiciousActivity.reasons
      }

    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }

      console.error('Login error:', error)
      throw new AuthError(
        AuthErrorType.UNKNOWN_ERROR,
        'Login failed due to an unexpected error',
        500,
        { originalError: error }
      )
    }
  }

  // Handle failed login attempts
  private static async handleFailedLogin(
    email: string, 
    ipAddress: string, 
    userAgent: string, 
    deviceFingerprint: string, 
    reason: string
  ): Promise<void> {
    try {
      // Find user to update failed attempts
      const user = await prisma.user.findUnique({
        where: { email }
      })

      if (user) {
        const newFailedAttempts = user.failedLoginAttempts + 1
        const shouldLockAccount = newFailedAttempts >= SECURITY_CONFIG.auth.maxLoginAttempts

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newFailedAttempts,
            lockoutUntil: shouldLockAccount ? new Date(Date.now() + SECURITY_CONFIG.auth.lockoutDuration) : null
          }
        })

        // Log failed attempt
        await logSecurityEvent({
          userId: user.id,
          email: user.email,
          ipAddress,
          userAgent,
          deviceFingerprint,
          success: false,
          failureReason: reason,
          timestamp: new Date()
        })
      } else {
        // Log failed attempt for non-existent user
        await logSecurityEvent({
          email,
          ipAddress,
          userAgent,
          deviceFingerprint,
          success: false,
          failureReason: reason,
          timestamp: new Date()
        })
      }
    } catch (error) {
      console.error('Failed to handle failed login:', error)
      // Don't throw error to avoid breaking the login flow
    }
  }

  // Create user session
  private static async createUserSession(
    userId: string,
    refreshToken: string,
    deviceFingerprint: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    try {
      // Clean up expired sessions first
      await prisma.userSession.deleteMany({
        where: {
          userId,
          expiresAt: {
            lt: new Date()
          }
        }
      })

      // Check concurrent sessions limit
      const activeSessions = await prisma.userSession.count({
        where: {
          userId,
          isActive: true,
          expiresAt: {
            gt: new Date()
          }
        }
      })

      if (activeSessions >= SECURITY_CONFIG.auth.maxConcurrentSessions) {
        // Remove oldest session
        const oldestSession = await prisma.userSession.findFirst({
          where: {
            userId,
            isActive: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        })

        if (oldestSession) {
          await prisma.userSession.delete({
            where: { id: oldestSession.id }
          })
        }
      }

      // Create new session
      await prisma.userSession.create({
        data: {
          userId,
          refreshToken,
          deviceFingerprint,
          ipAddress,
          userAgent,
          isActive: true,
          expiresAt: new Date(Date.now() + SECURITY_CONFIG.auth.refreshTokenDuration)
        }
      })
    } catch (error) {
      console.error('Failed to create user session:', error)
      throw new AuthError(
        AuthErrorType.DATABASE_ERROR,
        'Failed to create user session',
        500,
        { originalError: error }
      )
    }
  }

  // Verify and refresh tokens
  static async refreshToken(refreshToken: string, request: NextRequest): Promise<{
    accessToken: string;
    refreshToken: string;
    user: User;
  }> {
    try {
      // Verify refresh token
      const decoded = verifyToken(refreshToken, SECURITY_CONFIG.auth.refreshTokenSecret)

      // Check if session exists and is active
      const session = await prisma.userSession.findUnique({
        where: { refreshToken },
        include: { user: true }
      })

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        throw new AuthError(
          AuthErrorType.SESSION_EXPIRED,
          'Session has expired or is invalid',
          401
        )
      }

      // Update session last used
      await prisma.userSession.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() }
      })

      // Generate new tokens
      const newTokens = generateTokens(session.userId, session.user.email)

      // Update session with new refresh token
      await prisma.userSession.update({
        where: { id: session.id },
        data: { 
          refreshToken: newTokens.refreshToken,
          expiresAt: new Date(Date.now() + SECURITY_CONFIG.auth.refreshTokenDuration)
        }
      })

      // Return user without password
      const { password, ...userWithoutPassword } = session.user

      return {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        user: userWithoutPassword as User
      }

    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }

      console.error('Token refresh error:', error)
      throw new AuthError(
        AuthErrorType.INVALID_TOKEN,
        'Failed to refresh authentication token',
        401
      )
    }
  }

  // Logout user
  static async logoutUser(refreshToken: string): Promise<void> {
    try {
      // First check if the session exists before trying to delete it
      const existingSession = await prisma.userSession.findUnique({
        where: { refreshToken }
      })

      if (existingSession) {
        await prisma.userSession.delete({
          where: { refreshToken }
        })
        console.log('✅ User session deleted successfully')
      } else {
        console.log('ℹ️ No active session found for logout (token may have already expired)')
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Don't throw error for logout failures
    }
  }

  // Get user by ID with error handling
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const { rows } = await query(
        'SELECT "id", "email", "firstName", "lastName", "isEmailVerified", "isAccountLocked", "isAccountDisabled", "lastLoginAt", "failedLoginAttempts", "lockoutUntil", "preferences", "createdAt", "updatedAt" FROM "User" WHERE "id" = $1 LIMIT 1',
        [userId]
      )

      if (rows.length === 0) {
        return null
      }

      const u = rows[0]
      const userWithoutPassword: User = {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        isEmailVerified: u.isEmailVerified,
        isAccountLocked: u.isAccountLocked,
        isAccountDisabled: u.isAccountDisabled,
        lastLoginAt: u.lastLoginAt || undefined,
        failedLoginAttempts: u.failedLoginAttempts,
        lockoutUntil: u.lockoutUntil || undefined,
        preferences: u.preferences,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }
      return userWithoutPassword

    } catch (error) {
      console.error('Get user error:', error)
      throw new AuthError(
        AuthErrorType.DATABASE_ERROR,
        'Failed to retrieve user information',
        500,
        { originalError: error }
      )
    }
  }

  // Update user with validation
  static async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      // Validate email if being updated
      if (updates.email) {
        const emailValidation = validateEmail(updates.email)
        if (!emailValidation.isValid) {
          throw new AuthError(
            AuthErrorType.VALIDATION_ERROR,
            emailValidation.error!,
            400
          )
        }

        // Check if email is already taken
        const existingUser = await prisma.user.findFirst({
          where: {
            email: updates.email.toLowerCase(),
            id: { not: userId }
          }
        })

        if (existingUser) {
          throw new AuthError(
            AuthErrorType.VALIDATION_ERROR,
            'Email address is already in use',
            409
          )
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...updates,
          email: updates.email?.toLowerCase(),
          updatedAt: new Date()
        }
      })

      // Return user without password
      const { password, ...userWithoutPassword } = user
      return userWithoutPassword as User

    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }

      console.error('Update user error:', error)
      throw new AuthError(
        AuthErrorType.DATABASE_ERROR,
        'Failed to update user information',
        500,
        { originalError: error }
      )
    }
  }

  // Change password with security checks
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        throw new AuthError(
          AuthErrorType.INVALID_CREDENTIALS,
          'User not found',
          404
        )
      }

      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password)
      if (!isCurrentPasswordValid) {
        throw new AuthError(
          AuthErrorType.INVALID_CREDENTIALS,
          'Current password is incorrect',
          401
        )
      }

      // Validate new password
      const passwordValidation = validatePassword(newPassword)
      if (!passwordValidation.isValid) {
        throw new AuthError(
          AuthErrorType.VALIDATION_ERROR,
          'New password does not meet security requirements',
          400,
          { errors: passwordValidation.errors }
        )
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword)

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
          updatedAt: new Date()
        }
      })

      // Invalidate all sessions (force re-login)
      await prisma.userSession.deleteMany({
        where: { userId }
      })

    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }

      console.error('Change password error:', error)
      throw new AuthError(
        AuthErrorType.DATABASE_ERROR,
        'Failed to change password',
        500,
        { originalError: error }
      )
    }
  }

  // Generate recovery code
  static async generateRecoveryCode(email: string): Promise<{ recoveryCode: string; expiresAt: Date }> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })

      if (!user) {
        // Don't reveal if user exists or not
        return {
          recoveryCode: generateRecoveryCode(),
          expiresAt: new Date(Date.now() + SECURITY_CONFIG.auth.recoveryCodeExpiry)
        }
      }

      const recoveryCode = generateRecoveryCode()
      const expiresAt = new Date(Date.now() + SECURITY_CONFIG.auth.recoveryCodeExpiry)

      // Store recovery code (in production, this should be encrypted)
      // For now, we'll just return it
      // TODO: Implement secure recovery code storage

      return { recoveryCode, expiresAt }

    } catch (error) {
      console.error('Generate recovery code error:', error)
      throw new AuthError(
        AuthErrorType.UNKNOWN_ERROR,
        'Failed to generate recovery code',
        500,
        { originalError: error }
      )
    }
  }

  // Clean up expired sessions (cron job)
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      await prisma.userSession.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })
    } catch (error) {
      console.error('Cleanup expired sessions error:', error)
    }
  }

  // Get user from access token
  static async getUserFromToken(token: string): Promise<User | null> {
    try {
      console.log('🔐 AuthService - Verifying token with secret:', {
        secretLength: SECURITY_CONFIG.auth.jwtSecret.length,
        secretPreview: `${SECURITY_CONFIG.auth.jwtSecret.substring(0, 20)}...`
      })
      
      // Verify token
      const decoded = verifyToken(token, SECURITY_CONFIG.auth.jwtSecret)
      console.log('🔓 AuthService - Token decoded:', {
        hasDecoded: !!decoded,
        userId: decoded?.userId,
        email: decoded?.email
      })
      
      if (!decoded || !decoded.userId) {
        console.log('❌ AuthService - No decoded data or userId')
        return null
      }

      // Get user from database
      console.log('👤 AuthService - Fetching user from database:', decoded.userId)
      const user = await this.getUserById(decoded.userId)
      console.log('✅ AuthService - User fetched:', {
        hasUser: !!user,
        userId: user?.id,
        email: user?.email
      })
      return user
    } catch (error) {
      console.error('❌ AuthService - Error getting user from token:', error)
      return null
    }
  }
}
