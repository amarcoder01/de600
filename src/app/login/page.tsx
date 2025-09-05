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
import { Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login, error, clearError, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showForgot, setShowForgot] = useState(false)

  useEffect(() => {
    clearError()
  }, [clearError])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErrors({})
    clearError()

    const errs: Record<string, string> = {}
    if (!email.trim()) errs.email = 'Email is required'
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
          className="relative w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex flex-col items-center text-center mb-6">
            <VidalityLogo className="h-10 w-auto text-white mb-3" />
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
                  className={`pl-9 ${validationErrors.email ? 'border-red-500' : ''}`}
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

            <div className="flex items-center justify-between text-sm">
              <div />
              <button type="button" onClick={() => setShowForgot(true)} className="text-blue-300 hover:text-blue-200">
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="text-sm text-gray-300 mt-4 text-center">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-300 hover:text-blue-200">Create one</Link>
          </div>

          <ForgotPasswordModal
            isOpen={showForgot}
            onClose={() => setShowForgot(false)}
            onSwitchToLogin={() => setShowForgot(false)}
          />
        </motion.div>
      </div>
    </AuthGuard>
  )
}
