import { NextRequest, NextResponse } from 'next/server'
import { NewsService } from '@/lib/news-api'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') || 'V'
    const limit = parseInt(searchParams.get('limit') || '5')
    
    console.log(`🧪 Testing news API with symbol: "${symbol}", limit: ${limit}`)
    
    // Test 1: Get financial news
    console.log('📰 Testing getFinancialNews...')
    const news = await NewsService.getFinancialNews(symbol, limit)
    
    // Test 2: Get earnings calendar
    console.log('📅 Testing getEarningsCalendar...')
    const earnings = await NewsService.getEarningsCalendar(7)
    
    // Test 3: Get sentiment analysis
    console.log('📊 Testing getSocialMediaSentiment...')
    const sentiment = await NewsService.getSocialMediaSentiment(symbol)
    
    // Test 4: Analyze news sentiment
    console.log('🤖 Testing analyzeNewsSentiment...')
    const analyzedNews = await NewsService.analyzeNewsSentiment(news.slice(0, 3))
    
    return NextResponse.json({
      success: true,
      test: {
        symbol,
        limit,
        news: {
          count: news.length,
          articles: news.slice(0, 2).map(article => ({
            title: article.title,
            source: article.source,
            publishedAt: article.publishedAt,
            sentiment: article.sentiment,
            category: article.category,
            relevance: article.relevance
          }))
        },
        earnings: {
          count: earnings.length,
          events: earnings.slice(0, 2).map(earning => ({
            symbol: earning.symbol,
            companyName: earning.companyName,
            reportDate: earning.reportDate,
            estimate: earning.estimate,
            sentiment: earning.sentiment
          }))
        },
        sentiment: {
          score: sentiment.score,
          label: sentiment.label,
          confidence: sentiment.confidence
        },
        analyzedNews: {
          count: analyzedNews.length,
          articles: analyzedNews.slice(0, 2).map(article => ({
            title: article.title,
            sentiment: article.sentiment
          }))
        }
      },
      message: 'News API functionality is working correctly!'
    })
    
  } catch (error) {
    console.error('❌ News API test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'News API functionality test failed'
    }, { status: 500 })
  }
}
