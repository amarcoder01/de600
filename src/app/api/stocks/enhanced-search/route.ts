import { NextRequest, NextResponse } from 'next/server'
import { enhancedSearch, SearchFilters, SearchOptions } from '@/lib/enhanced-search'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/stocks/enhanced-search - Enhanced stock search with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    if (!query || query.length < 1) {
      return NextResponse.json({
        success: false,
        message: 'Query parameter is required',
        results: []
      }, { status: 400 })
    }

    // Parse filters from query parameters
    const filters: SearchFilters = {}
    
    if (searchParams.get('sector')) {
      filters.sector = searchParams.get('sector')!
    }
    
    if (searchParams.get('exchange')) {
      filters.exchange = searchParams.get('exchange')!
    }
    
    if (searchParams.get('changeDirection')) {
      const direction = searchParams.get('changeDirection')!
      if (['up', 'down', 'any'].includes(direction)) {
        filters.changeDirection = direction as 'up' | 'down' | 'any'
      }
    }

    // Price range filter
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    if (minPrice || maxPrice) {
      filters.priceRange = {}
      if (minPrice) filters.priceRange.min = parseFloat(minPrice)
      if (maxPrice) filters.priceRange.max = parseFloat(maxPrice)
    }

    // Market cap range filter
    const minMarketCap = searchParams.get('minMarketCap')
    const maxMarketCap = searchParams.get('maxMarketCap')
    if (minMarketCap || maxMarketCap) {
      filters.marketCapRange = {}
      if (minMarketCap) filters.marketCapRange.min = parseFloat(minMarketCap)
      if (maxMarketCap) filters.marketCapRange.max = parseFloat(maxMarketCap)
    }

    // Volume range filter
    const minVolume = searchParams.get('minVolume')
    const maxVolume = searchParams.get('maxVolume')
    if (minVolume || maxVolume) {
      filters.volumeRange = {}
      if (minVolume) filters.volumeRange.min = parseFloat(minVolume)
      if (maxVolume) filters.volumeRange.max = parseFloat(maxVolume)
    }

    // Parse options
    const options: SearchOptions = {}
    
    const limit = searchParams.get('limit')
    if (limit) options.limit = parseInt(limit)
    
    const fuzzyMatch = searchParams.get('fuzzyMatch')
    if (fuzzyMatch) options.fuzzyMatch = fuzzyMatch === 'true'
    
    const includeFilters = searchParams.get('includeFilters')
    if (includeFilters) options.includeFilters = includeFilters === 'true'

    console.log(`🔍 Enhanced search API: "${query}" with filters:`, filters)

    // Perform enhanced search
    const results = await enhancedSearch.searchStocks(query, filters, options)

    return NextResponse.json({
      success: true,
      query,
      filters,
      results: results.map(result => ({
        ...result.stock,
        relevanceScore: result.relevanceScore,
        matchReasons: result.matchReasons
      })),
      count: results.length,
      message: `Found ${results.length} stocks with enhanced search`
    })

  } catch (error) {
    console.error('❌ Enhanced search API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Enhanced search failed',
      results: []
    }, { status: 500 })
  }
}

// POST /api/stocks/enhanced-search - Enhanced search with complex filters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, filters = {}, options = {} } = body

    if (!query || query.length < 1) {
      return NextResponse.json({
        success: false,
        message: 'Query is required',
        results: []
      }, { status: 400 })
    }

    console.log(`🔍 Enhanced search API (POST): "${query}" with filters:`, filters)

    // Perform enhanced search
    const results = await enhancedSearch.searchStocks(query, filters, options)

    return NextResponse.json({
      success: true,
      query,
      filters,
      options,
      results: results.map(result => ({
        ...result.stock,
        relevanceScore: result.relevanceScore,
        matchReasons: result.matchReasons
      })),
      count: results.length,
      message: `Found ${results.length} stocks with enhanced search`
    })

  } catch (error) {
    console.error('❌ Enhanced search API (POST) error:', error)
    return NextResponse.json({
      success: false,
      message: 'Enhanced search failed',
      results: []
    }, { status: 500 })
  }
}
