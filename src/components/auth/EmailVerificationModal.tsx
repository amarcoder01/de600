/**
 * Email Verification Modal Component
 * Handles email verification flow after registration
 */

import React, { useState, useEffect } from 'react'
import { X, Mail, Clock, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface EmailVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onVerificationComplete: () => void
  userEmail: string
  userId: string
  userName: string
}

export function EmailVerificationModal({
  isOpen,
  onClose,
  onVerificationComplete,
  userEmail,
  userId,
  userName
}: EmailVerificationModalProps) {
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const [cooldownTime, setCooldownTime] = useState(0)
  const [timeLeft, setTimeLeft] = useState(15 * 60) // 15 minutes in seconds

  // Timer countdown
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return

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
  }, [isOpen, timeLeft])

  // Cooldown timer
  useEffect(() => {
    if (!isOpen || cooldownTime <= 0) return

    const timer = setInterval(() => {
      setCooldownTime(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, cooldownTime])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setVerificationCode('')
      setError('')
      setSuccess(false)
      setRemainingAttempts(null)
      setCooldownTime(0)
      setTimeLeft(15 * 60)
    }
  }, [isOpen])

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleCodeChange = (value: string) => {
    // Only allow numbers and limit to 6 digits
    const sanitized = value.replace(/\D/g, '').slice(0, 6)
    setVerificationCode(sanitized)
    setError('')
  }

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email: userEmail,
          code: verificationCode
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          onVerificationComplete()
          onClose()
        }, 2000)
      } else {
        setError(data.error || 'Verification failed')
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts)
        }
      }
    } catch (error) {
      console.error('Verification error:', error)
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (cooldownTime > 0) return

    setIsResending(true)
    setError('')

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email: userEmail
        })
      })

      const data = await response.json()

      if (data.success) {
        // Reset timer and start cooldown
        setTimeLeft(15 * 60)
        setCooldownTime(60) // 1 minute cooldown
        setError('')
      } else {
        if (data.cooldownRemaining) {
          setCooldownTime(data.cooldownRemaining)
        }
        setError(data.error || 'Failed to resend code')
      }
    } catch (error) {
      console.error('Resend error:', error)
      setError('Network error. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const handleClose = () => {
    setVerificationCode('')
    setError('')
    setSuccess(false)
    setRemainingAttempts(null)
    setCooldownTime(0)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
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
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {/* Success State */}
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
              <p className="text-gray-600">Your email has been successfully verified. You can now access all features.</p>
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
                  <span className="font-semibold text-gray-900">{userEmail}</span>
                </p>
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center mb-6">
                <Clock className="w-4 h-4 text-gray-500 mr-2" />
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
                  className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
                  <div className="text-sm text-red-700">
                    <p>{error}</p>
                    {remainingAttempts !== null && remainingAttempts > 0 && (
                      <p className="mt-1">Remaining attempts: {remainingAttempts}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Verify Button */}
              <button
                onClick={handleVerifyCode}
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
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
                  disabled={isResending || cooldownTime > 0}
                  className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isResending ? (
                    <div className="flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                      Sending...
                    </div>
                  ) : cooldownTime > 0 ? (
                    `Resend in ${cooldownTime}s`
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
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
