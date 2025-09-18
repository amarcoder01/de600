'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Newspaper, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Globe, 
  Search, 
  Filter, 
  Bookmark, 
  Share2, 
  RefreshCw, 
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Target,
  BarChart3,
  Calendar,
  Star,
  Eye,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useNewsStore } from '@/store'
import { toast } from 'sonner'

interface NewsItem {
  id: string
  title: string
  summary: string
  content: string
  source: string
  url: string
  publishedAt: string
  category: 'market' | 'earnings' | 'economy' | 'technology' | 'politics' | 'crypto'
  sentiment: 'positive' | 'negative' | 'neutral'
  impact: 'high' | 'medium' | 'low'
  symbols: string[]
  aiInsights?: string[]
  relatedStocks?: string[]
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

export default function NewsPage() {
  const { news: storeNews, marketUpdates: storeUpdates, fetchNews, markAsRead } = useNewsStore()
  const [news, setNews] = useState<NewsItem[]>([])
  const [marketUpdates, setMarketUpdates] = useState<MarketUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSentiment, setSelectedSentiment] = useState<string>('all')
  const [bookmarkedNews, setBookmarkedNews] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('all')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreNews, setHasMoreNews] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const [marketUpdatesPage, setMarketUpdatesPage] = useState(1)
  const [hasMoreMarketUpdates, setHasMoreMarketUpdates] = useState(true)
  const [loadingMoreMarketUpdates, setLoadingMoreMarketUpdates] = useState(false)
  const [selectedMarketUpdate, setSelectedMarketUpdate] = useState<MarketUpdate | null>(null)
  const [showMarketUpdateModal, setShowMarketUpdateModal] = useState(false)

  // Fetch news from API directly
  const fetchNewsFromAPI = async (query?: string, category?: string, page: number = 1, append: boolean = false) => {
    if (page === 1) {
      setSearchLoading(true)
    } else {
      setLoadingMore(true)
    }
    
    try {
      let url = `/api/news?limit=20&page=${page}` // 20 articles per page
      
      if (query) {
        url += `&q=${encodeURIComponent(query)}`
      }
      
      // Always pass category parameter, even if it's 'all'
      if (category) {
        url += `&category=${category}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        if (append) {
          setNews(prev => [...prev, ...data.data])
        } else {
          setNews(data.data)
        }
        
        // Check if we have more news - use the hasMore from API response
        // Also check if we actually received articles
        setHasMoreNews(data.hasMore === true && data.data.length > 0)
        setCurrentPage(page)
        
        console.log(`✅ Fetched ${data.data.length} news articles (page ${page})`)
      } else {
        console.error('Failed to fetch news:', data.message)
        toast.error('Failed to fetch news articles')
        // If it's a load more request and it fails, set hasMoreNews to false
        if (append) {
          setHasMoreNews(false)
        }
      }
    } catch (error) {
      console.error('Error fetching news:', error)
      toast.error('Error fetching news articles')
    } finally {
      setSearchLoading(false)
      setLoadingMore(false)
    }
  }

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1)
    setHasMoreNews(true)
    if (searchQuery.trim()) {
      fetchNewsFromAPI(searchQuery, selectedCategory, 1, false)
    } else {
      fetchNewsFromAPI(undefined, selectedCategory === 'all' ? 'all' : selectedCategory, 1, false)
    }
  }

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setCurrentPage(1)
    setHasMoreNews(true)
    if (category === 'all') {
      fetchNewsFromAPI(searchQuery, 'all', 1, false)
    } else {
      fetchNewsFromAPI(searchQuery, category, 1, false)
    }
  }

  // Handle sentiment filter
  const handleSentimentChange = (sentiment: string) => {
    setSelectedSentiment(sentiment)
  }

  // Share functionality
  const handleShare = async (newsItem: NewsItem) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: newsItem.title,
          text: newsItem.summary,
          url: newsItem.url
        })
        toast.success('Article shared successfully!')
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${newsItem.title}\n\n${newsItem.summary}\n\nRead more: ${newsItem.url}`)
        setCopiedUrl(newsItem.id)
        toast.success('Article link copied to clipboard!')
        setTimeout(() => setCopiedUrl(null), 2000)
      }
    } catch (error) {
      console.error('Error sharing:', error)
      toast.error('Failed to share article')
    }
  }

  // Read full article functionality
  const handleReadArticle = (newsItem: NewsItem) => {
    if (newsItem.url && newsItem.url !== '#') {
      window.open(newsItem.url, '_blank', 'noopener,noreferrer')
    } else {
      toast.error('Article URL not available')
    }
  }

  // Load more news
  const handleLoadMore = async () => {
    if (loadingMore || !hasMoreNews) return
    
    const nextPage = currentPage + 1
    console.log(`🔄 Loading more news: page ${nextPage}`)
    await fetchNewsFromAPI(searchQuery, selectedCategory, nextPage, true)
  }

  // Fetch market updates from API
  const fetchMarketUpdates = async (page: number = 1, append: boolean = false) => {
    if (page === 1) {
      setLoading(true)
    } else {
      setLoadingMoreMarketUpdates(true)
    }
    
    try {
      const response = await fetch(`/api/news?type=market-updates&limit=10&page=${page}`)
      const data = await response.json()
      
      if (data.success) {
        if (append) {
          setMarketUpdates(prev => [...prev, ...data.data])
        } else {
          setMarketUpdates(data.data)
        }
        
        setHasMoreMarketUpdates(data.data.length === 10)
        setMarketUpdatesPage(page)
        
        console.log(`✅ Fetched ${data.data.length} market updates (page ${page})`)
      } else {
        console.error('Failed to fetch market updates:', data.message)
        toast.error('Failed to fetch market updates')
        if (append) {
          setHasMoreMarketUpdates(false)
        }
      }
    } catch (error) {
      console.error('Error fetching market updates:', error)
      toast.error('Error fetching market updates')
    } finally {
      setLoading(false)
      setLoadingMoreMarketUpdates(false)
    }
  }

  // Load more market updates
  const handleLoadMoreMarketUpdates = async () => {
    if (loadingMoreMarketUpdates || !hasMoreMarketUpdates) return
    
    const nextPage = marketUpdatesPage + 1
    console.log(`🔄 Loading more market updates: page ${nextPage}`)
    await fetchMarketUpdates(nextPage, true)
  }

  // Handle market update view details
  const handleViewMarketUpdateDetails = (update: MarketUpdate) => {
    setSelectedMarketUpdate(update)
    setShowMarketUpdateModal(true)
  }

  // Close market update modal
  const handleCloseMarketUpdateModal = () => {
    setShowMarketUpdateModal(false)
    setSelectedMarketUpdate(null)
  }



  // Refresh news
  const handleRefresh = async () => {
    setLoading(true)
    setCurrentPage(1)
    setHasMoreNews(true)
    try {
      await fetchNews()
      await fetchNewsFromAPI(searchQuery, selectedCategory, 1, false)
      toast.success('News refreshed successfully!')
    } catch (error) {
      console.error('Error refreshing news:', error)
      toast.error('Failed to refresh news')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Mark news as read when visiting the page
    markAsRead()
    
    // Fetch initial news
    fetchNewsFromAPI(undefined, 'all', 1, false)
    
    // Fetch initial market updates
    fetchMarketUpdates(1, false)
    
    setLoading(false)
  }, [markAsRead])

  // Filter news based on sentiment
  const filteredNews = news.filter(item => {
    const matchesSentiment = selectedSentiment === 'all' || item.sentiment === selectedSentiment
    return matchesSentiment
  })

  const toggleBookmark = (newsId: string) => {
    const newBookmarks = new Set(bookmarkedNews)
    if (newBookmarks.has(newsId)) {
      newBookmarks.delete(newsId)
      toast.success('Removed from bookmarks')
    } else {
      newBookmarks.add(newsId)
      toast.success('Added to bookmarks')
    }
    setBookmarkedNews(newBookmarks)
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const published = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - published.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50 dark:bg-green-900/20'
      case 'negative': return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
      default: return 'text-green-600 bg-green-50 dark:bg-green-900/20'
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading market news...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Market News</h1>
          <p className="text-muted-foreground">
            Real-time news, market updates, and AI-powered insights
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>LIVE</span>
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

             {/* Market Updates Banner */}
       <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="grid grid-cols-1 md:grid-cols-3 gap-4"
       >
         {marketUpdates.slice(0, 3).map((update) => (
           <Card key={update.id} className="border-l-4 border-l-blue-500">
             <CardContent className="p-4">
               <div className="flex items-start justify-between">
                 <div className="flex-1">
                   <div className="flex items-center space-x-2 mb-2">
                     <Badge variant="outline" className="text-xs">
                       {update.type.replace('_', ' ').toUpperCase()}
                     </Badge>
                     <span className="text-xs text-muted-foreground">
                       {formatTimeAgo(update.timestamp)}
                     </span>
                   </div>
                   <h4 className="font-semibold text-sm mb-1">{update.symbol}</h4>
                   <p className="text-sm text-muted-foreground">{update.message}</p>
                 </div>
                 <Button variant="ghost" size="sm">
                   <Eye className="w-4 h-4" />
                 </Button>
               </div>
             </CardContent>
           </Card>
         ))}
       </motion.div>

       

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search news, stocks, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
            {searchLoading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin" />
            )}
          </div>
          <Button onClick={handleSearch} disabled={searchLoading}>
            Search
          </Button>
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="market">Market</SelectItem>
              <SelectItem value="earnings">Earnings</SelectItem>
              <SelectItem value="economy">Economy</SelectItem>
              <SelectItem value="technology">Technology</SelectItem>
              <SelectItem value="politics">Politics</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedSentiment} onValueChange={handleSentimentChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sentiment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sentiment</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

             {/* News Content */}
       <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                   <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All News ({filteredNews.length})</TabsTrigger>
            <TabsTrigger value="bookmarked">Bookmarked ({bookmarkedNews.size})</TabsTrigger>
            <TabsTrigger value="market-updates">Market Updates</TabsTrigger>
          </TabsList>

        <TabsContent value="all" className="space-y-6">
          {searchLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-2" />
              <span>Searching for news...</span>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="text-center py-12">
              <Newspaper className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No news found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredNews.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  className="group"
                >
                  <Card className="h-full hover:shadow-lg transition-all duration-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={getSentimentColor(item.sentiment)}>
                              {item.sentiment.toUpperCase()}
                            </Badge>
                            <Badge className={getImpactColor(item.impact)}>
                              {item.impact.toUpperCase()} IMPACT
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(item.publishedAt)}
                            </span>
                          </div>
                          <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">
                            {item.title}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {item.summary}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleBookmark(item.id)}
                            className={bookmarkedNews.has(item.id) ? 'text-yellow-500' : ''}
                            title={bookmarkedNews.has(item.id) ? 'Remove from bookmarks' : 'Add to bookmarks'}
                          >
                            <Bookmark className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleShare(item)}
                            title="Share article"
                          >
                            {copiedUrl === item.id ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Source: {item.source}</span>
                        <div className="flex items-center space-x-2">
                          {item.symbols.map((symbol) => (
                            <Badge key={symbol} variant="outline" className="text-xs">
                              {symbol}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      
                      
                      <div className="flex items-center justify-between">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleReadArticle(item)}
                          className="flex items-center space-x-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Read Full Article</span>
                        </Button>
                        {item.relatedStocks && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-muted-foreground">Related:</span>
                            {item.relatedStocks.slice(0, 3).map((stock) => (
                              <Badge key={stock} variant="secondary" className="text-xs">
                                {stock}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
          
                     {/* Load More Button */}
           {!searchLoading && filteredNews.length > 0 && hasMoreNews && (
             <div className="flex justify-center mt-8">
               <Button 
                 onClick={handleLoadMore} 
                 disabled={loadingMore}
                 variant="outline"
                 size="lg"
                 className="flex items-center space-x-2"
               >
                 {loadingMore ? (
                   <>
                     <Loader2 className="w-4 h-4 animate-spin" />
                     <span>Loading...</span>
                   </>
                 ) : (
                   <>
                     <RefreshCw className="w-4 h-4" />
                     <span>Load More News</span>
                   </>
                 )}
               </Button>
             </div>
           )}
           
           {/* No more news message */}
           {!hasMoreNews && filteredNews.length > 0 && (
             <div className="text-center py-8">
               <p className="text-muted-foreground">You've reached the end of available news articles.</p>
             </div>
           )}

           {/* No news available message with suggestions */}
           {!searchLoading && filteredNews.length === 0 && selectedCategory === 'all' && (
             <div className="text-center py-12">
               <Newspaper className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
               <h3 className="text-lg font-medium mb-2">No news available for "All Categories"</h3>
               <p className="text-muted-foreground mb-4">
                 Try selecting a specific category or use the search feature to find relevant news.
               </p>
               <div className="flex flex-wrap justify-center gap-2">
                 {['market', 'technology', 'earnings', 'economy'].map((category) => (
                   <Button
                     key={category}
                     variant="outline"
                     size="sm"
                     onClick={() => handleCategoryChange(category)}
                     className="capitalize"
                   >
                     {category}
                   </Button>
                 ))}
               </div>
             </div>
           )}
        </TabsContent>

        <TabsContent value="bookmarked" className="space-y-6">
          {bookmarkedNews.size === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No bookmarked articles</h3>
              <p className="text-muted-foreground">Bookmark articles to see them here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredNews.filter(item => bookmarkedNews.has(item.id)).map((item) => (
                <Card key={item.id} className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Source: {item.source}</span>
                      <span className="text-muted-foreground">{formatTimeAgo(item.publishedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleReadArticle(item)}
                        className="flex items-center space-x-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Read Article</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleShare(item)}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Load More Button for Bookmarked */}
          {bookmarkedNews.size > 0 && hasMoreNews && (
            <div className="flex justify-center mt-8">
              <Button 
                onClick={handleLoadMore} 
                disabled={loadingMore}
                variant="outline"
                size="lg"
                className="flex items-center space-x-2"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Load More News</span>
                  </>
                )}
              </Button>
            </div>
          )}
                 </TabsContent>

         

                 <TabsContent value="market-updates" className="space-y-6">
           {loading && marketUpdates.length === 0 ? (
             <div className="flex items-center justify-center py-12">
               <Loader2 className="w-8 h-8 animate-spin mr-2" />
               <span>Loading market updates...</span>
             </div>
           ) : marketUpdates.length === 0 ? (
             <div className="text-center py-12">
               <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
               <h3 className="text-lg font-medium mb-2">No market updates available</h3>
               <p className="text-muted-foreground">Check back later for the latest market activity</p>
             </div>
           ) : (
             <>
               <div className="space-y-4">
                 {marketUpdates.map((update) => (
                   <motion.div
                     key={update.id}
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     whileHover={{ y: -2 }}
                     className="group"
                   >
                     <Card className="hover:shadow-lg transition-all duration-200">
                       <CardContent className="p-4">
                         <div className="flex items-center justify-between">
                           <div className="flex-1">
                             <div className="flex items-center space-x-2 mb-2">
                               <Badge variant="outline" className="text-xs">
                                 {update.symbol}
                               </Badge>
                               <Badge variant="secondary" className="text-xs">
                                 {update.type.replace('_', ' ').toUpperCase()}
                               </Badge>
                               <span className="text-xs text-muted-foreground">
                                 {formatTimeAgo(update.timestamp)}
                               </span>
                               {update.priority === 'high' && (
                                 <Badge className="bg-red-100 text-red-800 text-xs">
                                   HIGH PRIORITY
                                 </Badge>
                               )}
                             </div>
                             <h4 className="font-semibold mb-1 text-lg group-hover:text-primary transition-colors">
                               {update.title}
                             </h4>
                             <p className="text-sm text-muted-foreground">{update.message}</p>
                           </div>
                                                       <div className="flex items-center space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleViewMarketUpdateDetails(update)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View Details
                              </Button>
                            </div>
                         </div>
                       </CardContent>
                     </Card>
                   </motion.div>
                 ))}
               </div>
               
               {/* Load More Button for Market Updates */}
               {hasMoreMarketUpdates && (
                 <div className="flex justify-center mt-8">
                   <Button 
                     onClick={handleLoadMoreMarketUpdates} 
                     disabled={loadingMoreMarketUpdates}
                     variant="outline"
                     size="lg"
                     className="flex items-center space-x-2"
                   >
                     {loadingMoreMarketUpdates ? (
                       <>
                         <Loader2 className="w-4 h-4 animate-spin" />
                         <span>Loading...</span>
                       </>
                     ) : (
                       <>
                         <RefreshCw className="w-4 h-4" />
                         <span>Load More Updates</span>
                       </>
                     )}
                   </Button>
                 </div>
               )}
               
                          {/* No more updates message */}
           {!hasMoreMarketUpdates && marketUpdates.length > 0 && (
             <div className="text-center py-8">
               <p className="text-muted-foreground">You've reached the end of available market updates.</p>
             </div>
           )}
         </>
       )}
     </TabsContent>
   </Tabs>

   {/* Market Update Details Modal */}
   <Dialog open={showMarketUpdateModal} onOpenChange={setShowMarketUpdateModal}>
     <DialogContent className="max-w-2xl">
       <DialogHeader>
         <DialogTitle className="flex items-center space-x-2">
           <TrendingUp className="w-5 h-5 text-blue-600" />
           <span>Market Update Details</span>
         </DialogTitle>
         <DialogDescription>
           Detailed information about this market update
         </DialogDescription>
       </DialogHeader>
       {selectedMarketUpdate && (
         <div className="space-y-6">
           {/* Header Info */}
           <div className="flex items-center justify-between">
             <div className="flex items-center space-x-2">
               <Badge variant="outline" className="text-sm">
                 {selectedMarketUpdate.symbol}
               </Badge>
               <Badge variant="secondary" className="text-sm">
                 {selectedMarketUpdate.type.replace('_', ' ').toUpperCase()}
               </Badge>
               {selectedMarketUpdate.priority === 'high' && (
                 <Badge className="bg-red-100 text-red-800 text-sm">
                   HIGH PRIORITY
                 </Badge>
               )}
             </div>
             <span className="text-sm text-muted-foreground">
               {formatTimeAgo(selectedMarketUpdate.timestamp)}
             </span>
           </div>

           {/* Title and Message */}
           <div>
             <h3 className="text-xl font-semibold mb-3">{selectedMarketUpdate.title}</h3>
             <p className="text-muted-foreground leading-relaxed">{selectedMarketUpdate.message}</p>
           </div>

           {/* Additional Details */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-3">
               <h4 className="font-medium text-sm">Update Information</h4>
               <div className="space-y-2">
                 <div className="flex justify-between">
                   <span className="text-sm text-muted-foreground">Symbol:</span>
                   <span className="text-sm font-medium">{selectedMarketUpdate.symbol}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-sm text-muted-foreground">Type:</span>
                   <span className="text-sm font-medium">{selectedMarketUpdate.type.replace('_', ' ').toUpperCase()}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-sm text-muted-foreground">Priority:</span>
                   <span className="text-sm font-medium capitalize">{selectedMarketUpdate.priority}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-sm text-muted-foreground">Timestamp:</span>
                   <span className="text-sm font-medium">{new Date(selectedMarketUpdate.timestamp).toLocaleString()}</span>
                 </div>
               </div>
             </div>

             <div className="space-y-3">
               <h4 className="font-medium text-sm">Market Impact</h4>
               <div className="space-y-2">
                 <div className="flex items-center space-x-2">
                   <div className={`w-3 h-3 rounded-full ${
                     selectedMarketUpdate.priority === 'high' ? 'bg-red-500' : 
                     selectedMarketUpdate.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                   }`}></div>
                   <span className="text-sm">Impact Level: {selectedMarketUpdate.priority.toUpperCase()}</span>
                 </div>
                 <div className="text-sm text-muted-foreground">
                   This update may affect trading decisions and market sentiment for {selectedMarketUpdate.symbol} and related securities.
                 </div>
               </div>
             </div>
           </div>

           {/* Action Buttons */}
           <div className="flex justify-end space-x-2 pt-4 border-t">
             <Button variant="outline" onClick={handleCloseMarketUpdateModal}>
               Close
             </Button>
             <Button onClick={() => {
               // Here you could add functionality to track this update or add to watchlist
               toast.success(`Added ${selectedMarketUpdate.symbol} to watchlist`)
               handleCloseMarketUpdateModal()
             }}>
               Track {selectedMarketUpdate.symbol}
             </Button>
           </div>
         </div>
       )}
     </DialogContent>
   </Dialog>
 </div>
)
}
