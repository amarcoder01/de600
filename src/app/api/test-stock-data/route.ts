import { NextRequest, NextResponse } from 'next/server'
import { polygonAPI } from '@/lib/polygon-api'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') || 'AAPL'
    const clearCache = searchParams.get('clearCache') === 'true'

    if (clearCache) {
      polygonAPI.clearCache()
    }

    console.log(`🧪 Testing stock data for ${symbol}...`)

    // Fetch stock data
    const stockData = await polygonAPI.getUSStockData(symbol)
    
    if (!stockData) {
      return NextResponse.json({ 
        error: `No data available for ${symbol}`,
        success: false 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      data: stockData,
      debug: {
        symbol: stockData.symbol,
        price: stockData.price,
        change: stockData.change,
        changePercent: stockData.changePercent,
        pe: stockData.pe,
        dividendYield: stockData.dividendYield,
        beta: stockData.beta,
        eps: stockData.eps,
        lastUpdated: stockData.lastUpdated
      }
    })

  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      success: false 
    }, { status: 500 })
  }
}
