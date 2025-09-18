'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  X, 
  Filter, 
  TrendingUp, 
  Star, 
  Clock, 
  Building2,
  Globe,
  DollarSign,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Loader2,
  Info,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Stock } from '@/types'

interface SearchFilters {
  sector: string
  exchange: string
  marketCap: string
  priceRange: string
  volume: string
}

interface SearchSuggestion {
  symbol: string
  name: string
  type: 'recent' | 'favorite' | 'trending'
  price?: number
  change?: number
}

interface EnhancedStockSearchProps {
  onStockSelect: (stock: Stock) => void
  placeholder?: string
  className?: string
  showFilters?: boolean
  maxResults?: number
}

export function EnhancedStockSearch({ 
  onStockSelect, 
  placeholder = "Search stocks, ETFs, or companies...",
  className = "",
  showFilters = true,
  maxResults = 10
}: EnhancedStockSearchProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Stock[]>([])
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [filters, setFilters] = useState<SearchFilters>({
    sector: '',
    exchange: '',
    marketCap: '',
    priceRange: '',
    volume: ''
  })
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [favoriteStocks, setFavoriteStocks] = useState<string[]>([])
  const [trendingStocks, setTrendingStocks] = useState<SearchSuggestion[]>([])

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Load recent searches and favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('paperTrading_recentSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }

    const favorites = localStorage.getItem('paperTrading_favoriteStocks')
    if (favorites) {
      setFavoriteStocks(JSON.parse(favorites))
    }

    // Load trending stocks
    loadTrendingStocks()
  }, [])

  // Load trending stocks (popular stocks)
  const loadTrendingStocks = useCallback(async () => {
    try {
      const popularSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX']
      const trending: SearchSuggestion[] = popularSymbols.map(symbol => ({
        symbol,
        name: `${symbol} Inc.`,
        type: 'trending',
        price: 150 + Math.random() * 100,
        change: (Math.random() - 0.5) * 10
      }))
      setTrendingStocks(trending)
    } catch (error) {
      console.error('Error loading trending stocks:', error)
    }
  }, [])

  // Generate search suggestions
  useEffect(() => {
    if (!searchQuery.trim()) {
      const allSuggestions: SearchSuggestion[] = [
        ...recentSearches.slice(0, 3).map(symbol => ({
          symbol,
          name: `${symbol} Inc.`,
          type: 'recent' as const
        })),
        ...favoriteStocks.slice(0, 3).map(symbol => ({
          symbol,
          name: `${symbol} Inc.`,
          type: 'favorite' as const
        })),
        ...trendingStocks.slice(0, 4)
      ]
      setSuggestions(allSuggestions)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }, [searchQuery, recentSearches, favoriteStocks, trendingStocks])

  // Search stocks with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, filters])

  // Perform search
  const performSearch = async (query: string) => {
    if (!query.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        let results = data.data

        // Apply filters
        results = applyFilters(results)

        // Limit results
        results = results.slice(0, maxResults)

        setSearchResults(results)
        
        // Add to recent searches
        addToRecentSearches(query)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Apply search filters
  const applyFilters = (stocks: Stock[]): Stock[] => {
    return stocks.filter(stock => {
      if (filters.sector && stock.sector !== filters.sector) return false
      if (filters.exchange && stock.exchange !== filters.exchange) return false
      if (filters.marketCap) {
        const marketCap = stock.marketCap
        switch (filters.marketCap) {
          case 'small': if (marketCap > 2000000000) return false; break
          case 'mid': if (marketCap < 2000000000 || marketCap > 10000000000) return false; break
          case 'large': if (marketCap < 10000000000) return false; break
        }
      }
      if (filters.priceRange) {
        const price = stock.price
        switch (filters.priceRange) {
          case 'low': if (price > 50) return false; break
          case 'mid': if (price < 50 || price > 200) return false; break
          case 'high': if (price < 200) return false; break
        }
      }
      if (filters.volume) {
        const volume = stock.volume
        switch (filters.volume) {
          case 'low': if (volume > 1000000) return false; break
          case 'mid': if (volume < 1000000 || volume > 10000000) return false; break
          case 'high': if (volume < 10000000) return false; break
        }
      }
      return true
    })
  }

  // Add to recent searches
  const addToRecentSearches = (query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10)
    setRecentSearches(updated)
    localStorage.setItem('paperTrading_recentSearches', JSON.stringify(updated))
  }

  // Toggle favorite stock
  const toggleFavorite = (symbol: string) => {
    const updated = favoriteStocks.includes(symbol)
      ? favoriteStocks.filter(s => s !== symbol)
      : [...favoriteStocks, symbol]
    
    setFavoriteStocks(updated)
    localStorage.setItem('paperTrading_favoriteStocks', JSON.stringify(updated))
  }

  // Handle stock selection
  const handleStockSelect = (stock: Stock) => {
    onStockSelect(stock)
    setSearchQuery(stock.symbol)
    setSearchResults([])
    setShowSuggestions(false)
    addToRecentSearches(stock.symbol)
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.symbol)
    setShowSuggestions(false)
    // Trigger search for the selected symbol
    performSearch(suggestion.symbol)
  }

  // Clear search
  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowSuggestions(false)
    searchInputRef.current?.focus()
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  // Get suggestion icon
  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent': return <Clock className="w-4 h-4 text-blue-500" />
      case 'favorite': return <Star className="w-4 h-4 text-yellow-500" />
      case 'trending': return <TrendingUp className="w-4 h-4 text-green-500" />
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
        />
        
        {/* Search Actions */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {isSearching && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
          
          {showFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`h-6 w-6 p-0 ${showFiltersPanel ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {showFiltersPanel ? <ChevronUp className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
            </Button>
          )}
          
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFiltersPanel && showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-4 border border-border rounded-lg bg-background"
          >
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Sector Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Sector</label>
                <select
                  value={filters.sector}
                  onChange={(e) => setFilters(prev => ({ ...prev, sector: e.target.value }))}
                  className="w-full text-xs p-2 border rounded-md"
                >
                  <option value="">All Sectors</option>
                  <option value="Technology">Technology</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Financial Services">Financial Services</option>
                  <option value="Consumer Discretionary">Consumer Discretionary</option>
                  <option value="Energy">Energy</option>
                  <option value="Industrials">Industrials</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Materials">Materials</option>
                  <option value="Communication Services">Communication Services</option>
                </select>
              </div>

              {/* Exchange Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Exchange</label>
                <select
                  value={filters.exchange}
                  onChange={(e) => setFilters(prev => ({ ...prev, exchange: e.target.value }))}
                  className="w-full text-xs p-2 border rounded-md"
                >
                  <option value="">All Exchanges</option>
                  <option value="NASDAQ">NASDAQ</option>
                  <option value="NYSE">NYSE</option>
                  <option value="OTC">OTC</option>
                </select>
              </div>

              {/* Market Cap Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Market Cap</label>
                <select
                  value={filters.marketCap}
                  onChange={(e) => setFilters(prev => ({ ...prev, marketCap: e.target.value }))}
                  className="w-full text-xs p-2 border rounded-md"
                >
                  <option value="">All Caps</option>
                  <option value="small">Small Cap (&lt;$2B)</option>
                  <option value="mid">Mid Cap ($2B-$10B)</option>
                  <option value="large">Large Cap (&gt;$10B)</option>
                </select>
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Price Range</label>
                <select
                  value={filters.priceRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value }))}
                  className="w-full text-xs p-2 border rounded-md"
                >
                  <option value="">All Prices</option>
                  <option value="low">Low (&lt;$50)</option>
                  <option value="mid">Mid ($50-$200)</option>
                  <option value="high">High (&gt;$200)</option>
                </select>
              </div>

              {/* Volume Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Volume</label>
                <select
                  value={filters.volume}
                  onChange={(e) => setFilters(prev => ({ ...prev, volume: e.target.value }))}
                  className="w-full text-xs p-2 border rounded-md"
                >
                  <option value="">All Volumes</option>
                  <option value="low">Low (&lt;1M)</option>
                  <option value="mid">Mid (1M-10M)</option>
                  <option value="high">High (&gt;10M)</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({
                  sector: '',
                  exchange: '',
                  marketCap: '',
                  priceRange: '',
                  volume: ''
                })}
                className="text-xs"
              >
                Clear Filters
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Suggestions */}
      <AnimatePresence>
        {showSuggestions && !searchQuery && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
          >
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="p-3 border-b">
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Recent Searches
                </h4>
                <div className="space-y-1">
                  {recentSearches.slice(0, 3).map((symbol) => (
                    <button
                      key={symbol}
                      onClick={() => handleSuggestionSelect({ symbol, name: `${symbol} Inc.`, type: 'recent' })}
                      className="w-full text-left p-2 hover:bg-muted rounded-md text-sm flex items-center justify-between"
                    >
                      <span className="font-medium">{symbol}</span>
                      <Clock className="w-3 h-3 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Favorite Stocks */}
            {favoriteStocks.length > 0 && (
              <div className="p-3 border-b">
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center">
                  <Star className="w-3 h-3 mr-1" />
                  Favorites
                </h4>
                <div className="space-y-1">
                  {favoriteStocks.slice(0, 3).map((symbol) => (
                    <button
                      key={symbol}
                      onClick={() => handleSuggestionSelect({ symbol, name: `${symbol} Inc.`, type: 'favorite' })}
                      className="w-full text-left p-2 hover:bg-muted rounded-md text-sm flex items-center justify-between"
                    >
                      <span className="font-medium">{symbol}</span>
                      <Star className="w-3 h-3 text-yellow-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Stocks */}
            {trendingStocks.length > 0 && (
              <div className="p-3">
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Trending
                </h4>
                <div className="space-y-1">
                  {trendingStocks.slice(0, 4).map((stock) => (
                    <button
                      key={stock.symbol}
                      onClick={() => handleSuggestionSelect(stock)}
                      className="w-full text-left p-2 hover:bg-muted rounded-md text-sm flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{stock.symbol}</span>
                        <span className="text-xs text-muted-foreground">{stock.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium">
                          {stock.price ? formatCurrency(stock.price) : ''}
                        </div>
                        {stock.change !== undefined && (
                          <div className={`text-xs ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(stock.change)}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results */}
      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
          >
            {searchResults.map((stock) => (
              <div
                key={stock.symbol}
                className="p-3 hover:bg-muted border-b last:border-b-0 cursor-pointer"
                onClick={() => handleStockSelect(stock)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{stock.symbol}</span>
                      <Badge variant="outline" className="text-xs">
                        {stock.exchange}
                      </Badge>
                      {favoriteStocks.includes(stock.symbol) && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{stock.name}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-muted-foreground">{stock.sector}</span>
                      <span className="text-xs text-muted-foreground">
                        {stock.marketCap > 1000000000 
                          ? `$${(stock.marketCap / 1000000000).toFixed(1)}B`
                          : `$${(stock.marketCap / 1000000).toFixed(1)}M`
                        }
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(stock.price)}</div>
                    <div className={`text-sm ${stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(stock.changePercent)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Vol: {(stock.volume / 1000000).toFixed(1)}M
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Results */}
      {searchQuery && searchResults.length === 0 && !isSearching && (
        <div className="mt-2 p-3 text-center text-sm text-muted-foreground">
          No stocks found for "{searchQuery}". Try a different search term.
        </div>
      )}
    </div>
  )
}
