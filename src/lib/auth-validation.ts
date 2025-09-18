import { z } from 'zod'
import { isValidEmail } from './utils'

// Comprehensive validation schemas
export const LoginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email is too long')
    .transform(email => email.toLowerCase().trim()),
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long')
})

export const RegisterSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes')
    .transform(name => name.trim()),
  lastName: z.string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
    .transform(name => name.trim()),
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email is too long')
    .transform(email => email.toLowerCase().trim()),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password is too long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character')
    .refine(password => {
      // Check for common weak passwords
      const weakPasswords = [
        'password', '123456', 'qwerty', 'admin', 'letmein',
        'welcome', 'monkey', 'dragon', 'master', 'hello'
      ]
      return !weakPasswords.includes(password.toLowerCase())
    }, 'Password is too common. Please choose a stronger password'),
  confirmPassword: z.string()
    .min(1, 'Please confirm your password')
})

export const PasswordChangeSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters long')
    .max(128, 'New password is too long')
    .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
    .regex(/\d/, 'New password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'New password must contain at least one special character')
    .refine(password => {
      const weakPasswords = [
        'password', '123456', 'qwerty', 'admin', 'letmein',
        'welcome', 'monkey', 'dragon', 'master', 'hello'
      ]
      return !weakPasswords.includes(password.toLowerCase())
    }, 'New password is too common. Please choose a stronger password')
}).refine(data => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword']
})

// Validation result types
export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: Record<string, string[]>
  message?: string
}

// Enhanced validation functions
export class AuthValidator {
  // Login validation
  static validateLogin(data: any): ValidationResult<z.infer<typeof LoginSchema>> {
    try {
      const validatedData = LoginSchema.parse(data)
      return { success: true, data: validatedData }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string[]> = {}
        error.errors.forEach(err => {
          const field = err.path[0] as string
          if (!errors[field]) errors[field] = []
          errors[field].push(err.message)
        })
        return { success: false, errors }
      }
      return { success: false, message: 'Validation failed' }
    }
  }

  // Registration validation
  static validateRegistration(data: any): ValidationResult<z.infer<typeof RegisterSchema>> {
    try {
      const validatedData = RegisterSchema.parse(data)
      return { success: true, data: validatedData }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string[]> = {}
        error.errors.forEach(err => {
          const field = err.path[0] as string
          if (!errors[field]) errors[field] = []
          errors[field].push(err.message)
        })
        return { success: false, errors }
      }
      return { success: false, message: 'Validation failed' }
    }
  }

  // Password change validation
  static validatePasswordChange(data: any): ValidationResult<z.infer<typeof PasswordChangeSchema>> {
    try {
      const validatedData = PasswordChangeSchema.parse(data)
      return { success: true, data: validatedData }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string[]> = {}
        error.errors.forEach(err => {
          const field = err.path[0] as string
          if (!errors[field]) errors[field] = []
          errors[field].push(err.message)
        })
        return { success: false, errors }
      }
      return { success: false, message: 'Validation failed' }
    }
  }

  // Email validation with additional checks
  static validateEmail(email: string): ValidationResult<string> {
    try {
      const validatedEmail = z.string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address')
        .max(254, 'Email is too long')
        .transform(e => e.toLowerCase().trim())
        .parse(email)

      // Additional security checks
      if (validatedEmail.includes('..') || validatedEmail.includes('--')) {
        return { success: false, message: 'Invalid email format' }
      }

      // Check for disposable email domains (basic check)
      const disposableDomains = [
        'tempmail.org', 'guerrillamail.com', 'mailinator.com',
        '10minutemail.com', 'throwaway.email', 'temp-mail.org'
      ]
      const domain = validatedEmail.split('@')[1]
      if (disposableDomains.includes(domain)) {
        return { success: false, message: 'Disposable email addresses are not allowed' }
      }

      return { success: true, data: validatedEmail }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, message: error.errors[0].message }
      }
      return { success: false, message: 'Email validation failed' }
    }
  }

  // Password strength validation
  static validatePasswordStrength(password: string): {
    isValid: boolean
    score: number
    feedback: string[]
    suggestions: string[]
  } {
    const feedback: string[] = []
    const suggestions: string[] = []
    let score = 0

    // Length check
    if (password.length >= 8) score += 1
    else feedback.push('Password should be at least 8 characters long')

    if (password.length >= 12) score += 1
    else suggestions.push('Consider using a longer password (12+ characters)')

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1
    else feedback.push('Password should contain lowercase letters')

    if (/[A-Z]/.test(password)) score += 1
    else feedback.push('Password should contain uppercase letters')

    if (/\d/.test(password)) score += 1
    else feedback.push('Password should contain numbers')

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1
    else feedback.push('Password should contain special characters')

    // Complexity checks
    if (/(.)\1{2,}/.test(password)) {
      score -= 1
      feedback.push('Avoid repeating characters')
    }

    if (/^(.)\1+$/.test(password)) {
      score = 0
      feedback.push('Password cannot be all the same character')
    }

    // Common patterns check
    const commonPatterns = [
      '123456', 'qwerty', 'password', 'admin', 'letmein',
      'welcome', 'monkey', 'dragon', 'master', 'hello'
    ]
    if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
      score -= 2
      feedback.push('Avoid common password patterns')
    }

    // Sequential characters check
    if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
      score -= 1
      feedback.push('Avoid sequential characters')
    }

    // Score interpretation
    const isValid = score >= 4
    if (score < 4) {
      suggestions.push('Try mixing uppercase, lowercase, numbers, and special characters')
    }
    if (score < 5) {
      suggestions.push('Consider using a passphrase for better security')
    }

    return { isValid, score, feedback, suggestions }
  }

  // Rate limiting validation
  static validateRateLimit(attempts: number, lastAttemptTime: Date, maxAttempts: number = 5, lockoutDuration: number = 15 * 60 * 1000): {
    isAllowed: boolean
    remainingAttempts: number
    lockoutTime?: Date
    retryAfter?: number
  } {
    const now = new Date()
    const timeSinceLastAttempt = now.getTime() - lastAttemptTime.getTime()

    // Check if account is locked
    if (attempts >= maxAttempts && timeSinceLastAttempt < lockoutDuration) {
      const retryAfter = Math.ceil((lockoutDuration - timeSinceLastAttempt) / 1000)
      return {
        isAllowed: false,
        remainingAttempts: 0,
        lockoutTime: new Date(lastAttemptTime.getTime() + lockoutDuration),
        retryAfter
      }
    }

    // Reset attempts if lockout period has passed
    if (attempts >= maxAttempts && timeSinceLastAttempt >= lockoutDuration) {
      return {
        isAllowed: true,
        remainingAttempts: maxAttempts
      }
    }

    return {
      isAllowed: true,
      remainingAttempts: maxAttempts - attempts
    }
  }

  // Input sanitization
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 1000) // Limit length
  }

  // Device fingerprint validation
  static validateDeviceFingerprint(fingerprint: any): boolean {
    if (!fingerprint || typeof fingerprint !== 'object') return false

    const requiredFields = ['userAgent', 'screenResolution', 'timezone']
    return requiredFields.every(field => 
      fingerprint[field] && 
      typeof fingerprint[field] === 'string' && 
      fingerprint[field].length > 0
    )
  }
}


