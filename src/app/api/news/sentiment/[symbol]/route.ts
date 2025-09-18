// API Route for Social Media Sentiment Analysis
import { NextRequest, NextResponse } from 'next/server'
import { NewsService } from '@/lib/news-api'

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase()
    
    console.log(`📱 API: Fetching social media sentiment for ${symbol}...`)
    
    // Get social media sentiment
    const sentiment = await NewsService.getSocialMediaSentiment(symbol)
    
    console.log(`✅ API: Returned sentiment for ${symbol}`)
    
    return NextResponse.json({
      success: true,
      data: {
        symbol,
        sentiment,
        platforms: ['twitter', 'reddit', 'stocktwits'],
        lastUpdated: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ API: Sentiment fetch error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch sentiment data',
      data: null
    }, { status: 500 })
  }
}
