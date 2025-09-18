import { useState, useEffect, useCallback, useRef } from 'react'
import { StockData, MarketStatus, AppState } from '@/types/top-movers'
import { TopMoversApiService } from '@/lib/top-movers-api'

const ITEMS_PER_PAGE = 20
const AUTO_REFRESH_INTERVAL = 15 * 60 * 1000 // 15 minutes in milliseconds

export const useTopMovers = () => {
  const [state, setState] = useState<AppState>({
    gainers: [],
    losers: [],
    loading: true,
    error: null,
    marketStatus: null,
    gainersPage: 1,
    losersPage: 1,
  })

  const [allGainers, setAllGainers] = useState<StockData[]>([])
  const [allLosers, setAllLosers] = useState<StockData[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchMarketStatus = useCallback(async () => {
    try {
      console.log('🔄 Fetching market status...')
      const marketStatus = await TopMoversApiService.getMarketStatus()
      console.log('✅ Market status fetched:', marketStatus)
      setState(prev => ({ ...prev, marketStatus }))
    } catch (error) {
      console.error('❌ Failed to fetch market status:', error)
      // Don't set error state for market status failure
    }
  }, [])

  const fetchInitialData = useCallback(async () => {
    console.log('🔄 Starting initial data fetch...')
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      console.log('📊 Fetching top gainers and losers...')
      const [gainersResponse, losersResponse] = await Promise.all([
        TopMoversApiService.getTopGainers(),
        TopMoversApiService.getTopLosers(),
      ])

      console.log('📈 Gainers response:', gainersResponse)
      console.log('📉 Losers response:', losersResponse)

      const gainersData = gainersResponse.results || []
      const losersData = losersResponse.results || []

      console.log(`📊 Received ${gainersData.length} gainers and ${losersData.length} losers`)
      console.log('📊 Gainers data sample:', gainersData.slice(0, 2))
      console.log('📊 Losers data sample:', losersData.slice(0, 2))

      setAllGainers(gainersData)
      setAllLosers(losersData)

      setState(prev => ({
        ...prev,
        gainers: gainersData.slice(0, ITEMS_PER_PAGE),
        losers: losersData.slice(0, ITEMS_PER_PAGE),
        loading: false,
        gainersPage: 1,
        losersPage: 1,
      }))

      // Update timestamps
      const now = new Date()
      setLastUpdated(now)
      setNextRefresh(new Date(now.getTime() + AUTO_REFRESH_INTERVAL))

      // If both gainers and losers are empty, set an error
      if (gainersData.length === 0 && losersData.length === 0) {
        console.warn('⚠️ No data received from API')
        setState(prev => ({
          ...prev,
          error: 'No top movers data available. Market may be closed or data temporarily unavailable.',
        }))
      } else {
        console.log('✅ Data fetch completed successfully')
        // Clear any existing errors
        setState(prev => ({
          ...prev,
          error: null,
        }))
      }
    } catch (error) {
      console.error('❌ Error in fetchInitialData:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stock data'
      
      // Provide more specific error messages
      let userFriendlyError = errorMessage
      if (errorMessage.includes('Failed to fetch')) {
        userFriendlyError = 'Unable to connect to the market data service. Please check your internet connection and try again.'
      } else if (errorMessage.includes('API rate limit')) {
        userFriendlyError = 'API rate limit exceeded. Please wait a moment and try again.'
      } else if (errorMessage.includes('Invalid API key')) {
        userFriendlyError = 'API configuration error. Please contact support.'
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: userFriendlyError,
      }))
    }
  }, [])

  const loadMoreGainers = useCallback(() => {
    const nextPage = state.gainersPage + 1
    const startIndex = nextPage * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const newGainers = allGainers.slice(0, endIndex)

    setState(prev => ({
      ...prev,
      gainers: newGainers,
      gainersPage: nextPage,
    }))
  }, [state.gainersPage, allGainers])

  const loadMoreLosers = useCallback(() => {
    const nextPage = state.losersPage + 1
    const startIndex = nextPage * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const newLosers = allLosers.slice(0, endIndex)

    setState(prev => ({
      ...prev,
      losers: newLosers,
      losersPage: nextPage,
    }))
  }, [state.losersPage, allLosers])

  const hasMoreGainers = state.gainers.length < allGainers.length
  const hasMoreLosers = state.losers.length < allLosers.length

  const refreshData = useCallback(() => {
    console.log('🔄 Manual refresh triggered')
    fetchInitialData()
    fetchMarketStatus()
  }, [fetchInitialData, fetchMarketStatus])

  // Setup automatic refresh
  useEffect(() => {
    console.log('🚀 Setting up useTopMovers hook...')
    
    // Initial data fetch
    fetchInitialData()
    fetchMarketStatus()

    // Setup interval for automatic refresh
    intervalRef.current = setInterval(() => {
      console.log('🔄 Auto-refresh triggered')
      fetchInitialData()
      fetchMarketStatus()
    }, AUTO_REFRESH_INTERVAL)

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        console.log('🧹 Cleaned up auto-refresh interval')
      }
    }
  }, [fetchInitialData, fetchMarketStatus])

  return {
    ...state,
    loadMoreGainers,
    loadMoreLosers,
    hasMoreGainers,
    hasMoreLosers,
    refreshData,
    lastUpdated,
    nextRefresh,
  }
}
