'use client'

import React, { useEffect, useRef, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

/**
 * Non-intrusive global network banner for dashboard only.
 * - Renders nothing by default.
 * - Shows a tiny fixed banner when offline.
 * - Does not block clicks or layout (pointer-events-none wrapper).
 */
export function NetworkStatusBanner() {
  const { isOnline, lastChangedAt } = useNetworkStatus()
  const [showOnlineToast, setShowOnlineToast] = useState(false)
  const prevOnlineRef = useRef<boolean | null>(null)

  // Briefly show a small "Back online" toast without affecting layout
  useEffect(() => {
    const prevOnline = prevOnlineRef.current

    // Only show toast when transitioning from offline -> online
    if (prevOnline === false && isOnline === true) {
      setShowOnlineToast(true)
      const t = setTimeout(() => setShowOnlineToast(false), 2000)
      return () => clearTimeout(t)
    }

    // Update previous state after handling logic
    prevOnlineRef.current = isOnline
  }, [isOnline, lastChangedAt])

  if (isOnline && !showOnlineToast) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center">
      <div className={`mx-auto mt-2 max-w-fit rounded-md border px-3 py-1 text-xs shadow-sm transition-colors ${
        isOnline
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-3.5 w-3.5" />
          ) : (
            <WifiOff className="h-3.5 w-3.5" />
          )}
          <span className="font-medium">
            {isOnline ? 'Network restored' : 'You are offline'}
          </span>
          {!isOnline && (
            <span className="text-amber-700/80">— showing last loaded data</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default NetworkStatusBanner
