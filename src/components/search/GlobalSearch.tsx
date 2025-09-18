'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, TrendingUp, TrendingDown, Star, Clock, Building2, DollarSign } from 'lucide-react'
import { Stock } from '@/types'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface GlobalSearchProps {
  placeholder?: string
  className?: string
}

export function GlobalSearch({ placeholder = "Search symbols, news, or analysis...", className = "" }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Stock[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [popularStocks] = useState<Stock[]>([
    { symbol: 'AAPL', name: 'Apple Inc.', price: 185.50, change: 4.25, changePercent: 2.34, volume: 45678900, marketCap: 2890000000000, pe: 28.5, dividend: 0.96, sector: 'Technology', industry: 'Consumer Electronics', exchange: 'NASDAQ', dayHigh: 187.20, dayLow: 182.15, fiftyTwoWeekHigh: 199.62, fiftyTwoWeekLow: 124.17, avgVolume: 52000000, dividendYield: 0.52, beta: 1.24, eps: 6.50, lastUpdated: new Date().toISOString() },
    { symbol: 'MSFT', name: 'Microsoft Corporation', price: 378.85, change: -2.15, changePercent: -0.56, volume: 23456780, marketCap: 2810000000000, pe: 32.1, dividend: 3.00, sector: 'Technology', industry: 'Software', exchange: 'NASDAQ', dayHigh: 382.50, dayLow: 376.20, fiftyTwoWeekHigh: 420.82, fiftyTwoWeekLow: 213.43, avgVolume: 25000000, dividendYield: 0.79, beta: 0.89, eps: 11.80, lastUpdated: new Date().toISOString() },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 138.75, change: 1.85, changePercent: 1.35, volume: 28901234, marketCap: 1750000000000, pe: 26.8, dividend: 0.00, sector: 'Communication Services', industry: 'Internet Content & Information', exchange: 'NASDAQ', dayHigh: 140.20, dayLow: 136.50, fiftyTwoWeekHigh: 151.55, fiftyTwoWeekLow: 83.34, avgVolume: 30000000, dividendYield: 0.00, beta: 1.05, eps: 5.18, lastUpdated: new Date().toISOString() },
    { symbol: 'TSLA', name: 'Tesla, Inc.', price: 244.80, change: 8.20, changePercent: 3.47, volume: 67890123, marketCap: 780000000000, pe: 75.2, dividend: 0.00, sector: 'Consumer Discretionary', industry: 'Auto Manufacturers', exchange: 'NASDAQ', dayHigh: 248.50, dayLow: 240.10, fiftyTwoWeekHigh: 299.29, fiftyTwoWeekLow: 138.80, avgVolume: 70000000, dividendYield: 0.00, beta: 2.1, eps: 3.25, lastUpdated: new Date().toISOString() }
  ])
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('globalRecentSearches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (error) {
        console.error('Error loading recent searches:', error)
      }
    }
  }, [])

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((query: string) => {
    const trimmedQuery = query.trim().toUpperCase()
    if (!trimmedQuery) return

    setRecentSearches(prev => {
      const newSearches = [trimmedQuery, ...prev.filter(s => s !== trimmedQuery)].slice(0, 5)
      localStorage.setItem('globalRecentSearches', JSON.stringify(newSearches))
      return newSearches
    })
  }, [])

  // Perform search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    setShowResults(false)

    try {
      // Use the enhanced search API with fallbacks
      const searchUrl = `/api/stocks/search?q=${encodeURIComponent(query)}`
      
      let results: Stock[] = []

      try {
        const response = await fetch(searchUrl)
        if (response.ok) {
          const data = await response.json()
          results = data.results || []
        }
      } catch (error) {
        console.log(`Search API failed:`, error)
      }

      // If no API results, use local search
      if (results.length === 0) {
        const localResults = popularStocks.filter(stock => 
          stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
          stock.name.toLowerCase().includes(query.toLowerCase())
        )
        results = localResults
      }

      // Remove duplicates and limit results
      const uniqueResults = results.filter((result, index, self) => 
        index === self.findIndex(r => r.symbol === result.symbol)
      ).slice(0, 8)

      setSearchResults(uniqueResults)
      setShowResults(true)
      saveRecentSearch(query)

    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [popularStocks, saveRecentSearch])

  // Debounced search
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
      setShowResults(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, performSearch])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle stock selection
  const handleStockSelect = (stock: Stock) => {
    setSearchQuery('')
    setShowResults(false)
    saveRecentSearch(stock.symbol)
    // Redirect to dashboard since market tab is removed
    router.push(`/dashboard`)
  }

  // Handle recent search click
  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query)
    performSearch(query)
  }

  // Clear search
  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
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
    <div className={`relative ${className}`} ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10 py-2 w-80 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          onFocus={() => setShowResults(true)}
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50"
          >
            {/* Loading State */}
            {isSearching && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                Searching...
              </div>
            )}

            {/* Search Results */}
            {!isSearching && searchResults.length > 0 && (
              <div className="py-2">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Search Results
                </div>
                {searchResults.map((stock) => (
                  <button
                    key={stock.symbol}
                    onClick={() => handleStockSelect(stock)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{stock.symbol}</span>
                          <Badge variant="outline" className="text-xs">
                            {stock.exchange}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {stock.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className="text-sm font-medium">
                        {formatPrice(stock.price)}
                      </span>
                      <div className={`flex items-center space-x-1 text-xs ${
                        stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stock.changePercent >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>
                          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Recent Searches */}
            {!isSearching && searchResults.length === 0 && recentSearches.length > 0 && (
              <div className="py-2">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center space-x-2">
                  <Clock className="w-3 h-3" />
                  <span>Recent Searches</span>
                </div>
                {recentSearches.map((query) => (
                  <button
                    key={query}
                    onClick={() => handleRecentSearchClick(query)}
                    className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{query}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Popular Stocks */}
            {!isSearching && searchResults.length === 0 && recentSearches.length === 0 && (
              <div className="py-2">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center space-x-2">
                  <Star className="w-3 h-3" />
                  <span>Popular Stocks</span>
                </div>
                {popularStocks.map((stock) => (
                  <button
                    key={stock.symbol}
                    onClick={() => handleStockSelect(stock)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{stock.symbol}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {stock.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className="text-sm font-medium">
                        {formatPrice(stock.price)}
                      </span>
                      <div className={`flex items-center space-x-1 text-xs ${
                        stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stock.changePercent >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>
                          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Results */}
            {!isSearching && searchResults.length === 0 && searchQuery.trim() && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No results found for "{searchQuery}"
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
