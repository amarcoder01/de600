'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, X, Filter, TrendingUp, TrendingDown, Star, RefreshCw, Loader2, Check, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PriceTicker } from '@/components/trading/price-ticker'
import { searchStocks as multiSourceSearchStocks, getStockData } from '@/lib/multi-source-api'
import { Stock, WatchlistItem } from '@/types'
import { useWatchlistStore, useAuthStore } from '@/store'

// WebSocket event data type
interface WebSocketEvent {
  event: string
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
}

// WatchlistItem now includes all required fields

export default function WatchlistPage() {
  // IMPORTANT: This page follows a database-first architecture
  // - All watchlist data is fetched fresh from the database
  // - No watchlist data is stored in localStorage
  // - The store acts as a temporary cache for UI state only
  // - Users can manually refresh to get latest data from database
  
  const { 
    watchlists, 
    addToWatchlist, 
    removeFromWatchlist, 
    removeFromWatchlistBySymbol,
    createWatchlist,
    loadWatchlists,
    refreshWatchlistData,
    clearWatchlist,
    isLoading: storeLoading,
    isConnectedToRealTime,
    startRealTimeUpdates,
    stopRealTimeUpdates,
    isHydrated,
    setHydrated,
    removeWatchlist: removeWatchlistFromStore // Added this line
  } = useWatchlistStore()
  
  const { checkAuth, isAuthenticated, user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Stock[]>([])  
  const [isSearching, setIsSearching] = useState(false)
  const [isAddingSymbol, setIsAddingSymbol] = useState(false)
  const [showFloatingButton, setShowFloatingButton] = useState(true)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingPopular, setIsLoadingPopular] = useState(false)
  const [loadingStocks, setLoadingStocks] = useState<Set<string>>(new Set())
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)
  const [refreshSuccess, setRefreshSuccess] = useState<string | false>(false)
  const [optimisticItems, setOptimisticItems] = useState<WatchlistItem[]>([])
  const [optimisticRemovals, setOptimisticRemovals] = useState<Set<string>>(new Set())
  const [isCreatingWatchlist, setIsCreatingWatchlist] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newWatchlistName, setNewWatchlistName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [removingWatchlistId, setRemovingWatchlistId] = useState<string | null>(null)
  const [activeWatchlistId, setActiveWatchlistId] = useState<string | null>(null)
  const suppressScrollRef = useRef(false)

  // Get or create default watchlist
  const defaultWatchlist = watchlists?.find(w => w.name === 'My Watchlist') || {
    id: 'default',
    name: 'My Watchlist',
    items: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  // Generate unique watchlist name
  const getUniqueWatchlistName = (baseName: string) => {
    let name = baseName
    let counter = 1
    
    while (watchlists.find(w => w.name === name)) {
      name = `${baseName} ${counter}`
      counter++
    }
    
    return name
  }

  // Check if a specific watchlist name already exists
  const isWatchlistNameTaken = (name: string) => {
    return watchlists.some(w => w.name === name)
  }

  // Open create watchlist modal
  const openCreateModal = () => {
    setShowCreateModal(true)
    setNewWatchlistName('')
    setError(null)
  }

  // Handle watchlist creation with custom name
  const handleCreateWatchlist = async (name: string) => {
    try {
      setError(null)
      setIsCreatingWatchlist(true)
      
      // Check if watchlist with same name already exists
      const existingWatchlist = watchlists.find(w => w.name === name)
      if (existingWatchlist) {
        setError(`Watchlist "${name}" already exists. Please choose a different name.`)
        setIsCreatingWatchlist(false)
        return
      }
      
      await createWatchlist(name)
      
      // Show success message
      setRefreshSuccess('created')
      setTimeout(() => {
        setRefreshSuccess(false)
      }, 3000)
      
      // Refresh watchlists to get the latest data
      await loadWatchlists()
      
      // Close modal if it was open
      if (showCreateModal) {
        setShowCreateModal(false)
        setNewWatchlistName('')
      }
      
    } catch (error) {
      console.error('❌ Error creating watchlist:', error)
      let errorMessage = 'Failed to create watchlist. Please try again.'
      
      if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          errorMessage = 'Please log in to create a watchlist.'
        } else if (error.message.includes('session has expired')) {
          errorMessage = 'Your session has expired. Please log in again.'
        } else if (error.message.includes('Failed to create watchlist')) {
          errorMessage = error.message
        } else if (error.message.includes('already exists')) {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
      
      // If session expired, show login button
      if (error instanceof Error && error.message.includes('session has expired')) {
        setTimeout(() => {
          window.location.href = '/login?message=session_expired'
        }, 3000)
      }
    } finally {
      setIsCreatingWatchlist(false)
      setIsSubmitting(false)
    }
  }

  // Handle custom watchlist creation from modal
  const handleCustomCreate = async () => {
    if (!newWatchlistName.trim()) {
      setError('Please enter a watchlist name')
      return
    }
    
    setIsSubmitting(true)
    await handleCreateWatchlist(newWatchlistName.trim())
  }

  // Helper function to get items to display based on current selection
  const getItemsToDisplay = () => {
    if (activeWatchlistId) {
      // Return items from specific watchlist
      return watchlists.find(w => w.id === activeWatchlistId)?.items || []
    } else {
      // Return all items from all watchlists combined
      return watchlists.reduce((allItems: WatchlistItem[], watchlist) => {
        if (watchlist.items && watchlist.items.length > 0) {
          return [...allItems, ...watchlist.items]
        }
        return allItems
      }, [])
    }
  }

  // Handle watchlist removal
  const handleRemoveWatchlist = async (watchlistId: string, watchlistName: string) => {
    const wl = watchlists.find(w => w.id === watchlistId)
    const c = wl?.items?.length || 0
    const noun = c === 1 ? 'stock' : 'stocks'
    if (!confirm(`Are you sure you want to delete the watchlist "${watchlistName}"? This action cannot be undone and will remove all ${c} ${noun} in this watchlist.`)) {
      return
    }

    try {
      setRemovingWatchlistId(watchlistId)
      setError(null)
      
      // Remove watchlist from store
      await removeWatchlistFromStore(watchlistId)
      
      // If this was the active watchlist, clear it
      if (activeWatchlistId === watchlistId) {
        setActiveWatchlistId(null)
      }
      
      // Show success message
      setRefreshSuccess('removed')
      setTimeout(() => {
        setRefreshSuccess(false)
      }, 3000)
      
      // Refresh watchlists to get the latest data
      await loadWatchlists()
      
    } catch (error) {
      console.error('❌ Error removing watchlist:', error)
      setError('Failed to remove watchlist. Please try again.')
    } finally {
      setRemovingWatchlistId(null)
    }
  }

  // Handle watchlist selection
  const handleSelectWatchlist = (watchlistId: string) => {
    setActiveWatchlistId(watchlistId)
    // Scroll to watchlist items section
    const watchlistItemsSection = document.getElementById('watchlist-items-section')
    if (watchlistItemsSection) {
      watchlistItemsSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Smoothly scroll to the active watchlist header when selection changes
  useEffect(() => {
    if (!activeWatchlistId) return
    if (suppressScrollRef.current) {
      suppressScrollRef.current = false
      return
    }
    const id = window.requestAnimationFrame(() => {
      const target = document.getElementById('active-watchlist-header') || document.getElementById('watchlist-items-section')
      if (target) {
        try {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
          if (typeof (target as any).focus === 'function') {
            ;(target as HTMLElement).focus({ preventScroll: true })
          }
        } catch {}
      }
    })
    return () => window.cancelAnimationFrame(id)
  }, [activeWatchlistId])

  // Force clear stale authentication state
  const forceClearAuth = () => {
    // Use the proper auth store logout method
    // This will clear all tokens, cookies, and store state properly
    if (typeof window !== 'undefined') {
      // Force page reload to clear all store state
      window.location.href = '/login?message=session_expired'
    }
  }

  // Handle hydration on client side
  useEffect(() => {
    // Mark as hydrated after component mounts on client
    if (typeof window !== 'undefined') {
      setHydrated(true)
    }
  }, [setHydrated])

  // Check authentication status when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // CRITICAL: Check for stale authentication state
      const hasValidToken = localStorage.getItem('token') || document.cookie.includes('token=')
      if (isAuthenticated && !hasValidToken) {
        // Force clear stale state immediately
        forceClearAuth()
        return
      }
      
      checkAuth()
    }
  }, [checkAuth])

  // Load watchlists on component mount
  useEffect(() => {
    const initializeWatchlist = async () => {
      try {
        setError(null)
        setIsLoading(true)
        // First check authentication status
        await checkAuth()
        
        // Wait a bit for auth state to settle
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          console.warn('⚠️ Watchlist loading timeout, forcing completion')
          setIsLoading(false)
        }, 10000) // 10 second timeout
        
        // Load watchlists from database
        await loadWatchlists()
        
        // Wait a bit for state to update
        setTimeout(async () => {
                                  // Don't automatically create watchlist - let user decide
            if (watchlists.length === 0) {
              // User needs to create a watchlist
            } else {
              // Watchlists loaded successfully
            }
          
          clearTimeout(timeoutId)
          setIsLoading(false)
        }, 100)
        
      } catch (err) {
        console.error('Error loading watchlists:', err)
        setError('Failed to load watchlists. Please try again.')
        setIsLoading(false)
      }
    }
    
    initializeWatchlist()
  }, [checkAuth, loadWatchlists, isAuthenticated, user]) // Add auth state to dependencies

  // Safely handle real-time updates
  useEffect(() => {
    if (defaultWatchlist?.items?.length > 0 && !isConnectedToRealTime) {
      try {
        // Only start real-time updates if the functions exist and are safe to call
        if (typeof startRealTimeUpdates === 'function') {
          startRealTimeUpdates()
        }
      } catch (error) {
        console.error('Error starting real-time updates:', error)
        setError('Failed to connect to real-time data. Some features may be limited.')
      }
    }

    return () => {
      if (isConnectedToRealTime && typeof stopRealTimeUpdates === 'function') {
        try {
          stopRealTimeUpdates()
        } catch (error) {
          console.error('Error stopping real-time updates:', error)
        }
      }
    }
  }, [defaultWatchlist?.items?.length, isConnectedToRealTime])

  // Force refresh data from database
  const forceRefreshData = async () => {
    try {
      setError(null)
      setIsLoading(true)
      // Reload watchlists from database
      await loadWatchlists()
      
      // Wait a bit for state to update
      setTimeout(async () => {
        await refreshWatchlistData()
        setIsLoading(false)
      }, 500)
      
    } catch (error) {
      console.error('❌ Error force refreshing data:', error)
      setError('Failed to refresh data. Please try again.')
      setIsLoading(false)
    }
  }



  // Handle clear all
  const handleClearAll = async (targetWatchlistId?: string) => {
    try {
      setError(null)
      const watchlistId = targetWatchlistId || activeWatchlistId || defaultWatchlist?.id
      
      if (!watchlistId || watchlistId === 'default') {
        setError('Cannot clear default watchlist. Please select a specific watchlist.')
        return
      }

      const watchlist = watchlists.find(w => w.id === watchlistId)
      if (!watchlist || !watchlist.items || watchlist.items.length === 0) {
        setError('No items to clear in this watchlist.')
        return
      }

      if (confirm(`Are you sure you want to remove all ${watchlist.items.length} ${watchlist.items.length === 1 ? 'stock' : 'stocks'} from "${watchlist.name}"? This action cannot be undone.`)) {
        console.log(`🗑️ UI: Clearing all items from watchlist ${watchlistId}...`)
        await clearWatchlist(watchlistId)
        setRefreshSuccess('cleared')
        setTimeout(() => setRefreshSuccess(false), 3000)
        console.log(`✅ UI: Successfully cleared watchlist ${watchlistId}`)
      }
    } catch (error) {
      console.error('❌ Error clearing watchlist:', error)
      setError('Failed to clear watchlist. Please try again.')
    }
  }

  // Remove problematic useEffect that causes loading loops
  // This was calling refreshWatchlistData() which created infinite loops

  // Function to validate and fix invalid symbols (without removing)
  const validateAndFixWatchlistSymbols = async () => {
    try {
      const { updateWatchlistItem } = useWatchlistStore.getState()
      
      // Check if defaultWatchlist exists and has items
      if (!defaultWatchlist?.items?.length) {
        return
      }
      
      // Common symbol corrections
      const symbolCorrections: { [key: string]: string } = {
        'APPL': 'AAPL',
        'GOOG': 'GOOGL',
        'MSFT': 'MSFT', // Already correct
        'TSLA': 'TSLA', // Already correct
        'AMZN': 'AMZN', // Already correct
        'PFE': 'PFE'    // Already correct
      }
      
      for (const item of defaultWatchlist?.items || []) {
        // Check if symbol needs correction
        if (symbolCorrections[item.symbol]) {
          const correctSymbol = symbolCorrections[item.symbol]
          
          // Test if the corrected symbol works
          try {
            const response = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(correctSymbol)}`)
            if (response.ok) {
              const data = await response.json()
              if (data.stock && data.stock.price > 0) {
                // Update the symbol and data
                updateWatchlistItem(defaultWatchlist?.id || 'default', item.id, {
                  symbol: correctSymbol,
                  name: data.stock.name,
                  price: data.stock.price,
                  change: data.stock.change,
                  changePercent: data.stock.changePercent,
                  volume: data.stock.volume
                })
                console.log(`✅ Fixed symbol ${item.symbol} → ${correctSymbol}`)
              }
            }
          } catch (error) {
            console.error(`Error fixing symbol ${item.symbol}:`, error)
          }
        }
        
        // Note: Removed automatic removal logic to prevent stocks from being deleted
        // Users can manually remove stocks if needed
      }
    } catch (error) {
      console.error('Error validating watchlist symbols:', error)
    }
  }

  // Start real-time updates for watchlist items using multi-source
  useEffect(() => {
    if (defaultWatchlist?.items?.length > 0) {
      const symbols = defaultWatchlist?.items?.map(item => item.symbol) || []
      
      // Set up periodic updates for all symbols
      const updateInterval = setInterval(async () => {
        try {
          // Safely get the update function from the store
          const store = useWatchlistStore.getState()
          if (store && typeof store.updateWatchlistItem === 'function') {
          // Update each symbol with fresh data from multi-source
          for (const symbol of symbols) {
            try {
              const freshData = await getStockData(symbol)
              if (freshData && freshData.price > 0) {
                const existingItem = defaultWatchlist?.items?.find(item => item.symbol === symbol)
                if (existingItem) {
                    store.updateWatchlistItem(defaultWatchlist?.id || 'default', existingItem.id, {
                    price: freshData.price,
                    change: freshData.change,
                    changePercent: freshData.changePercent,
                    volume: freshData.volume
                  })
                }
              }
            } catch (error) {
              console.error(`Error updating ${symbol}:`, error)
              }
            }
          }
        } catch (error) {
          console.error('Error in periodic update:', error)
        }
      }, 30000) // Update every 30 seconds

      return () => {
        clearInterval(updateInterval)
      }
    }
  }, [defaultWatchlist?.items])

  // Enhanced search functionality using yfinance API
  useEffect(() => {
    const searchStocks = async () => {
      if (!searchQuery || searchQuery.length < 1) {
        setSearchResults([])
        setError(null)
        return
      }

      // Validate search query - only allow alphanumeric characters and basic symbols
      if (!/^[A-Za-z0-9.\-\s]+$/.test(searchQuery)) {
        setError('Please use only letters, numbers, and basic symbols in your search.')
        setSearchResults([])
        return
      }

      setIsSearching(true)
      setError(null)
      
      try {
        // Use the enhanced search API with fallbacks
        const searchUrl = `/api/stocks/search?q=${encodeURIComponent(searchQuery)}`
        
        const response = await fetch(searchUrl)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ API Error Response: ${errorText}`)
          throw new Error(`API request failed: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log(`📊 Enhanced Search API response:`, data)
        
        // Handle multiple response formats
        let results = []
        if (data.results && Array.isArray(data.results)) {
          results = data.results
        } else if (data.data && Array.isArray(data.data)) {
          results = data.data
        } else if (data.stocks && Array.isArray(data.stocks)) {
          results = data.stocks
        }
        
        // Sort results to prioritize actual stocks over ETFs and funds
        const sortedResults = results.sort((a: Stock, b: Stock) => {
          // Exact symbol match gets highest priority
          if (a.symbol.toLowerCase() === searchQuery.toLowerCase()) return -1
          if (b.symbol.toLowerCase() === searchQuery.toLowerCase()) return 1
          
          // Prioritize stocks over ETFs/funds
          const aIsStock = !a.sector?.includes('Fund') && !a.sector?.includes('ETF') && !a.industry?.includes('Fund')
          const bIsStock = !b.sector?.includes('Fund') && !b.sector?.includes('ETF') && !b.industry?.includes('Fund')
          
          if (aIsStock && !bIsStock) return -1
          if (!aIsStock && bIsStock) return 1
          
          // Prioritize results with price data
          const aHasPrice = a.price && a.price > 0
          const bHasPrice = b.price && b.price > 0
          
          if (aHasPrice && !bHasPrice) return -1
          if (!aHasPrice && bHasPrice) return 1
          
          // Sort by symbol length (shorter symbols often more relevant)
          return a.symbol.length - b.symbol.length
        })
        
        setSearchResults(sortedResults)
        
        // Fetch price data for stocks that don't have it
        const stocksWithoutPrice = sortedResults.filter((stock: Stock) => !stock.price || stock.price <= 0)
        if (stocksWithoutPrice.length > 0) {
          console.log(`🔄 Fetching price data for ${stocksWithoutPrice.length} stocks...`)
          
          // Fetch prices in parallel but limit to first 3 to avoid overwhelming the API
          const pricePromises = stocksWithoutPrice.slice(0, 3).map(async (stock: Stock) => {
            try {
              const priceData = await getStockData(stock.symbol)
              if (priceData && priceData.price > 0) {
                return { ...stock, ...priceData }
              }
            } catch (error) {
              console.error(`Error fetching price for ${stock.symbol}:`, error)
            }
            return stock
          })
          
          const updatedStocks = await Promise.all(pricePromises)
          
          // Update the results with price data
          const finalResults = sortedResults.map((stock: Stock) => {
            const updated = updatedStocks.find((updated: Stock) => updated.symbol === stock.symbol)
            return updated || stock
          })
          
          setSearchResults(finalResults)
        }
        
        if (results.length === 0) {
          setError(`No stocks found for "${searchQuery}". Try searching with a different term.`)
        } else {
          console.log(`✅ Found ${results.length} stocks for "${searchQuery}" using ${data.source || 'enhanced-search'} data`)
        }
      } catch (error) {
        console.error('❌ Error searching stocks:', error)
        let errorMessage = 'Search failed. Please check your internet connection.'
        
        if (error instanceof Error) {
          if (error.message.includes('404') || error.message.includes('Not Found')) {
            errorMessage = `📊 No stock data found for "${searchQuery}". Please check the symbol and try again.`
          } else if (error.message.includes('server error') || error.message.includes('500')) {
            errorMessage = '🔧 Search service is temporarily unavailable. Please try again later.'
          } else if (error.message.includes('Network') || error.message.includes('fetch')) {
            errorMessage = '🌐 Network error. Please check your internet connection.'
          } else if (error.message.includes('timeout')) {
            errorMessage = '⏱️ Request timed out. Please try again with a shorter search term.'
          }
        }
        
        setError(errorMessage)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    const debounceTimeout = setTimeout(searchStocks, 300) // Reduced debounce for better UX
    return () => clearTimeout(debounceTimeout)
  }, [searchQuery])

  // Filter watchlist items with optimistic updates
  const allItems = [
    ...(defaultWatchlist?.items || []),
    ...optimisticItems
  ]
  
  const filteredItems = allItems.filter(item => {
    // Exclude optimistically removed items
    if (optimisticRemovals.has(item.id)) {
      return false
    }
    
    const matchesSearch = item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  }) || []

  // Calculate total items for display
  const totalItems = filteredItems.length

  // Calculate totals with real-time data
  const averagePrice = totalItems > 0 ? filteredItems.reduce((sum, item) => sum + (item.price || 0), 0) / totalItems : 0
  const totalChange = filteredItems.reduce((sum, item) => sum + (item.change || 0), 0)
  const totalChangePercent = totalItems > 0 ? filteredItems.reduce((sum, item) => sum + (item.changePercent || 0), 0) / totalItems : 0
  const gainers = filteredItems.filter(item => (item.changePercent || 0) > 0).length
  const losers = filteredItems.filter(item => (item.changePercent || 0) < 0).length

  // Check if a stock is already in the watchlist
  const isInWatchlist = (symbol: string) => {
    return defaultWatchlist?.items?.some(item => 
      item.symbol.toUpperCase() === symbol.toUpperCase()
    ) || false
  }

  // Handle adding stock to specific watchlist
  const handleAddToWatchlist = async (stock: Stock, targetWatchlistId?: string) => {
    try {
      setError(null)
      setLoadingStocks(prev => new Set(prev).add(stock.symbol))
      
      // Determine which watchlist to add to
      let watchlistToUse = targetWatchlistId 
        ? watchlists.find(w => w.id === targetWatchlistId)
        : activeWatchlistId 
          ? watchlists.find(w => w.id === activeWatchlistId)
          : watchlists[0] // Fallback to first watchlist
      
      if (!watchlistToUse) {
        setError('No watchlist available. Please create a watchlist first.')
        return
      }

      // Check if stock already exists in the target watchlist
      const isAlreadyInWatchlist = watchlistToUse.items?.some(item => item.symbol === stock.symbol)
      if (isAlreadyInWatchlist) {
        setError(`${stock.symbol} is already in "${watchlistToUse.name}"`)
        return
      }

      // Add stock to the specific watchlist
      await addToWatchlist(watchlistToUse.id, {
        id: '', // Will be set by the API
        symbol: stock.symbol,
        name: stock.name,
        type: 'stock',
        price: (stock as any).currentPrice || stock.price || 0,
        change: stock.change || 0,
        changePercent: stock.changePercent || 0,
        exchange: stock.exchange || 'NASDAQ',
        sector: stock.sector || 'Unknown',
        volume: stock.volume || 0,
        marketCap: stock.marketCap || 0,
        addedAt: new Date()
      })
      
      // Show success message
      setRefreshSuccess('added')
      setTimeout(() => {
        setRefreshSuccess(false)
      }, 3000)
      
      // Clear search query
      setSearchQuery(searchQuery)
      setSearchResults(prev => prev)
      
      // Refresh watchlists to get the latest data
      Promise.resolve()
      
          } catch (error) {
        console.error('❌ Error adding stock to watchlist:', error)
      let errorMessage = 'Failed to add stock to watchlist. Please try again.'
        
        if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          errorMessage = 'Please log in to add stocks to watchlist.'
        } else if (error.message.includes('session has expired')) {
          errorMessage = 'Your session has expired. Please log in again.'
        } else if (error.message.includes('already exists')) {
          errorMessage = error.message
        } else if (error.message.includes('not found')) {
          errorMessage = 'Watchlist not found. Please refresh and try again.'
          }
        }
        
        setError(errorMessage)
      
      // If session expired, show login button
      if (error instanceof Error && error.message.includes('session has expired')) {
        setTimeout(() => {
          window.location.href = '/login?message=session_expired'
        }, 3000)
      }
    } finally {
      setLoadingStocks(prev => {
        const newSet = new Set(prev)
        newSet.delete(stock.symbol)
        return newSet
      })
      }
  }

  const handleRemoveFromWatchlist = async (itemId: string, symbol?: string) => {
    try {
      setError(null)
      setRemovingItemId(itemId)
      
      // Determine which watchlist to remove from
      let targetWatchlistId = activeWatchlistId
      
      // If no specific watchlist is selected (All Watchlists view), find which watchlist contains this item
      if (!targetWatchlistId) {
        const watchlistContainingItem = watchlists.find(watchlist => 
          watchlist.items?.some(item => item.id === itemId)
        )
        
        if (watchlistContainingItem) {
          targetWatchlistId = watchlistContainingItem.id
          console.log(`🔍 Found item ${itemId} in watchlist: ${watchlistContainingItem.name} (${targetWatchlistId})`)
        } else {
          // Fallback to default watchlist if item not found
          targetWatchlistId = defaultWatchlist?.id
        }
      }
      
      if (!targetWatchlistId) {
        throw new Error('No watchlist selected')
      }
      
      console.log(`🗑️ UI: Removing item ${itemId} (${symbol}) from watchlist ${targetWatchlistId}...`)
      
      // If we have the symbol, use the direct API approach
      if (symbol) {
        await removeFromWatchlistBySymbol(targetWatchlistId, symbol, itemId)
      } else {
        // Fallback to the original method
        await removeFromWatchlist(targetWatchlistId, itemId)
      }
      
      console.log(`✅ UI: Successfully removed item ${itemId} from watchlist`)
      
      // Show success message briefly
      setRefreshSuccess('removed')
      setTimeout(() => {
        setRefreshSuccess(false)
      }, 2000)
      
    } catch (error) {
      console.error('❌ UI: Error removing stock from watchlist:', error)
      
      let errorMessage = 'Failed to remove stock from watchlist. Please try again.'
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          errorMessage = 'Stock not found in watchlist. It may have already been removed.'
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (error.message.includes('Failed to remove item')) {
          errorMessage = error.message
        } else if (error.message.includes('No watchlist selected')) {
          errorMessage = 'Please select a watchlist first.'
        } else if (error.message.includes('access denied') || error.message.includes('unauthorized')) {
          errorMessage = 'You do not have permission to modify this watchlist.'
        }
      }
      
      setError(errorMessage)
    } finally {
      setRemovingItemId(null)
    }
  }

  // Show loading state while store is initializing
  if (storeLoading || !isHydrated) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading watchlist...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Error Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6"
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                {error.includes('already exists') ? 'Duplicate Watchlist Name' : 'Error'}
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error}
              </p>
              {error.includes('already exists') && (
                <div className="mt-3 p-3 bg-orange-100 dark:bg-orange-800/30 rounded-lg border border-orange-200 dark:border-orange-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                      🚫 DUPLICATE WATCHLIST PREVENTED
                    </span>
                  </div>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mb-2">
                    <strong>Why this happened:</strong> A watchlist with the name "{error.match(/"([^"]+)"/)?.[1] || 'this name'}" already exists in your account.
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    <strong>💡 Solution:</strong> Click "Create Watchlist" again and the system will automatically suggest a unique name for you.
                  </p>
                  {watchlists.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-orange-200 dark:border-orange-600">
                      <p className="text-xs text-orange-600 dark:text-orange-400 mb-1">
                        <strong>Your existing watchlists:</strong>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {watchlists.map((watchlist) => (
                          <span 
                            key={watchlist.id}
                            className="inline-block px-2 py-1 text-xs bg-orange-200 dark:bg-orange-700 text-orange-800 dark:text-orange-200 rounded-md"
                          >
                            {watchlist.name}
                          </span>
                        ))}
          </div>
        </div>
                  )}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-800/30"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Success Messages */}
      {refreshSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6"
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                {refreshSuccess === 'created' ? 'Watchlist Created Successfully!' : 'Success'}
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                {refreshSuccess === 'created' && 'Your new watchlist has been created and is ready to use.'}
                {refreshSuccess === 'cleared' && 'All stocks have been removed from your watchlist.'}
                {refreshSuccess === 'removed' && 'Watchlist has been successfully removed.'}
                {refreshSuccess === 'switched' && 'Successfully switched to selected watchlist.'}
                {refreshSuccess === 'added' && 'Stock added. You can add another.'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRefreshSuccess(false)}
              className="text-green-400 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-800/30"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Create Watchlist Modal */}
      {showCreateModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create New Watchlist
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
              </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="watchlistName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Watchlist Name
                </label>
                <input
                  id="watchlistName"
                  type="text"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  placeholder="Enter watchlist name (e.g., Tech Stocks, Dividend Portfolio)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  onKeyPress={(e) => e.key === 'Enter' && handleCustomCreate()}
                  autoFocus
                />
            </div>
              
              {watchlists.length > 0 && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    <strong>Your existing watchlists:</strong>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {watchlists.map((watchlist) => (
                      <span 
                        key={watchlist.id}
                        className="inline-block px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md"
                      >
                        {watchlist.name}
                      </span>
                    ))}
            </div>
                </div>
              )}
              
              <div className="flex space-x-3 pt-2">
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCustomCreate}
                  disabled={!newWatchlistName.trim() || isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Watchlist'
                  )}
                </Button>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Watchlist</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track your favorite stocks and monitor their performance
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {/* Watchlist Selector */}
          {watchlists.length > 0 && (
        <div className="flex items-center space-x-2">
              <label htmlFor="watchlist-selector" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active:
              </label>
              <select
                id="watchlist-selector"
                value={activeWatchlistId || ''}
                onChange={(e) => {
                  const selectedId = e.target.value
                  if (selectedId === '') {
                    setActiveWatchlistId(null)
                  } else {
                    setActiveWatchlistId(selectedId)
                    // Scroll to watchlist items section
                    if (!suppressScrollRef.current) {
                      const watchlistItemsSection = document.getElementById('watchlist-items-section')
                      if (watchlistItemsSection) {
                        watchlistItemsSection.scrollIntoView({ behavior: 'smooth' })
                      }
                    } else {
                      // clear suppression after honoring it once
                      suppressScrollRef.current = false
                    }
                  }
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Watchlists</option>
                {watchlists.map((watchlist, index) => (
                  <option key={watchlist.id} value={watchlist.id}>
                    {index + 1}. {watchlist.name} ({watchlist.items?.length || 0} stocks)
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Create Watchlist Button */}
          <Button 
            onClick={openCreateModal}
            disabled={isCreatingWatchlist}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isCreatingWatchlist ? (
              <>
              <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create Watchlist</span>
              </>
            )}
          </Button>
          
          {/* Refresh Button - Always fetch fresh data from database */}
          <Button 
            onClick={() => refreshWatchlistData()}
            variant="outline"
            disabled={storeLoading}
            className="flex items-center space-x-2"
          >
            {storeLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>Refresh Data</span>
          </Button>
        </div>
      </div>

      {/* Watchlist Status Indicator */}
      {activeWatchlistId && watchlists.find(w => w.id === activeWatchlistId) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Currently viewing: <strong>{watchlists.find(w => w.id === activeWatchlistId)?.name}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-blue-700 dark:text-blue-300">
              <span>
                📊 {watchlists.find(w => w.id === activeWatchlistId)?.items?.length || 0} stocks
              </span>
              <span>
                📅 Created {new Date(watchlists.find(w => w.id === activeWatchlistId)?.createdAt || '').toLocaleDateString()}
              </span>
              <span>
                🔄 Last updated {new Date(watchlists.find(w => w.id === activeWatchlistId)?.updatedAt || '').toLocaleTimeString()}
              </span>
            </div>
        </div>
      </motion.div>
      )}

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Enhanced Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search stocks (e.g., AAPL, Apple, Tesla)..."
              value={searchQuery}
              onChange={(e) => {
                console.log(`🔍 Search input changed: "${e.target.value}"`)
                setSearchQuery(e.target.value)
              }}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                  <X className="w-4 h-4" />
              </Button>
            )}
            {isSearching && (
                <Loader2 className="absolute right-10 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-gray-400 dark:text-gray-500" />
            )}
          </div>
          
          </div>
        </div>

        {/* Enhanced Search Results */}
        {searchQuery.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden"
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Search className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                    Search Results for "{searchQuery}"
                </h3>
                    <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                      </span>
                  {isSearching && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                    </div>
              </div>
              
              {/* Watchlist Selection for Adding Stocks */}
              {watchlists.length > 0 && (
                <div className="mt-3 flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Add to:</span>
                  <select
                    value={activeWatchlistId || ''}
                    onChange={(e) => { suppressScrollRef.current = true; setActiveWatchlistId(e.target.value || null) }}
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Watchlist</option>
                    {watchlists.map((watchlist) => (
                      <option key={watchlist.id} value={watchlist.id}>
                        {watchlist.name} ({watchlist.items?.length || 0} stocks)
                      </option>
                    ))}
                  </select>
                  {activeWatchlistId && (
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      ✓ {watchlists.find(w => w.id === activeWatchlistId)?.name}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="p-4">
              {searchResults.length > 0 ? (
                  <div className="space-y-3">
                    {searchResults.map((stock) => (
                    <div
                      key={stock.symbol}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                    >
                          <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {stock.symbol[0]}
                          </span>
                            </div>
                            <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{stock.symbol}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{stock.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            {stock.exchange} • {stock.sector || 'N/A'}
                            </div>
                          </div>
                        </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          {stock.price && stock.price > 0 ? (
                            <>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                ${stock.price.toFixed(2)}
                              </div>
                              <div className={`text-sm ${(stock.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(stock.change || 0) >= 0 ? '+' : ''}{(stock.change || 0).toFixed(2)} 
                                ({(stock.changePercent || 0).toFixed(2)}%)
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              <div className="font-medium">Loading price...</div>
                              <div className="text-xs">Click to add</div>
                            </div>
                          )}
                        </div>
                        
                        <Button
                          onClick={() => handleAddToWatchlist(stock, activeWatchlistId || undefined)}
                          disabled={loadingStocks.has(stock.symbol) || !activeWatchlistId}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {loadingStocks.has(stock.symbol) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          {activeWatchlistId ? 'Add' : 'Select Watchlist'}
                        </Button>
                      </div>
                  </div>
                  ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No stocks found matching "{searchQuery}"</p>
                  </div>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Enhanced Popular Stocks - only show when not searching */}
        {searchQuery.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Main Popular Stocks Grid */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Star className="w-5 h-5 mr-2 text-yellow-500" />
                  Popular Stocks
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">Click to search</span>
                </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Quick access to popular stocks - click any stock to search and add to your watchlist
              </p>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { symbol: 'AAPL', name: 'Apple Inc.' },
                  { symbol: 'MSFT', name: 'Microsoft' },
                  { symbol: 'GOOGL', name: 'Alphabet' },
                  { symbol: 'TSLA', name: 'Tesla' },
                  { symbol: 'NVDA', name: 'NVIDIA' },
                  { symbol: 'AMZN', name: 'Amazon' },
                  { symbol: 'META', name: 'Meta' },
                  { symbol: 'NFLX', name: 'Netflix' },
                  { symbol: 'JPM', name: 'JPMorgan' },
                  { symbol: 'JNJ', name: 'Johnson & Johnson' },
                  { symbol: 'PG', name: 'Procter & Gamble' },
                  { symbol: 'UNH', name: 'UnitedHealth' }
                  ].map((stock) => (
                  <div
                    key={stock.symbol}
                    onClick={() => {
                      setSearchQuery(stock.symbol)
                      // Focus on search input
                      setTimeout(() => {
                        const searchInput = document.querySelector('input[placeholder*="Search stocks"]') as HTMLInputElement
                        if (searchInput) {
                          searchInput.focus()
                        }
                      }, 100)
                    }}
                    className="cursor-pointer group"
                  >
                    <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-all duration-200 hover:shadow-md">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-200">
                        <span className="text-white font-bold text-lg">{stock.symbol.charAt(0)}</span>
                          </div>
                    <div className="text-center">
                        <div className="font-bold text-gray-900 dark:text-white text-sm mb-1">{stock.symbol}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 leading-tight">{stock.name}</div>
                          </div>
                        </div>
                      </div>
                ))}
              </div>
            </div>
                    </div>
              
          {/* More Popular Stocks - Horizontal Buttons */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">More Popular Stocks</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Additional popular stocks you might be interested in
              </p>
            </div>
            <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {['HD', 'MA', 'V', 'PYPL', 'ADBE', 'CRM', 'INTC', 'AMD', 'ORCL', 'CSCO', 'IBM', 'QCOM'].map((symbol) => (
                    <button
                      key={symbol}
                    onClick={() => {
                      setSearchQuery(symbol)
                      // Focus on search input
                      setTimeout(() => {
                        const searchInput = document.querySelector('input[placeholder*="Search stocks"]') as HTMLInputElement
                        if (searchInput) {
                          searchInput.focus()
                        }
                      }, 100)
                    }}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors duration-200 hover:shadow-sm"
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
          </div>
      </motion.div>
      )}

      {/* Watchlist Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Watchlist Summary</h2>
          <Button
            onClick={openCreateModal}
            disabled={isCreatingWatchlist}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            {isCreatingWatchlist ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>New Watchlist</span>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Stocks</p>
                  <p className="text-2xl font-bold">
                    {getItemsToDisplay().length}
                  </p>
                </div>
              </div>
          </CardContent>
        </Card>
          
        <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Gainers</p>
                  <p className="text-2xl font-bold text-green-600">
                    {getItemsToDisplay().filter(item => (item.changePercent || 0) > 0).length}
                  </p>
                </div>
              </div>
          </CardContent>
        </Card>

        <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Losers</p>
                  <p className="text-2xl font-bold text-red-600">
                    {getItemsToDisplay().filter(item => (item.changePercent || 0) < 0).length}
                  </p>
                </div>
              </div>
          </CardContent>
        </Card>
           
        <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Change</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(() => {
                      const items = getItemsToDisplay()
                      const totalChange = items.reduce((sum, item) => sum + (item.changePercent || 0), 0)
                      return totalChange.toFixed(2)
                    })()}%
                  </p>
                </div>
              </div>
          </CardContent>
        </Card>

        <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-sm font-medium">
                    {(() => {
                      const items = getItemsToDisplay()
                      return items.length > 0 
                        ? new Date(Math.max(...items.map(item => new Date(item.addedAt).getTime()))).toLocaleTimeString()
                        : 'Never'
                    })()}
                  </p>
                </div>
              </div>
          </CardContent>
        </Card>
        </div>
      </motion.div>

      {/* Watchlist Management Section */}
      {watchlists.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Manage Your Watchlists</h2>
            <Button
              onClick={openCreateModal}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another</span>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlists.map((watchlist) => (
              <Card key={watchlist.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                      {watchlist.name}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                        {(() => {
                          const c = watchlist.items?.length || 0
                          return `${c} ${c === 1 ? 'stock' : 'stocks'}`
                        })()}
                      </span>
                    </div>
                  </div>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                    Created {new Date(watchlist.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {watchlist.items && watchlist.items.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Recent stocks:
                        </p>
                        {watchlist.items.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{item.symbol}</span>
                            <span className="text-gray-500">${item.price?.toFixed(2) || 'N/A'}</span>
                          </div>
                        ))}
                        {watchlist.items.length > 3 && (
                          <p className="text-xs text-gray-500 text-center">
                            {(() => { const extra = watchlist.items.length - 3; return `+${extra} more ${extra === 1 ? 'stock' : 'stocks'}` })()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No stocks added yet
                      </p>
                    )}
                    
                    <div className="flex space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleSelectWatchlist(watchlist.id)}
                        disabled={activeWatchlistId === watchlist.id}
                      >
                        {activeWatchlistId === watchlist.id ? (
                          <>
                            <Check className="w-4 h-4 mr-2 text-green-600" />
                            Active
                          </>
                        ) : (
                          <>
                            <Star className="w-4 h-4 mr-2 text-gray-500" />
                            View
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleRemoveWatchlist(watchlist.id, watchlist.name)}
                        disabled={removingWatchlistId === watchlist.id}
                      >
                        {removingWatchlistId === watchlist.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Watchlist Items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
        id="watchlist-items-section"
      >
        {/* Show create watchlist prompt if no watchlists exist */}
        {watchlists.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <Star className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Create Your First Watchlist
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Start tracking your favorite stocks by creating a watchlist. You can organize stocks by theme, sector, or any way you prefer.
            </p>
            <div className="space-y-3">
              {!isAuthenticated || !user || !localStorage.getItem('token') ? (
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                      {!localStorage.getItem('token') 
                        ? 'Your session has expired. Please log in again.' 
                        : 'Please log in to create a watchlist'
                      }
                    </p>
                  </div>
                  <Button 
                    onClick={() => window.location.href = '/login'}
                    className="px-6 py-3"
                    size="lg"
                    variant="outline"
                  >
                    Go to Login
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={openCreateModal}
                  className="px-6 py-3"
                  size="lg"
                  disabled={isCreatingWatchlist}
                >
                  {isCreatingWatchlist ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Create Watchlist
                    </>
                  )}
                </Button>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                After creating a watchlist, you can search and add stocks above
              </p>
            </div>
          </motion.div>
        )}

        {/* Active Watchlist Header */}
        {activeWatchlistId && watchlists.find(w => w.id === activeWatchlistId) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 scroll-mt-24"
            id="active-watchlist-header"
            tabIndex={-1}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Star className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    {watchlists.find(w => w.id === activeWatchlistId)?.name}
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {(() => { const c = watchlists.find(w => w.id === activeWatchlistId)?.items?.length || 0; return `${c} ${c === 1 ? 'stock' : 'stocks'}` })()} • 
                    Created {new Date(watchlists.find(w => w.id === activeWatchlistId)?.createdAt || '').toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveWatchlistId(null)}
                className="text-blue-600 border-blue-300 hover:bg-blue-100"
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
            
            {/* Quick Actions for Selected Watchlist */}
            <div className="flex items-center space-x-3 pt-3 border-t border-blue-200 dark:border-blue-700">
              <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                Quick Actions:
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveWatchlistId(null)
                  // Focus on search input
                  setTimeout(() => {
                    const searchInput = document.querySelector('input[placeholder*="Search stocks"]') as HTMLInputElement
                    if (searchInput) {
                      searchInput.focus()
                    }
                  }, 100)
                }}
                className="text-blue-600 border-blue-300 hover:bg-blue-100"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Stocks
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const watchlist = watchlists.find(w => w.id === activeWatchlistId)
                  if (watchlist && watchlist.items && watchlist.items.length > 0) {
                    handleClearAll(activeWatchlistId)
                  }
                }}
                className="text-red-600 border-red-300 hover:bg-red-100"
                disabled={!activeWatchlistId || !watchlists.find(w => w.id === activeWatchlistId)?.items?.length}
              >
                <X className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
          </motion.div>
        )}

        {/* Only show watchlist items if watchlists exist */}
        {watchlists.length > 0 && (
          <>
        <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {activeWatchlistId 
                  ? `${watchlists.find(w => w.id === activeWatchlistId)?.name} Stocks`
                  : 'All Watchlist Stocks'
                } ({(() => {
                  if (activeWatchlistId) {
                    return watchlists.find(w => w.id === activeWatchlistId)?.items?.length || 0
                  } else {
                    // Count total stocks across all watchlists
                    return watchlists.reduce((total, watchlist) => {
                      return total + (watchlist.items?.length || 0)
                    }, 0)
                  }
                })()})
              </h2>
          {isConnectedToRealTime && (
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Updates</span>
            </div>
          )}
        </div>
        
        <AnimatePresence mode="popLayout">
              {(() => {
                // Get items to show based on selection
                const itemsToShow = getItemsToDisplay()
                
                return itemsToShow.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {itemsToShow.map((item) => (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                      <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">{item.symbol[0]}</span>
                        </div>
                              <div>
                                <div className="font-semibold">{item.symbol}</div>
                                <div className="text-sm text-muted-foreground">{item.name}</div>
                                <div className="text-xs text-muted-foreground">{item.exchange}</div>
                      </div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="text-lg font-bold">${item.price?.toFixed(2) || 'N/A'}</div>
                              <div className={`text-sm ${(item.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(item.change || 0) >= 0 ? '+' : ''}{item.change?.toFixed(2) || '0.00'} 
                                ({(item.changePercent || 0).toFixed(2)}%)
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-2">
                      <Button
                        size="sm"
                              variant="outline"
                        onClick={() => handleRemoveFromWatchlist(item.id, item.symbol)}
                        disabled={removingItemId === item.id}
                              className="h-8 w-8 p-0"
                      >
                        {removingItemId === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </Button>
                            
                              {isConnectedToRealTime && (
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              )}
                          </div>
                        </div>
                        
                          <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Sector: {item.sector || 'N/A'}</span>
                        </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Added: {new Date(item.addedAt).toLocaleDateString()}
                          </div>
                      </div>
                    </CardContent>
                  </Card>
              ))}
            </div>
          ) : (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {activeWatchlistId 
                        ? `No stocks in "${watchlists.find(w => w.id === activeWatchlistId)?.name}"`
                        : 'No stocks found'
                      }
              </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {activeWatchlistId 
                        ? 'This watchlist is empty. Start adding stocks to track their performance.'
                        : 'No stocks match your current filters. Try adjusting your search or filters.'
                }
              </p>
                    {activeWatchlistId && (
                      <Button
                        onClick={() => {
                          setActiveWatchlistId(null)
                          // Focus on search input
                          setTimeout(() => {
                            const searchInput = document.querySelector('input[placeholder*="Search stocks"]') as HTMLInputElement
                            if (searchInput) {
                              searchInput.focus()
                            }
                          }, 100)
                        }}
                        variant="outline"
                        className="px-6 py-2"
                      >
                  <Plus className="w-4 h-4 mr-2" />
                        Add Stocks
                </Button>
                    )}
                  </div>
                )
              })()}
            </AnimatePresence>
          </>
              )}
            </motion.div>

      {/* Floating Action Button - Dismissible create watchlist button */}
      <AnimatePresence>
        {showFloatingButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 100 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 100 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div className="relative group">
              {/* Main Create Button */}
              <Button
                onClick={openCreateModal}
                disabled={isCreatingWatchlist}
                className="flex items-center space-x-2 px-6 py-3 h-auto rounded-full shadow-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-2 border-white dark:border-gray-800 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isCreatingWatchlist ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span className="text-sm">Create Watchlist</span>
                  </>
                )}
              </Button>
              
              {/* Dismiss Button */}
              <Button
                onClick={() => setShowFloatingButton(false)}
                variant="ghost"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 shadow-md border border-gray-200 dark:border-gray-600 p-0"
                title="Hide this button"
              >
                <X className="w-3 h-3" />
              </Button>
              
              {/* Helper text */}
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                Quick create (also available in header)
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Show floating button toggle - appears when button is hidden */}
      <AnimatePresence>
        {!showFloatingButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setShowFloatingButton(true)}
              variant="outline"
              size="sm"
              className="rounded-full h-10 w-10 p-0 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-lg border-2 border-gray-200 dark:border-gray-600"
              title="Show create watchlist button"
            >
              <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}