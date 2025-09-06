import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const period = searchParams.get('period') || '1d'
    const interval = searchParams.get('interval') || '1m'

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol parameter is required' },
        { status: 400 }
      )
    }

    // Enhanced data structure
    const enhancedData = {
      symbol: symbol.toUpperCase(),
      timestamp: new Date().toISOString(),
      current: await getCurrentData(symbol),
      historical: await getHistoricalData(symbol, period, interval),
      technical: await getTechnicalIndicators(symbol),
      sentiment: await getMarketSentiment(symbol),
      fundamentals: await getEnhancedFundamentals(symbol),
      news: await getRecentNews(symbol)
    }

    return NextResponse.json({
      success: true,
      data: enhancedData
    })

  } catch (error) {
    console.error('Enhanced Market Data API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch enhanced market data' },
      { status: 500 }
    )
  }
}

async function getCurrentData(symbol: string) {
  try {
    // Use existing stock quote API as base
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/stocks/quote?symbol=${symbol}`)
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.data) {
        return {
          price: data.data.price || 0,
          change: data.data.change || 0,
          changePercent: data.data.changePercent || 0,
          volume: data.data.volume || 0,
          marketCap: data.data.marketCap || 0,
          pe: data.data.pe || null, // Use null instead of 0 for missing P/E
          dividendYield: data.data.dividendYield || 0,
          beta: data.data.beta || null, // Use null instead of 0 for missing Beta
          high52Week: data.data.high52Week || 0,
          low52Week: data.data.low52Week || 0,
          sector: data.data.sector || 'Unknown',
          industry: data.data.industry || 'Unknown',
          name: data.data.name || symbol,
          dataSource: 'polygon',
          lastUpdated: new Date().toISOString()
        }
      } else {
        console.warn(`Stock quote API returned unsuccessful response for ${symbol}:`, data)
      }
    } else {
      console.warn(`Stock quote API returned ${response.status} for ${symbol}`)
    }
  } catch (error) {
    console.error(`Error fetching current data for ${symbol}:`, error)
  }

  // No fallback data - throw error for real-time data requirement
  throw new Error(`Real-time market data unavailable for ${symbol} - no fallback data allowed`)
}

async function getHistoricalData(symbol: string, period: string, interval: string) {
  // Real-time historical data only - no mock data allowed
  throw new Error(`Real-time historical data required for ${symbol} - use Polygon.io API for live data`)
}

async function getTechnicalIndicators(symbol: string) {
  // Real-time technical indicators only - no mock data allowed
  throw new Error(`Real-time technical indicators required for ${symbol} - use Polygon.io API for live data`)
}

async function getMarketSentiment(symbol: string) {
  // Real-time sentiment data only - no mock data allowed
  throw new Error(`Real-time sentiment data required for ${symbol} - use news APIs for live sentiment`)
}

async function getEnhancedFundamentals(symbol: string) {
  // Real-time fundamentals only - no mock data allowed
  throw new Error(`Real-time fundamentals required for ${symbol} - use financial data APIs for live data`)
}

async function getRecentNews(symbol: string) {
  // Real-time news only - no mock data allowed
  throw new Error(`Real-time news required for ${symbol} - use news APIs for live data`)
}
