'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  AlertCircle,
  ChevronRight
} from 'lucide-react'
import { topGainersLosersApiService } from '@/lib/top-gainers-losers-api'
import type { StockData } from '@/types/top-gainers-losers'

interface CompactTopMoversWidgetProps {
  limit?: number
  showRefresh?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

const DEFAULT_LIMIT = 3
const DEFAULT_REFRESH_INTERVAL = 30000 // 30 seconds

export default function CompactTopMoversWidget({
  limit = DEFAULT_LIMIT,
  showRefresh = true,
  autoRefresh = false,
  refreshInterval = DEFAULT_REFRESH_INTERVAL
}: CompactTopMoversWidgetProps) {
  const [gainers, setGainers] = useState<StockData[]>([])
  const [losers, setLosers] = useState<StockData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    
    try {
      const marketData = await topGainersLosersApiService.fetchMarketData(limit * 2) // Get more data to ensure we have enough

      const topGainers = (marketData?.gainers || []).slice(0, limit)
      const topLosers = (marketData?.losers || []).slice(0, limit)

      setGainers(topGainers)
      setLosers(topLosers)
      setLastUpdated(new Date())

      if (topGainers.length === 0 && topLosers.length === 0) {
        setError("No market data available")
      }
    } catch (err: any) {
      console.error('Error loading top movers:', err)
      setError("Failed to load market data")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [limit])

  // Initial load
  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, loadData])

  const handleRefresh = () => {
    loadData(true)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  const formatChange = (change: number, changePercent: number) => {
    const isPositive = change >= 0
    const sign = isPositive ? '+' : ''
    return {
      change: `${sign}${formatPrice(change)}`,
      percent: `${sign}${changePercent.toFixed(2)}%`,
      isPositive
    }
  }

  const StockItem = ({ stock, type }: { stock: StockData; type: 'gainer' | 'loser' }) => {
    const changeData = formatChange(stock.change, stock.changePercent)
    const isGainer = type === 'gainer'
    
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center justify-between py-2 px-3 rounded-md bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        onClick={() => window.open(`/top-movers?symbol=${stock.symbol}`, '_blank')}
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className={`w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs shrink-0 ${
            isGainer 
              ? 'bg-green-500' 
              : 'bg-red-500'
          }`}>
            {stock.symbol?.[0] || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm">
              {stock.symbol}
            </h4>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatPrice(stock.price)}
          </div>
          <div className={`text-xs font-medium flex items-center justify-end space-x-1 ${
            changeData.isPositive 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {isGainer ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{changeData.percent}</span>
          </div>
        </div>
      </motion.div>
    )
  }

  const EmptyState = ({ type }: { type: 'gainers' | 'losers' }) => (
    <div className="text-center py-4">
      <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        {type === 'gainers' ? (
          <TrendingUp className="w-4 h-4 text-gray-400" />
        ) : (
          <TrendingDown className="w-4 h-4 text-gray-400" />
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        No {type} data
      </p>
    </div>
  )

  const LoadingState = () => (
    <div className="space-y-2">
      {[...Array(limit)].map((_, i) => (
        <div key={i} className="flex items-center space-x-2 py-2 px-3 rounded-md bg-gray-50 dark:bg-gray-800">
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3" />
          </div>
          <div className="text-right space-y-1">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-12" />
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-8" />
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Top Movers</CardTitle>
              {lastUpdated && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          
          {showRefresh && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleRefresh} 
              disabled={loading || isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`w-4 h-4 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Gainers */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Gainers
              </h3>
            </div>
            
            <div className="space-y-1">
              {loading ? (
                <LoadingState />
              ) : gainers.length === 0 ? (
                <EmptyState type="gainers" />
              ) : (
                gainers.map((stock, index) => (
                  <StockItem key={`${stock.symbol}-${index}`} stock={stock} type="gainer" />
                ))
              )}
            </div>
          </div>

          {/* Top Losers */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Losers
              </h3>
            </div>
            
            <div className="space-y-1">
              {loading ? (
                <LoadingState />
              ) : losers.length === 0 ? (
                <EmptyState type="losers" />
              ) : (
                losers.map((stock, index) => (
                  <StockItem key={`${stock.symbol}-${index}`} stock={stock} type="loser" />
                ))
              )}
            </div>
          </div>
        </div>

        {/* View All Link */}
        {!loading && !error && (gainers.length > 0 || losers.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-2 border-t border-gray-200 dark:border-gray-700"
          >
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => window.open('/top-movers', '_blank')}
              className="w-full flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <span>View All Movers</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
