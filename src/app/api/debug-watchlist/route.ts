import { NextResponse } from 'next/server'

// Import the in-memory storage from the watchlist route
// Note: This is a simplified version for debugging
const inMemoryWatchlists = new Map()

export async function GET() {
  try {
    console.log('🔍 Debug: Checking in-memory watchlist state...')
    
    // Get all watchlists
    const watchlists = Array.from(inMemoryWatchlists.entries()).map(([id, items]) => ({
      id,
      itemCount: items.length,
      items: items.map((item: any) => ({
        symbol: item.symbol,
        name: item.name,
        price: item.price
      }))
    }))
    
    return NextResponse.json({
      success: true,
      message: 'In-memory watchlist debug info',
      watchlists,
      totalWatchlists: watchlists.length,
      defaultWatchlistExists: inMemoryWatchlists.has('default')
    })
  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json({
      success: false,
      message: 'Debug failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
