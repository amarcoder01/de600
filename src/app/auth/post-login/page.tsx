'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PostLogin() {
  const router = useRouter()
  const [message, setMessage] = useState('Completing sign-in…')

  useEffect(() => {
    const run = async () => {
      try {
        setMessage('Finalizing your session…')
        const res = await fetch('/api/auth/oauth/exchange', { method: 'POST' })
        if (!res.ok) {
          const txt = await res.text().catch(() => '')
          console.error('❌ /api/auth/oauth/exchange failed', res.status, txt)
          setMessage('Could not finalize sign-in. Redirecting to login…')
          setTimeout(() => router.replace('/login?error=ExchangeFailed'), 600)
          return
        }
        const data = await res.json().catch(() => ({}))
        console.log('✅ OAuth exchange completed', data)
        setMessage('Signed in! Redirecting…')
        setTimeout(() => router.replace('/dashboard'), 400)
      } catch (e) {
        console.error('❌ Post-login error', e)
        setMessage('Something went wrong. Redirecting to login…')
        setTimeout(() => router.replace('/login?error=PostLoginError'), 600)
      }
    }
    run()
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
