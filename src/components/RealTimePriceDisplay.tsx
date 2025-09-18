import React from 'react'
import { cn } from '@/lib/utils'
import { usePriceChangeIndicator } from '@/hooks/useRealTimeComparison'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface RealTimePriceDisplayProps {
  symbol: string
  price: number
  change: number
  changePercent: number
  isUpdating?: boolean
  className?: string
  showSymbol?: boolean
}

export function RealTimePriceDisplay({
  symbol,
  price,
  change,
  changePercent,
  isUpdating = false,
  className,
  showSymbol = false
}: RealTimePriceDisplayProps) {
  const { changeDirection, isAnimating, getIndicatorClass, getChangeColor } = usePriceChangeIndicator(symbol, price)

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatChange = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(2)}`
  }

  const formatChangePercent = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(2)}%`
  }

  const getChangeIcon = () => {
    if (changePercent > 0) return <TrendingUp className="w-4 h-4" />
    if (changePercent < 0) return <TrendingDown className="w-4 h-4" />
    return <Activity className="w-4 h-4" />
  }

  return (
    <div className={cn(
      'flex items-center space-x-2 p-2 rounded-lg transition-all duration-300',
      isAnimating && getIndicatorClass(),
      isUpdating && 'ring-2 ring-blue-200 ring-opacity-50',
      className
    )}>
      {showSymbol && (
        <span className="text-sm font-medium text-gray-600">{symbol}</span>
      )}
      
      <div className="flex flex-col">
        <div className="flex items-center space-x-1">
          <span className={cn(
            'font-semibold text-lg',
            isUpdating && 'animate-pulse'
          )}>
            {formatPrice(price)}
          </span>
          {isUpdating && (
            <Activity className="w-3 h-3 text-blue-500 animate-spin" />
          )}
        </div>
        
        <div className={cn(
          'flex items-center space-x-1 text-sm',
          getChangeColor()
        )}>
          {getChangeIcon()}
          <span>{formatChange(change)}</span>
          <span>({formatChangePercent(changePercent)})</span>
        </div>
      </div>
    </div>
  )
}

interface RealTimeVolumeDisplayProps {
  symbol: string
  volume: number
  isUpdating?: boolean
  className?: string
}

export function RealTimeVolumeDisplay({
  symbol,
  volume,
  isUpdating = false,
  className
}: RealTimeVolumeDisplayProps) {
  const formatVolume = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toLocaleString()
  }

  return (
    <div className={cn(
      'flex items-center space-x-2 p-2 rounded-lg transition-all duration-300',
      isUpdating && 'bg-blue-50 ring-2 ring-blue-200 ring-opacity-50',
      className
    )}>
      <Activity className={cn(
        'w-4 h-4 text-gray-500',
        isUpdating && 'text-blue-500 animate-pulse'
      )} />
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">Volume</span>
        <span className={cn(
          'font-medium',
          isUpdating && 'animate-pulse text-blue-600'
        )}>
          {formatVolume(volume)}
        </span>
      </div>
    </div>
  )
}

interface RealTimeMarketCapDisplayProps {
  symbol: string
  marketCap: number
  isUpdating?: boolean
  className?: string
}

export function RealTimeMarketCapDisplay({
  symbol,
  marketCap,
  isUpdating = false,
  className
}: RealTimeMarketCapDisplayProps) {
  const formatMarketCap = (value: number) => {
    if (value >= 1000000000000) {
      return `$${(value / 1000000000000).toFixed(2)}T`
    } else if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`
    }
    return `$${value.toLocaleString()}`
  }

  return (
    <div className={cn(
      'flex items-center space-x-2 p-2 rounded-lg transition-all duration-300',
      isUpdating && 'bg-blue-50 ring-2 ring-blue-200 ring-opacity-50',
      className
    )}>
      <TrendingUp className={cn(
        'w-4 h-4 text-gray-500',
        isUpdating && 'text-blue-500 animate-pulse'
      )} />
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">Market Cap</span>
        <span className={cn(
          'font-medium',
          isUpdating && 'animate-pulse text-blue-600'
        )}>
          {formatMarketCap(marketCap)}
        </span>
      </div>
    </div>
  )
}

// Combined real-time display component
interface RealTimeStockDisplayProps {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume?: number
  marketCap?: number
  isUpdating?: boolean
  className?: string
  compact?: boolean
}

export function RealTimeStockDisplay({
  symbol,
  price,
  change,
  changePercent,
  volume,
  marketCap,
  isUpdating = false,
  className,
  compact = false
}: RealTimeStockDisplayProps) {
  if (compact) {
    return (
      <div className={cn(
        'flex items-center justify-between p-3 bg-white rounded-lg border transition-all duration-300',
        isUpdating && 'ring-2 ring-blue-200 ring-opacity-50 bg-blue-50',
        className
      )}>
        <div className="flex items-center space-x-3">
          <span className="font-medium text-gray-900">{symbol}</span>
          <RealTimePriceDisplay
            symbol={symbol}
            price={price}
            change={change}
            changePercent={changePercent}
            isUpdating={isUpdating}
          />
        </div>
        {isUpdating && (
          <Activity className="w-4 h-4 text-blue-500 animate-spin" />
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'p-4 bg-white rounded-lg border space-y-3 transition-all duration-300',
      isUpdating && 'ring-2 ring-blue-200 ring-opacity-50 bg-blue-50',
      className
    )}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-gray-900">{symbol}</h3>
        {isUpdating && (
          <div className="flex items-center space-x-1 text-blue-600">
            <Activity className="w-4 h-4 animate-spin" />
            <span className="text-xs">Updating...</span>
          </div>
        )}
      </div>
      
      <RealTimePriceDisplay
        symbol={symbol}
        price={price}
        change={change}
        changePercent={changePercent}
        isUpdating={isUpdating}
      />
      
      <div className="grid grid-cols-2 gap-3">
        {volume !== undefined && (
          <RealTimeVolumeDisplay
            symbol={symbol}
            volume={volume}
            isUpdating={isUpdating}
          />
        )}
        {marketCap !== undefined && (
          <RealTimeMarketCapDisplay
            symbol={symbol}
            marketCap={marketCap}
            isUpdating={isUpdating}
          />
        )}
      </div>
    </div>
  )
}