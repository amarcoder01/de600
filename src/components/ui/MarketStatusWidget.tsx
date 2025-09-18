'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Radio, Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarketStatus {
  isOpen: boolean
  isPreMarket: boolean
  isPostMarket: boolean
  isExtendedHours: boolean
  status: 'open' | 'closed' | 'pre-market' | 'post-market'
  nextOpen: string | null
  nextClose: string | null
  marketTime: string
  currentTime: string
}

interface MarketStatusResponse {
  success: boolean
  data: MarketStatus
  timestamp: string
}

interface MarketStatusWidgetProps {
  className?: string
  compact?: boolean
}

export function MarketStatusWidget({ className, compact = false }: MarketStatusWidgetProps) {
  const { data: statusResponse, isLoading } = useQuery<MarketStatusResponse>({
    queryKey: ['/api/market/status'],
    queryFn: async () => {
      const response = await fetch('/api/market/status')
      if (!response.ok) {
        throw new Error('Failed to fetch market status')
      }
      return response.json()
    },
    refetchInterval: 60000, // Refresh every minute
    retry: 1,
    staleTime: 30000, // Consider data stale after 30 seconds
  })

  const marketStatus = statusResponse?.data

  const getStatusInfo = () => {
    if (!marketStatus) return { text: 'Unknown', color: 'text-gray-500', bgColor: 'bg-gray-100', dotColor: 'bg-gray-400' }
    
    switch (marketStatus.status) {
      case 'open':
        return { 
          text: 'Market Open', 
          color: 'text-green-700 dark:text-green-400', 
          bgColor: 'bg-green-100 dark:bg-green-900/20', 
          dotColor: 'bg-green-500' 
        }
      case 'pre-market':
        return { 
          text: 'Pre-Market', 
          color: 'text-blue-700 dark:text-blue-400', 
          bgColor: 'bg-blue-100 dark:bg-blue-900/20', 
          dotColor: 'bg-blue-500' 
        }
      case 'post-market':
        return { 
          text: 'After Hours', 
          color: 'text-orange-700 dark:text-orange-400', 
          bgColor: 'bg-orange-100 dark:bg-orange-900/20', 
          dotColor: 'bg-orange-500' 
        }
      case 'closed':
        return { 
          text: 'Market Closed', 
          color: 'text-red-700 dark:text-red-400', 
          bgColor: 'bg-red-100 dark:bg-red-900/20', 
          dotColor: 'bg-red-500' 
        }
      default:
        return { 
          text: 'Unknown', 
          color: 'text-gray-500', 
          bgColor: 'bg-gray-100 dark:bg-gray-900/20', 
          dotColor: 'bg-gray-400' 
        }
    }
  }

  const formatTime = (timeString: string) => {
    const time = new Date(timeString)
    return time.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZone: 'America/New_York'
    })
  }

  const getCurrentMarketTime = () => {
    if (!marketStatus?.marketTime) return 'N/A'
    return formatTime(marketStatus.marketTime)
  }

  const getNextEventTime = () => {
    if (!marketStatus) return null
    
    if (marketStatus.isOpen && marketStatus.nextClose) {
      return `Closes ${formatTime(marketStatus.nextClose)}`
    } else if (!marketStatus.isOpen && marketStatus.nextOpen) {
      return `Opens ${formatTime(marketStatus.nextOpen)}`
    }
    return null
  }

  const statusInfo = getStatusInfo()

  if (isLoading) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
        <span className="text-xs text-gray-500">Loading...</span>
      </div>
    )
  }

  if (compact) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className={cn('flex items-center px-2 py-1 rounded-full text-xs font-medium', statusInfo.bgColor, statusInfo.color)}>
          <div className={cn('w-2 h-2 rounded-full mr-1.5', statusInfo.dotColor, {
            'animate-pulse': marketStatus?.isOpen
          })} />
          <span className="hidden sm:inline">{statusInfo.text}</span>
          <span className="sm:hidden">{marketStatus?.isOpen ? 'Open' : 'Closed'}</span>
        </div>
        <div className="hidden md:flex items-center text-xs text-muted-foreground">
          <Clock className="w-3 h-3 mr-1" />
          <span>{getCurrentMarketTime()} ET</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col space-y-1', className)}>
      <div className={cn('flex items-center px-3 py-1.5 rounded-full text-sm font-medium', statusInfo.bgColor, statusInfo.color)}>
        <Radio className={cn('w-3 h-3 mr-2', {
          'animate-pulse': marketStatus?.isOpen
        })} />
        <span>{statusInfo.text}</span>
      </div>
      
      <div className="flex items-center space-x-3 text-xs text-muted-foreground">
        <div className="flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          <span>{getCurrentMarketTime()} ET</span>
        </div>
        
        {getNextEventTime() && (
          <span className="text-xs">{getNextEventTime()}</span>
        )}
      </div>
    </div>
  )
}

// Minimal version for very compact spaces
export function MarketStatusDot({ className }: { className?: string }) {
  const { data: statusResponse, isLoading } = useQuery<MarketStatusResponse>({
    queryKey: ['/api/market/status'],
    queryFn: async () => {
      const response = await fetch('/api/market/status')
      if (!response.ok) {
        throw new Error('Failed to fetch market status')
      }
      return response.json()
    },
    refetchInterval: 60000,
    retry: 1,
    staleTime: 30000,
  })

  const marketStatus = statusResponse?.data
  const statusInfo = React.useMemo(() => {
    if (!marketStatus) return { dotColor: 'bg-gray-400', tooltip: 'Market Status Unknown' }
    
    switch (marketStatus.status) {
      case 'open':
        return { dotColor: 'bg-green-500', tooltip: 'Market Open' }
      case 'pre-market':
        return { dotColor: 'bg-blue-500', tooltip: 'Pre-Market' }
      case 'post-market':
        return { dotColor: 'bg-orange-500', tooltip: 'After Hours' }
      case 'closed':
        return { dotColor: 'bg-red-500', tooltip: 'Market Closed' }
      default:
        return { dotColor: 'bg-gray-400', tooltip: 'Unknown' }
    }
  }, [marketStatus])

  if (isLoading) {
    return <div className={cn('w-2 h-2 rounded-full bg-gray-300 animate-pulse', className)} />
  }

  return (
    <div 
      className={cn('w-2 h-2 rounded-full', statusInfo.dotColor, {
        'animate-pulse': marketStatus?.isOpen
      }, className)}
      title={statusInfo.tooltip}
    />
  )
}
