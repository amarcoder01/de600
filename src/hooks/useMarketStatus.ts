import { useState, useEffect } from 'react'
import { getMarketStatus, type MarketStatusInfo } from '@/lib/market-status-utils'
import { useAuthStore } from '@/store'

/**
 * Hook for timezone-aware market status
 * Automatically detects user timezone and provides market status information
 */
export function useMarketStatus() {
  const { user } = useAuthStore()
  const [marketStatus, setMarketStatus] = useState<MarketStatusInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const updateMarketStatus = () => {
      try {
        const status = getMarketStatus(undefined, user?.preferences)
        setMarketStatus(status)
        setLoading(false)
      } catch (error) {
        console.error('Error getting market status:', error)
        setLoading(false)
      }
    }

    // Initial update
    updateMarketStatus()

    // Update every minute to keep status current
    const interval = setInterval(updateMarketStatus, 60000)

    return () => clearInterval(interval)
  }, [user?.preferences])

  return {
    marketStatus,
    loading,
    isOpen: marketStatus?.isOpen ?? false,
    status: marketStatus?.status ?? 'closed',
    tradingSession: marketStatus?.tradingSession ?? 'Market Closed',
    currentTimeLocal: marketStatus?.currentTimeLocal ?? '',
    currentTimeET: marketStatus?.currentTimeET ?? '',
    nextOpenET: marketStatus?.nextOpenET,
    nextCloseET: marketStatus?.nextCloseET,
    timezoneInfo: marketStatus?.timezoneInfo
  }
}
