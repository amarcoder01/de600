import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { query } from '@/lib/pg'

// Using direct PostgreSQL client from src/lib/pg

// Security configuration
const SECURITY_CONFIG = {
  // Password requirements
  PASSWORD_MIN_LENGTH: 5,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBERS: true,
  PASSWORD_REQUIRE_SYMBOLS: true,
  
  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  PROGRESSIVE_DELAY: true,
  
  // Session management
  SESSION_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days
  REFRESH_TOKEN_DURATION: 30 * 24 * 60 * 60 * 1000, // 30 days
  MAX_CONCURRENT_SESSIONS: 5,
  
  // Security
  BCRYPT_ROUNDS: 12,
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret',
  
  // Account recovery
  RECOVERY_CODE_LENGTH: 8,
  RECOVERY_CODE_EXPIRY: 10 * 60 * 1000, // 10 minutes
  
  // Device fingerprinting
  DEVICE_FINGERPRINT_FIELDS: [
    'userAgent',
    'acceptLanguage',
    'screenResolution',
    'timezone',
    'platform'
  ]
}

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
  
  if (password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${SECURITY_CONFIG.PASSWORD_MIN_LENGTH} characters long`)
  }
  
  if (SECURITY_CONFIG.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (SECURITY_CONFIG.PASSWORD_REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (SECURITY_CONFIG.PASSWORD_REQUIRE_NUMBERS && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (SECURITY_CONFIG.PASSWORD_REQUIRE_SYMBOLS && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
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
      return { allowed: true, remainingAttempts: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - 1 }
    }
    
    // Check if lockout period has passed
    if (attempt.count >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
      const lockoutEnd = attempt.lastAttempt + SECURITY_CONFIG.LOCKOUT_DURATION
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
        return { allowed: true, remainingAttempts: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - 1 }
      }
    }
    
    // Apply progressive delay if enabled
    if (SECURITY_CONFIG.PROGRESSIVE_DELAY && attempt.count > 1) {
      const delay = Math.min(Math.pow(2, attempt.count - 1) * 1000, 30000) // Max 30 seconds
      const timeSinceLastAttempt = now - attempt.lastAttempt
      if (timeSinceLastAttempt < delay) {
        return { 
          allowed: false, 
          retryAfter: Math.ceil((delay - timeSinceLastAttempt) / 1000),
          remainingAttempts: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - attempt.count
        }
      }
    }
    
    // Increment attempt count
    attempt.count++
    attempt.lastAttempt = now
    this.attempts.set(identifier, attempt)
    
    return { 
      allowed: true, 
      remainingAttempts: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - attempt.count
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
    return await bcrypt.hash(password, SECURITY_CONFIG.BCRYPT_ROUNDS)
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
      SECURITY_CONFIG.JWT_SECRET,
      { expiresIn: SECURITY_CONFIG.SESSION_DURATION / 1000 }
    )
    
    const refreshToken = jwt.sign(
      { userId, email, type: 'refresh' },
      SECURITY_CONFIG.REFRESH_TOKEN_SECRET,
      { expiresIn: SECURITY_CONFIG.REFRESH_TOKEN_DURATION / 1000 }
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
export function verifyToken(token: string, secret: string = SECURITY_CONFIG.JWT_SECRET): any {
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
  return crypto.randomBytes(SECURITY_CONFIG.RECOVERY_CODE_LENGTH).toString('hex').toUpperCase()
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
    const { rows: failedRows } = await query<{ count: string }>(
      'SELECT COUNT(*)::text as count FROM "LoginAttempt" WHERE "ipAddress" = $1 AND "success" = false AND "timestamp" >= $2',
      [ipAddress, new Date(Date.now() - 60 * 60 * 1000)]
    )
    const recentFailedAttempts = parseInt(failedRows[0]?.count || '0', 10)
    
    if (recentFailedAttempts > 10) {
      reasons.push('Multiple failed login attempts from this IP address')
    }
    
    // Check for login from new device
    const { rows: deviceRows } = await query<{ id: string }>(
      'SELECT "id" FROM "DeviceTrust" WHERE "userId" = $1 AND "deviceFingerprint" = $2 LIMIT 1',
      [userId, deviceFingerprint]
    )
    
    if (deviceRows.length === 0) {
      reasons.push('Login attempt from new device')
    }
    
    // Check for rapid successive logins
    const { rows: loginRows } = await query<{ count: string }>(
      'SELECT COUNT(*)::text as count FROM "LoginAttempt" WHERE "userId" = $1 AND "success" = true AND "timestamp" >= $2',
      [userId, new Date(Date.now() - 5 * 60 * 1000)]
    )
    const recentLogins = parseInt(loginRows[0]?.count || '0', 10)
    
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
