// API Route for Earnings Calendar
import { NextRequest, NextResponse } from 'next/server'
import { NewsService } from '@/lib/news-api'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const symbol = searchParams.get('symbol')
    
    console.log(`📅 API: Fetching earnings calendar for next ${days} days...`)
    
    // Get earnings calendar
    let earnings = await NewsService.getEarningsCalendar(days)
    
    // Filter by symbol if provided
    if (symbol) {
      earnings = earnings.filter(event => event.symbol === symbol.toUpperCase())
    }
    
    // Sort by date
    earnings.sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
    
    console.log(`✅ API: Returned ${earnings.length} earnings events`)
    
    return NextResponse.json({
      success: true,
      data: earnings,
      meta: {
        total: earnings.length,
        days: days,
        symbol: symbol || 'all'
      }
    })
    
  } catch (error) {
    console.error('❌ API: Earnings fetch error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch earnings calendar',
      data: []
    }, { status: 500 })
  }
}
