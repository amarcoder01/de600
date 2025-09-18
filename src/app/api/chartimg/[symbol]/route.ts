import { NextRequest, NextResponse } from 'next/server'
import { ChartImgAPI } from '@/lib/chartimg-api'

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = params.symbol
    const timeframe = searchParams.get('timeframe') || '1d'
    const width = parseInt(searchParams.get('width') || '800')
    const height = parseInt(searchParams.get('height') || '400')
    const theme = (searchParams.get('theme') as 'light' | 'dark') || 'dark'
    const chartType = (searchParams.get('chartType') as any) || 'candlestick'
    const indicators = searchParams.get('indicators')?.split(',') || []

    // Check if ChartImg is configured
    if (!ChartImgAPI.isConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'ChartImg API not configured. Please add CHARTIMG_API_KEY to your environment variables.',
        symbol,
        timeframe,
        chartType
      }, { status: 500 })
    }

    console.log(`Generating ChartImg chart for ${symbol} with timeframe ${timeframe}`)

    // Generate chart
    const result = await ChartImgAPI.generateChart({
      symbol,
      timeframe,
      width,
      height,
      theme,
      chartType,
      indicators
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        url: result.url,
        symbol,
        timeframe,
        chartType,
        indicators,
        width,
        height,
        theme,
        generatedAt: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to generate chart',
        symbol,
        timeframe,
        chartType
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in ChartImg API route:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      symbol: params.symbol
    }, { status: 500 })
  }
}

// Handle POST requests for more complex chart generation
export async function POST(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const body = await request.json()
    const symbol = params.symbol
    const {
      timeframe = '1d',
      width = 800,
      height = 400,
      theme = 'dark',
      chartType = 'candlestick',
      indicators = []
    } = body

    // Check if ChartImg is configured
    if (!ChartImgAPI.isConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'ChartImg API not configured. Please add CHARTIMG_API_KEY to your environment variables.',
        symbol
      }, { status: 500 })
    }

    console.log(`Generating ChartImg chart for ${symbol} with custom options`)

    // Generate chart with custom options
    const result = await ChartImgAPI.generateChart({
      symbol,
      timeframe,
      width,
      height,
      theme,
      chartType,
      indicators
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        url: result.url,
        symbol,
        timeframe,
        chartType,
        indicators,
        width,
        height,
        theme,
        generatedAt: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to generate chart',
        symbol
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in ChartImg API POST route:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      symbol: params.symbol
    }, { status: 500 })
  }
}
