'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  RefreshCw, 
  BarChart3,
  DollarSign,
  Target,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EarningsEvent, SentimentScore } from '@/types'

interface EarningsCalendarProps {
  symbol?: string
  autoRefresh?: boolean
  showFilters?: boolean
}

export default function EarningsCalendar({ symbol, autoRefresh = true, showFilters = true }: EarningsCalendarProps) {
  const [earnings, setEarnings] = useState<EarningsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState({
    days: '30',
    showPredictions: true
  })

  const fetchEarnings = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        days: filter.days,
        ...(symbol && { symbol })
      })
      
      const response = await fetch(`/api/news/earnings?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setEarnings(data.data)
      } else {
        setError(data.message || 'Failed to fetch earnings')
      }
    } catch (error) {
      console.error('Error fetching earnings:', error)
      setError('Failed to load earnings calendar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEarnings()
  }, [symbol, filter])

  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(fetchEarnings, 600000) // Refresh every 10 minutes
    return () => clearInterval(interval)
  }, [autoRefresh, symbol, filter])

  const getSentimentColor = (sentiment: SentimentScore) => {
    if (sentiment.label === 'positive') return 'text-green-600 bg-green-100 dark:bg-green-900/20'
    if (sentiment.label === 'negative') return 'text-red-600 bg-red-100 dark:bg-red-900/20'
    return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
  }

  const getSentimentIcon = (sentiment: SentimentScore) => {
    if (sentiment.label === 'positive') return <TrendingUp className="w-4 h-4" />
    if (sentiment.label === 'negative') return <TrendingDown className="w-4 h-4" />
    return <BarChart3 className="w-4 h-4" />
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  }

  const formatTimeUntil = (date: Date) => {
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h`
    return 'Today'
  }

  const getPredictionColor = (prediction: number, estimate: number) => {
    const percentDiff = ((prediction - estimate) / estimate) * 100
    if (percentDiff > 5) return 'text-green-600'
    if (percentDiff < -5) return 'text-red-600'
    return 'text-gray-600'
  }

  const getPredictionIcon = (prediction: number, estimate: number) => {
    const percentDiff = ((prediction - estimate) / estimate) * 100
    if (percentDiff > 5) return <TrendingUp className="w-4 h-4" />
    if (percentDiff < -5) return <TrendingDown className="w-4 h-4" />
    return <Target className="w-4 h-4" />
  }

  const upcomingEarnings = earnings.filter(e => new Date(e.reportDate) > new Date())
  const recentEarnings = earnings.filter(e => new Date(e.reportDate) <= new Date())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {symbol ? `${symbol} Earnings` : 'Earnings Calendar'}
          </h2>
          <p className="text-muted-foreground">
            Upcoming earnings with AI-powered predictions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEarnings}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Time Horizon</label>
                <Select
                  value={filter.days}
                  onValueChange={(value) => setFilter(prev => ({ ...prev, days: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Next 7 Days</SelectItem>
                    <SelectItem value="14">Next 14 Days</SelectItem>
                    <SelectItem value="30">Next 30 Days</SelectItem>
                    <SelectItem value="90">Next 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Display Options</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showPredictions"
                    checked={filter.showPredictions}
                    onChange={(e) => setFilter(prev => ({ ...prev, showPredictions: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="showPredictions" className="text-sm">
                    Show AI Predictions
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Earnings Calendar */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading earnings calendar...</p>
          </div>
        ) : earnings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No earnings found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or check back later
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Upcoming Earnings */}
            {upcomingEarnings.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Upcoming Earnings ({upcomingEarnings.length})
                </h3>
                <div className="grid gap-4">
                  <AnimatePresence mode="popLayout">
                    {upcomingEarnings.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="hover:shadow-lg transition-all duration-200">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">{event.symbol}</span>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-lg">{event.symbol}</h4>
                                  <p className="text-sm text-muted-foreground">{event.companyName}</p>
                                  <div className="flex items-center space-x-4 mt-1">
                                    <span className="text-sm text-muted-foreground">
                                      {formatDate(event.reportDate)}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {formatTimeUntil(event.reportDate)}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="flex items-center space-x-4">
                                  {/* Estimate */}
                                  <div>
                                    <p className="text-sm text-muted-foreground">Estimate</p>
                                    <p className="font-semibold">${event.estimate.toFixed(2)}</p>
                                  </div>
                                  
                                  {/* Prediction */}
                                  {filter.showPredictions && (
                                    <div>
                                      <p className="text-sm text-muted-foreground">AI Prediction</p>
                                      <div className="flex items-center gap-1">
                                        {getPredictionIcon(event.prediction, event.estimate)}
                                        <p className={`font-semibold ${getPredictionColor(event.prediction, event.estimate)}`}>
                                          ${event.prediction.toFixed(2)}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Sentiment */}
                                  <div>
                                    <p className="text-sm text-muted-foreground">Sentiment</p>
                                    <Badge 
                                      variant="outline" 
                                      className={`flex items-center gap-1 ${getSentimentColor(event.sentiment)}`}
                                    >
                                      {getSentimentIcon(event.sentiment)}
                                      <span className="capitalize">{event.sentiment.label}</span>
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Recent Earnings */}
            {recentEarnings.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Recent Earnings ({recentEarnings.length})
                </h3>
                <div className="grid gap-4">
                  <AnimatePresence mode="popLayout">
                    {recentEarnings.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="hover:shadow-lg transition-all duration-200">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">{event.symbol}</span>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-lg">{event.symbol}</h4>
                                  <p className="text-sm text-muted-foreground">{event.companyName}</p>
                                  <span className="text-sm text-muted-foreground">
                                    {formatDate(event.reportDate)}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="flex items-center space-x-4">
                                  {/* Estimate */}
                                  <div>
                                    <p className="text-sm text-muted-foreground">Estimate</p>
                                    <p className="font-semibold">${event.estimate.toFixed(2)}</p>
                                  </div>
                                  
                                  {/* Actual */}
                                  <div>
                                    <p className="text-sm text-muted-foreground">Actual</p>
                                    <p className={`font-semibold ${event.actual && event.actual > event.estimate ? 'text-green-600' : 'text-red-600'}`}>
                                      {event.actual ? `$${event.actual.toFixed(2)}` : 'TBD'}
                                    </p>
                                  </div>
                                  
                                  {/* Sentiment */}
                                  <div>
                                    <p className="text-sm text-muted-foreground">Sentiment</p>
                                    <Badge 
                                      variant="outline" 
                                      className={`flex items-center gap-1 ${getSentimentColor(event.sentiment)}`}
                                    >
                                      {getSentimentIcon(event.sentiment)}
                                      <span className="capitalize">{event.sentiment.label}</span>
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
