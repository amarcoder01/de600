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
        const chartData = convertYahooFinanceToChartData(result.data, symbol, range)
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
function convertYahooFinanceToChartData(yahooData: any, symbol: string, range: string = '1d'): ChartDataPoint[] {
  try {
    const chartData = yahooData.chart
    if (!chartData || !chartData.result || !chartData.result[0]) {
      console.warn('Invalid Yahoo Finance data structure')
      return DataSourceService.generateChartFallbackData({
        symbol,
        timeframe: range,
        dataType: 'chart'
      })
    }

    const result = chartData.result[0]
    const timestamps = result.timestamp
    const quotes = result.indicators.quote[0]
    const meta = result.meta
    
    if (!timestamps || !quotes) {
      console.warn('Missing timestamp or quote data')
      return DataSourceService.generateChartFallbackData({
        symbol,
        timeframe: range,
        dataType: 'chart'
      })
    }

    // Get previous close from meta data for intraday calculations
    const previousClose = meta?.previousClose || meta?.chartPreviousClose
    const isIntradayRange = ['1d', '5d'].includes(range)
    
    console.log(`📊 Processing ${timestamps.length} data points for ${symbol} (${range}), previousClose: ${previousClose}`)

    const chartPoints: ChartDataPoint[] = []
    
    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i]
      const open = quotes.open[i] || 0
      const high = quotes.high[i] || 0
      const low = quotes.low[i] || 0
      const close = quotes.close[i] || 0
      const volume = quotes.volume[i] || 0

      if (open > 0 && high > 0 && low > 0 && close > 0) {
        // Calculate change based on timeframe
        let change = 0
        let changePercent = 0
        
        if (isIntradayRange && previousClose && previousClose > 0) {
          // For intraday data, always compare against previous day's close
          change = close - previousClose
          changePercent = (change / previousClose) * 100
        } else if (i > 0 && chartPoints.length > 0) {
          // For longer timeframes, compare against previous period
          const previousClose = chartPoints[chartPoints.length - 1].close
          if (previousClose > 0) {
            change = close - previousClose
            changePercent = (change / previousClose) * 100
          }
        } else {
          // For first data point, compare close vs open
          change = close - open
          changePercent = open > 0 ? ((close - open) / open) * 100 : 0
        }

        chartPoints.push({
          time: timestamp * 1000, // Convert to milliseconds
          open,
          high,
          low,
          close,
          volume,
          change,
          changePercent
        })
      }
    }

    console.log(`✅ Converted ${chartPoints.length} data points from Yahoo Finance for ${symbol} (${range})`)
    if (chartPoints.length > 0) {
      const latest = chartPoints[chartPoints.length - 1]
      const changePercent = latest.changePercent || 0
      console.log(`📈 Latest data point: $${latest.close.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`)
    }
    
    return chartPoints
  } catch (error) {
    console.error('Error converting Yahoo Finance data:', error)
    return DataSourceService.generateChartFallbackData({
      symbol,
      timeframe: range,
      dataType: 'chart'
    })
  }
}
