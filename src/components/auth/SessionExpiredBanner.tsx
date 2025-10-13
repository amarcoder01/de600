"use client"

import React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export function SessionExpiredBanner() {
  const searchParams = useSearchParams()
  const [visible, setVisible] = React.useState(true)

  const sessionExpired =
    searchParams?.get('session_expired') === '1' ||
    searchParams?.get('message') === 'session_expired'

  if (!sessionExpired || !visible) return null

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-amber-800">
          Your session timed out for security. Sign in again to continue.
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm font-medium text-amber-900 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-md"
          >
            Sign in
          </Link>
          <button
            onClick={() => setVisible(false)}
            className="text-sm text-amber-700 hover:text-amber-900 px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
