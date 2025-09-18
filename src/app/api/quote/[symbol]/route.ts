import { NextRequest, NextResponse } from 'next/server'
import { yahooFinanceSimple } from '@/lib/yahoo-finance-simple'

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase()

    console.log(`📡 Fetching quote for ${symbol}`)

    // Get stock data from Yahoo Finance
    const stock = await yahooFinanceSimple.getStockData(symbol)

    if (!stock) {
      return NextResponse.json({ 
        error: `No data available for ${symbol}`,
        symbol: symbol
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      stock: stock
    })

  } catch (error) {
    console.error(`Error fetching quote for ${params.symbol}:`, error)
    return NextResponse.json({ 
      error: 'Failed to fetch stock data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
