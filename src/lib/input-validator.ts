/**
 * Comprehensive Input Validation and Sanitization
 * Protects against injection attacks, XSS, and data corruption
 */

import { VALIDATION_PATTERNS } from './security-config'
import DOMPurify from 'isomorphic-dompurify'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedValue?: any
}

export interface ValidationOptions {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  customValidator?: (value: any) => boolean
  sanitize?: boolean
  allowHtml?: boolean
}

/**
 * Comprehensive input sanitization
 */
export function sanitizeInput(input: any, options: ValidationOptions = {}): any {
  if (input === null || input === undefined) {
    return input
  }

  if (typeof input === 'string') {
    let sanitized = input.trim()
    
    // Remove potential XSS vectors
    if (!options.allowHtml) {
      sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] })
    }
    
    // Remove control characters except newlines and tabs
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    
    // Limit length if specified
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength)
    }
    
    return sanitized
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item, options))
  }

  if (typeof input === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      // Sanitize object keys
      const sanitizedKey = sanitizeInput(key, { ...options, maxLength: 50 })
      sanitized[sanitizedKey] = sanitizeInput(value, options)
    }
    return sanitized
  }

  return input
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = []
  
  if (!email) {
    errors.push('Email is required')
    return { isValid: false, errors }
  }

  const sanitized = sanitizeInput(email)
  
  if (!VALIDATION_PATTERNS.email.test(sanitized)) {
    errors.push('Invalid email format')
  }
  
  if (sanitized.length > 254) {
    errors.push('Email is too long')
  }
  
  // Check for disposable email domains
  const disposableDomains = [
    'tempmail.com', '10minutemail.com', 'guerrillamail.com',
    'mailinator.com', 'throwaway.email', 'temp-mail.org'
  ]
  const domain = sanitized.split('@')[1]?.toLowerCase()
  if (domain && disposableDomains.includes(domain)) {
    errors.push('Disposable email addresses are not allowed')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = []
  
  if (!password) {
    errors.push('Password is required')
    return { isValid: false, errors }
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (password.length > 128) {
    errors.push('Password is too long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  // Check for common patterns
  if (/(.)\1{3,}/.test(password)) {
    errors.push('Password cannot contain more than 3 repeated characters')
  }
  
  // Check for common passwords
  const commonPasswords = [
    'password', '123456', 'qwerty', 'admin', 'letmein',
    'password123', 'admin123', 'qwerty123', 'welcome123'
  ]
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a more unique password')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: password
  }
}

/**
 * Validate stock symbol
 */
export function validateSymbol(symbol: string): ValidationResult {
  const errors: string[] = []
  
  if (!symbol) {
    errors.push('Symbol is required')
    return { isValid: false, errors }
  }

  const sanitized = sanitizeInput(symbol.toUpperCase())
  
  if (!VALIDATION_PATTERNS.symbol.test(sanitized)) {
    errors.push('Invalid symbol format. Must be 1-5 uppercase letters')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized
  }
}

/**
 * Validate price
 */
export function validatePrice(price: number | string): ValidationResult {
  const errors: string[] = []
  
  if (price === null || price === undefined || price === '') {
    errors.push('Price is required')
    return { isValid: false, errors }
  }

  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  
  if (isNaN(numPrice)) {
    errors.push('Price must be a valid number')
    return { isValid: false, errors }
  }
  
  if (numPrice < 0) {
    errors.push('Price cannot be negative')
  }
  
  if (numPrice > 1000000) {
    errors.push('Price is too high')
  }
  
  // Check decimal places
  if (numPrice.toString().includes('.') && numPrice.toString().split('.')[1].length > 2) {
    errors.push('Price cannot have more than 2 decimal places')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: Math.round(numPrice * 100) / 100
  }
}

/**
 * Validate quantity
 */
export function validateQuantity(quantity: number | string): ValidationResult {
  const errors: string[] = []
  
  if (quantity === null || quantity === undefined || quantity === '') {
    errors.push('Quantity is required')
    return { isValid: false, errors }
  }

  const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity
  
  if (isNaN(numQuantity)) {
    errors.push('Quantity must be a valid number')
    return { isValid: false, errors }
  }
  
  if (numQuantity <= 0) {
    errors.push('Quantity must be greater than 0')
  }
  
  if (numQuantity > 1000000) {
    errors.push('Quantity is too high')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: numQuantity
  }
}

/**
 * Validate UUID
 */
export function validateUUID(uuid: string): ValidationResult {
  const errors: string[] = []
  
  if (!uuid) {
    errors.push('UUID is required')
    return { isValid: false, errors }
  }

  const sanitized = sanitizeInput(uuid)
  
  if (!VALIDATION_PATTERNS.uuid.test(sanitized)) {
    errors.push('Invalid UUID format')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized
  }
}

/**
 * Validate name fields
 */
export function validateName(name: string, fieldName: string): ValidationResult {
  const errors: string[] = []
  
  if (!name) {
    errors.push(`${fieldName} is required`)
    return { isValid: false, errors }
  }

  const sanitized = sanitizeInput(name)
  
  if (sanitized.length < 2) {
    errors.push(`${fieldName} must be at least 2 characters long`)
  }
  
  if (sanitized.length > 50) {
    errors.push(`${fieldName} is too long`)
  }
  
  if (!/^[a-zA-Z\s\-']+$/.test(sanitized)) {
    errors.push(`${fieldName} can only contain letters, spaces, hyphens, and apostrophes`)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized
  }
}

/**
 * Generic validation function
 */
export function validateInput(value: any, options: ValidationOptions = {}): ValidationResult {
  const errors: string[] = []
  
  if (options.required && (value === null || value === undefined || value === '')) {
    errors.push('This field is required')
    return { isValid: false, errors }
  }
  
  if (value !== null && value !== undefined) {
    const sanitized = options.sanitize ? sanitizeInput(value, options) : value
    
    if (typeof sanitized === 'string') {
      if (options.minLength && sanitized.length < options.minLength) {
        errors.push(`Minimum length is ${options.minLength} characters`)
      }
      
      if (options.maxLength && sanitized.length > options.maxLength) {
        errors.push(`Maximum length is ${options.maxLength} characters`)
      }
      
      if (options.pattern && !options.pattern.test(sanitized)) {
        errors.push('Invalid format')
      }
    }
    
    if (options.customValidator && !options.customValidator(sanitized)) {
      errors.push('Custom validation failed')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitized
    }
  }
  
  return { isValid: true, errors, sanitizedValue: value }
}

/**
 * Validate API request body
 */
export function validateRequestBody(body: any, schema: Record<string, ValidationOptions>): ValidationResult {
  const errors: string[] = []
  const sanitizedBody: any = {}
  
  for (const [field, options] of Object.entries(schema)) {
    const value = body[field]
    const validation = validateInput(value, options)
    
    if (!validation.isValid) {
      errors.push(...validation.errors.map(error => `${field}: ${error}`))
    }
    
    sanitizedBody[field] = validation.sanitizedValue
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitizedBody
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams(params: URLSearchParams, schema: Record<string, ValidationOptions>): ValidationResult {
  const errors: string[] = []
  const sanitizedParams: any = {}
  
  for (const [field, options] of Object.entries(schema)) {
    const value = params.get(field)
    const validation = validateInput(value, options)
    
    if (!validation.isValid) {
      errors.push(...validation.errors.map(error => `${field}: ${error}`))
    }
    
    sanitizedParams[field] = validation.sanitizedValue
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitizedParams
  }
}

// Export commonly used validation schemas
export const VALIDATION_SCHEMAS = {
  userRegistration: {
    email: { required: true, pattern: VALIDATION_PATTERNS.email, sanitize: true },
    password: { required: true, minLength: 8, sanitize: false },
    firstName: { required: true, minLength: 2, maxLength: 50, sanitize: true },
    lastName: { required: true, minLength: 2, maxLength: 50, sanitize: true }
  },
  
  userLogin: {
    email: { required: true, pattern: VALIDATION_PATTERNS.email, sanitize: true },
    password: { required: true, sanitize: false }
  },
  
  stockSymbol: {
    symbol: { required: true, pattern: VALIDATION_PATTERNS.symbol, sanitize: true }
  },
  
  trade: {
    symbol: { required: true, pattern: VALIDATION_PATTERNS.symbol, sanitize: true },
    type: { required: true, customValidator: (value: any) => ['buy', 'sell'].includes(value) },
    quantity: { required: true, customValidator: (value: any) => !isNaN(value) && value > 0 },
    price: { required: true, customValidator: (value: any) => !isNaN(value) && value > 0 }
  },
  
  portfolio: {
    name: { required: true, minLength: 1, maxLength: 100, sanitize: true }
  }
}
