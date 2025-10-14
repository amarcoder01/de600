'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useAuthStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion } from 'framer-motion'
import { VidalityLogo } from '@/components/ui/VidalityLogo'
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login, error, clearError, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  // Verify email request state (for users who need verification before sign-in)
  const [isRequestingVerification, setIsRequestingVerification] = useState(false)
  const [verificationRequestError, setVerificationRequestError] = useState('')
  const [verificationRequestSuccess, setVerificationRequestSuccess] = useState(false)
  // Inline verification code entry state
  const [showVerification, setShowVerification] = useState(false)
  const [verificationUser, setVerificationUser] = useState<{ userId: string, email: string } | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationError, setVerificationError] = useState('')
  const [verificationSuccess, setVerificationSuccess] = useState(false)

  useEffect(() => {
    clearError()
  }, [clearError])

  // Comprehensive email validator following RFC 5322 standard
  const isValidEmail = (value: string) => {
    const email = value.trim()
    if (!email) return false
    // RFC 5322 Official Standard regex for email validation
    // eslint-disable-next-line no-control-regex
    const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/i
    return emailRegex.test(email)
  }

  // Request verification email for an existing account
  const handleRequestVerification = async () => {
    setVerificationRequestError('')
    setVerificationRequestSuccess(false)

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setVerificationRequestError('Please enter your email address first')
      return
    }
    if (!isValidEmail(normalizedEmail)) {
      setVerificationRequestError('Please enter a valid email address')
      return
    }

    setIsRequestingVerification(true)
    try {
      const res = await fetch('/api/auth/request-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        if (data.alreadyVerified) {
          // Email is already verified, show appropriate message
          setVerificationRequestSuccess(false)
          setVerificationRequestError('Your email is already verified. Please try signing in with your password.')
          setShowVerification(false)
        } else {
          // Email verification code was sent
          setVerificationRequestSuccess(true)
          setVerificationRequestError('')
          // Prepare inline verification UI
          setVerificationUser({ userId: data.userId, email: data.email })
          setVerificationCode('')
          setVerificationError('')
          setVerificationSuccess(false)
          setShowVerification(true)
        }
      } else {
        setVerificationRequestError(data.error || 'Failed to send verification email')
      }
    } catch (err) {
      setVerificationRequestError('Network error. Please try again.')
    } finally {
      setIsRequestingVerification(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErrors({})
    clearError()

    const errs: Record<string, string> = {}
    if (!email.trim()) errs.email = 'Email is required'
    else if (!isValidEmail(email)) errs.email = 'Please enter a valid email address'
    if (!password) errs.password = 'Password is required'
    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs)
      return
    }

    try {
      await login({ email: email.trim().toLowerCase(), password })
      router.replace('/dashboard')
    } catch (e) {
      // error state is already set in the store; UI will reflect it
    }
  }

  return (
    <AuthGuard requireAuth={false} redirectTo="/dashboard">
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        {/* Subtle animated grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] opacity-50" />
        
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="login-card relative w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex flex-col items-center text-center mb-6">
            <VidalityLogo className="h-10 w-auto mb-3" theme="onDark" />
            <h1 className="text-2xl font-semibold text-white mb-1">Welcome back</h1>
            <p className="text-sm text-gray-300">Sign in to access your dashboard</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl border border-red-300/30 bg-red-500/10 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (validationErrors.email) setValidationErrors(v => ({ ...v, email: '' }))
                    if (error) clearError()
                  }}
                  placeholder="you@example.com"
                  className={`pl-9 bg-white/10 text-white placeholder:text-gray-300 border-white/20 focus-visible:ring-white/40 ${validationErrors.email ? 'border-red-500' : ''}`}
                />
              </div>
              {validationErrors.email && (
                <p className="text-xs text-red-400">{validationErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (validationErrors.password) setValidationErrors(v => ({ ...v, password: '' }))
                    if (error) clearError()
                  }}
                  placeholder="••••••••"
                  className={`pl-9 pr-12 bg-white/10 text-white placeholder:text-gray-300 border-white/20 focus-visible:ring-white/40 ${validationErrors.password ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-auto text-gray-200 hover:text-white bg-white/10 hover:bg-white/20 transition-colors rounded-md p-1 hover:ring-1 hover:ring-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 backdrop-blur-sm"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 drop-shadow-md text-white/90" strokeWidth={2.5} />
                  ) : (
                    <Eye className="h-5 w-5 drop-shadow-md text-white/90" strokeWidth={2.5} />
                  )}
                </button>
              </div>
              {validationErrors.password && (
                <p className="text-xs text-red-400">{validationErrors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleRequestVerification}
                disabled={isRequestingVerification || !isValidEmail(email)}
                className="text-green-300 hover:text-green-200 disabled:opacity-60"
                aria-label="Request email verification"
                title="Request a verification email"
              >
                {isRequestingVerification ? 'Sending verification…' : 'Verify email'}
              </button>
              <button type="button" onClick={() => setShowForgot(true)} className="text-blue-300 hover:text-blue-200">
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {/* Verify email feedback and inline code entry */}
          <div className="mt-4 space-y-3">
            {verificationRequestError && (
              <div className="p-3 rounded-xl border border-red-300/30 bg-red-500/10 text-red-300 text-sm">
                {verificationRequestError}
              </div>
            )}
            {verificationRequestSuccess && (
              <div className="p-3 rounded-xl border border-emerald-300/30 bg-emerald-500/10 text-emerald-300 text-sm">
                If an account with that email exists, you’ll receive a verification email with instructions. Please check your inbox and spam folder.
              </div>
            )}
            {showVerification && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <Label htmlFor="verificationCode" className="text-gray-300">Verification code</Label>
                <Input
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0,6)
                    setVerificationCode(v)
                    setVerificationError('')
                  }}
                  placeholder="000000"
                  className="mt-2 text-center tracking-widest text-lg bg-white/10 text-white placeholder:text-gray-300 border-white/20 focus-visible:ring-white/40"
                />
                {verificationError && (
                  <div className="mt-2 p-2 rounded-lg border border-red-300/30 bg-red-500/10 text-red-300 text-xs">
                    {verificationError}
                  </div>
                )}
                {verificationSuccess && (
                  <div className="mt-2 p-2 rounded-lg border border-emerald-300/30 bg-emerald-500/10 text-emerald-300 text-xs">
                    Email verified. {password ? 'Signing you in…' : 'Now click Sign in to continue.'}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!verificationUser) {
                        setVerificationError('Verification data missing. Please request a new code.')
                        return
                      }
                      if (verificationCode.length !== 6) {
                        setVerificationError('Enter a valid 6-digit code')
                        return
                      }
                      setIsVerifying(true)
                      setVerificationError('')
                      try {
                        const res = await fetch('/api/auth/verify-email', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            userId: verificationUser.userId,
                            email: verificationUser.email,
                            code: verificationCode
                          })
                        })
                        const data = await res.json()
                        if (res.ok && data.success) {
                          setVerificationSuccess(true)
                          // Auto sign-in if password already provided
                          if (password) {
                            try {
                              await login({ email: (verificationUser.email || email).toLowerCase(), password })
                              router.replace('/dashboard')
                            } catch (e) {
                              // If auto-login fails, keep success note and let user click Sign in
                            }
                          }
                        } else {
                          setVerificationError(data.error || 'Verification failed')
                        }
                      } catch (err) {
                        setVerificationError('Network error. Please try again.')
                      } finally {
                        setIsVerifying(false)
                      }
                    }}
                    disabled={isVerifying || verificationCode.length !== 6}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isVerifying ? 'Verifying…' : 'Verify code'}
                  </Button>
                  <button
                    type="button"
                    onClick={handleRequestVerification}
                    disabled={isRequestingVerification}
                    className="text-blue-300 hover:text-blue-200 text-sm disabled:opacity-60"
                  >
                    {isRequestingVerification ? 'Resending…' : 'Resend code'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Third-party sign-in disabled */}

          <div className="text-sm text-gray-300 mt-4 text-center">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-300 hover:text-blue-200">Create one</Link>
          </div>

          <ForgotPasswordModal
            isOpen={showForgot}
            onClose={() => setShowForgot(false)}
            onSwitchToLogin={() => setShowForgot(false)}
          />
          {/* Fix Chrome autofill white background on dark surfaces */}
          <style jsx global>{`
            .login-card input:-webkit-autofill,
            .login-card input:-webkit-autofill:hover,
            .login-card input:-webkit-autofill:focus {
              -webkit-box-shadow: 0 0 0px 1000px rgba(255,255,255,0.06) inset !important;
              box-shadow: 0 0 0px 1000px rgba(255,255,255,0.06) inset !important;
              -webkit-text-fill-color: #ffffff !important;
              caret-color: #ffffff !important;
              transition: background-color 999999s ease-in-out 0s;
            }
          `}</style>
        </motion.div>
      </div>
    </AuthGuard>
  )
}
