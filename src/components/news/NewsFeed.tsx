'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Filter, 
  RefreshCw, 
  ExternalLink,
  Calendar,
  MessageCircle,
  BarChart3,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NewsItem, SentimentScore } from '@/types'

interface NewsFeedProps {
  symbol?: string
  autoRefresh?: boolean
  showFilters?: boolean
}

export default function NewsFeed({ symbol, autoRefresh = true, showFilters = true }: NewsFeedProps) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState({
    category: 'all',
    sentiment: 'all',
    timeRange: '24h'
  })

  const fetchNews = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        limit: '20',
        ...(symbol && { symbol }),
        ...(filter.category !== 'all' && { category: filter.category }),
        ...(filter.sentiment !== 'all' && { sentiment: filter.sentiment })
      })
      
      const response = await fetch(`/api/news?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setNews(data.data)
      } else {
        setError(data.message || 'Failed to fetch news')
      }
    } catch (error) {
      console.error('Error fetching news:', error)
      setError('Failed to load news')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
  }, [symbol, filter])

  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(fetchNews, 300000) // Refresh every 5 minutes
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

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'Earnings', label: 'Earnings' },
    { value: 'Market', label: 'Market' },
    { value: 'Product', label: 'Product' },
    { value: 'Leadership', label: 'Leadership' },
    { value: 'M&A', label: 'M&A' },
    { value: 'Regulatory', label: 'Regulatory' }
  ]

  const sentiments = [
    { value: 'all', label: 'All Sentiment' },
    { value: 'positive', label: 'Positive' },
    { value: 'negative', label: 'Negative' },
    { value: 'neutral', label: 'Neutral' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {symbol ? `${symbol} News` : 'Financial News'}
          </h2>
          <p className="text-muted-foreground">
            Real-time financial news with AI sentiment analysis
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNews}
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
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select
                  value={filter.category}
                  onValueChange={(value) => setFilter(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Sentiment</label>
                <Select
                  value={filter.sentiment}
                  onValueChange={(value) => setFilter(prev => ({ ...prev, sentiment: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sentiments.map(sentiment => (
                      <SelectItem key={sentiment.value} value={sentiment.value}>
                        {sentiment.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Time Range</label>
                <Select
                  value={filter.timeRange}
                  onValueChange={(value) => setFilter(prev => ({ ...prev, timeRange: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Last Hour</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
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

      {/* News Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading news...</p>
          </div>
        ) : news.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No news found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or check back later
              </p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            {news.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* Image */}
                      {item.imageUrl && (
                        <div className="flex-shrink-0">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-20 h-20 object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold line-clamp-2 mb-2">
                              {item.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {item.description}
                            </p>
                          </div>
                          
                          {/* Sentiment Badge */}
                          {item.sentiment && (
                            <Badge 
                              variant="outline" 
                              className={`ml-4 flex items-center gap-1 ${getSentimentColor(item.sentiment)}`}
                            >
                              {getSentimentIcon(item.sentiment)}
                              <span className="capitalize">{item.sentiment.label}</span>
                              <span className="text-xs">
                                ({Math.round(item.sentiment.confidence * 100)}%)
                              </span>
                            </Badge>
                          )}
                        </div>
                        
                        {/* Meta Information */}
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(item.publishedAt)}
                            </span>
                            <span className="font-medium">{item.source}</span>
                            <Badge variant="secondary" className="text-xs">
                              {item.category}
                            </Badge>
                            {item.relevance > 0.8 && (
                              <Badge variant="outline" className="text-xs text-blue-600">
                                <Zap className="w-3 h-3 mr-1" />
                                High Relevance
                              </Badge>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(item.url, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Read
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
