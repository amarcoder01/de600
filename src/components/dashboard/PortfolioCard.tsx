'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Eye, Activity } from 'lucide-react'

interface PortfolioCardProps {
  title: string
  value: string | number
  change?: number
  changePercent?: number
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function PortfolioCard({ 
  title, 
  value, 
  change, 
  changePercent, 
  icon: Icon, 
  iconColor, 
  subtitle,
  trend = 'neutral'
}: PortfolioCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(val)
    }
    return val
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  const getChangeColor = () => {
    if (changePercent === undefined) return 'text-gray-600'
    return changePercent >= 0 ? 'text-green-600' : 'text-red-600'
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>{title}</span>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatValue(value)}</div>
          {(change !== undefined || changePercent !== undefined) && (
            <div className="flex items-center space-x-1 text-sm mt-1">
              {getTrendIcon()}
              {changePercent !== undefined && (
                <span className={getChangeColor()}>
                  {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                </span>
              )}
              {change !== undefined && (
                <span className={getChangeColor()}>
                  {change >= 0 ? '+' : ''}{formatValue(change)}
                </span>
              )}
              {subtitle && (
                <span className="text-muted-foreground ml-1">{subtitle}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}



export function WatchlistsCard({ count }: { count: number }) {
  return (
    <PortfolioCard
      title="Watchlists"
      value={count}
      icon={Eye}
      iconColor="text-purple-600"
      subtitle="Active watchlists"
    />
  )
}

export function TodayTradesCard({ count }: { count: number }) {
  return (
    <PortfolioCard
      title="Today's Trades"
      value={count}
      icon={Activity}
      iconColor="text-orange-600"
      subtitle="Trades executed"
    />
  )
}
