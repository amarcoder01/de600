'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface StockPrice {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  lastUpdated: string
}

interface LivePriceTickerProps {
  symbols: string[]
  autoRefresh?: boolean
  refreshInterval?: number
}

export function LivePriceTicker({ 
  symbols, 
  autoRefresh = true, 
  refreshInterval = 30000 
}: LivePriceTickerProps) {
  const [prices, setPrices] = useState<StockPrice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchPrices = async () => {
    try {
      setLoading(true)
      setError(null)

      const pricePromises = symbols.map(async (symbol) => {
        const response = await fetch(`/api/quote/${symbol}`)
        if (response.ok) {
          const data = await response.json()
          return data.stock
        }
        return null
      })

      const results = await Promise.all(pricePromises)
      const validPrices = results.filter(price => price !== null)
      
      setPrices(validPrices)
      setLastUpdate(new Date())
    } catch (err) {
      setError('Failed to fetch price data')
      console.error('Error fetching prices:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrices()

    if (autoRefresh) {
      const interval = setInterval(fetchPrices, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [symbols, autoRefresh, refreshInterval])

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Activity className="w-4 h-4 text-gray-500" />
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price)
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`
    return volume.toString()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Live Price Ticker</span>
            {loading && (
              <Badge variant="outline" className="animate-pulse">
                Updating...
              </Badge>
            )}
          </CardTitle>
          
          <div className="text-xs text-muted-foreground">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-red-600 text-sm">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {prices.map((price, index) => (
              <motion.div
                key={price.symbol}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{price.symbol}</h3>
                    <p className="text-sm text-muted-foreground">{price.name}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getChangeIcon(price.change)}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {formatPrice(price.price)}
                    </span>
                    <span className={`text-sm font-medium ${getChangeColor(price.change)}`}>
                      {price.change >= 0 ? '+' : ''}{formatPrice(price.change)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${getChangeColor(price.change)}`}>
                      {price.changePercent >= 0 ? '+' : ''}{price.changePercent.toFixed(2)}%
                    </span>
                    <span className="text-muted-foreground">
                      Vol: {formatVolume(price.volume)}
                    </span>
                  </div>
                </div>

                {/* Price change animation */}
                <motion.div
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.3 }}
                  className={`absolute inset-0 rounded-lg ${
                    price.change > 0 ? 'bg-green-500/10' : 
                    price.change < 0 ? 'bg-red-500/10' : 'bg-transparent'
                  }`}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {prices.length === 0 && !loading && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No price data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
