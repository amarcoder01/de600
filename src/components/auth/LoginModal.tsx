'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ForgotPasswordModal } from './ForgotPasswordModal'
import { AUTH_MESSAGES } from '@/lib/auth-messages'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToRegister: () => void
}

export function LoginModal({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  
  // Email verification state
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [verificationUserData, setVerificationUserData] = useState<{
    userId: string
    email: string
    name: string
  } | null>(null)
  
  // Inline email verification state
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationError, setVerificationError] = useState('')
  const [verificationSuccess, setVerificationSuccess] = useState(false)
  const [timeLeft, setTimeLeft] = useState(15 * 60) // 15 minutes in seconds
  const [isResending, setIsResending] = useState(false)
  
  // Verify email state
  const [showVerifyEmailOption, setShowVerifyEmailOption] = useState(false)
  const [isRequestingVerification, setIsRequestingVerification] = useState(false)
  const [verificationRequestError, setVerificationRequestError] = useState('')
  const [verificationRequestSuccess, setVerificationRequestSuccess] = useState(false)
  
  const { login, error, clearError, setAuthModalOpen } = useAuthStore()
  const router = useRouter()

  // Clear validation errors when modal opens and signal that an auth modal is open
  useEffect(() => {
    if (isOpen) {
      setValidationErrors({})
      clearError()
      setAuthModalOpen(true)
    }
    return () => {
      // Ensure flag is reset if component unmounts
      setAuthModalOpen(false)
    }
  }, [isOpen, clearError])

  // Timer countdown for verification code
  useEffect(() => {
    if (!showEmailVerification || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [showEmailVerification, timeLeft])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    clearError()
    
    // Client-side validation
    const errors: Record<string, string> = {}
    
    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!password) {
      errors.password = 'Password is required'
    }
    
    if (Object.keys(errors).length > 0) {
      // Display validation errors
      setValidationErrors(errors)
      setIsLoading(false)
      return
    }
    
    try {
      await login({ email: email.trim().toLowerCase(), password })
      
      // If we reach here, login was successful
      console.log('🔐 LoginModal: Login successful, closing modal')
      onClose()
      setEmail('')
      setPassword('')
      setValidationErrors({})
      
      // Let the parent component handle the redirect
      console.log('🔐 LoginModal: Login completed successfully')
    } catch (error: any) {
      console.error('🔐 LoginModal: Login failed:', error)
      
      // Check if the error is due to email verification requirement
      if (error?.requiresEmailVerification && error?.userId && error?.email) {
        console.log('🔐 LoginModal: Email verification required, showing inline verification')
        
        // Show inline email verification instead of modal
        setVerificationUserData({
          userId: error.userId,
          email: error.email,
          name: email.trim() // We don't have the full name here, just use email
        })
        setShowEmailVerification(true)
        
        // Reset verification state
        setVerificationCode('')
        setVerificationError('')
        setVerificationSuccess(false)
        setTimeLeft(15 * 60)
        
        // Clear the error since we're handling it with the verification step
        clearError()
      } else {
        // The auth store will handle setting the error state
        // We don't need to set validation errors here as the auth store error will be displayed
        // Just clear any existing validation errors
        setValidationErrors({})
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    clearError()
    setEmail('')
    setPassword('')
    setValidationErrors({})
    setAuthModalOpen(false)
    
    // Reset verification state
    setShowEmailVerification(false)
    setVerificationUserData(null)
    setVerificationCode('')
    setVerificationError('')
    setVerificationSuccess(false)
    setTimeLeft(15 * 60)
    
    // Reset verify email state
    setShowVerifyEmailOption(false)
    setVerificationRequestError('')
    setVerificationRequestSuccess(false)
    
    onClose()
  }

  const handleForgotPassword = () => {
    setShowForgotPassword(true)
  }

  const handleSwitchToRegister = () => {
    // Keep modal-open flag true across the transition
    setAuthModalOpen(true)
    clearError()
    setValidationErrors({})
    onClose()
    onSwitchToRegister()
  }

  const handleEmailVerificationComplete = () => {
    // Close email verification modal
    setShowEmailVerification(false)
    setVerificationUserData(null)
    
    // Close login modal
    onClose()
    
    // Redirect to dashboard
    router.push('/dashboard')
  }

  // Format time for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Handle verification code input
  const handleCodeChange = (value: string) => {
    // Only allow numbers and limit to 6 digits
    const sanitized = value.replace(/\D/g, '').slice(0, 6)
    setVerificationCode(sanitized)
    setVerificationError('')
  }

  // Verify email code
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setVerificationError('Please enter a valid 6-digit verification code')
      return
    }

    if (!verificationUserData) {
      setVerificationError('Verification data not found. Please try logging in again.')
      return
    }

    setIsVerifying(true)
    setVerificationError('')

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: verificationUserData.userId,
          email: verificationUserData.email,
          code: verificationCode
        })
      })

      const data = await response.json()

      if (data.success) {
        setVerificationSuccess(true)
        // After successful verification, automatically log the user in
        setTimeout(async () => {
          try {
            await login({ email: verificationUserData.email, password: password })
            onClose()
            router.push('/dashboard')
          } catch (error) {
            console.error('Auto-login after verification failed:', error)
            // If auto-login fails, just close the modal
            onClose()
          }
        }, 2000)
      } else {
        setVerificationError(data.error || 'Verification failed')
      }
    } catch (error) {
      console.error('Verification error:', error)
      setVerificationError('Network error. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  // Resend verification code
  const handleResendCode = async () => {
    if (!verificationUserData) return

    setIsResending(true)
    setVerificationError('')

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: verificationUserData.userId,
          email: verificationUserData.email
        })
      })

      const data = await response.json()

      if (data.success) {
        // Reset timer
        setTimeLeft(15 * 60)
        setVerificationError('')
      } else {
        setVerificationError(data.error || 'Failed to resend code')
      }
    } catch (error) {
      console.error('Resend error:', error)
      setVerificationError('Network error. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  // Request verification email for existing user
  const handleRequestVerification = async () => {
    if (!email.trim()) {
      setVerificationRequestError('Please enter your email address first')
      return
    }

    setIsRequestingVerification(true)
    setVerificationRequestError('')
    setVerificationRequestSuccess(false)

    try {
      const response = await fetch('/api/auth/request-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase()
        })
      })

      const data = await response.json()

      if (data.success) {
        setVerificationRequestSuccess(true)
        // Show the verification step
        setVerificationUserData({
          userId: data.userId,
          email: data.email,
          name: email.trim()
        })
        setShowEmailVerification(true)
        setShowVerifyEmailOption(false)
        
        // Reset verification state
        setVerificationCode('')
        setVerificationError('')
        setVerificationSuccess(false)
        setTimeLeft(15 * 60)
      } else {
        setVerificationRequestError(data.error || 'Failed to send verification email')
      }
    } catch (error) {
      console.error('Verification request error:', error)
      setVerificationRequestError('Network error. Please try again.')
    } finally {
      setIsRequestingVerification(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Sign In</h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            {!showEmailVerification && !showVerifyEmailOption ? (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (validationErrors.email) {
                        setValidationErrors(prev => ({ ...prev, email: '' }))
                      }
                      // Clear auth store error when user starts typing
                      if (error) {
                        clearError()
                      }
                    }}
                    className={`pl-10 ${validationErrors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                    placeholder="Enter your email"
                  />
                </div>
                {validationErrors.email && (
                  <p className="text-sm text-red-600">{validationErrors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      disabled={isLoading}
                    >
                      Forgot password?
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowVerifyEmailOption(true)}
                      className="text-sm text-green-600 hover:text-green-700 font-medium"
                      disabled={isLoading}
                    >
                      Verify Email
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (validationErrors.password) {
                        setValidationErrors(prev => ({ ...prev, password: '' }))
                      }
                      // Clear auth store error when user starts typing
                      if (error) {
                        clearError()
                      }
                    }}
                    className={`pl-10 pr-10 ${validationErrors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="text-sm text-red-600">{validationErrors.password}</p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <p className="text-sm text-red-600">{error}</p>
                </motion.div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              {/* Third-party sign-in disabled */}

              {/* Switch to Register */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={handleSwitchToRegister}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                    disabled={isLoading}
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </form>
            ) : showVerifyEmailOption ? (
              /* Verify Email Option Section */
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
                  <p className="text-gray-600">
                    Enter your email address to receive a verification code
                  </p>
                </div>

                {/* Email Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      disabled={isRequestingVerification}
                    />
                  </div>
                </div>

                {/* Error Message */}
                {verificationRequestError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-red-700">
                      <p>{verificationRequestError}</p>
                    </div>
                  </motion.div>
                )}

                {/* Success Message */}
                {verificationRequestSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center mb-4 p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="text-sm text-green-700">
                      <p>{AUTH_MESSAGES.EMAIL_VERIFICATION.GENERIC_SUCCESS}</p>
                    </div>
                  </motion.div>
                )}

                {/* Send Verification Button */}
                <button
                  onClick={handleRequestVerification}
                  disabled={isRequestingVerification || !email.trim()}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isRequestingVerification ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Sending...
                    </div>
                  ) : (
                    'Send Verification Email'
                  )}
                </button>

                {/* Back to Login */}
                <div className="mt-4 text-center">
                  <button
                    onClick={() => {
                      setShowVerifyEmailOption(false)
                      setVerificationRequestError('')
                      setVerificationRequestSuccess(false)
                    }}
                    className="text-gray-600 hover:text-gray-700 font-medium transition-colors"
                  >
                    ← Back to Sign In
                  </button>
                </div>

                {/* Help Text */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Need help?</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Make sure you enter the correct email address</li>
                    <li>• Check your spam/junk folder for the verification email</li>
                    <li>• The verification code expires in 15 minutes</li>
                    <li>• You can only request verification for existing accounts</li>
                  </ul>
                </div>
              </div>
            ) : (
              /* Email Verification Section */
              <div className="p-6 space-y-6">
                {/* Success State */}
                {verificationSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
                    <p className="text-gray-600">Logging you in automatically...</p>
                  </motion.div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-8 h-8 text-blue-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
                      <p className="text-gray-600">
                        We've sent a 6-digit verification code to<br />
                        <span className="font-semibold text-gray-900">{verificationUserData?.email}</span>
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Complete verification to continue signing in
                      </p>
                    </div>

                    {/* Timer */}
                    <div className="flex items-center justify-center mb-6">
                      <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className={`text-sm ${timeLeft < 300 ? 'text-red-600' : 'text-gray-600'}`}>
                        Code expires in {formatTime(timeLeft)}
                      </span>
                    </div>

                    {/* Verification Code Input */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enter verification code
                      </label>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => handleCodeChange(e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full px-4 py-4 text-center text-3xl font-mono tracking-widest border-2 border-blue-300 bg-blue-50 text-blue-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                        disabled={isVerifying}
                        style={{
                          letterSpacing: '0.5em',
                          fontWeight: 'bold'
                        }}
                      />
                    </div>

                    {/* Error Message */}
                    {verificationError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                      >
                        <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-red-700">
                          <p>{verificationError}</p>
                        </div>
                      </motion.div>
                    )}

                    {/* Verify Button */}
                    <button
                      onClick={handleVerifyCode}
                      disabled={isVerifying || verificationCode.length !== 6}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isVerifying ? (
                        <div className="flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Verifying...
                        </div>
                      ) : (
                        'Verify & Sign In'
                      )}
                    </button>

                    {/* Resend Code */}
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
                      <button
                        onClick={handleResendCode}
                        disabled={isResending}
                        className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isResending ? (
                          <div className="flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-1" />
                            Sending...
                          </div>
                        ) : (
                          'Resend verification code'
                        )}
                      </button>
                    </div>

                    {/* Back to Login */}
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => {
                          setShowEmailVerification(false)
                          setVerificationUserData(null)
                        }}
                        className="text-gray-600 hover:text-gray-700 font-medium transition-colors"
                      >
                        ← Back to Sign In
                      </button>
                    </div>

                    {/* Help Text */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Need help?</h4>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• Check your spam/junk folder</li>
                        <li>• Make sure you entered the correct email address</li>
                        <li>• The code expires in 15 minutes</li>
                        <li>• You have 5 attempts to enter the correct code</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
      
      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onSwitchToLogin={() => setShowForgotPassword(false)}
      />

    </AnimatePresence>
  )
}
