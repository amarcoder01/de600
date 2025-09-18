import { useState, useEffect } from 'react'

interface MarketInsights {
  economicIndicators: {
    inflationRate: string
    interestRates: string
    gdpGrowth: string
    unemploymentRate: string
    consumerConfidence: number
  }
  marketSentiment: {
    fearGreedIndex: number
    fearGreedStatus: string
    vixIndex: string
    putCallRatio: string
    marketMood: string
  }
  sectorPerformance: {
    technology: string
    healthcare: string
    finance: string
    energy: string
    consumer: string
  }
  marketStatus: {
    isOpen: boolean
    nextOpen: string
    lastUpdate: string
    tradingVolume: string
  }
  globalMarkets: {
    sp500: string
    nasdaq: string
    dowJones: string
    gold: string
    oil: string
  }
}

export function useMarketInsights() {
  const [insights, setInsights] = useState<MarketInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/market-insights')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setInsights(data.data)
        } else {
          throw new Error(data.error || 'Failed to fetch market insights')
        }
      } else {
        throw new Error(`HTTP ${response.status}: Failed to fetch market insights`)
      }
    } catch (err) {
      console.error('Error fetching market insights:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch market insights')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchInsights, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  return {
    insights,
    loading,
    error,
    refresh: fetchInsights
  }
}
