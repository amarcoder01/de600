import { NextRequest, NextResponse } from 'next/server'
import { polygonAPI } from '@/lib/polygon-api'

// GET - Get batch quotes for multiple symbols
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbolsParam = searchParams.get('symbols')
    
    if (!symbolsParam) {
      return NextResponse.json(
        { success: false, error: 'Symbols parameter is required' },
        { status: 400 }
      )
    }
    
    // Parse symbols from comma-separated string
    const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(s => s.length > 0)
    
    if (symbols.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one symbol is required' },
        { status: 400 }
      )
    }
    
    if (symbols.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Maximum 50 symbols allowed per request' },
        { status: 400 }
      )
    }
    
    console.log(`Fetching batch quotes for symbols: ${symbols.join(', ')}`)
    
    // Fetch quotes for all symbols with rate limiting
    const results = new Map<string, any>()
    const errors = new Map<string, string>()
    
    // Process symbols in batches of 10 to avoid rate limits
    const batchSize = 10
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize)
      
      // Process batch concurrently but with delay between batches
      const batchPromises = batch.map(async (symbol) => {
        try {
          const data = await polygonAPI.getUSStockData(symbol)
          if (data && data.price) {
            results.set(symbol, {
              symbol,
              name: data.name || symbol,
              price: data.price,
              change: data.change || 0,
              changePercent: data.changePercent || 0,
              volume: data.volume || 0,
              marketCap: data.marketCap || 0,
              timestamp: new Date().toISOString()
            })
          } else {
            errors.set(symbol, 'No price data available')
          }
        } catch (error) {
          console.error(`Error fetching data for ${symbol}:`, error)
          errors.set(symbol, error instanceof Error ? error.message : 'Unknown error')
        }
      })
      
      await Promise.all(batchPromises)
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    // Convert results to array format
    const successfulResults = Array.from(results.values())
    const failedSymbols = Array.from(errors.entries()).map(([symbol, error]) => ({ symbol, error }))
    
    console.log(`Batch quote results: ${successfulResults.length} successful, ${failedSymbols.length} failed`)
    
    return NextResponse.json({
      success: true,
      data: {
        quotes: successfulResults,
        errors: failedSymbols,
        total: symbols.length,
        successful: successfulResults.length,
        failed: failedSymbols.length
      }
    })
    
  } catch (error) {
    console.error('Error in batch quote API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Get batch quotes for multiple symbols (alternative method)
export async function POST(request: NextRequest) {
  try {
    const { symbols } = await request.json()
    
    if (!Array.isArray(symbols)) {
      return NextResponse.json(
        { success: false, error: 'Symbols must be an array' },
        { status: 400 }
      )
    }
    
    if (symbols.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one symbol is required' },
        { status: 400 }
      )
    }
    
    if (symbols.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Maximum 50 symbols allowed per request' },
        { status: 400 }
      )
    }
    
    // Normalize symbols
    const normalizedSymbols = symbols.map(s => String(s).trim().toUpperCase()).filter(s => s.length > 0)
    
    console.log(`Fetching batch quotes for symbols: ${normalizedSymbols.join(', ')}`)
    
    // Fetch quotes for all symbols with rate limiting
    const results = new Map<string, any>()
    const errors = new Map<string, string>()
    
    // Process symbols in batches of 10 to avoid rate limits
    const batchSize = 10
    for (let i = 0; i < normalizedSymbols.length; i += batchSize) {
      const batch = normalizedSymbols.slice(i, i + batchSize)
      
      // Process batch concurrently but with delay between batches
      const batchPromises = batch.map(async (symbol) => {
        try {
          const data = await polygonAPI.getUSStockData(symbol)
          if (data && data.price) {
            results.set(symbol, {
              symbol,
              name: data.name || symbol,
              price: data.price,
              change: data.change || 0,
              changePercent: data.changePercent || 0,
              volume: data.volume || 0,
              marketCap: data.marketCap || 0,
              timestamp: new Date().toISOString()
            })
          } else {
            errors.set(symbol, 'No price data available')
          }
        } catch (error) {
          console.error(`Error fetching data for ${symbol}:`, error)
          errors.set(symbol, error instanceof Error ? error.message : 'Unknown error')
        }
      })
      
      await Promise.all(batchPromises)
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < normalizedSymbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    // Convert results to array format
    const successfulResults = Array.from(results.values())
    const failedSymbols = Array.from(errors.entries()).map(([symbol, error]) => ({ symbol, error }))
    
    console.log(`Batch quote results: ${successfulResults.length} successful, ${failedSymbols.length} failed`)
    
    return NextResponse.json({
      success: true,
      data: {
        quotes: successfulResults,
        errors: failedSymbols,
        total: normalizedSymbols.length,
        successful: successfulResults.length,
        failed: failedSymbols.length
      }
    })
    
  } catch (error) {
    console.error('Error in batch quote API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}