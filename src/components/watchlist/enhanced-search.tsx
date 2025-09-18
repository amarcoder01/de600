'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Filter, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Star,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Stock } from '@/types'
import { SearchFilters, SearchResult } from '@/lib/enhanced-search'

interface EnhancedSearchProps {
  onSelectStock: (stock: Stock) => void
  onClose: () => void
  isLoading?: boolean
}

export function EnhancedSearch({ onSelectStock, onClose, isLoading = false }: EnhancedSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Debounced search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout>()

  // Available filter options
  const sectors = [
    'Technology', 'Healthcare', 'Financial Services', 'Consumer Discretionary',
    'Consumer Staples', 'Energy', 'Utilities', 'Industrials', 'Materials',
    'Communication Services', 'Real Estate'
  ]
  const exchanges = ['NYSE', 'NASDAQ', 'OTC']

  // Debounced search function
  const debouncedSearch = useCallback((searchQuery: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    const timeout = setTimeout(async () => {
      if (searchQuery.length >= 1) {
        await performSearch(searchQuery)
      } else {
        setResults([])
      }
    }, 300)

    setSearchTimeout(timeout)
  }, [searchTimeout])

  // Get search suggestions
  const getSuggestions = useCallback(async (partialQuery: string) => {
    if (partialQuery.length < 2) {
      setSuggestions([])
      return
    }

    try {
      const response = await fetch(`/api/stocks/search-suggestions?q=${encodeURIComponent(partialQuery)}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSuggestions(data.suggestions)
        }
      }
    } catch (error) {
      console.error('Error getting suggestions:', error)
    }
  }, [])

  // Perform enhanced search
  const performSearch = async (searchQuery: string) => {
    setIsSearching(true)
    setShowSuggestions(false)

    try {
      // Build query parameters
      const params = new URLSearchParams({
        q: searchQuery,
        limit: '10',
        fuzzyMatch: 'true',
        includeFilters: 'true'
      })

      // Add filters to query
      if (filters.sector) params.append('sector', filters.sector)
      if (filters.exchange) params.append('exchange', filters.exchange)
      if (filters.changeDirection) params.append('changeDirection', filters.changeDirection)
      if (filters.priceRange?.min) params.append('minPrice', filters.priceRange.min.toString())
      if (filters.priceRange?.max) params.append('maxPrice', filters.priceRange.max.toString())
      if (filters.marketCapRange?.min) params.append('minMarketCap', filters.marketCapRange.min.toString())
      if (filters.marketCapRange?.max) params.append('maxMarketCap', filters.marketCapRange.max.toString())

      const response = await fetch(`/api/stocks/enhanced-search?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setResults(data.results.map((item: any) => ({
            stock: item,
            relevanceScore: item.relevanceScore || 0,
            matchReasons: item.matchReasons || []
          })))
        }
      }
    } catch (error) {
      console.error('Enhanced search error:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Handle query change
  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (value.length >= 2) {
      getSuggestions(value)
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
    debouncedSearch(value)
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    const symbol = suggestion.split(' - ')[0]
    setQuery(symbol)
    setShowSuggestions(false)
    debouncedSearch(symbol)
  }

  // Handle filter change
  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    // Re-search with new filters
    if (query.length >= 1) {
      debouncedSearch(query)
    }
  }

  // Clear filters
  const clearFilters = () => {
    setFilters({})
    if (query.length >= 1) {
      debouncedSearch(query)
    }
  }

  // Format market cap for display
  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(1)}T`
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(1)}B`
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(1)}M`
    return `$${marketCap.toLocaleString()}`
  }

  // Format volume for display
  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`
    return volume.toLocaleString()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Enhanced Stock Search
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search stocks by symbol or company name..."
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 animate-spin" />
              )}
            </div>

            {/* Search Suggestions */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10"
                >
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                    >
                      <span className="text-gray-900 dark:text-white">{suggestion}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {Object.keys(filters).length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-700"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Sector Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sector
                    </label>
                    <select
                      value={filters.sector || ''}
                      onChange={(e) => handleFilterChange('sector', e.target.value || undefined)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">All Sectors</option>
                      {sectors.map(sector => (
                        <option key={sector} value={sector}>{sector}</option>
                      ))}
                    </select>
                  </div>

                  {/* Exchange Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Exchange
                    </label>
                    <select
                      value={filters.exchange || ''}
                      onChange={(e) => handleFilterChange('exchange', e.target.value || undefined)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">All Exchanges</option>
                      {exchanges.map(exchange => (
                        <option key={exchange} value={exchange}>{exchange}</option>
                      ))}
                    </select>
                  </div>

                  {/* Change Direction Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Performance
                    </label>
                    <select
                      value={filters.changeDirection || 'any'}
                      onChange={(e) => handleFilterChange('changeDirection', e.target.value === 'any' ? undefined : e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="any">Any</option>
                      <option value="up">Gainers Only</option>
                      <option value="down">Losers Only</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {results.length === 0 && !isSearching && query.length >= 1 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No stocks found for "{query}"
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Try adjusting your search terms or filters
              </p>
            </div>
          )}

          {results.length === 0 && !isSearching && query.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Start typing to search for stocks
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Use symbols (AAPL) or company names (Apple)
              </p>
            </div>
          )}

          <div className="space-y-3">
            {results.map((result, index) => (
              <motion.div
                key={result.stock.symbol}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onSelectStock(result.stock)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {result.stock.symbol}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {result.stock.name}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {result.stock.sector}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {result.stock.exchange}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>Vol: {formatVolume(result.stock.volume)}</span>
                          {result.stock.marketCap && (
                            <span>Cap: {formatMarketCap(result.stock.marketCap)}</span>
                          )}
                          <span>Score: {result.relevanceScore}</span>
                        </div>
                        
                        {result.matchReasons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {result.matchReasons.map((reason, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          ${result.stock.price.toFixed(2)}
                        </div>
                        <div className={`flex items-center gap-1 text-sm ${
                          result.stock.changePercent >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {result.stock.changePercent >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {result.stock.changePercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
