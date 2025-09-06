import { NextRequest, NextResponse } from 'next/server'
import { webSearch } from '@/lib/web-search'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || 'Tesla stock news'
    
    console.log(`🧪 Testing web search with query: "${query}"`)
    
    // Test basic web search
    const results = await webSearch.searchWeb(query, 3)
    
    // Test trading-specific search
    const tradingResults = await webSearch.searchTradingInfo(query)
    
    // Test company search
    const companyResults = await webSearch.searchCompanyInfo('Tesla')
    
    // Test market news
    const newsResults = await webSearch.searchMarketNews()
    
    return NextResponse.json({
      success: true,
      test: {
        query,
        basicSearch: {
          count: results.length,
          results: results.slice(0, 2) // Show first 2 results
        },
        tradingSearch: {
          count: tradingResults.length,
          results: tradingResults.slice(0, 2)
        },
        companySearch: {
          count: companyResults.length,
          results: companyResults.slice(0, 2)
        },
        marketNews: {
          count: newsResults.length,
          results: newsResults.slice(0, 2)
        }
      },
      message: 'Web search functionality is working correctly!'
    })
    
  } catch (error) {
    console.error('❌ Web search test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Web search functionality test failed'
    }, { status: 500 })
  }
}
