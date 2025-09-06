// API Route for searching US stocks with real-time data from Polygon.io
import { NextRequest, NextResponse } from 'next/server'
import { Stock } from '@/types'
import { polygonAPI } from '@/lib/polygon-api'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

// Cache for search results to improve performance
const searchCache = new Map<string, { results: Stock[], timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 1) {
      return NextResponse.json({ 
        success: false, 
        data: [], 
        message: 'Query parameter required' 
      })
    }

    console.log('🔍 API: Searching for stocks:', query)

    // Check cache first
    const cacheKey = query.toLowerCase().trim()
    const cached = searchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`✅ Returning cached results for "${query}"`)
      return NextResponse.json({ 
        success: true, 
        data: cached.results,
        message: `Found ${cached.results.length} stocks (cached)`
      })
    }

    // Use Polygon.io API for real-time search
    const results = await polygonAPI.searchUSStocks(query)
    
    console.log(`✅ API: Search completed: ${results.length} results found`)
    
    // Cache the results
    searchCache.set(cacheKey, { results, timestamp: Date.now() })

    // Clean old cache entries (keep only last 100)
    if (searchCache.size > 100) {
      const entries = Array.from(searchCache.entries())
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
      const newCache = new Map(entries.slice(0, 100))
      searchCache.clear()
      newCache.forEach((value, key) => searchCache.set(key, value))
    }

    return NextResponse.json({ 
      success: true, 
      data: results,
      message: `Found ${results.length} stocks`
    })

  } catch (error) {
    console.error('❌ API: Search error:', error)
    return NextResponse.json({ 
      success: false, 
      data: [], 
      message: 'Search failed' 
    }, { status: 500 })
  }
}