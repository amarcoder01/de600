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
import { Mail, Lock, User } from 'lucide-react'
import { EmailVerificationModal } from '@/components/auth/EmailVerificationModal'

export default function RegisterPage() {
  const router = useRouter()
  const { register, error, clearError, isLoading, user, setAuthModalOpen } = useAuthStore()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showVerification, setShowVerification] = useState(false)

  useEffect(() => {
    clearError()
  }, [clearError])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErrors({})
    clearError()

    const errs: Record<string, string> = {}
    if (!firstName.trim()) errs.firstName = 'First name is required'
    if (!lastName.trim()) errs.lastName = 'Last name is required'
    if (!email.trim()) errs.email = 'Email is required'
    if (!password) errs.password = 'Password is required'
    if (password && password.length < 8) errs.password = 'Password must be at least 8 characters'
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match'
    if (!privacyPolicyAccepted) errs.privacy = 'You must accept the Privacy Policy and Terms of Service'

    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs)
      return
    }

    try {
      await register({ email: email.trim().toLowerCase(), password, firstName: firstName.trim(), lastName: lastName.trim(), privacyPolicyAccepted })
      // On success, do NOT redirect. Show verification modal instead.
      // Keep the auth modal state open to prevent AuthGuard redirects while verifying
      setAuthModalOpen(true)
      setShowVerification(true)
    } catch (e) {
      // error state is already set in the store; UI will reflect it
    }
  }

  const handleVerificationComplete = () => {
    // Close modal guard and route to dashboard
    setShowVerification(false)
    setAuthModalOpen(false)
    router.replace('/dashboard')
  }

  const handleCloseVerification = () => {
    setShowVerification(false)
    setAuthModalOpen(false)
  }

  return (
    <AuthGuard requireAuth={false} redirectTo="/dashboard">
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        {/* Subtle animated grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] opacity-50" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-lg bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex flex-col items-center text-center mb-6">
            <VidalityLogo className="h-10 w-auto text-white mb-3" />
            <h1 className="text-2xl font-semibold text-white mb-1">Create your account</h1>
            <p className="text-sm text-gray-300">Join the platform and start trading</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl border border-red-300/30 bg-red-500/10 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-gray-300">First name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value)
                      if (validationErrors.firstName) setValidationErrors(v => ({ ...v, firstName: '' }))
                      if (error) clearError()
                    }}
                    placeholder="Jane"
                    className={`pl-9 ${validationErrors.firstName ? 'border-red-500' : ''}`}
                  />
                </div>
                {validationErrors.firstName && (
                  <p className="text-xs text-red-400">{validationErrors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-gray-300">Last name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value)
                      if (validationErrors.lastName) setValidationErrors(v => ({ ...v, lastName: '' }))
                      if (error) clearError()
                    }}
                    placeholder="Doe"
                    className={`pl-9 ${validationErrors.lastName ? 'border-red-500' : ''}`}
                  />
                </div>
                {validationErrors.lastName && (
                  <p className="text-xs text-red-400">{validationErrors.lastName}</p>
                )}
              </div>
            </div>

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
                  className={`pl-9 ${validationErrors.email ? 'border-red-500' : ''}`}
                />
              </div>
              {validationErrors.email && (
                <p className="text-xs text-red-400">{validationErrors.email}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (validationErrors.password) setValidationErrors(v => ({ ...v, password: '' }))
                      if (error) clearError()
                    }}
                    placeholder="••••••••"
                    className={`pl-9 ${validationErrors.password ? 'border-red-500' : ''}`}
                  />
                </div>
                {validationErrors.password && (
                  <p className="text-xs text-red-400">{validationErrors.password}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (validationErrors.confirmPassword) setValidationErrors(v => ({ ...v, confirmPassword: '' }))
                      if (error) clearError()
                    }}
                    placeholder="••••••••"
                    className={`pl-9 ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
                  />
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-xs text-red-400">{validationErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-300 text-sm">
              <input
                id="privacy"
                type="checkbox"
                checked={privacyPolicyAccepted}
                onChange={(e) => {
                  setPrivacyPolicyAccepted(e.target.checked)
                  if (validationErrors.privacy) setValidationErrors(v => ({ ...v, privacy: '' }))
                }}
              />
              <label htmlFor="privacy">
                I agree to the <a href="/privacy" className="text-blue-400 hover:text-blue-300">Privacy Policy</a> and <a href="/terms" className="text-blue-400 hover:text-blue-300">Terms of Service</a>
              </label>
            </div>

            {validationErrors.privacy && (
              <p className="text-xs text-red-400">{validationErrors.privacy}</p>
            )}

            <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          {/* Third-party sign-up disabled */}

          <div className="text-sm text-gray-300 mt-4 text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-300 hover:text-blue-200">Sign in</Link>
          </div>
        </motion.div>
        {/* Email Verification Modal */}
        {showVerification && user && (
          <EmailVerificationModal
            isOpen={showVerification}
            onClose={handleCloseVerification}
            onVerificationComplete={handleVerificationComplete}
            userEmail={user.email}
            userId={user.id}
            userName={`${firstName || user.firstName || ''} ${lastName || user.lastName || ''}`.trim()}
          />
        )}
      </div>
    </AuthGuard>
  )
}
