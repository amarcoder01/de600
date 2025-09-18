import { NextRequest, NextResponse } from 'next/server'
import { enhancedSearch } from '@/lib/enhanced-search'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/stocks/search-suggestions - Get search suggestions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    if (!query || query.length < 2) {
      return NextResponse.json({
        success: false,
        message: 'Query must be at least 2 characters',
        suggestions: []
      }, { status: 400 })
    }

    console.log(`💡 Getting search suggestions for: "${query}"`)

    // Get search suggestions
    const suggestions = await enhancedSearch.getSearchSuggestions(query)

    return NextResponse.json({
      success: true,
      query,
      suggestions,
      count: suggestions.length
    })

  } catch (error) {
    console.error('❌ Search suggestions API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to get search suggestions',
      suggestions: []
    }, { status: 500 })
  }
}
