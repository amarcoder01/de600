import React from 'react'
import { MarketStatusProps } from '@/types/top-movers'
import { LoadingSpinner } from './LoadingSpinner'
import { useMarketStatus } from '@/hooks/useMarketStatus'

export const MarketStatus: React.FC<MarketStatusProps> = ({ marketStatus, loading }) => {
  const { 
    isOpen, 
    tradingSession, 
    currentTimeLocal, 
    currentTimeET, 
    nextOpenET,
    timezoneInfo 
  } = useMarketStatus()

  const message = loading 
    ? 'Loading...' 
    : `${tradingSession} • Local: ${currentTimeLocal} • ET: ${currentTimeET}${!isOpen && nextOpenET ? ` • Next Open: ${nextOpenET} ET` : ''}`

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Market Status
            </h2>
            <p className="text-sm text-gray-600">
              {message}
            </p>
            {timezoneInfo && (
              <p className="text-xs text-gray-500 mt-1">
                Your timezone: {timezoneInfo.userTimezone} • Market timezone: {timezoneInfo.marketTimezone}
              </p>
            )}
          </div>
        </div>
        {loading && <LoadingSpinner size="small" />}
      </div>
    </div>
  )
}
