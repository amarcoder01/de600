'use client'

import React, { useState, useEffect } from 'react'
import { Stock, StockDetails, AppError } from '@/types/market-view'
import { marketViewApiService } from '@/lib/market-view-api'
import { SearchBox } from '@/components/market-view/SearchBox'
import { StockList } from '@/components/market-view/StockList'
import { LoadMoreButton } from '@/components/market-view/LoadMoreButton'
import { StockModal } from '@/components/market-view/StockModal'
import { AlertCircle, TrendingUp } from 'lucide-react'
import { TopMoversApiService } from '@/lib/top-movers-api'

export default function MarketViewPage() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'NETWORK_ERROR' | 'API_ERROR' | 'MARKET_CLOSED' | null>(null)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)
  const [stockDetails, setStockDetails] = useState<StockDetails | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<Stock[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMarketClosed, setIsMarketClosed] = useState(false)
  const [sessionLabel, setSessionLabel] = useState<'Pre-Market' | 'Regular' | 'After Hours' | 'Closed'>('Closed')

  useEffect(() => {
    const initializeMarketView = async () => {
      try {
        setError(null)
        setErrorType(null)
        
        // Test connection first
        const connectionTest = await marketViewApiService.testConnection()
        
        if (connectionTest.success) {
          // Only load stocks if connection is successful
          await loadInitialStocks()
        } else {
          // Show the specific error message from the connection test
          setError(connectionTest.message)
          // Determine if it's a network error or API error based on the message
          if (connectionTest.message.includes('Network connection failed') || 
              connectionTest.message.includes('unable to reach') ||
              connectionTest.message.includes('timed out')) {
            setErrorType('NETWORK_ERROR')
          } else {
            setErrorType('API_ERROR')
          }
        }
      } catch (err) {
        console.error('Failed to initialize Market View:', err)
        setError('Failed to initialize Market View - unexpected error occurred')
        setErrorType('NETWORK_ERROR')
      }
    }
    
    initializeMarketView()

    // Fetch authoritative market status from server (Polygon-backed)
    const fetchMarketStatus = async () => {
      try {
        const status = await TopMoversApiService.getMarketStatus()
        // Derive session label and strict open/closed using US/Eastern windows
        const now = new Date()
        const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
        const minutes = et.getHours() * 60 + et.getMinutes()
        const preStart = 4 * 60, regularOpen = 9 * 60 + 30, regularClose = 16 * 60, afterEnd = 20 * 60
        const inRegular = minutes >= regularOpen && minutes < regularClose
        const closed = !(status.market === 'open' && inRegular)
        setIsMarketClosed(closed)
        let label: typeof sessionLabel = 'Closed'
        if (!closed) {
          label = 'Regular'
        } else if (minutes >= preStart && minutes < regularOpen) {
          label = 'Pre-Market'
        } else if (minutes >= regularClose && minutes < afterEnd) {
          label = 'After Hours'
        } else {
          label = 'Closed'
        }
        setSessionLabel(label)
      } catch (e) {
        // Fallback to ET heuristic if server status fails
        const now = new Date()
        const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
        const minutes = et.getHours() * 60 + et.getMinutes()
        const preStart = 4 * 60, regularOpen = 9 * 60 + 30, regularClose = 16 * 60, afterEnd = 20 * 60
        // Heuristic closed state
        const closed = !(minutes >= regularOpen && minutes < regularClose)
        setIsMarketClosed(closed)
        let label: typeof sessionLabel = 'Closed'
        if (!closed) {
          label = 'Regular'
        } else if (minutes >= preStart && minutes < regularOpen) {
          label = 'Pre-Market'
        } else if (minutes >= regularClose && minutes < afterEnd) {
          label = 'After Hours'
        }
        setSessionLabel(label)
      }
    }

    fetchMarketStatus()
  }, [])

  const loadInitialStocks = async () => {
    try {
      setLoading(true)
      setError(null)
      setErrorType(null)
      
      const { stocks: initialStocks, nextCursor: cursor } = await marketViewApiService.getStocks(50)
      
      setStocks(initialStocks)
      setNextCursor(cursor)
      setError(null) // Ensure error is cleared
      setErrorType(null) // Ensure error type is cleared
    } catch (err) {
      console.error('Error loading stocks:', err)
      const error = err as AppError
      
      // Clear any previous successful state
      setStocks([])
      setNextCursor(undefined)
      
      setError(error.message || 'Failed to load stocks')
      setErrorType(error.type || 'API_ERROR')
    } finally {
      setLoading(false)
    }
  }

  const loadMoreStocks = async () => {
    if (!nextCursor || loadingMore) return

    try {
      setLoadingMore(true)
      setError(null)
      setErrorType(null)
      
      const { stocks: moreStocks, nextCursor: cursor } = await marketViewApiService.getStocks(50, nextCursor)
      setStocks(prev => [...prev, ...moreStocks])
      setNextCursor(cursor)
    } catch (err) {
      const error = err as AppError
      setError(error.message || 'Failed to load more stocks')
      setErrorType(error.type || 'API_ERROR')
    } finally {
      setLoadingMore(false)
    }
  }

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setIsSearching(false)
      setSearchQuery('')
      return
    }

    try {
      setIsSearching(true)
      setSearchQuery(query)
      setError(null)
      setErrorType(null)
      
      const results = await marketViewApiService.searchStocks(query)
      setSearchResults(results)
    } catch (err) {
      const error = err as AppError
      setError(error.message || 'Search failed')
      setErrorType(error.type || 'API_ERROR')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleStockSelect = async (stock: Stock) => {
    setSelectedStock(stock)
    setModalLoading(true)
    setStockDetails(null)

    try {
      const details = await marketViewApiService.getStockDetails(stock.ticker)
      setStockDetails({ ...details, name: stock.name })
    } catch (err) {
      const error = err as AppError
      setError(error.message || 'Failed to load stock details')
      setErrorType(error.type || 'API_ERROR')
    } finally {
      setModalLoading(false)
    }
  }

  const handleCloseModal = () => {
    setSelectedStock(null)
    setStockDetails(null)
  }

  const clearSearch = () => {
    setSearchResults([])
    setIsSearching(false)
    setSearchQuery('')
  }

  const retryConnection = async () => {
    try {
      console.log('🔄 Retrying connection...')
      setError(null)
      setErrorType(null)
      
      // Test connection first
      const connectionTest = await marketViewApiService.testConnection()
      console.log('🔍 Retry connection test result:', connectionTest)
      
      if (connectionTest.success) {
        // Load stocks if connection is successful
        await loadInitialStocks()
      } else {
        setError(connectionTest.message)
        setErrorType('NETWORK_ERROR')
      }
    } catch (err) {
      console.error('❌ Retry connection failed:', err)
      setError('Failed to retry connection')
      setErrorType('NETWORK_ERROR')
    }
  }

  const displayedStocks = searchQuery ? searchResults : stocks
  const showLoadMore = !searchQuery && nextCursor && !loading

  const getErrorIcon = () => {
    if (errorType === 'NETWORK_ERROR') {
      return <AlertCircle className="h-5 w-5 text-red-400" />
    }
    return <AlertCircle className="h-5 w-5 text-red-400" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Market View</h1>
            </div>
            <SearchBox 
              onSearch={handleSearch} 
              loading={isSearching}
              onClear={clearSearch}
            />
          </div>
        </div>
      </header>

      {/* Market Status Banner (server-driven) */}
      <div className={`${isMarketClosed ? 'bg-yellow-50 border-yellow-400' : 'bg-green-50 border-green-400'} border-l-4 p-4`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            {isMarketClosed ? (
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
            ) : (
              <span className="h-3 w-3 rounded-full bg-green-500 mr-2 inline-block" />
            )}
            <p className={`${isMarketClosed ? 'text-yellow-800' : 'text-green-800'} font-medium`}>
              {isMarketClosed ? (
                <>Market Closed – Showing Last Close Data{sessionLabel && sessionLabel !== 'Closed' ? ` • ${sessionLabel}` : ''}</>
              ) : (
                <>Market Open – Showing Real-Time Data</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Results Header */}
        {searchQuery && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Search results for "{searchQuery}" ({searchResults.length} found)
            </h2>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-start">
              {getErrorIcon()}
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  {errorType === 'NETWORK_ERROR' ? 'Connection Error' : 'API Error'}
                </h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <div className="mt-3 flex space-x-3">
                  {errorType === 'NETWORK_ERROR' && (
                    <button
                      onClick={retryConnection}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Retry Connection
                    </button>
                  )}
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Refresh Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading stocks...</span>
          </div>
        )}

        {/* Stock List */}
        {!loading && (
          <>
            <StockList 
              stocks={displayedStocks} 
              onStockSelect={handleStockSelect}
              loading={isSearching}
            />
            
            {/* Load More Button */}
            {showLoadMore && (
              <LoadMoreButton 
                onClick={loadMoreStocks}
                loading={loadingMore}
                disabled={!nextCursor}
              />
            )}
            
            {/* No Results Message */}
            {!loading && displayedStocks.length === 0 && (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">
                  {searchQuery ? 'No stocks found for your search.' : 'No stocks available.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Stock Details Modal */}
      {selectedStock && (
        <StockModal
          stock={selectedStock}
          stockDetails={stockDetails}
          loading={modalLoading}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
