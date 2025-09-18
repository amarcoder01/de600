'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/utils'

interface PriceTickerProps {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume?: number
  className?: string
}

export function PriceTicker({ 
  symbol, 
  name, 
  price, 
  change, 
  changePercent, 
  volume,
  className 
}: PriceTickerProps) {
  const [isPositive, setIsPositive] = useState(changePercent >= 0)
  const [prevPrice, setPrevPrice] = useState(price)

  useEffect(() => {
    if (price !== prevPrice) {
      setIsPositive(price > prevPrice)
      setPrevPrice(price)
    }
  }, [price, prevPrice])

  return (
    <motion.div
      className={`p-4 rounded-lg border bg-card hover:shadow-md transition-all duration-200 cursor-pointer ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-lg">{symbol}</h3>
            <AnimatePresence mode="wait">
              {isPositive ? (
                <motion.div
                  key="up"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-6 h-6 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center"
                >
                  <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
                </motion.div>
              ) : (
                <motion.div
                  key="down"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-6 h-6 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center"
                >
                  <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p className="text-sm text-muted-foreground truncate">{name}</p>
        </div>
        
        <div className="text-right">
          <motion.div
            key={price}
            initial={{ scale: 1.1, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-xl font-bold"
          >
            {formatCurrency(price)}
          </motion.div>
          <div className="flex items-center space-x-1 text-sm">
            <span className={changePercent >= 0 ? 'text-green-500' : 'text-red-500'}>
              {changePercent >= 0 ? '+' : ''}{formatPercentage(changePercent)}
            </span>
            <span className="text-muted-foreground">
              ({change >= 0 ? '+' : ''}{formatCurrency(change)})
            </span>
          </div>
          {volume && (
            <p className="text-xs text-muted-foreground">
              Vol: {volume.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

interface TickerGridProps {
  tickers: Array<{
    symbol: string
    name: string
    price: number
    change: number
    changePercent: number
    volume?: number
  }>
  className?: string
}

export function TickerGrid({ tickers, className }: TickerGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}>
      {tickers.map((ticker) => (
        <PriceTicker
          key={ticker.symbol}
          symbol={ticker.symbol}
          name={ticker.name}
          price={ticker.price}
          change={ticker.change}
          changePercent={ticker.changePercent}
          volume={ticker.volume}
        />
      ))}
    </div>
  )
} 