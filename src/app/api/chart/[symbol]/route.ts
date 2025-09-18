import { NextRequest, NextResponse } from 'next/server'
import { YahooFinanceChartAPI } from '@/lib/yahoo-finance-chart-api'
import { DataSourceService } from '@/lib/data-source-service'

interface ChartDataPoint {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  adjClose?: number
  change?: number
  changePercent?: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '1d'
    const interval = searchParams.get('interval') || '1m'
    
    const symbol = params.symbol

    console.log(`📊 Fetching chart data for ${symbol} with range: ${range}, interval: ${interval}`)

    // Yahoo Finance API is always available (no authentication required)
    console.log('Yahoo Finance API is available')

    try {
      // Use Yahoo Finance API to get real chart data
      const result = await YahooFinanceChartAPI.fetchChartData({
        symbol,
        interval,
        range
      })
      
      if (result.success && result.data) {
        // Convert Yahoo Finance data to chart format
        const chartData = convertYahooFinanceToChartData(result.data, symbol)
        console.log(`✅ Successfully fetched ${chartData.length} real data points for ${symbol}`)
        return NextResponse.json({
          success: true,
          data: chartData,
          source: 'yahoo_finance',
          dataPoints: chartData.length,
          isRealData: true,
          timestamp: new Date().toISOString(),
          warning: null
        })
      } else {
        console.warn(`⚠️ No chart data from Yahoo Finance for ${symbol}, using fallback`)
        const fallbackData = DataSourceService.generateChartFallbackData({
          symbol,
          timeframe: range,
          dataType: 'chart'
        })
        return NextResponse.json({
          success: true,
          data: fallbackData,
          source: 'fallback',
          dataPoints: fallbackData.length,
          isRealData: false,
          timestamp: new Date().toISOString(),
          warning: 'Using simulated data - Yahoo Finance API returned no data',
          message: 'No data from Yahoo Finance API, using simulated data'
        })
      }
    } catch (yahooError) {
      console.error(`❌ Yahoo Finance chart data failed for ${symbol}:`, yahooError)
      const fallbackData = DataSourceService.generateChartFallbackData({
        symbol,
        timeframe: range,
        dataType: 'chart'
      })
      return NextResponse.json({
        success: true,
        data: fallbackData,
        source: 'fallback',
        dataPoints: fallbackData.length,
        isRealData: false,
        timestamp: new Date().toISOString(),
        warning: 'Using simulated data - Yahoo Finance API failed',
        error: yahooError instanceof Error ? yahooError.message : 'Unknown error'
      })
    }

  } catch (error) {
    console.error('❌ Chart data error:', error)
    const fallbackData = DataSourceService.generateChartFallbackData({
      symbol: params.symbol,
      timeframe: '1d',
      dataType: 'chart'
    })
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      data: fallbackData,
      source: 'fallback',
      dataPoints: fallbackData.length,
      isRealData: false,
      timestamp: new Date().toISOString(),
      warning: 'Using simulated data - Internal server error'
    }, { status: 500 })
  }
}

// Convert Yahoo Finance data to chart format
function convertYahooFinanceToChartData(yahooData: any, symbol: string): ChartDataPoint[] {
  try {
    const chartData = yahooData.chart
    if (!chartData || !chartData.result || !chartData.result[0]) {
      console.warn('Invalid Yahoo Finance data structure')
      return DataSourceService.generateChartFallbackData({
        symbol,
        timeframe: '1d',
        dataType: 'chart'
      })
    }

    const result = chartData.result[0]
    const timestamps = result.timestamp
    const quotes = result.indicators.quote[0]
    
    if (!timestamps || !quotes) {
      console.warn('Missing timestamp or quote data')
      return DataSourceService.generateChartFallbackData({
        symbol,
        timeframe: '1d',
        dataType: 'chart'
      })
    }

    const chartPoints: ChartDataPoint[] = []
    
    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i]
      const open = quotes.open[i] || 0
      const high = quotes.high[i] || 0
      const low = quotes.low[i] || 0
      const close = quotes.close[i] || 0
      const volume = quotes.volume[i] || 0

      if (open > 0 && high > 0 && low > 0 && close > 0) {
        chartPoints.push({
          time: timestamp * 1000, // Convert to milliseconds
          open,
          high,
          low,
          close,
          volume,
          change: close - open,
          changePercent: ((close - open) / open) * 100
        })
      }
    }

    console.log(`Converted ${chartPoints.length} data points from Yahoo Finance`)
    return chartPoints
  } catch (error) {
    console.error('Error converting Yahoo Finance data:', error)
    return DataSourceService.generateChartFallbackData({
      symbol,
      timeframe: '1d',
      dataType: 'chart'
    })
  }
}
