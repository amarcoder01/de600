import React from 'react'
import { AlertTriangle, Shield, Lock, Clock, UserX, AlertCircle } from 'lucide-react'
import { AuthErrorType } from '@/lib/auth-security'

interface AuthErrorHandlerProps {
  error: string | null
  errorType?: string
  onRetry?: () => void
  onContactSupport?: () => void
}

export function AuthErrorHandler({ 
  error, 
  errorType, 
  onRetry, 
  onContactSupport 
}: AuthErrorHandlerProps) {
  if (!error) return null

  const getErrorIcon = () => {
    switch (errorType) {
      case AuthErrorType.RATE_LIMIT_EXCEEDED:
        return <Clock className="w-5 h-5 text-orange-500" />
      case AuthErrorType.ACCOUNT_LOCKED:
        return <Lock className="w-5 h-5 text-red-500" />
      case AuthErrorType.ACCOUNT_DISABLED:
        return <UserX className="w-5 h-5 text-red-500" />
      case AuthErrorType.INVALID_CREDENTIALS:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case AuthErrorType.VALIDATION_ERROR:
        return <AlertCircle className="w-5 h-5 text-blue-500" />
      default:
        return <AlertTriangle className="w-5 h-5 text-red-500" />
    }
  }

  const getErrorColor = () => {
    switch (errorType) {
      case AuthErrorType.RATE_LIMIT_EXCEEDED:
        return 'border-orange-200 bg-orange-50 text-orange-800'
      case AuthErrorType.ACCOUNT_LOCKED:
        return 'border-red-200 bg-red-50 text-red-800'
      case AuthErrorType.ACCOUNT_DISABLED:
        return 'border-red-200 bg-red-50 text-red-800'
      case AuthErrorType.INVALID_CREDENTIALS:
        return 'border-yellow-200 bg-yellow-50 text-yellow-800'
      case AuthErrorType.VALIDATION_ERROR:
        return 'border-blue-200 bg-blue-50 text-blue-800'
      default:
        return 'border-red-200 bg-red-50 text-red-800'
    }
  }

  const getErrorTitle = () => {
    switch (errorType) {
      case AuthErrorType.RATE_LIMIT_EXCEEDED:
        return 'Too Many Attempts'
      case AuthErrorType.ACCOUNT_LOCKED:
        return 'Account Temporarily Locked'
      case AuthErrorType.ACCOUNT_DISABLED:
        return 'Account Disabled'
      case AuthErrorType.INVALID_CREDENTIALS:
        return 'Invalid Credentials'
      case AuthErrorType.VALIDATION_ERROR:
        return 'Validation Error'
      default:
        return 'Authentication Error'
    }
  }

  const getErrorActions = () => {
    switch (errorType) {
      case AuthErrorType.RATE_LIMIT_EXCEEDED:
        return (
          <div className="mt-3">
            <p className="text-sm text-orange-700 mb-2">
              Please wait before trying again. This helps protect your account from unauthorized access.
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm text-orange-600 hover:text-orange-800 underline"
              >
                Try again later
              </button>
            )}
          </div>
        )
      
      case AuthErrorType.ACCOUNT_LOCKED:
        return (
          <div className="mt-3">
            <p className="text-sm text-red-700 mb-2">
              Your account has been temporarily locked due to multiple failed login attempts.
            </p>
            <div className="flex space-x-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try again later
                </button>
              )}
              {onContactSupport && (
                <button
                  onClick={onContactSupport}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  Contact Support
                </button>
              )}
            </div>
          </div>
        )
      
      case AuthErrorType.ACCOUNT_DISABLED:
        return (
          <div className="mt-3">
            <p className="text-sm text-red-700 mb-2">
              This account has been disabled. Please contact our support team for assistance.
            </p>
            {onContactSupport && (
              <button
                onClick={onContactSupport}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                Contact Support
              </button>
            )}
          </div>
        )
      
      case AuthErrorType.VALIDATION_ERROR:
        return (
          <div className="mt-3">
            <p className="text-sm text-blue-700 mb-2">
              Please check your input and try again.
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Try again
              </button>
            )}
          </div>
        )
      
      default:
        return (
          <div className="mt-3">
            <p className="text-sm text-red-700 mb-2">
              An unexpected error occurred. Please try again.
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            )}
          </div>
        )
    }
  }

  return (
    <div className={`rounded-lg border p-4 ${getErrorColor()}`}>
      <div className="flex items-start space-x-3">
        {getErrorIcon()}
        <div className="flex-1">
          <h3 className="font-medium">{getErrorTitle()}</h3>
          <p className="mt-1 text-sm">{error}</p>
          {getErrorActions()}
        </div>
      </div>
    </div>
  )
}

// Security tips component
export function SecurityTips() {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start space-x-3">
        <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-blue-800">Security Tips</h3>
          <ul className="mt-2 text-sm text-blue-700 space-y-1">
            <li>• Use a strong, unique password with at least 12 characters</li>
            <li>• Enable two-factor authentication when available</li>
            <li>• Never share your login credentials</li>
            <li>• Log out from shared devices</li>
            <li>• Report suspicious activity immediately</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Password strength indicator
export function PasswordStrengthIndicator({ password }: { password: string }) {
  const getStrength = () => {
    if (!password) return { score: 0, label: '', color: 'bg-gray-200' }
    
    let score = 0
    const checks = {
      length: password.length >= 12,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      noRepeats: !/(.)\1{2,}/.test(password),
      notCommon: !['password', '123456', 'qwerty', 'admin', 'letmein'].includes(password.toLowerCase())
    }
    
    score += Object.values(checks).filter(Boolean).length
    
    if (score <= 2) return { score, label: 'Very Weak', color: 'bg-red-500' }
    if (score <= 4) return { score, label: 'Weak', color: 'bg-orange-500' }
    if (score <= 6) return { score, label: 'Fair', color: 'bg-yellow-500' }
    if (score <= 8) return { score, label: 'Good', color: 'bg-blue-500' }
    return { score, label: 'Strong', color: 'bg-green-500' }
  }

  const strength = getStrength()
  const percentage = (strength.score / 8) * 100

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Password Strength</span>
        <span className="font-medium">{strength.label}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${strength.color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-gray-500">
        {strength.score}/8 criteria met
      </div>
    </div>
  )
}
