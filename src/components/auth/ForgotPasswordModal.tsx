'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToLogin: () => void
}

export function ForgotPasswordModal({ isOpen, onClose, onSwitchToLogin }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [resetUrl, setResetUrl] = useState<string | null>(null)
  const { setAuthModalOpen } = useAuthStore()

  // Mark auth modal open when visible to avoid redirects
  useEffect(() => {
    if (isOpen) {
      setAuthModalOpen(true)
    }
    return () => {
      setAuthModalOpen(false)
    }
  }, [isOpen, setAuthModalOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setValidationErrors({})

    // Client-side validation
    const errors: Record<string, string> = {}
    
    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setIsLoading(false)
      return
    }

    try {
      console.log('📧 Sending password reset request...')
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await response.json()
      console.log('📧 Password reset response:', data)

      if (data.success) {
        setIsSuccess(true)
        setEmail('')
        setResetUrl(data.resetUrl || null)
        
        // In development mode, log the reset URL for testing
        if (data.resetUrl && process.env.NODE_ENV === 'development') {
          console.log('🔗 Development Mode - Password Reset URL:', data.resetUrl)
          console.log('📧 You can copy this URL to test the password reset flow')
        }

        // Log debug information if available
        if (data.debug) {
          console.log('🔧 Debug Information:', data.debug)
        }
      } else {
        setError(data.error || 'Failed to send reset email')
        console.error('❌ Password reset failed:', data.error)
      }
    } catch (error) {
      console.error('❌ Network error during password reset:', error)
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setError(null)
    setValidationErrors({})
    setIsSuccess(false)
    setResetUrl(null)
    setAuthModalOpen(false)
    onClose()
  }

  const handleSwitchToLogin = () => {
    // Keep the modal-open flag true during transition back to login
    setAuthModalOpen(true)
    handleClose()
    onSwitchToLogin()
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
              <h2 className="text-xl font-semibold text-gray-900">Reset Password</h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {!isSuccess ? (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Forgot your password?
                    </h3>
                    <p className="text-sm text-gray-600">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
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
                          }}
                          className={`pl-10 ${validationErrors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                          placeholder="Enter your email"
                          disabled={isLoading}
                        />
                      </div>
                      {validationErrors.email && (
                        <p className="text-sm text-red-600">{validationErrors.email}</p>
                      )}
                    </div>

                    {/* Error Message */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2"
                      >
                        <AlertCircle className="w-4 h-4 text-red-500" />
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
                          Sending Reset Link...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>

                    {/* Back to Login */}
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleSwitchToLogin}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        disabled={isLoading}
                      >
                        Back to Sign In
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Check Your Email
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    We've sent a password reset link to <strong>{email}</strong>. 
                    Please check your email and click the link to reset your password.
                  </p>
                  
                  {/* Development Mode - Show Reset URL */}
                  {process.env.NODE_ENV === 'development' && resetUrl && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>Development Mode:</strong> Reset URL for testing:
                      </p>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={resetUrl}
                          readOnly
                          className="flex-1 text-xs p-2 bg-white border border-blue-300 rounded"
                        />
                        <button
                          onClick={() => navigator.clipboard.writeText(resetUrl)}
                          className="px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <Button
                      onClick={handleSwitchToLogin}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      Back to Sign In
                    </Button>
                    <button
                      onClick={() => setIsSuccess(false)}
                      className="w-full text-sm text-gray-600 hover:text-gray-800"
                    >
                      Didn't receive the email? Try again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
