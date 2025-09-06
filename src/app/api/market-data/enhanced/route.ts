import { NextRequest, NextResponse } from 'next/server'
import { polygonAPI } from '@/lib/polygon-api'

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
    // Use Polygon API directly instead of internal HTTP call
    const stockData = await polygonAPI.getUSStockData(symbol)
    
    if (!stockData) {
      throw new Error(`No data available for ${symbol}`)
    }

    return {
      price: stockData.price || 0,
      change: stockData.change || 0,
      changePercent: stockData.changePercent || 0,
      volume: stockData.volume || 0,
      marketCap: stockData.marketCap || 0,
      pe: stockData.pe || null, // Use null instead of 0 for missing P/E
      dividendYield: stockData.dividendYield || 0,
      beta: stockData.beta || null, // Use null instead of 0 for missing Beta
      high52Week: stockData.fiftyTwoWeekHigh || 0,
      low52Week: stockData.fiftyTwoWeekLow || 0,
      sector: stockData.sector || 'Unknown',
      industry: stockData.industry || 'Unknown',
      name: stockData.name || symbol,
      dataSource: 'polygon',
      lastUpdated: new Date().toISOString()
    }
  } catch (error) {
    console.error(`Error fetching current data for ${symbol}:`, error)
    throw new Error(`Real-time market data unavailable for ${symbol} - no fallback data allowed`)
  }
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
