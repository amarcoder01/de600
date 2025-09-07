'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PostLogin() {
  const router = useRouter()
  const [message, setMessage] = useState('Completing sign-in…')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        setMessage('Finalizing your session…')
        const res = await fetch('/api/auth/exchange', { method: 'POST' })
        if (!res.ok) {
          const txt = await res.text().catch(() => '')
          console.error('❌ /api/auth/exchange failed', res.status, txt)
          setMessage('Could not finalize sign-in. Redirecting to login…')
          setTimeout(() => router.replace('/login?error=ExchangeFailed'), 600)
          return
        }
        const data = await res.json().catch(() => ({}))
        console.log('✅ Exchange completed', data)
        setMessage('Signed in! Redirecting…')
        // Small delay to allow cookies/localStorage hydration by the store
        setTimeout(() => router.replace('/dashboard'), 400)
      } catch (e) {
        console.error('❌ Post-login error', e)
        setMessage('Something went wrong. Redirecting to login…')
        setTimeout(() => router.replace('/login?error=PostLoginError'), 600)
      }
    }
    run()
    return () => { cancelled = true }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center p-6">
        <div className="text-xl mb-2">{message}</div>
        <div className="text-sm opacity-75">This only takes a moment…</div>
      </div>
    </div>
  )
}


