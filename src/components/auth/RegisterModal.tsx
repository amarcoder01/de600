'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Lock, Eye, EyeOff, Loader2, User } from 'lucide-react'
import { useAuthStore } from '@/store'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface RegisterModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToLogin: () => void
}

export function RegisterModal({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false)
  
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
  
  const { register, error, clearError, setAuthModalOpen } = useAuthStore()
  const router = useRouter()

  // Clear validation errors when modal opens and mark auth modal as open
  useEffect(() => {
    if (isOpen) {
      setValidationErrors({})
      clearError()
      setAuthModalOpen(true)
    }
    return () => {
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

  // Clear any authentication state when modal opens to ensure clean state
  React.useEffect(() => {
    if (isOpen) {
      console.log('🔐 RegisterModal: Modal opened, ensuring clean registration state')
      clearError()
      setValidationErrors({})
      
      // Always clear authentication state when opening registration modal
      // This prevents interference from stale tokens or previous auth attempts
      console.log('🔐 RegisterModal: Clearing auth state for fresh registration')
      useAuthStore.setState({
        isAuthenticated: false,
        user: null,
        token: null,
        error: null,
        isLoading: false
      })
      
      // Clear all auth-related storage
      localStorage.removeItem('token')
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict'
      document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict'
    }
  }, [isOpen, clearError])

  // Validation functions
  const validateEmail = (email: string): string => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) return 'Email is required'
    if (!emailRegex.test(email)) return 'Please enter a valid email address'
    return ''
  }

  const validatePassword = (password: string): string => {
    if (!password) return 'Password is required'
    if (password.length < 5) return 'Password must be at least 5 characters long'
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter'
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
    if (!/\d/.test(password)) return 'Password must contain at least one number'
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return 'Password must contain at least one special character'
    return ''
  }

  const validateConfirmPassword = (confirmPassword: string, password: string): string => {
    if (!confirmPassword) return 'Please confirm your password'
    if (confirmPassword !== password) return 'Passwords do not match'
    return ''
  }

  const validateName = (name: string, fieldName: string): string => {
    if (!name.trim()) return `${fieldName} is required`
    if (name.trim().length < 2) return `${fieldName} must be at least 2 characters long`
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) return `${fieldName} can only contain letters and spaces`
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setValidationErrors({})
    clearError()
    
    // Validate all fields
    const errors: Record<string, string> = {}
    
    const firstNameError = validateName(firstName, 'First name')
    if (firstNameError) errors.firstName = firstNameError
    
    const lastNameError = validateName(lastName, 'Last name')
    if (lastNameError) errors.lastName = lastNameError
    
    const emailError = validateEmail(email)
    if (emailError) errors.email = emailError
    
    const passwordError = validatePassword(password)
    if (passwordError) errors.password = passwordError
    
    const confirmPasswordError = validateConfirmPassword(confirmPassword, password)
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError
    
    // Validate privacy policy acceptance
    if (!privacyPolicyAccepted) {
      errors.privacyPolicy = 'You must accept the Privacy Policy to continue'
    }

    // If there are validation errors, don't submit
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }
    
    setIsLoading(true)
    let registrationSucceeded = false
    
    try {
      // Call the register function - this will throw an error if registration fails
      await register({ 
        email, 
        password, 
        firstName: firstName.trim(), 
        lastName: lastName.trim(),
        privacyPolicyAccepted 
      })
      
      // If we reach here, registration was successful
      registrationSucceeded = true
      console.log('🔐 RegisterModal: Registration succeeded, preparing to close modal and redirect')
      
    } catch (error: any) {
      console.error('🔐 RegisterModal: Registration failed:', error)
      
      // The auth store will handle setting the error state
      // We don't need to set validation errors here as the auth store error will be displayed
      // Just clear any existing validation errors
      setValidationErrors({})
    } finally {
      setIsLoading(false)
    }
    
    // Only proceed if registration actually succeeded
    if (registrationSucceeded) {
      console.log('🔐 RegisterModal: Registration succeeded, showing email verification')
      
      // Get user data from auth store for verification
      const userData = useAuthStore.getState().user
      
      if (userData) {
        // Show inline email verification instead of modal
        setVerificationUserData({
          userId: userData.id,
          email: userData.email,
          name: `${firstName.trim()} ${lastName.trim()}`
        })
        setShowEmailVerification(true)
        
        // Reset verification state
        setVerificationCode('')
        setVerificationError('')
        setVerificationSuccess(false)
        setTimeLeft(15 * 60)
        
        // Clear form data but keep modal open for verification
        setFirstName('')
        setLastName('')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setValidationErrors({})
      } else {
        // Fallback: close modal if no user data
        onClose()
      }
      console.log('🔐 RegisterModal: Registration completed successfully')
    }
  }

  const handleEmailVerificationComplete = () => {
    // Close email verification modal
    setShowEmailVerification(false)
    setVerificationUserData(null)
    
    // Close registration modal
    onClose()
    
    // Redirect to dashboard or home page
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
      setVerificationError('Verification data not found. Please try registering again.')
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
        setTimeout(() => {
          onClose()
          router.push('/dashboard')
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

  const handleClose = () => {
    clearError()
    setValidationErrors({})
    setFirstName('')
    setLastName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setPrivacyPolicyAccepted(false)
    setAuthModalOpen(false)
    
    // Reset verification state
    setShowEmailVerification(false)
    setVerificationUserData(null)
    setVerificationCode('')
    setVerificationError('')
    setVerificationSuccess(false)
    setTimeLeft(15 * 60)
    
    onClose()
  }

  const isFormValid = 
    firstName.trim() && 
    lastName.trim() && 
    email && 
    password && 
    confirmPassword && 
    password === confirmPassword &&
    privacyPolicyAccepted &&
    Object.keys(validationErrors).length === 0

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
            className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create Account</h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            {!showEmailVerification ? (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                    First Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className={`pl-10 ${validationErrors.firstName ? 'border-red-500 focus:border-red-500' : ''}`}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {validationErrors.firstName && (
                    <p className="text-xs text-red-500">{validationErrors.firstName}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                    Last Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      className={`pl-10 ${validationErrors.lastName ? 'border-red-500 focus:border-red-500' : ''}`}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {validationErrors.lastName && (
                    <p className="text-xs text-red-500">{validationErrors.lastName}</p>
                  )}
                </div>
              </div>

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
                    placeholder="Enter your email"
                    className={`pl-10 ${validationErrors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                    required
                    disabled={isLoading}
                  />
                </div>
                {validationErrors.email && (
                  <p className="text-xs text-red-500">{validationErrors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className={`pl-10 pr-10 ${validationErrors.password ? 'border-red-500 focus:border-red-500' : ''}`}
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
                {validationErrors.password ? (
                  <p className="text-xs text-red-500">{validationErrors.password}</p>
                                 ) : (
                   <p className="text-xs text-gray-500">
                     Must be at least 5 characters with uppercase, lowercase, number, and special character
                   </p>
                 )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className={`pl-10 pr-10 ${validationErrors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-xs text-red-500">{validationErrors.confirmPassword}</p>
                )}
              </div>

              {/* Privacy Policy Checkbox */}
              <div className="space-y-2">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="privacyPolicy"
                    checked={privacyPolicyAccepted}
                    onChange={(e) => {
                      setPrivacyPolicyAccepted(e.target.checked)
                      if (validationErrors.privacyPolicy) {
                        setValidationErrors(prev => ({ ...prev, privacyPolicy: '' }))
                      }
                    }}
                    className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    disabled={isLoading}
                  />
                  <div className="flex-1">
                    <label htmlFor="privacyPolicy" className="text-sm text-gray-700 cursor-pointer">
                      I agree to the{' '}
                      <a
                        href="/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        Privacy Policy
                      </a>
                      {' '}and{' '}
                      <a
                        href="/terms-of-service"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        Terms of Service
                      </a>
                    </label>
                    {validationErrors.privacyPolicy && (
                      <p className="text-xs text-red-500 mt-1">{validationErrors.privacyPolicy}</p>
                    )}
                  </div>
                </div>
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
                disabled={isLoading || !isFormValid || !privacyPolicyAccepted}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              {/* Third-party sign-up disabled */}

              {/* Switch to Login */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                    disabled={isLoading}
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </form>
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
                    <p className="text-gray-600">Your account has been successfully created and verified.</p>
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
                        'Verify Email'
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

    </AnimatePresence>
  )
}
