/**
 * API Security Middleware and Utilities
 * Comprehensive security measures for API endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { SECURITY_CONFIG, checkRateLimit, validateApiKey } from './security-config'
import { sanitizeInput, validateRequestBody, VALIDATION_SCHEMAS } from './input-validator'
import crypto from 'crypto'
import { verifyToken } from './auth-security'

export interface SecurityHeaders {
  'X-Content-Type-Options': string
  'X-Frame-Options': string
  'X-XSS-Protection': string
  'Strict-Transport-Security': string
  'Referrer-Policy': string
  'Content-Security-Policy': string
  'Permissions-Policy': string
}

export interface SecurityContext {
  requestId: string
  timestamp: number
  ipAddress: string
  userAgent: string
  rateLimitRemaining: number
  rateLimitReset: number
  isAuthenticated: boolean
  userId?: string
}

/**
 * Generate security headers
 */
export function getSecurityHeaders(): SecurityHeaders {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  }
}

/**
 * Apply CORS headers to the response if the origin is allowed
 */
function applyCorsHeaders(response: NextResponse, request: NextRequest): void {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const requestOrigin = origin || (referer ? new URL(referer).origin : null)

  if (!requestOrigin) return

  if (
    SECURITY_CONFIG.api.corsOrigins.includes('*') ||
    SECURITY_CONFIG.api.corsOrigins.includes(requestOrigin)
  ) {
    response.headers.set('Access-Control-Allow-Origin', requestOrigin)
    response.headers.set('Vary', 'Origin')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, x-api-key'
    )
    response.headers.set(
      'Access-Control-Allow-Methods',
      (SECURITY_CONFIG.api.allowedMethods.join(',') + ',OPTIONS')
    )
  }
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  const headers = getSecurityHeaders()
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // Remove server information
  response.headers.delete('X-Powered-By')
  response.headers.delete('Server')
  
  return response
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(identifier: string) {
  const rateLimit = checkRateLimit(identifier)
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': SECURITY_CONFIG.api.rateLimitMax.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetTime.toString()
        }
      }
    )
  }
  
  return {
    allowed: true,
    headers: {
      'X-RateLimit-Limit': SECURITY_CONFIG.api.rateLimitMax.toString(),
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': rateLimit.resetTime.toString()
    }
  }
}

/**
 * CORS security middleware
 */
export function validateCORS(request: NextRequest): { allowed: boolean; error?: string } {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  // Allow requests without origin (e.g., Postman, curl)
  if (!origin && !referer) {
    return { allowed: true }
  }
  
  const requestOrigin = origin || new URL(referer!).origin
  
  if (SECURITY_CONFIG.api.corsOrigins.includes('*')) {
    return { allowed: true }
  }
  
  if (!SECURITY_CONFIG.api.corsOrigins.includes(requestOrigin)) {
    console.error('🚫 CORS violation:', { requestOrigin, allowedOrigins: SECURITY_CONFIG.api.corsOrigins })
    return { allowed: false, error: 'CORS policy violation' }
  }
  
  return { allowed: true }
}

/**
 * Request size validation
 */
export function validateRequestSize(request: NextRequest): { allowed: boolean; error?: string } {
  const contentLength = request.headers.get('content-length')
  
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    if (size > SECURITY_CONFIG.api.maxRequestSize) {
      return {
        allowed: false,
        error: `Request too large. Maximum size: ${SECURITY_CONFIG.api.maxRequestSize} bytes`
      }
    }
  }
  
  return { allowed: true }
}

/**
 * Method validation
 */
export function validateMethod(request: NextRequest, allowedMethods: string[] = SECURITY_CONFIG.api.allowedMethods): { allowed: boolean; error?: string } {
  const method = request.method
  
  // Always allow OPTIONS for CORS preflight
  if (method === 'OPTIONS') {
    return { allowed: true }
  }

  if (!allowedMethods.includes(method)) {
    return {
      allowed: false,
      error: `Method ${method} not allowed`
    }
  }
  
  return { allowed: true }
}

/**
 * Generate request ID for tracking
 */
export function generateRequestId(): string {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Extract client information
 */
export function extractClientInfo(request: NextRequest): {
  ipAddress: string
  userAgent: string
  requestId: string
} {
  const ipAddress = request.ip || 
                   request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
  
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const requestId = generateRequestId()
  
  return { ipAddress, userAgent, requestId }
}

/**
 * Comprehensive security middleware
 */
export function withSecurity<T extends any[]>(
  handler: (request: NextRequest, context: SecurityContext, ...args: T) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean
    rateLimit?: boolean
    validateInput?: boolean
    inputSchema?: Record<string, any>
    allowedMethods?: string[]
  } = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now()
    
    try {
      // Extract client information
      const { ipAddress, userAgent, requestId } = extractClientInfo(request)
      
      // Validate CORS
      const corsValidation = validateCORS(request)
      if (!corsValidation.allowed) {
        const resp = NextResponse.json(
          { success: false, error: corsValidation.error },
          { status: 403 }
        )
        applyCorsHeaders(resp, request)
        return resp
      }
      
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        const preflight = new NextResponse(null, { status: 204 })
        applyCorsHeaders(preflight, request)
        return preflight
      }

      // Validate method
      const methodValidation = validateMethod(request, options.allowedMethods)
      if (!methodValidation.allowed) {
        const resp = NextResponse.json(
          { success: false, error: methodValidation.error },
          { status: 405 }
        )
        applyCorsHeaders(resp, request)
        return resp
      }
      
      // Validate request size
      const sizeValidation = validateRequestSize(request)
      if (!sizeValidation.allowed) {
        const resp = NextResponse.json(
          { success: false, error: sizeValidation.error },
          { status: 413 }
        )
        applyCorsHeaders(resp, request)
        return resp
      }
      
      // Rate limiting
      let rateLimitHeaders = {}
      if (options.rateLimit !== false) {
        const rateLimitResult = withRateLimit(`${ipAddress}:${userAgent}`)
        if (rateLimitResult instanceof NextResponse) {
          applyCorsHeaders(rateLimitResult, request)
          return rateLimitResult
        }
        rateLimitHeaders = rateLimitResult.headers
      }
      
      // Input validation
      let sanitizedBody: any = null
      if (options.validateInput && request.method !== 'GET' && options.inputSchema) {
        try {
          const body = await request.json()
          const validation = validateRequestBody(body, options.inputSchema)
          
          if (!validation.isValid) {
            const resp = NextResponse.json(
              {
                success: false,
                error: 'Invalid input',
                details: validation.errors
              },
              { status: 400 }
            )
            applyCorsHeaders(resp, request)
            return resp
          }
          
          sanitizedBody = validation.sanitizedValue
        } catch (error) {
          const resp = NextResponse.json(
            { success: false, error: 'Invalid JSON in request body' },
            { status: 400 }
          )
          applyCorsHeaders(resp, request)
          return resp
        }
      }
      
      // Authentication check
      let isAuthenticated = false
      let userId: string | undefined
      
      if (options.requireAuth) {
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '') || request.cookies.get('token')?.value
        
        if (token) {
          try {
            // Proper JWT verification using shared auth-security
            const decoded: any = verifyToken(token)
            if (decoded?.userId) {
              isAuthenticated = true
              userId = decoded.userId
            }
          } catch (error) {
            // Token validation failed
          }
        }
        
        if (!isAuthenticated) {
          const resp = NextResponse.json(
            { success: false, error: 'Authentication required' },
            { status: 401 }
          )
          applyCorsHeaders(resp, request)
          return resp
        }
      }
      
      // Create security context
      const securityContext: SecurityContext = {
        requestId,
        timestamp: startTime,
        ipAddress,
        userAgent,
        rateLimitRemaining: 0,
        rateLimitReset: Date.now() + SECURITY_CONFIG.api.rateLimitWindow,
        isAuthenticated,
        userId
      }
      
      // Update rate limit remaining
      if (options.rateLimit !== false) {
        const rateLimit = checkRateLimit(`${ipAddress}:${userAgent}`)
        securityContext.rateLimitRemaining = rateLimit.remaining
        securityContext.rateLimitReset = rateLimit.resetTime
      }
      
      // Execute handler with sanitized request
      const modifiedRequest = new NextRequest(request.url, {
        method: request.method,
        headers: request.headers,
        body: sanitizedBody ? JSON.stringify(sanitizedBody) : request.body
      })
      
      const response = await handler(modifiedRequest, securityContext, ...args)
      
      // Apply security headers
      const securedResponse = applySecurityHeaders(response)
      applyCorsHeaders(securedResponse, request)
      
      // Add rate limit headers
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        securedResponse.headers.set(key, value as string)
      })
      
      // Add security context headers
      securedResponse.headers.set('X-Request-ID', requestId)
      securedResponse.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)
      
      // Log security event
      logSecurityEvent({
        requestId,
        timestamp: startTime,
        method: request.method,
        url: request.url,
        ipAddress,
        userAgent,
        userId,
        status: response.status,
        responseTime: Date.now() - startTime
      })
      
      return securedResponse
      
    } catch (error) {
      console.error('🚨 Security middleware error:', error)
      
      const errorResponse = NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
      
      const secured = applySecurityHeaders(errorResponse)
      applyCorsHeaders(secured, request)
      return secured
    }
  }
}

/**
 * API key validation middleware
 */
export function withApiKeyValidation(apiKeyHeader: string = 'x-api-key') {
  return function<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const apiKey = request.headers.get(apiKeyHeader)
      
      if (!apiKey) {
        return NextResponse.json(
          { success: false, error: 'API key required' },
          { status: 401 }
        )
      }
      
      // Validate against configured API keys
      const validKeys = [
        process.env.INTERNAL_API_KEY,
        process.env.PARTNER_API_KEY
      ].filter(Boolean)
      
      const isValid = validKeys.some(key => validateApiKey(apiKey, key!))
      
      if (!isValid) {
        console.error('🚫 Invalid API key attempt:', { apiKey: apiKey.substring(0, 8) + '...' })
        return NextResponse.json(
          { success: false, error: 'Invalid API key' },
          { status: 401 }
        )
      }
      
      return handler(request, ...args)
    }
  }
}

/**
 * Log security events
 */
export async function logSecurityEvent(event: {
  requestId: string
  timestamp: number
  method: string
  url: string
  ipAddress: string
  userAgent: string
  userId?: string
  status: number
  responseTime: number
}): Promise<void> {
  try {
    // In production, send to security monitoring service
    console.log('🔒 Security Event:', {
      ...event,
      severity: event.status >= 400 ? 'warning' : 'info'
    })
    
    // TODO: Send to security monitoring service (e.g., Sentry, DataDog, etc.)
    
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

/**
 * Detect suspicious activity
 */
export async function detectSuspiciousActivity(request: NextRequest): Promise<{
  suspicious: boolean
  reasons: string[]
  riskScore: number
}> {
  const reasons: string[] = []
  let riskScore = 0
  
  const userAgent = request.headers.get('user-agent') || ''
  const ipAddress = request.ip || 'unknown'
  
  // Check for suspicious user agents
  const suspiciousUserAgents = [
    'sqlmap', 'nikto', 'nmap', 'masscan', 'zap', 'burp',
    'scanner', 'bot', 'crawler', 'spider'
  ]
  
  if (suspiciousUserAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
    reasons.push('Suspicious user agent')
    riskScore += 30
  }
  
  // Check for SQL injection patterns in URL
  const url = request.url.toLowerCase()
  const sqlPatterns = [
    'union select', 'drop table', 'delete from', 'insert into',
    'update set', 'exec(', 'sp_', 'xp_', 'information_schema'
  ]
  
  if (sqlPatterns.some(pattern => url.includes(pattern))) {
    reasons.push('Potential SQL injection attempt')
    riskScore += 50
  }
  
  // Check for XSS patterns
  const xssPatterns = [
    '<script', 'javascript:', 'onload=', 'onerror=', 'onclick=',
    'alert(', 'document.cookie', 'window.location'
  ]
  
  if (xssPatterns.some(pattern => url.includes(pattern))) {
    reasons.push('Potential XSS attempt')
    riskScore += 40
  }
  
  // Check for path traversal
  if (url.includes('../') || url.includes('..\\')) {
    reasons.push('Potential path traversal attempt')
    riskScore += 35
  }
  
  // Check for excessive query parameters
  const queryParams = new URL(request.url).searchParams
  if (queryParams.size > 20) {
    reasons.push('Excessive query parameters')
    riskScore += 15
  }
  
  return {
    suspicious: reasons.length > 0,
    reasons,
    riskScore
  }
}

/**
 * Security monitoring middleware
 */
export function withSecurityMonitoring<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    // Detect suspicious activity
    const suspiciousCheck = await detectSuspiciousActivity(request)
    
    if (suspiciousCheck.suspicious) {
      console.warn('🚨 Suspicious activity detected:', {
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
        url: request.url,
        reasons: suspiciousCheck.reasons,
        riskScore: suspiciousCheck.riskScore
      })
      
      // Block high-risk requests
      if (suspiciousCheck.riskScore >= 70) {
        return NextResponse.json(
          { success: false, error: 'Request blocked due to security policy' },
          { status: 403 }
        )
      }
    }
    
    return handler(request, ...args)
  }
}

// Export commonly used security decorators
export const securityDecorators = {
  withSecurity,
  withApiKeyValidation,
  withSecurityMonitoring,
  withRateLimit
}
