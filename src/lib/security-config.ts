/**
 * Comprehensive Security Configuration
 * Centralized security settings and validation rules
 */

import * as crypto from 'crypto'

export interface SecurityConfig {
  // Authentication & Authorization
  auth: {
    jwtSecret: string
    refreshTokenSecret: string
    passwordMinLength: number
    passwordRequireUppercase: boolean
    passwordRequireLowercase: boolean
    passwordRequireNumbers: boolean
    passwordRequireSymbols: boolean
    maxLoginAttempts: number
    lockoutDuration: number
    sessionDuration: number
    refreshTokenDuration: number
    bcryptRounds: number
    maxConcurrentSessions: number
    recoveryCodeExpiry: number
  }
  
  // API Security
  api: {
    rateLimitWindow: number
    rateLimitMax: number
    corsOrigins: string[]
    allowedMethods: string[]
    maxRequestSize: number
  }
  
  // Data Protection
  data: {
    encryptionKey: string
    saltRounds: number
    tokenExpiry: number
  }
  
  // Environment Security
  env: {
    requiredSecrets: string[]
    allowedOrigins: string[]
    debugMode: boolean
  }
}

// Validate environment variables
function validateEnvironment(): void {
  const requiredSecrets = [
    'JWT_SECRET',
    'REFRESH_TOKEN_SECRET',
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'POLYGON_API_KEY'
  ]
  
  const missingSecrets = requiredSecrets.filter(secret => {
    const value = process.env[secret]
    return !value || value.includes('your-') || value.includes('change-this')
  })
  
  if (missingSecrets.length > 0) {
    throw new Error(`CRITICAL SECURITY ERROR: Missing or default secrets: ${missingSecrets.join(', ')}`)
  }
  
  // Validate JWT secret strength
  const jwtSecret = process.env.JWT_SECRET!
  if (jwtSecret.length < 32) {
    throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET must be at least 32 characters long')
  }
}

// Initialize security configuration
export function initializeSecurity(): SecurityConfig {
  // Validate environment first
  validateEnvironment()
  
  return {
    auth: {
      jwtSecret: process.env.JWT_SECRET!,
      refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET!,
      passwordMinLength: 8, // Increased from 5
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSymbols: true,
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      sessionDuration: 24 * 60 * 60 * 1000, // 24 hours (reduced from 7 days)
      refreshTokenDuration: 7 * 24 * 60 * 60 * 1000, // 7 days (reduced from 30 days)
      bcryptRounds: 14, // Increased from 12
      maxConcurrentSessions: 5, // Maximum concurrent sessions per user
      recoveryCodeExpiry: 60 * 60 * 1000 // 1 hour for recovery codes
    },
    
    api: {
      rateLimitWindow: 15 * 60 * 1000, // 15 minutes
      rateLimitMax: 100, // requests per window
      corsOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      maxRequestSize: 10 * 1024 * 1024 // 10MB
    },
    
    data: {
      encryptionKey: process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
      saltRounds: 12,
      tokenExpiry: 60 * 60 * 1000 // 1 hour
    },
    
    env: {
      requiredSecrets: [
        'JWT_SECRET',
        'REFRESH_TOKEN_SECRET',
        'DATABASE_URL',
        'OPENAI_API_KEY',
        'POLYGON_API_KEY'
      ],
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
      debugMode: process.env.NODE_ENV === 'development'
    }
  }
}

// Global security configuration
export const SECURITY_CONFIG = initializeSecurity()

// Security validation utilities
export function validateApiKey(apiKey: string, expectedKey: string): boolean {
  if (!apiKey || !expectedKey) return false
  return crypto.timingSafeEqual(
    Buffer.from(apiKey, 'utf8'),
    Buffer.from(expectedKey, 'utf8')
  )
}

export function sanitizeApiKey(apiKey: string): string {
  return apiKey.replace(/[^a-zA-Z0-9_-]/g, '')
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

// Input validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  symbol: /^[A-Z]{1,5}$/,
  price: /^\d+(\.\d{1,2})?$/,
  quantity: /^\d+(\.\d+)?$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  safeString: /^[a-zA-Z0-9\s\-_.,!?]+$/
}

// Rate limiting storage
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const windowStart = now - SECURITY_CONFIG.api.rateLimitWindow
  const record = rateLimitStore.get(identifier)
  
  if (!record || record.resetTime < now) {
    // New window or expired
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + SECURITY_CONFIG.api.rateLimitWindow
    })
    return {
      allowed: true,
      remaining: SECURITY_CONFIG.api.rateLimitMax - 1,
      resetTime: now + SECURITY_CONFIG.api.rateLimitWindow
    }
  }
  
  if (record.count >= SECURITY_CONFIG.api.rateLimitMax) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime
    }
  }
  
  record.count++
  return {
    allowed: true,
    remaining: SECURITY_CONFIG.api.rateLimitMax - record.count,
    resetTime: record.resetTime
  }
}

// Clean up expired rate limit records
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of Array.from(rateLimitStore.entries())) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60 * 1000) // Clean up every minute

export { validateEnvironment }
