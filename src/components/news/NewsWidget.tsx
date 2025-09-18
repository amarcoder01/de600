'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Newspaper, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  ExternalLink, 
  Bookmark, 
  Share2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNewsStore } from '@/store'

interface NewsItem {
  id: string
  title: string
  summary: string
  source: string
  publishedAt: string
  category: 'market' | 'earnings' | 'economy' | 'technology' | 'politics' | 'crypto'
  sentiment: 'positive' | 'negative' | 'neutral'
  impact: 'high' | 'medium' | 'low'
  symbols: string[]
}

interface MarketUpdate {
  id: string
  type: 'price_alert' | 'volume_spike' | 'earnings' | 'analyst_rating'
  symbol: string
  title: string
  message: string
  timestamp: string
  priority: 'high' | 'medium' | 'low'
}

interface NewsWidgetProps {
  compact?: boolean
  maxItems?: number
  showMarketUpdates?: boolean
  className?: string
}

export function NewsWidget({ 
  compact = false, 
  maxItems = 5, 
  showMarketUpdates = true,
  className = ''
}: NewsWidgetProps) {
  const { news: storeNews, marketUpdates: storeUpdates, fetchNews, isLoading } = useNewsStore()
  const [news, setNews] = useState<NewsItem[]>([])
  const [marketUpdates, setMarketUpdates] = useState<MarketUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('news')

  useEffect(() => {
    // Use store data if available, otherwise fetch
    if (storeNews.length > 0 && storeUpdates.length > 0) {
      setNews(storeNews)
      setMarketUpdates(storeUpdates)
      setLoading(false)
    } else {
      fetchNews().then(() => {
        setNews(storeNews)
        setMarketUpdates(storeUpdates)
        setLoading(false)
      })
    }
  }, [storeNews, storeUpdates, fetchNews])

  const handleRefresh = async () => {
    try {
      setLoading(true)
      await fetchNews()
      setNews(storeNews)
      setMarketUpdates(storeUpdates)
    } catch (error) {
      console.error('Error refreshing news:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const published = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - published.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
    return `${Math.floor(diffInMinutes / 1440)}d`
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="w-3 h-3 text-green-600" />
      case 'negative': return <TrendingDown className="w-3 h-3 text-red-600" />
      default: return <Info className="w-3 h-3 text-gray-600" />
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50 dark:bg-green-900/20'
      case 'negative': return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
      default: return 'text-green-600 bg-green-50 dark:bg-green-900/20'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Newspaper className="w-4 h-4" />
            <span>Market News</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Newspaper className="w-4 h-4" />
              <span>Latest News</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {news.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {news.slice(0, maxItems).map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group cursor-pointer"
            >
              <div className="flex items-start space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  {getSentimentIcon(item.sentiment)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-muted-foreground">{item.source}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{formatTimeAgo(item.publishedAt)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Newspaper className="w-5 h-5" />
            <span>Market News</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardTitle>
        <CardDescription>
          Real-time market updates and breaking news
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="news">News</TabsTrigger>
            <TabsTrigger value="updates">Updates</TabsTrigger>
          </TabsList>

          <TabsContent value="news" className="space-y-3 mt-4">
            {news.slice(0, maxItems).map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group cursor-pointer"
              >
                <div className="p-3 border rounded-lg hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={`text-xs ${getSentimentColor(item.sentiment)}`}>
                          {item.sentiment.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{item.source}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(item.publishedAt)}</span>
                      </div>
                      <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {item.summary}
                      </p>
                      {item.symbols.length > 0 && (
                        <div className="flex items-center space-x-1 mt-2">
                          {item.symbols.slice(0, 3).map((symbol) => (
                            <Badge key={symbol} variant="outline" className="text-xs">
                              {symbol}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Bookmark className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Share2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="updates" className="space-y-3 mt-4">
            {marketUpdates.slice(0, maxItems).map((update) => (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group cursor-pointer"
              >
                <div className="p-3 border rounded-lg hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {update.symbol}
                        </Badge>
                        <Badge className={`text-xs ${getPriorityColor(update.priority)}`}>
                          {update.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(update.timestamp)}</span>
                      </div>
                      <h4 className="text-sm font-medium group-hover:text-primary transition-colors">
                        {update.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {update.message}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-2">
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
