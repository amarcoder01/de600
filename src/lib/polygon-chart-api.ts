// Polygon.io Chart Data API for Stock Charts
import { OHLCVData } from '@/types'

// Polygon API configuration
const POLYGON_API_KEY = process.env.NEXT_PUBLIC_POLYGON_API_KEY || process.env.POLYGON_API_KEY
const POLYGON_BASE_URL = 'https://api.polygon.io'

// Helper function to make authenticated requests
const makePolygonRequest = async (url: string): Promise<Response> => {
  if (!POLYGON_API_KEY || POLYGON_API_KEY.trim() === '' || POLYGON_API_KEY === 'your_actual_api_key_here') {
    throw new Error('Polygon API key is required. Please add POLYGON_API_KEY to your environment variables.')
  }

  // Add API key as query parameter
  const urlWithKey = new URL(url)
  urlWithKey.searchParams.set('apikey', POLYGON_API_KEY)

  console.log('Making Polygon request to:', urlWithKey.toString().replace(POLYGON_API_KEY, '[API_KEY]'))

  const response = await fetch(urlWithKey.toString(), {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Polygon API error:', response.status, errorText)
    
    if (response.status === 401) {
      throw new Error('Invalid Polygon API key. Please check your API key.')
    } else if (response.status === 403) {
      throw new Error('Access forbidden. Your API key may not have permission for this endpoint.')
    } else if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait before making more requests.')
    } else {
      throw new Error(`Polygon API error: ${response.status} ${response.statusText}`)
    }
  }

  return response
}

// Polygon aggregates API response interface
interface PolygonAggregatesResponse {
  status: string
  request_id?: string
  results?: Array<{
    c: number  // Close price
    h: number  // High price
    l: number  // Low price
    o: number  // Open price
    t: number  // Timestamp (Unix timestamp in milliseconds)
    v: number  // Volume
    vw?: number // Volume weighted average price
  }>
  resultsCount?: number
  adjusted?: boolean
  next_url?: string
}

export class PolygonChartAPI {
  
  // Convert timeframe to Polygon API parameters
  private static getPolygonTimeParams(timeframe: string, interval: string) {
    const now = new Date()
    let from: Date
    let multiplier: number
    let timespan: string

    // Determine date range based on timeframe
    switch (timeframe) {
      case '1d':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        multiplier = 1
        timespan = 'minute'
        break
      case '5d':
        from = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
        multiplier = 5
        timespan = 'minute'
        break
      case '1mo':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        multiplier = 15
        timespan = 'minute'
        break
      case '3mo':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        multiplier = 1
        timespan = 'hour'
        break
      case '6mo':
        from = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
        multiplier = 1
        timespan = 'day'
        break
      case '1y':
        from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        multiplier = 1
        timespan = 'day'
        break
      case '5y':
        from = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000)
        multiplier = 1
        timespan = 'week'
        break
      default:
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        multiplier = 1
        timespan = 'minute'
    }

    return {
      from: from.toISOString().split('T')[0], // Format as YYYY-MM-DD
      to: now.toISOString().split('T')[0],
      multiplier,
      timespan
    }
  }

  // Get chart data from Polygon API
  static async getChartData(symbol: string, timeframe: string = '1d', interval: string = '1m'): Promise<OHLCVData[]> {
    try {
      console.log(`Fetching Polygon chart data for ${symbol}, timeframe: ${timeframe}`)

      const { from, to, multiplier, timespan } = this.getPolygonTimeParams(timeframe, interval)
      
      // Construct Polygon aggregates URL
      const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}`
      
      console.log(`Polygon API URL: ${url}`)

      const response = await makePolygonRequest(url)
      const data: PolygonAggregatesResponse = await response.json()

      console.log('Polygon API response:', {
        status: data.status,
        resultsCount: data.resultsCount,
        hasResults: !!data.results?.length
      })

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.warn(`No data found for ${symbol} with timeframe ${timeframe}`)
        return []
      }

      // Convert Polygon format to our OHLCV format
      const chartData: OHLCVData[] = data.results.map(item => ({
        time: item.t, // Polygon provides timestamp in milliseconds
        open: item.o,
        high: item.h,
        low: item.l,
        close: item.c,
        volume: item.v
      }))

      // Sort by time to ensure proper order
      chartData.sort((a, b) => a.time - b.time)

      console.log(`Successfully converted ${chartData.length} data points for ${symbol}`)
      console.log('Sample data point:', chartData[0])

      return chartData

    } catch (error) {
      console.error(`Error fetching chart data for ${symbol}:`, error)
      throw error
    }
  }

  // Generate fallback data when Polygon API fails
  static generateFallbackData(symbol: string, timeframe: string = '1d'): OHLCVData[] {
    console.log(`Generating fallback chart data for ${symbol} (${timeframe})`)
    
    // Base prices for known symbols
    const basePrices: { [key: string]: number } = {
      'AAPL': 185,
      'MSFT': 385,
      'GOOGL': 145,
      'TSLA': 255,
      'AMZN': 150,
      'NVDA': 455,
      'META': 305,
      'NFLX': 405,
      'JPM': 155,
      'V': 265
    }
    
    const basePrice = basePrices[symbol] || (100 + Math.random() * 400)
    const dataPoints: OHLCVData[] = []
    const now = Date.now()
    
    // Generate data points based on timeframe
    let numPoints = 100
    let timeInterval = 24 * 60 * 60 * 1000 // 1 day
    
    switch (timeframe) {
      case '1d':
        numPoints = 390 // Market minutes
        timeInterval = 60 * 1000 // 1 minute
        break
      case '5d':
        numPoints = 5 * 390
        timeInterval = 60 * 1000
        break
      case '1mo':
        numPoints = 30
        timeInterval = 24 * 60 * 60 * 1000
        break
      case '3mo':
        numPoints = 90
        timeInterval = 24 * 60 * 60 * 1000
        break
      case '6mo':
        numPoints = 180
        timeInterval = 24 * 60 * 60 * 1000
        break
      case '1y':
        numPoints = 252
        timeInterval = 24 * 60 * 60 * 1000
        break
      case '5y':
        numPoints = 1260
        timeInterval = 24 * 60 * 60 * 1000
        break
    }
    
    let currentPrice = basePrice
    
    for (let i = 0; i < numPoints; i++) {
      const time = now - (numPoints - i) * timeInterval
      
      // Random walk with slight upward bias
      const volatility = 0.015
      const change = (Math.random() - 0.48) * volatility
      currentPrice = currentPrice * (1 + change)
      
      const high = currentPrice * (1 + Math.random() * 0.008)
      const low = currentPrice * (1 - Math.random() * 0.008)
      const open = currentPrice * (1 + (Math.random() - 0.5) * 0.003)
      const close = currentPrice
      const volume = Math.random() * 800000 + 100000

      dataPoints.push({
        time,
        open,
        high,
        low,
        close,
        volume
      })
    }
    
    console.log(`Generated ${dataPoints.length} fallback data points for ${symbol} (${timeframe})`)
    return dataPoints
  }

  // Check if Polygon API is configured
  static isConfigured(): boolean {
    return !!(POLYGON_API_KEY && POLYGON_API_KEY.trim() !== '' && POLYGON_API_KEY !== 'your_actual_api_key_here')
  }

  // Get API status
  static getAPIStatus(): { configured: boolean; key: string } {
    return {
      configured: this.isConfigured(),
      key: POLYGON_API_KEY ? `${POLYGON_API_KEY.substring(0, 8)}...` : 'Not set'
    }
  }
}
