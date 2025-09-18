'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  AlertCircle, 
  ExternalLink,
  DollarSign,
  BarChart3,
  Clock,
  Activity
} from 'lucide-react'
import { topGainersLosersApiService } from '@/lib/top-gainers-losers-api'
import type { StockData } from '@/types/top-gainers-losers'

interface TopGainersLosersWidgetProps {
  limit?: number
  showRefresh?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

const DEFAULT_LIMIT = 5
const DEFAULT_REFRESH_INTERVAL = 30000 // 30 seconds

export default function TopGainersLosersWidget({
  limit = DEFAULT_LIMIT,
  showRefresh = true,
  autoRefresh = false,
  refreshInterval = DEFAULT_REFRESH_INTERVAL
}: TopGainersLosersWidgetProps) {
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
        setError("No market data available. Market may be closed or data temporarily unavailable.")
      }
    } catch (err: any) {
      console.error('Error loading top movers:', err)
      setError(
        typeof err?.message === "string"
          ? err.message
          : "Failed to load market data. Please try again later."
      )
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

  const StockRow = ({ stock, type }: { stock: StockData; type: 'gainer' | 'loser' }) => {
    const changeData = formatChange(stock.change, stock.changePercent)
    const isGainer = type === 'gainer'
    
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 hover:shadow-md transition-all duration-200 group"
      >
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 ${
            isGainer 
              ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
              : 'bg-gradient-to-br from-red-500 to-rose-600'
          }`}>
            {stock.symbol?.[0] || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                {stock.symbol}
              </h4>
              <Badge 
                variant="secondary" 
                className={`text-xs ${
                  isGainer 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                }`}
              >
                {stock.sector || 'Stock'}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {stock.name}
            </p>
          </div>
        </div>
        
        <div className="text-right space-y-1">
          <div className="font-bold text-gray-900 dark:text-white">
            {formatPrice(stock.price)}
          </div>
          <div className={`text-sm font-medium flex items-center justify-end space-x-1 ${
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
          <div className={`text-xs ${
            changeData.isPositive 
              ? 'text-green-500 dark:text-green-500' 
              : 'text-red-500 dark:text-red-500'
          }`}>
            {changeData.change}
          </div>
        </div>
      </motion.div>
    )
  }

  const EmptyState = ({ type }: { type: 'gainers' | 'losers' }) => (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        {type === 'gainers' ? (
          <TrendingUp className="w-8 h-8 text-gray-400" />
        ) : (
          <TrendingDown className="w-8 h-8 text-gray-400" />
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
        No {type} data
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Market may be closed or data unavailable
      </p>
    </div>
  )

  const LoadingState = () => (
    <div className="space-y-3">
      {[...Array(limit)].map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3" />
          </div>
          <div className="text-right space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-12" />
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Top Market Movers</CardTitle>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="w-3 h-3" />
                <span>
                  {lastUpdated 
                    ? `Updated ${lastUpdated.toLocaleTimeString()}` 
                    : 'Loading...'
                  }
                </span>
              </div>
            </div>
          </div>
          
          {showRefresh && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleRefresh} 
              disabled={loading || isRefreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start space-x-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
          >
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                Data Unavailable
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Gainers */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Top Gainers
              </h3>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                {gainers.length}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <AnimatePresence>
                {loading ? (
                  <LoadingState />
                ) : gainers.length === 0 ? (
                  <EmptyState type="gainers" />
                ) : (
                gainers.map((stock, index) => (
                  <StockRow key={`${stock.symbol}-${index}`} stock={stock} type="gainer" />
                ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Top Losers */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Top Losers
              </h3>
              <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                {losers.length}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <AnimatePresence>
                {loading ? (
                  <LoadingState />
                ) : losers.length === 0 ? (
                  <EmptyState type="losers" />
                ) : (
                losers.map((stock, index) => (
                  <StockRow key={`${stock.symbol}-${index}`} stock={stock} type="loser" />
                ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Market Summary */}
        {!loading && !error && (gainers.length > 0 || losers.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Market Activity
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {gainers.length} gainers • {losers.length} losers
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => window.open('/top-movers', '_blank')}
                className="flex items-center space-x-2"
              >
                <span>View All</span>
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
