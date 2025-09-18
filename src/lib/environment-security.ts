/**
 * Environment Security Validator
 * Validates and secures environment variables and configuration
 */

import crypto from 'crypto'

export interface EnvironmentValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  missing: string[]
}

/**
 * Validate environment variables for security
 */
export function validateEnvironmentSecurity(): EnvironmentValidation {
  const errors: string[] = []
  const warnings: string[] = []
  const missing: string[] = []
  
  // Required secrets that must be set
  const requiredSecrets = [
    'JWT_SECRET',
    'REFRESH_TOKEN_SECRET',
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'POLYGON_API_KEY'
  ]
  
  // Check for missing required secrets
  for (const secret of requiredSecrets) {
    const value = process.env[secret]
    if (!value) {
      missing.push(secret)
      errors.push(`Required environment variable ${secret} is not set`)
    }
  }
  
  // Validate JWT secret strength
  const jwtSecret = process.env.JWT_SECRET
  if (jwtSecret) {
    if (jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long for security')
    }
    
    if (jwtSecret.includes('your-') || jwtSecret.includes('change-this') || jwtSecret.includes('default')) {
      errors.push('JWT_SECRET contains default/placeholder values - this is a security risk')
    }
    
    if (!/^[a-zA-Z0-9+/=]+$/.test(jwtSecret)) {
      warnings.push('JWT_SECRET should only contain alphanumeric characters and base64 symbols')
    }
  }
  
  // Validate refresh token secret
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET
  if (refreshSecret) {
    if (refreshSecret === jwtSecret) {
      errors.push('REFRESH_TOKEN_SECRET should be different from JWT_SECRET')
    }
    
    if (refreshSecret.length < 32) {
      errors.push('REFRESH_TOKEN_SECRET must be at least 32 characters long')
    }
  }
  
  // Validate database URL
  const dbUrl = process.env.DATABASE_URL
  if (dbUrl) {
    if (dbUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
      warnings.push('DATABASE_URL points to localhost in production - this may be incorrect')
    }
    
    if (!dbUrl.includes('ssl') && process.env.NODE_ENV === 'production') {
      warnings.push('DATABASE_URL should use SSL in production')
    }
  }
  
  // Validate API keys
  const apiKeys = [
    'OPENAI_API_KEY',
    'POLYGON_API_KEY',
    'CHARTIMG_API_KEY',
    'GOOGLE_SEARCH_API_KEY'
  ]
  
  for (const key of apiKeys) {
    const value = process.env[key]
    if (value) {
      // Check for placeholder values
      if (value.includes('your_') || value.includes('api_key_here') || value.includes('replace_me')) {
        errors.push(`${key} contains placeholder values - this is a security risk`)
      }
      
      // Check for reasonable length
      if (value.length < 10) {
        warnings.push(`${key} seems unusually short for an API key`)
      }
    }
  }
  
  // Validate CORS origins
  const corsOrigins = process.env.ALLOWED_ORIGINS
  if (corsOrigins) {
    if (corsOrigins.includes('*') && process.env.NODE_ENV === 'production') {
      warnings.push('ALLOWED_ORIGINS contains wildcard (*) in production - this may be too permissive')
    }
  } else if (process.env.NODE_ENV === 'production') {
    warnings.push('ALLOWED_ORIGINS not set - CORS may be too restrictive or permissive')
  }
  
  // Check for development secrets in production
  if (process.env.NODE_ENV === 'production') {
    const devSecrets = ['NODE_ENV', 'NEXT_PUBLIC_DEBUG']
    for (const secret of devSecrets) {
      if (process.env[secret] === 'development') {
        warnings.push(`${secret} is set to development in production environment`)
      }
    }
  }
  
  // Validate encryption key if set
  const encryptionKey = process.env.ENCRYPTION_KEY
  if (encryptionKey) {
    if (encryptionKey.length < 32) {
      errors.push('ENCRYPTION_KEY must be at least 32 characters long')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missing
  }
}

/**
 * Generate secure environment variables
 */
export function generateSecureEnvironment(): Record<string, string> {
  return {
    JWT_SECRET: crypto.randomBytes(64).toString('base64'),
    REFRESH_TOKEN_SECRET: crypto.randomBytes(64).toString('base64'),
    ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
    API_SECRET: crypto.randomBytes(32).toString('hex')
  }
}

/**
 * Sanitize environment variables for logging
 */
export function sanitizeEnvForLogging(env: Record<string, string | undefined>): Record<string, string> {
  const sensitiveKeys = [
    'PASSWORD',
    'SECRET',
    'KEY',
    'TOKEN',
    'URL',
    'DATABASE',
    'API'
  ]
  
  const sanitized: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(env)) {
    if (!value) continue
    
    const isSensitive = sensitiveKeys.some(sensitive => 
      key.toUpperCase().includes(sensitive.toUpperCase())
    )
    
    if (isSensitive) {
      // Show first 4 and last 4 characters for debugging
      if (value.length > 8) {
        sanitized[key] = `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
      } else {
        sanitized[key] = '[REDACTED]'
      }
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

/**
 * Validate API key format
 */
export function validateApiKeyFormat(apiKey: string, keyType: string): { isValid: boolean; error?: string } {
  if (!apiKey) {
    return { isValid: false, error: `${keyType} API key is required` }
  }
  
  if (apiKey.length < 10) {
    return { isValid: false, error: `${keyType} API key is too short` }
  }
  
  if (apiKey.length > 200) {
    return { isValid: false, error: `${keyType} API key is too long` }
  }
  
  // Check for common placeholder patterns
  const placeholderPatterns = [
    /your_.*_key/i,
    /api_key_here/i,
    /replace_me/i,
    /change_this/i,
    /placeholder/i,
    /example/i
  ]
  
  for (const pattern of placeholderPatterns) {
    if (pattern.test(apiKey)) {
      return { isValid: false, error: `${keyType} API key appears to be a placeholder` }
    }
  }
  
  return { isValid: true }
}

/**
 * Check for environment variable leaks
 */
export function checkForEnvironmentLeaks(): { hasLeaks: boolean; leaks: string[] } {
  const leaks: string[] = []
  
  // Check for secrets in public environment variables
  const publicEnvVars = Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_'))
  const sensitivePatterns = [
    /secret/i,
    /password/i,
    /key/i,
    /token/i,
    /database/i
  ]
  
  for (const envVar of publicEnvVars) {
    for (const pattern of sensitivePatterns) {
      if (pattern.test(envVar)) {
        leaks.push(`${envVar} - sensitive data in public environment variable`)
      }
    }
  }
  
  // Check for secrets in URLs or other public strings
  const publicValues = Object.values(process.env).filter(value => 
    value && typeof value === 'string' && value.includes('://')
  )
  
  for (const value of publicValues) {
    if (value && value.includes('://') && (value.includes('password=') || value.includes('secret='))) {
      leaks.push('Database URL or similar contains exposed credentials')
    }
  }
  
  return {
    hasLeaks: leaks.length > 0,
    leaks
  }
}

/**
 * Get environment security report
 */
export function getEnvironmentSecurityReport(): {
  validation: EnvironmentValidation
  leaks: { hasLeaks: boolean; leaks: string[] }
  recommendations: string[]
} {
  const validation = validateEnvironmentSecurity()
  const leaks = checkForEnvironmentLeaks()
  const recommendations: string[] = []
  
  // Generate recommendations based on findings
  if (validation.missing.length > 0) {
    recommendations.push('Set all required environment variables before deployment')
  }
  
  if (validation.errors.length > 0) {
    recommendations.push('Fix all security errors in environment configuration')
  }
  
  if (validation.warnings.length > 0) {
    recommendations.push('Review and address environment security warnings')
  }
  
  if (leaks.hasLeaks) {
    recommendations.push('Remove sensitive data from public environment variables')
  }
  
  if (process.env.NODE_ENV === 'production') {
    recommendations.push('Ensure all production secrets are properly secured and rotated regularly')
    recommendations.push('Use a secrets management service for production deployments')
    recommendations.push('Enable environment variable encryption at rest')
  }
  
  return {
    validation,
    leaks,
    recommendations
  }
}

/**
 * Initialize environment security
 */
export function initializeEnvironmentSecurity(): void {
  const report = getEnvironmentSecurityReport()
  
  console.log('🔒 Environment Security Report:')
  console.log(`   Status: ${report.validation.isValid ? '✅ Secure' : '❌ Issues Found'}`)
  
  if (report.validation.errors.length > 0) {
    console.log('   Errors:')
    report.validation.errors.forEach(error => console.log(`     ❌ ${error}`))
  }
  
  if (report.validation.warnings.length > 0) {
    console.log('   Warnings:')
    report.validation.warnings.forEach(warning => console.log(`     ⚠️  ${warning}`))
  }
  
  if (report.leaks.hasLeaks) {
    console.log('   Leaks:')
    report.leaks.leaks.forEach(leak => console.log(`     🚨 ${leak}`))
  }
  
  if (report.recommendations.length > 0) {
    console.log('   Recommendations:')
    report.recommendations.forEach(rec => console.log(`     💡 ${rec}`))
  }
  
  // Throw error if critical security issues found
  if (!report.validation.isValid) {
    throw new Error('Critical environment security issues found. Please fix before proceeding.')
  }
}

