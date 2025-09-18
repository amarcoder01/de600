import { useState, useEffect } from 'react'

interface StockDetails {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  marketCap: number
  pe: number
  eps: number
  dividendYield: number
  dividendPayoutRatio: number
  beta: number
  high52Week: number
  low52Week: number
  volume: number
  avgVolume: number
  sector: string
  industry: string
  employees: number
  founded: number
  headquarters: string
  debtToEquity: number
  currentRatio: number
  institutionalOwnership: number
  analystRating: string
  revenueGrowth: number
  profitMargin: number
  roe: number
  movingAverage50: number
  movingAverage200: number
  rsi: number
  macd: {
    macd: number
    signal: number
    histogram: number
  }
  volumeTrend: number
  aiPrediction: {
    nextDayPrice: number
    nextWeekPrice: number
    probability: number
    confidence: number
    direction: 'bullish' | 'bearish' | 'neutral'
  }
}

export function useStockDetails(symbol: string) {
  const [data, setData] = useState<StockDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!symbol) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/stock-details/${symbol}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data for ${symbol}`)
        }

        const stockData = await response.json()
        setData(stockData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [symbol])

  return { data, loading, error }
}

export function useMultipleStockDetails(symbols: string[]) {
  const [data, setData] = useState<Record<string, StockDetails>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!symbols.length) return

    const fetchAllData = async () => {
      setLoading(true)
      setError(null)

      try {
        const promises = symbols.map(async (symbol) => {
          const response = await fetch(`/api/stock-details/${symbol}`)
          if (!response.ok) {
            throw new Error(`Failed to fetch data for ${symbol}`)
          }
          return response.json()
        })

        const results = await Promise.all(promises)
        const dataMap: Record<string, StockDetails> = {}
        
        results.forEach((result, index) => {
          dataMap[symbols[index]] = result
        })

        setData(dataMap)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [symbols.join(',')])

  return { data, loading, error }
}
