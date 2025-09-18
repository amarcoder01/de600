import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { query } from '@/lib/pg'
import { SECURITY_CONFIG } from './security-config'

// Using direct PostgreSQL client from src/lib/pg

// Error types for better error handling
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  DEVICE_NOT_TRUSTED = 'DEVICE_NOT_TRUSTED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class AuthError extends Error {
  public type: AuthErrorType
  public code: number
  public details?: any
  public retryAfter?: number

  constructor(type: AuthErrorType, message: string, code: number = 400, details?: any, retryAfter?: number) {
    super(message)
    this.name = 'AuthError'
    this.type = type
    this.code = code
    this.details = details
    this.retryAfter = retryAfter
  }
}

// User interfaces
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  isEmailVerified: boolean
  isAccountLocked: boolean
  isAccountDisabled: boolean
  lastLoginAt?: Date
  failedLoginAttempts: number
  lockoutUntil?: Date
  preferences: any
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserData {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface LoginAttempt {
  id: string
  userId: string
  email: string
  ipAddress: string
  userAgent: string
  deviceFingerprint: string
  success: boolean
  failureReason?: string
  location?: string
  timestamp: Date
}

export interface UserSession {
  id: string
  userId: string
  refreshToken: string
  deviceFingerprint: string
  ipAddress: string
  userAgent: string
  isActive: boolean
  expiresAt: Date
  createdAt: Date
  lastUsedAt: Date
}

export interface DeviceTrust {
  id: string
  userId: string
  deviceFingerprint: string
  deviceName: string
  isTrusted: boolean
  lastUsedAt: Date
  createdAt: Date
}

// Password validation with comprehensive checks
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (password.length < SECURITY_CONFIG.auth.passwordMinLength) {
    errors.push(`Password must be at least ${SECURITY_CONFIG.auth.passwordMinLength} characters long`)
  }
  
  if (SECURITY_CONFIG.auth.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (SECURITY_CONFIG.auth.passwordRequireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (SECURITY_CONFIG.auth.passwordRequireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (SECURITY_CONFIG.auth.passwordRequireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password cannot contain repeated characters (e.g., "aaa")')
  }
  
  if (/^(.)\1+$/.test(password)) {
    errors.push('Password cannot be all the same character')
  }
  
  // Check for common passwords (basic check)
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein']
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a more unique password')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Email validation
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!email) {
    return { isValid: false, error: 'Email is required' }
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' }
  }
  
  // Check for disposable email domains (basic check)
  const disposableDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com']
  const domain = email.split('@')[1]?.toLowerCase()
  if (disposableDomains.includes(domain)) {
    return { isValid: false, error: 'Disposable email addresses are not allowed' }
  }
  
  return { isValid: true }
}

// Device fingerprinting
export function generateDeviceFingerprint(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || ''
  const acceptLanguage = request.headers.get('accept-language') || ''
  const ipAddress = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${userAgent}|${acceptLanguage}|${ipAddress}`)
    .digest('hex')
  
  return fingerprint
}

// Rate limiting with progressive delays
export class RateLimiter {
  private attempts = new Map<string, { count: number; firstAttempt: number; lastAttempt: number }>()
  
  isAllowed(identifier: string): { allowed: boolean; retryAfter?: number; remainingAttempts: number } {
    const now = Date.now()
    const attempt = this.attempts.get(identifier)
    
    if (!attempt) {
      this.attempts.set(identifier, { count: 1, firstAttempt: now, lastAttempt: now })
      return { allowed: true, remainingAttempts: SECURITY_CONFIG.auth.maxLoginAttempts - 1 }
    }
    
    // Check if lockout period has passed
    if (attempt.count >= SECURITY_CONFIG.auth.maxLoginAttempts) {
      const lockoutEnd = attempt.lastAttempt + SECURITY_CONFIG.auth.lockoutDuration
      if (now < lockoutEnd) {
        return { 
          allowed: false, 
          retryAfter: Math.ceil((lockoutEnd - now) / 1000),
          remainingAttempts: 0
        }
      } else {
        // Reset after lockout period
        this.attempts.delete(identifier)
        this.attempts.set(identifier, { count: 1, firstAttempt: now, lastAttempt: now })
        return { allowed: true, remainingAttempts: SECURITY_CONFIG.auth.maxLoginAttempts - 1 }
      }
    }
    
    // Apply progressive delay if enabled
    if (attempt.count > 1) {
      const delay = Math.min(Math.pow(2, attempt.count - 1) * 1000, 30000) // Max 30 seconds
      const timeSinceLastAttempt = now - attempt.lastAttempt
      if (timeSinceLastAttempt < delay) {
        return { 
          allowed: false, 
          retryAfter: Math.ceil((delay - timeSinceLastAttempt) / 1000),
          remainingAttempts: SECURITY_CONFIG.auth.maxLoginAttempts - attempt.count
        }
      }
    }
    
    // Increment attempt count
    attempt.count++
    attempt.lastAttempt = now
    this.attempts.set(identifier, attempt)
    
    return { 
      allowed: true, 
      remainingAttempts: SECURITY_CONFIG.auth.maxLoginAttempts - attempt.count
    }
  }
  
  reset(identifier: string): void {
    this.attempts.delete(identifier)
  }
  
  getAttempts(identifier: string): number {
    return this.attempts.get(identifier)?.count || 0
  }
}

// Global rate limiter instance
export const authRateLimiter = new RateLimiter()

// Password hashing with error handling
export async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, SECURITY_CONFIG.auth.bcryptRounds)
  } catch (error) {
    throw new AuthError(
      AuthErrorType.DATABASE_ERROR,
      'Failed to hash password',
      500,
      { originalError: error }
    )
  }
}

// Password verification with timing attack protection
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword)
  } catch (error) {
    throw new AuthError(
      AuthErrorType.DATABASE_ERROR,
      'Failed to verify password',
      500,
      { originalError: error }
    )
  }
}

// JWT token generation with error handling
export function generateTokens(userId: string, email: string): { accessToken: string; refreshToken: string } {
  try {
    const accessToken = jwt.sign(
      { userId, email, type: 'access' },
      SECURITY_CONFIG.auth.jwtSecret,
      { expiresIn: SECURITY_CONFIG.auth.sessionDuration / 1000 }
    )
    
    const refreshToken = jwt.sign(
      { userId, email, type: 'refresh' },
      SECURITY_CONFIG.auth.refreshTokenSecret,
      { expiresIn: SECURITY_CONFIG.auth.refreshTokenDuration / 1000 }
    )
    
    return { accessToken, refreshToken }
  } catch (error) {
    throw new AuthError(
      AuthErrorType.UNKNOWN_ERROR,
      'Failed to generate authentication tokens',
      500,
      { originalError: error }
    )
  }
}

// JWT token verification with comprehensive error handling
export function verifyToken(token: string, secret: string = SECURITY_CONFIG.auth.jwtSecret): any {
  try {
    return jwt.verify(token, secret)
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthError(
        AuthErrorType.TOKEN_EXPIRED,
        'Authentication token has expired',
        401
      )
    } else if (error.name === 'JsonWebTokenError') {
      throw new AuthError(
        AuthErrorType.INVALID_TOKEN,
        'Invalid authentication token',
        401
      )
    } else {
      throw new AuthError(
        AuthErrorType.UNKNOWN_ERROR,
        'Token verification failed',
        500,
        { originalError: error }
      )
    }
  }
}

// Generate recovery codes
export function generateRecoveryCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase() // 8 characters
}

// Generate secure random string
export function generateSecureRandom(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

// Sanitize user input
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

// Validate user data
export function validateUserData(data: CreateUserData): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  
  // Email validation
  const emailValidation = validateEmail(data.email)
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!
  }
  
  // Password validation
  const passwordValidation = validatePassword(data.password)
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors.join(', ')
  }
  
  // Name validation
  if (!data.firstName?.trim() || data.firstName.trim().length < 2) {
    errors.firstName = 'First name must be at least 2 characters long'
  }
  
  if (!data.lastName?.trim() || data.lastName.trim().length < 2) {
    errors.lastName = 'Last name must be at least 2 characters long'
  }
  
  // Name format validation
  if (data.firstName && !/^[a-zA-Z\s]+$/.test(data.firstName.trim())) {
    errors.firstName = 'First name can only contain letters and spaces'
  }
  
  if (data.lastName && !/^[a-zA-Z\s]+$/.test(data.lastName.trim())) {
    errors.lastName = 'Last name can only contain letters and spaces'
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Log security events
export async function logSecurityEvent(event: Partial<LoginAttempt>): Promise<void> {
  try {
    await query(
      'INSERT INTO "LoginAttempt" ("userId", "email", "ipAddress", "userAgent", "deviceFingerprint", "success", "failureReason", "location", "timestamp") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [
        event.userId || null,
        event.email || '',
        event.ipAddress || '',
        event.userAgent || '',
        event.deviceFingerprint || '',
        event.success || false,
        event.failureReason || null,
        event.location || null,
        event.timestamp || new Date(),
      ]
    )
  } catch (error) {
    console.error('Failed to log security event:', error)
    // Don't throw error for logging failures to avoid breaking auth flow
  }
}

// Check for suspicious activity
export async function detectSuspiciousActivity(userId: string, ipAddress: string, deviceFingerprint: string): Promise<{ suspicious: boolean; reasons: string[] }> {
  const reasons: string[] = []
  
  try {
    // Check for multiple failed attempts from same IP
    const { rows: failedRows } = await query(
      'SELECT COUNT(*)::text as count FROM "LoginAttempt" WHERE "ipAddress" = $1 AND "success" = false AND "timestamp" >= $2',
      [ipAddress, new Date(Date.now() - 60 * 60 * 1000)]
    )

    const failedCount = parseInt(failedRows[0]?.count || '0')
    if (failedCount >= SECURITY_CONFIG.auth.maxLoginAttempts) {
      console.log(`🚫 IP ${ipAddress} blocked due to ${failedCount} failed attempts`)
      reasons.push('Too many failed attempts from this IP address')
    }

    // Check for device fingerprint blocking
    const { rows: deviceRows } = await query(
      'SELECT "id" FROM "BlockedDevice" WHERE "fingerprint" = $1 AND "isActive" = true',
      [deviceFingerprint]
    )

    if (deviceRows.length > 0) {
      console.log(`🚫 Device ${deviceFingerprint} blocked`)
      reasons.push('Device is blocked')
    }

    // Check for recent successful logins from same IP
    const { rows: loginRows } = await query(
      'SELECT COUNT(*)::text as count FROM "LoginAttempt" WHERE "ipAddress" = $1 AND "success" = true AND "timestamp" >= $2',
      [ipAddress, new Date(Date.now() - 5 * 60 * 1000)]
    )
    
    const recentLogins = parseInt(loginRows[0]?.count || '0')
    if (recentLogins > 3) {
      reasons.push('Rapid successive login attempts')
    }
    
    return {
      suspicious: reasons.length > 0,
      reasons
    }
  } catch (error) {
    console.error('Failed to detect suspicious activity:', error)
    return { suspicious: false, reasons: [] }
  }
}

// Clean up expired sessions
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    await query('DELETE FROM "UserSession" WHERE "expiresAt" < $1', [new Date()])
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error)
  }
}

// Export security configuration
export { SECURITY_CONFIG }
