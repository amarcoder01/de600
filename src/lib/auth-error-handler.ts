import { NextResponse } from 'next/server'
import { AuthValidator } from './auth-validation'

// Enhanced error types
export enum AuthErrorCode {
  // Validation errors
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  INVALID_NAME = 'INVALID_NAME',
  MISSING_FIELDS = 'MISSING_FIELDS',
  
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  
  // Security errors
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  DEVICE_NOT_TRUSTED = 'DEVICE_NOT_TRUSTED',
  IP_BLOCKED = 'IP_BLOCKED',
  
  // Database errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// Error details interface
export interface AuthErrorDetails {
  code: AuthErrorCode
  message: string
  userMessage: string
  statusCode: number
  retryAfter?: number
  field?: string
  suggestions?: string[]
  logLevel: 'info' | 'warn' | 'error'
}

// Error mapping
const ERROR_MAP: Record<AuthErrorCode, AuthErrorDetails> = {
  [AuthErrorCode.INVALID_EMAIL]: {
    code: AuthErrorCode.INVALID_EMAIL,
    message: 'Invalid email format provided',
    userMessage: 'Please enter a valid email address',
    statusCode: 400,
    field: 'email',
    suggestions: ['Check for typos in your email address', 'Make sure to include @ and domain'],
    logLevel: 'info'
  },
  
  [AuthErrorCode.INVALID_PASSWORD]: {
    code: AuthErrorCode.INVALID_PASSWORD,
    message: 'Invalid password format',
    userMessage: 'Password does not meet security requirements',
    statusCode: 400,
    field: 'password',
    suggestions: ['Use at least 8 characters', 'Include uppercase, lowercase, numbers, and symbols'],
    logLevel: 'info'
  },
  
  [AuthErrorCode.WEAK_PASSWORD]: {
    code: AuthErrorCode.WEAK_PASSWORD,
    message: 'Password is too weak',
    userMessage: 'Please choose a stronger password',
    statusCode: 400,
    field: 'password',
    suggestions: ['Avoid common passwords like "password123"', 'Use a mix of characters', 'Consider using a passphrase'],
    logLevel: 'info'
  },
  
  [AuthErrorCode.INVALID_NAME]: {
    code: AuthErrorCode.INVALID_NAME,
    message: 'Invalid name format',
    userMessage: 'Name contains invalid characters',
    statusCode: 400,
    field: 'name',
    suggestions: ['Use only letters, spaces, hyphens, and apostrophes', 'Names must be 2-50 characters long'],
    logLevel: 'info'
  },
  
  [AuthErrorCode.MISSING_FIELDS]: {
    code: AuthErrorCode.MISSING_FIELDS,
    message: 'Required fields are missing',
    userMessage: 'Please fill in all required fields',
    statusCode: 400,
    suggestions: ['Check that all required fields are completed'],
    logLevel: 'info'
  },
  
  [AuthErrorCode.INVALID_CREDENTIALS]: {
    code: AuthErrorCode.INVALID_CREDENTIALS,
    message: 'Invalid email or password',
    userMessage: 'Email or password is incorrect',
    statusCode: 401,
    suggestions: ['Check your email and password', 'Make sure caps lock is off', 'Try resetting your password'],
    logLevel: 'warn'
  },
  
  [AuthErrorCode.ACCOUNT_LOCKED]: {
    code: AuthErrorCode.ACCOUNT_LOCKED,
    message: 'Account is temporarily locked',
    userMessage: 'Your account is temporarily locked due to too many failed attempts',
    statusCode: 423,
    retryAfter: 900, // 15 minutes
    suggestions: ['Wait 15 minutes before trying again', 'Contact support if you need immediate access'],
    logLevel: 'warn'
  },
  
  [AuthErrorCode.ACCOUNT_DISABLED]: {
    code: AuthErrorCode.ACCOUNT_DISABLED,
    message: 'Account is disabled',
    userMessage: 'Your account has been disabled',
    statusCode: 403,
    suggestions: ['Contact support to reactivate your account'],
    logLevel: 'error'
  },
  
  [AuthErrorCode.EMAIL_NOT_VERIFIED]: {
    code: AuthErrorCode.EMAIL_NOT_VERIFIED,
    message: 'Email not verified',
    userMessage: 'Please verify your email address before signing in',
    statusCode: 403,
    suggestions: ['Check your email for verification link', 'Request a new verification email'],
    logLevel: 'info'
  },
  
  [AuthErrorCode.TOKEN_EXPIRED]: {
    code: AuthErrorCode.TOKEN_EXPIRED,
    message: 'Authentication token expired',
    userMessage: 'Your session has expired. Please sign in again',
    statusCode: 401,
    suggestions: ['Sign in again to continue'],
    logLevel: 'info'
  },
  
  [AuthErrorCode.TOKEN_INVALID]: {
    code: AuthErrorCode.TOKEN_INVALID,
    message: 'Invalid authentication token',
    userMessage: 'Invalid session. Please sign in again',
    statusCode: 401,
    suggestions: ['Clear your browser cookies and sign in again'],
    logLevel: 'warn'
  },
  
  [AuthErrorCode.SESSION_EXPIRED]: {
    code: AuthErrorCode.SESSION_EXPIRED,
    message: 'User session expired',
    userMessage: 'Your session has expired. Please sign in again',
    statusCode: 401,
    suggestions: ['Sign in again to continue'],
    logLevel: 'info'
  },
  
  [AuthErrorCode.RATE_LIMIT_EXCEEDED]: {
    code: AuthErrorCode.RATE_LIMIT_EXCEEDED,
    message: 'Rate limit exceeded',
    userMessage: 'Too many requests. Please wait before trying again',
    statusCode: 429,
    retryAfter: 60,
    suggestions: ['Wait a moment before trying again', 'Contact support if this persists'],
    logLevel: 'warn'
  },
  
  [AuthErrorCode.TOO_MANY_ATTEMPTS]: {
    code: AuthErrorCode.TOO_MANY_ATTEMPTS,
    message: 'Too many failed login attempts',
    userMessage: 'Too many failed attempts. Please wait before trying again',
    statusCode: 429,
    retryAfter: 300, // 5 minutes
    suggestions: ['Wait 5 minutes before trying again', 'Consider resetting your password'],
    logLevel: 'warn'
  },
  
  [AuthErrorCode.SUSPICIOUS_ACTIVITY]: {
    code: AuthErrorCode.SUSPICIOUS_ACTIVITY,
    message: 'Suspicious activity detected',
    userMessage: 'Suspicious activity detected. Please verify your identity',
    statusCode: 403,
    suggestions: ['Complete additional verification steps', 'Contact support if this is incorrect'],
    logLevel: 'error'
  },
  
  [AuthErrorCode.DEVICE_NOT_TRUSTED]: {
    code: AuthErrorCode.DEVICE_NOT_TRUSTED,
    message: 'Device not trusted',
    userMessage: 'This device is not recognized. Please complete additional verification',
    statusCode: 403,
    suggestions: ['Complete device verification', 'Check your email for verification codes'],
    logLevel: 'warn'
  },
  
  [AuthErrorCode.IP_BLOCKED]: {
    code: AuthErrorCode.IP_BLOCKED,
    message: 'IP address is blocked',
    userMessage: 'Access denied from this location',
    statusCode: 403,
    suggestions: ['Try accessing from a different network', 'Contact support for assistance'],
    logLevel: 'error'
  },
  
  [AuthErrorCode.USER_NOT_FOUND]: {
    code: AuthErrorCode.USER_NOT_FOUND,
    message: 'User not found',
    userMessage: 'Account not found',
    statusCode: 404,
    suggestions: ['Check your email address', 'Create a new account if needed'],
    logLevel: 'info'
  },
  
  [AuthErrorCode.USER_ALREADY_EXISTS]: {
    code: AuthErrorCode.USER_ALREADY_EXISTS,
    message: 'User already exists',
    userMessage: 'An account with this email already exists',
    statusCode: 409,
    suggestions: ['Try signing in instead', 'Use a different email address', 'Reset your password'],
    logLevel: 'info'
  },
  
  [AuthErrorCode.DATABASE_ERROR]: {
    code: AuthErrorCode.DATABASE_ERROR,
    message: 'Database operation failed',
    userMessage: 'Unable to process your request. Please try again',
    statusCode: 500,
    suggestions: ['Try again in a few moments', 'Contact support if the problem persists'],
    logLevel: 'error'
  },
  
  [AuthErrorCode.NETWORK_ERROR]: {
    code: AuthErrorCode.NETWORK_ERROR,
    message: 'Network connection error',
    userMessage: 'Connection error. Please check your internet connection',
    statusCode: 503,
    suggestions: ['Check your internet connection', 'Try again in a few moments'],
    logLevel: 'warn'
  },
  
  [AuthErrorCode.SERVICE_UNAVAILABLE]: {
    code: AuthErrorCode.SERVICE_UNAVAILABLE,
    message: 'Service temporarily unavailable',
    userMessage: 'Service is temporarily unavailable. Please try again later',
    statusCode: 503,
    retryAfter: 300,
    suggestions: ['Try again in a few minutes', 'Check our status page for updates'],
    logLevel: 'warn'
  },
  
  [AuthErrorCode.UNKNOWN_ERROR]: {
    code: AuthErrorCode.UNKNOWN_ERROR,
    message: 'Unknown error occurred',
    userMessage: 'An unexpected error occurred. Please try again',
    statusCode: 500,
    suggestions: ['Try again', 'Contact support if the problem persists'],
    logLevel: 'error'
  },
  
  [AuthErrorCode.INTERNAL_ERROR]: {
    code: AuthErrorCode.INTERNAL_ERROR,
    message: 'Internal server error',
    userMessage: 'Something went wrong on our end. Please try again',
    statusCode: 500,
    suggestions: ['Try again in a few moments', 'Contact support if the problem persists'],
    logLevel: 'error'
  }
}

// Enhanced error handler class
export class AuthErrorHandler {
  // Create error response
  static createErrorResponse(errorCode: AuthErrorCode, additionalData?: any): NextResponse {
    const errorDetails = ERROR_MAP[errorCode]
    const responseData = {
      success: false,
      error: {
        code: errorDetails.code,
        message: errorDetails.userMessage,
        suggestions: errorDetails.suggestions,
        ...additionalData
      }
    }

    const response = NextResponse.json(responseData, { status: errorDetails.statusCode })

    // Add retry-after header if specified
    if (errorDetails.retryAfter) {
      response.headers.set('Retry-After', errorDetails.retryAfter.toString())
    }

    // Add rate limit headers
    if (errorCode === AuthErrorCode.RATE_LIMIT_EXCEEDED || errorCode === AuthErrorCode.TOO_MANY_ATTEMPTS) {
      response.headers.set('X-RateLimit-Limit', '5')
      response.headers.set('X-RateLimit-Remaining', '0')
      response.headers.set('X-RateLimit-Reset', (Date.now() + (errorDetails.retryAfter || 60) * 1000).toString())
    }

    return response
  }

  // Handle validation errors
  static handleValidationError(validationResult: any): NextResponse {
    if (validationResult.errors) {
      const firstError = Object.entries(validationResult.errors)[0]
      const field = firstError[0]
      const message = (firstError[1] as string[])[0]

      let errorCode = AuthErrorCode.MISSING_FIELDS
      if (field === 'email') errorCode = AuthErrorCode.INVALID_EMAIL
      else if (field === 'password') errorCode = AuthErrorCode.INVALID_PASSWORD
      else if (field === 'firstName' || field === 'lastName') errorCode = AuthErrorCode.INVALID_NAME

      return this.createErrorResponse(errorCode, {
        field,
        validationErrors: validationResult.errors
      })
    }

    return this.createErrorResponse(AuthErrorCode.MISSING_FIELDS, {
      message: validationResult.message
    })
  }

  // Handle authentication errors
  static handleAuthError(error: any): NextResponse {
    // Handle known error types
    if (error?.type) {
      switch (error.type) {
        case 'INVALID_CREDENTIALS':
          return this.createErrorResponse(AuthErrorCode.INVALID_CREDENTIALS)
        case 'ACCOUNT_LOCKED':
          return this.createErrorResponse(AuthErrorCode.ACCOUNT_LOCKED, {
            retryAfter: error.retryAfter
          })
        case 'ACCOUNT_DISABLED':
          return this.createErrorResponse(AuthErrorCode.ACCOUNT_DISABLED)
        case 'EMAIL_NOT_VERIFIED':
          return this.createErrorResponse(AuthErrorCode.EMAIL_NOT_VERIFIED)
        case 'RATE_LIMIT_EXCEEDED':
          return this.createErrorResponse(AuthErrorCode.RATE_LIMIT_EXCEEDED, {
            retryAfter: error.retryAfter
          })
        case 'TOKEN_EXPIRED':
          return this.createErrorResponse(AuthErrorCode.TOKEN_EXPIRED)
        case 'TOKEN_INVALID':
          return this.createErrorResponse(AuthErrorCode.TOKEN_INVALID)
        case 'SUSPICIOUS_ACTIVITY':
          return this.createErrorResponse(AuthErrorCode.SUSPICIOUS_ACTIVITY)
        case 'DEVICE_NOT_TRUSTED':
          return this.createErrorResponse(AuthErrorCode.DEVICE_NOT_TRUSTED)
      }
    }

    // Handle database errors
    if (error?.code === 'P2002') {
      return this.createErrorResponse(AuthErrorCode.USER_ALREADY_EXISTS)
    }
    if (error?.code === 'P2025') {
      return this.createErrorResponse(AuthErrorCode.USER_NOT_FOUND)
    }

    // Handle network errors
    if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      return this.createErrorResponse(AuthErrorCode.NETWORK_ERROR)
    }

    // Handle unknown errors
    console.error('Unhandled auth error:', error)
    return this.createErrorResponse(AuthErrorCode.UNKNOWN_ERROR)
  }

  // Log error with appropriate level
  static logError(errorCode: AuthErrorCode, error: any, context?: any): void {
    const errorDetails = ERROR_MAP[errorCode]
    const logData = {
      errorCode,
      message: errorDetails.message,
      userMessage: errorDetails.userMessage,
      statusCode: errorDetails.statusCode,
      timestamp: new Date().toISOString(),
      context,
      originalError: error?.message || error
    }

    switch (errorDetails.logLevel) {
      case 'info':
        console.info('🔍 Auth Info:', logData)
        break
      case 'warn':
        console.warn('⚠️ Auth Warning:', logData)
        break
      case 'error':
        console.error('❌ Auth Error:', logData)
        break
    }
  }

  // Create success response
  static createSuccessResponse(data: any, statusCode: number = 200): NextResponse {
    return NextResponse.json({
      success: true,
      data
    }, { status: statusCode })
  }

  // Validate and sanitize input
  static validateAndSanitizeInput(input: any, type: 'login' | 'register' | 'password-change'): any {
    try {
      switch (type) {
        case 'login':
          return AuthValidator.validateLogin(input)
        case 'register':
          return AuthValidator.validateRegistration(input)
        case 'password-change':
          return AuthValidator.validatePasswordChange(input)
        default:
          throw new Error('Invalid validation type')
      }
    } catch (error) {
      return { success: false, message: 'Input validation failed' }
    }
  }

  // Handle rate limiting
  static handleRateLimit(attempts: number, lastAttemptTime: Date): NextResponse | null {
    const rateLimitResult = AuthValidator.validateRateLimit(attempts, lastAttemptTime)
    
    if (!rateLimitResult.isAllowed) {
      return this.createErrorResponse(AuthErrorCode.TOO_MANY_ATTEMPTS, {
        retryAfter: rateLimitResult.retryAfter,
        lockoutTime: rateLimitResult.lockoutTime
      })
    }
    
    return null
  }

  // Create comprehensive error response with debugging info (development only)
  static createDebugErrorResponse(errorCode: AuthErrorCode, error: any, context?: any): NextResponse {
    const errorDetails = ERROR_MAP[errorCode]
    const responseData = {
      success: false,
      error: {
        code: errorDetails.code,
        message: errorDetails.userMessage,
        suggestions: errorDetails.suggestions,
        debug: process.env.NODE_ENV === 'development' ? {
          originalError: error?.message || error,
          stack: error?.stack,
          context
        } : undefined
      }
    }

    return NextResponse.json(responseData, { status: errorDetails.statusCode })
  }
}

// Export error codes and handler
export { ERROR_MAP }
