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
import { EmailVerificationModal } from './EmailVerificationModal'

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
        console.log('🔐 LoginModal: Email verification required, showing verification modal')
        
        // Show email verification modal
        setVerificationUserData({
          userId: error.userId,
          email: error.email,
          name: email.trim() // We don't have the full name here, just use email
        })
        setShowEmailVerification(true)
        
        // Clear the error since we're handling it with the verification modal
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
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    disabled={isLoading}
                  >
                    Forgot password?
                  </button>
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
          </motion.div>
        </div>
      )}
      
      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onSwitchToLogin={() => setShowForgotPassword(false)}
      />

      {/* Email Verification Modal */}
      {verificationUserData && (
        <EmailVerificationModal
          isOpen={showEmailVerification}
          onClose={() => {
            setShowEmailVerification(false)
            setVerificationUserData(null)
          }}
          onVerificationComplete={handleEmailVerificationComplete}
          userEmail={verificationUserData.email}
          userId={verificationUserData.userId}
          userName={verificationUserData.name}
        />
      )}
    </AnimatePresence>
  )
}
