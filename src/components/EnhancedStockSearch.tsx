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
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [favoriteStocks, setFavoriteStocks] = useState<string[]>([])
  const [trendingStocks] = useState<string[]>(['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX'])

  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Load persistent data from localStorage
  useEffect(() => {
    const savedRecent = localStorage.getItem('recentSearches')
    const savedFavorites = localStorage.getItem('favoriteStocks')
    
    if (savedRecent) {
      setRecentSearches(JSON.parse(savedRecent))
    }
    if (savedFavorites) {
      setFavoriteStocks(JSON.parse(savedFavorites))
    }
  }, [])

  // Generate search suggestions
  useEffect(() => {
    const newSuggestions: SearchSuggestion[] = []
    
    // Add recent searches
    recentSearches.slice(0, 3).forEach(symbol => {
      newSuggestions.push({
        symbol,
        name: `${symbol} (Recent)`,
        type: 'recent'
      })
    })
    
    // Add favorite stocks
    favoriteStocks.slice(0, 3).forEach(symbol => {
      newSuggestions.push({
        symbol,
        name: `${symbol} (Favorite)`,
        type: 'favorite'
      })
    })
    
    // Add trending stocks
    trendingStocks.slice(0, 4).forEach(symbol => {
      newSuggestions.push({
        symbol,
        name: `${symbol} (Trending)`,
        type: 'trending'
      })
    })
    
    setSuggestions(newSuggestions)
  }, [recentSearches, favoriteStocks, trendingStocks])

  // Debounced search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      setShowSuggestions(false)
      return
    }

    setIsSearching(true)
    setShowSuggestions(false)

    try {
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`)
      if (!response.ok) {
        throw new Error('Search failed')
      }
      
      const data = await response.json()
      let results = data.success ? data.data : []
      
      // Apply filters if any are set
      if (Object.values(filters).some(f => f !== '')) {
        results = applyFilters(results, filters)
      }
      
      setSearchResults(results.slice(0, maxResults))
      
      // Add to recent searches
      if (query.trim() && !recentSearches.includes(query.trim().toUpperCase())) {
        const newRecent = [query.trim().toUpperCase(), ...recentSearches.slice(0, 9)]
        setRecentSearches(newRecent)
        localStorage.setItem('recentSearches', JSON.stringify(newRecent))
      }
      
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [filters, maxResults, recentSearches])

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery)
      }, 300)
    } else {
      setSearchResults([])
      setShowSuggestions(true)
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, performSearch])

  // Apply filters to search results
  const applyFilters = (results: Stock[], filters: SearchFilters): Stock[] => {
    return results.filter(stock => {
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

  // Handle stock selection
  const handleStockSelect = (stock: Stock) => {
    onStockSelect(stock)
    setSearchQuery(stock.symbol)
    setSearchResults([])
    setShowSuggestions(false)
    
    // Add to recent searches
    if (!recentSearches.includes(stock.symbol)) {
      const newRecent = [stock.symbol, ...recentSearches.slice(0, 9)]
      setRecentSearches(newRecent)
      localStorage.setItem('recentSearches', JSON.stringify(newRecent))
    }
  }

  // Toggle favorite
  const toggleFavorite = (symbol: string) => {
    const newFavorites = favoriteStocks.includes(symbol)
      ? favoriteStocks.filter(s => s !== symbol)
      : [...favoriteStocks, symbol]
    
    setFavoriteStocks(newFavorites)
    localStorage.setItem('favoriteStocks', JSON.stringify(newFavorites))
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.symbol)
    performSearch(suggestion.symbol)
  }

  // Clear search
  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowSuggestions(true)
    searchInputRef.current?.focus()
  }

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
        />
        
        {/* Clear and Filter Buttons */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-7 w-7 p-0 hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          
          {showFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`h-7 px-2 ${showFiltersPanel ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              <Filter className="w-4 h-4" />
            </Button>
          )}
          
          {isSearching && (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && showFiltersPanel && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 p-4 border border-border rounded-lg bg-muted/50"
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Sector</label>
              <select
                value={filters.sector}
                onChange={(e) => setFilters(prev => ({ ...prev, sector: e.target.value }))}
                className="w-full mt-1 p-2 text-sm border rounded-md bg-background"
              >
                <option value="">All Sectors</option>
                <option value="Technology">Technology</option>
                <option value="Financial Services">Financial Services</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Energy">Energy</option>
                <option value="Consumer Discretionary">Consumer Discretionary</option>
                <option value="Industrials">Industrials</option>
                <option value="Utilities">Utilities</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Materials">Materials</option>
                <option value="Communication Services">Communication Services</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground">Exchange</label>
              <select
                value={filters.exchange}
                onChange={(e) => setFilters(prev => ({ ...prev, exchange: e.target.value }))}
                className="w-full mt-1 p-2 text-sm border rounded-md bg-background"
              >
                <option value="">All Exchanges</option>
                <option value="NYSE">NYSE</option>
                <option value="NASDAQ">NASDAQ</option>
                <option value="OTC">OTC</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground">Market Cap</label>
              <select
                value={filters.marketCap}
                onChange={(e) => setFilters(prev => ({ ...prev, marketCap: e.target.value }))}
                className="w-full mt-1 p-2 text-sm border rounded-md bg-background"
              >
                <option value="">All Caps</option>
                <option value="small">Small Cap (&lt;$2B)</option>
                <option value="mid">Mid Cap ($2B-$10B)</option>
                <option value="large">Large Cap (&gt;$10B)</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground">Price Range</label>
              <select
                value={filters.priceRange}
                onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value }))}
                className="w-full mt-1 p-2 text-sm border rounded-md bg-background"
              >
                <option value="">All Prices</option>
                <option value="low">Low (&lt;$50)</option>
                <option value="mid">Mid ($50-$200)</option>
                <option value="high">High (&gt;$200)</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground">Volume</label>
              <select
                value={filters.volume}
                onChange={(e) => setFilters(prev => ({ ...prev, volume: e.target.value }))}
                className="w-full mt-1 p-2 text-sm border rounded-md bg-background"
              >
                <option value="">All Volumes</option>
                <option value="low">Low (&lt;1M)</option>
                <option value="mid">Mid (1M-10M)</option>
                <option value="high">High (&gt;10M)</option>
              </select>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search Suggestions */}
      <AnimatePresence>
        {showSuggestions && !searchQuery && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Quick Access</div>
              
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.type}-${suggestion.symbol}-${index}`}
                  className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="flex items-center space-x-2">
                    {suggestion.type === 'recent' && <Clock className="w-4 h-4 text-blue-500" />}
                    {suggestion.type === 'favorite' && <Star className="w-4 h-4 text-yellow-500" />}
                    {suggestion.type === 'trending' && <TrendingUp className="w-4 h-4 text-green-500" />}
                    <div>
                      <div className="font-medium">{suggestion.symbol}</div>
                      <div className="text-sm text-muted-foreground">{suggestion.name}</div>
                    </div>
                  </div>
                  
                  {suggestion.type === 'favorite' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(suggestion.symbol)
                      }}
                      className="h-6 w-6 p-0 text-yellow-500 hover:bg-yellow-50"
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
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
            className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                Found {searchResults.length} results
              </div>
              
              {searchResults.map((stock) => (
                <div
                  key={stock.symbol}
                  className="flex items-center justify-between p-3 hover:bg-muted rounded-md cursor-pointer border-b last:border-b-0"
                  onClick={() => handleStockSelect(stock)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col">
                      <div className="font-semibold text-lg">{stock.symbol}</div>
                      <div className="text-sm text-muted-foreground max-w-48 truncate">
                        {stock.name}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {stock.exchange}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {stock.sector}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold text-lg">
                      ${stock.price.toFixed(2)}
                    </div>
                    <div className={`text-sm font-medium ${
                      stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Vol: {(stock.volume / 1000000).toFixed(1)}M
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(stock.symbol)
                    }}
                    className={`h-8 w-8 p-0 ${
                      favoriteStocks.includes(stock.symbol) 
                        ? 'text-yellow-500 hover:bg-yellow-50' 
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${favoriteStocks.includes(stock.symbol) ? 'fill-current' : ''}`} />
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Results */}
      <AnimatePresence>
        {searchQuery && searchResults.length === 0 && !isSearching && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 p-4"
          >
            <div className="text-center">
              <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <div className="font-medium">No stocks found</div>
              <div className="text-sm text-muted-foreground">
                Try searching with a different term or check your filters
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
