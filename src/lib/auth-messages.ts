/**
 * Authentication Messages Constants
 * Centralized location for all authentication-related user messages
 * Following security best practices to prevent user enumeration
 */

export const AUTH_MESSAGES = {
  // Generic messages that don't reveal user existence
  PASSWORD_RESET: {
    GENERIC_SUCCESS: 'If an account with that email exists, a password reset link has been sent.',
    EMAIL_SENT_CHECK: 'Please check your email for password reset instructions.',
    LINK_EXPIRED: 'This password reset link has expired. Please request a new one.',
    INVALID_TOKEN: 'Invalid or expired reset token. Please request a new password reset.',
    SUCCESS: 'Your password has been reset successfully. You can now sign in with your new password.'
  },

  EMAIL_VERIFICATION: {
    GENERIC_SUCCESS: 'If an account with that email exists and requires verification, a verification code has been sent.',
    CODE_SENT: 'A verification code has been sent to your email address.',
    ALREADY_VERIFIED: 'Your email address has already been verified. You can sign in directly.',
    SUCCESS: 'Your email has been successfully verified.',
    CODE_EXPIRED: 'The verification code has expired. Please request a new one.',
    CODE_INVALID: 'The verification code is invalid. Please check and try again.',
    TOO_MANY_ATTEMPTS: 'Too many verification attempts. Please wait before trying again.'
  },

  LOGIN: {
    INVALID_CREDENTIALS: 'Invalid email or password. Please check your credentials and try again.',
    ACCOUNT_LOCKED: 'Your account has been temporarily locked due to multiple failed login attempts.',
    EMAIL_NOT_VERIFIED: 'Please verify your email address before signing in.',
    ACCOUNT_DISABLED: 'Your account has been disabled. Please contact support for assistance.'
  },

  REGISTRATION: {
    SUCCESS: 'Account created successfully! Please check your email to verify your account.',
    EMAIL_EXISTS: 'An account with this email address already exists.',
    WEAK_PASSWORD: 'Password must be at least 8 characters long and contain a mix of letters, numbers, and special characters.'
  },

  GENERIC: {
    NETWORK_ERROR: 'Network error. Please check your connection and try again.',
    SERVER_ERROR: 'Something went wrong. Please try again later.',
    INVALID_INPUT: 'Please check your input and try again.',
    TRY_AGAIN: 'Please try again.',
    CONTACT_SUPPORT: 'If the problem persists, please contact support.'
  }
} as const

/**
 * Helper function to get user-friendly error messages
 * Maps technical error codes to user-friendly messages
 */
export function getUserFriendlyMessage(errorCode: string, fallback?: string): string {
  const errorMap: Record<string, string> = {
    'USER_NOT_FOUND': AUTH_MESSAGES.PASSWORD_RESET.GENERIC_SUCCESS,
    'EMAIL_NOT_VERIFIED': AUTH_MESSAGES.LOGIN.EMAIL_NOT_VERIFIED,
    'INVALID_CREDENTIALS': AUTH_MESSAGES.LOGIN.INVALID_CREDENTIALS,
    'ACCOUNT_LOCKED': AUTH_MESSAGES.LOGIN.ACCOUNT_LOCKED,
    'ACCOUNT_DISABLED': AUTH_MESSAGES.LOGIN.ACCOUNT_DISABLED,
    'EMAIL_EXISTS': AUTH_MESSAGES.REGISTRATION.EMAIL_EXISTS,
    'WEAK_PASSWORD': AUTH_MESSAGES.REGISTRATION.WEAK_PASSWORD,
    'CODE_EXPIRED': AUTH_MESSAGES.EMAIL_VERIFICATION.CODE_EXPIRED,
    'CODE_INVALID': AUTH_MESSAGES.EMAIL_VERIFICATION.CODE_INVALID,
    'TOO_MANY_ATTEMPTS': AUTH_MESSAGES.EMAIL_VERIFICATION.TOO_MANY_ATTEMPTS,
    'NETWORK_ERROR': AUTH_MESSAGES.GENERIC.NETWORK_ERROR,
    'SERVER_ERROR': AUTH_MESSAGES.GENERIC.SERVER_ERROR
  }

  return errorMap[errorCode] || fallback || AUTH_MESSAGES.GENERIC.SERVER_ERROR
}

/**
 * Security-focused message helper
 * Returns generic messages for sensitive operations
 */
export function getSecureMessage(operation: 'password_reset' | 'email_verification'): string {
  switch (operation) {
    case 'password_reset':
      return AUTH_MESSAGES.PASSWORD_RESET.GENERIC_SUCCESS
    case 'email_verification':
      return AUTH_MESSAGES.EMAIL_VERIFICATION.GENERIC_SUCCESS
    default:
      return AUTH_MESSAGES.GENERIC.TRY_AGAIN
  }
}
