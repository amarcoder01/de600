// API Route for fetching current stock quote data using Polygon.io
import { NextRequest, NextResponse } from 'next/server'
import { Stock } from '@/types'
import { polygonAPI } from '@/lib/polygon-api'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 })
    }

    console.log('API: Fetching quote for symbol:', symbol)

    // Use Polygon.io API for real-time stock data
    const stockData = await polygonAPI.getUSStockData(symbol)
    
    if (!stockData) {
      console.log(`API: No data found for ${symbol}`)
      return NextResponse.json({ error: `No data available for ${symbol}` }, { status: 404 })
    }

    console.log(`API: Successfully fetched quote for ${symbol} via Polygon.io: $${stockData.price}`)
    return NextResponse.json({ 
      success: true, 
      data: stockData 
    })

  } catch (error) {
    console.error('API: Quote fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
