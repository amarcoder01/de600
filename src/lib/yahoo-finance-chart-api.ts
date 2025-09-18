// Yahoo Finance API Integration for Financial Charts
// Based on successful API key testing

interface YahooFinanceChartOptions {
  symbol: string
  interval?: string
  range?: string
  width?: number
  height?: number
  theme?: 'light' | 'dark'
  indicators?: string[]
  chartType?: 'candlestick' | 'line' | 'area' | 'bar'
}

interface YahooFinanceResponse {
  url?: string
  success: boolean
  error?: string
  data?: any
}

export class YahooFinanceChartAPI {
  private static readonly BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'
  private static readonly API_KEY = process.env.NEXT_PUBLIC_CHARTIMG_API_KEY || process.env.CHARTIMG_API_KEY

  // Check if API is configured - Yahoo Finance API doesn't require authentication
  static isConfigured(): boolean {
    return true // Yahoo Finance API is always available
  }

  // Get API status
  static getAPIStatus(): { configured: boolean; key: string } {
    return {
      configured: true,
      key: 'Yahoo Finance API (No Key Required)'
    }
  }

  // Generate chart data URL
  static generateChartDataURL(options: YahooFinanceChartOptions): string {
    const {
      symbol,
      interval = '1d',
      range = '1mo',
      indicators = []
    } = options

    // Build query parameters - Yahoo Finance API doesn't require API key
    const params = new URLSearchParams({
      interval,
      range
    })

    // Add indicators if specified
    if (indicators.length > 0) {
      params.append('indicators', indicators.join(','))
    }

    return `${this.BASE_URL}/${symbol.toUpperCase()}?${params.toString()}`
  }

  // Generate chart image URL (using a chart rendering service)
  static generateChartImageURL(options: YahooFinanceChartOptions): string {
    const {
      symbol,
      interval = '1d',
      range = '1mo',
      width = 800,
      height = 400,
      theme = 'dark',
      chartType = 'candlestick'
    } = options

    // Use QuickChart.io to render Yahoo Finance data as an image
    const chartConfig = {
      type: chartType === 'candlestick' ? 'line' : chartType,
      data: {
        datasets: [{
          label: symbol,
          data: '{{data}}', // Placeholder for actual data
          borderColor: theme === 'dark' ? '#8b5cf6' : '#3b82f6',
          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        width: width,
        height: height,
        plugins: {
          title: {
            display: true,
            text: `${symbol} Chart (${interval})`,
            color: theme === 'dark' ? '#ffffff' : '#000000'
          }
        },
        scales: {
          x: {
            grid: {
              color: theme === 'dark' ? '#374151' : '#e5e7eb'
            },
            ticks: {
              color: theme === 'dark' ? '#9ca3af' : '#6b7280'
            }
          },
          y: {
            grid: {
              color: theme === 'dark' ? '#374151' : '#e5e7eb'
            },
            ticks: {
              color: theme === 'dark' ? '#9ca3af' : '#6b7280'
            }
          }
        }
      }
    }

    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig))
    return `https://quickchart.io/chart?c=${encodedConfig}`
  }

  // Fetch chart data
  static async fetchChartData(options: YahooFinanceChartOptions): Promise<YahooFinanceResponse> {
    try {
      const url = this.generateChartDataURL(options)
      
      console.log('Fetching Yahoo Finance chart data for:', options.symbol)
      console.log('Data URL:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
      })

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(`Yahoo Finance API error: ${data.error}`)
      }

      return {
        success: true,
        data
      }

    } catch (error) {
      console.error('Error fetching Yahoo Finance chart data:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Generate chart image using data
  static async generateChartImage(options: YahooFinanceChartOptions): Promise<YahooFinanceResponse> {
    try {
      // First fetch the data
      const dataResult = await this.fetchChartData(options)
      
      if (!dataResult.success || !dataResult.data) {
        throw new Error(dataResult.error || 'Failed to fetch chart data')
      }

      // Extract price data from Yahoo Finance response
      const chartData = dataResult.data.chart
      if (!chartData || !chartData.result || !chartData.result[0]) {
        throw new Error('Invalid chart data structure')
      }

      const result = chartData.result[0]
      const timestamps = result.timestamp
      const quotes = result.indicators.quote[0]
      
      if (!timestamps || !quotes) {
        throw new Error('Missing price data')
      }

      // Format data for chart rendering
      const chartPoints = timestamps.map((timestamp: number, index: number) => ({
        x: new Date(timestamp * 1000).toISOString().split('T')[0],
        y: quotes.close[index] || quotes.open[index] || 0
      })).filter((point: { x: string; y: number }) => point.y > 0)

      // Generate chart image URL with actual data
      const chartImageUrl = this.generateChartImageURLWithData(options, chartPoints)

      return {
        success: true,
        url: chartImageUrl,
        data: dataResult.data
      }

    } catch (error) {
      console.error('Error generating chart image:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Generate chart image URL with actual data
  private static generateChartImageURLWithData(options: YahooFinanceChartOptions, data: any[]): string {
    const {
      symbol,
      interval = '1d',
      width = 800,
      height = 400,
      theme = 'dark',
      chartType = 'candlestick'
    } = options

    // Create chart configuration with actual data
    const chartConfig = {
      type: chartType === 'candlestick' ? 'line' : chartType,
      data: {
        datasets: [{
          label: symbol,
          data: data,
          borderColor: theme === 'dark' ? '#8b5cf6' : '#3b82f6',
          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
          fill: false
        }]
      },
      options: {
        responsive: true,
        width: width,
        height: height,
        plugins: {
          title: {
            display: true,
            text: `${symbol} Chart (${interval})`,
            color: theme === 'dark' ? '#ffffff' : '#000000'
          }
        },
        scales: {
          x: {
            grid: {
              color: theme === 'dark' ? '#374151' : '#e5e7eb'
            },
            ticks: {
              color: theme === 'dark' ? '#9ca3af' : '#6b7280'
            }
          },
          y: {
            grid: {
              color: theme === 'dark' ? '#374151' : '#e5e7eb'
            },
            ticks: {
              color: theme === 'dark' ? '#9ca3af' : '#6b7280'
            }
          }
        }
      }
    }

    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig))
    return `https://quickchart.io/chart?c=${encodedConfig}`
  }

  // Get available intervals
  static getAvailableIntervals(): { value: string; label: string }[] {
    return [
      { value: '1m', label: '1 Minute' },
      { value: '2m', label: '2 Minutes' },
      { value: '5m', label: '5 Minutes' },
      { value: '15m', label: '15 Minutes' },
      { value: '30m', label: '30 Minutes' },
      { value: '60m', label: '1 Hour' },
      { value: '90m', label: '1.5 Hours' },
      { value: '1h', label: '1 Hour' },
      { value: '1d', label: '1 Day' },
      { value: '5d', label: '5 Days' },
      { value: '1wk', label: '1 Week' },
      { value: '1mo', label: '1 Month' },
      { value: '3mo', label: '3 Months' }
    ]
  }

  // Get available ranges
  static getAvailableRanges(): { value: string; label: string }[] {
    return [
      { value: '1d', label: '1 Day' },
      { value: '5d', label: '5 Days' },
      { value: '1mo', label: '1 Month' },
      { value: '3mo', label: '3 Months' },
      { value: '6mo', label: '6 Months' },
      { value: '1y', label: '1 Year' },
      { value: '2y', label: '2 Years' },
      { value: '5y', label: '5 Years' },
      { value: '10y', label: '10 Years' },
      { value: 'ytd', label: 'Year to Date' },
      { value: 'max', label: 'Maximum' }
    ]
  }

  // Get available chart types
  static getAvailableChartTypes(): { value: string; label: string }[] {
    return [
      { value: 'line', label: 'Line' },
      { value: 'area', label: 'Area' },
      { value: 'bar', label: 'Bar' }
    ]
  }

  // Generate fallback chart when API fails
  static generateFallbackChart(symbol: string): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1a1a1a"/>
        <text x="400" y="200" text-anchor="middle" fill="#8b5cf6" font-family="Arial" font-size="24">
          ${symbol} Chart
        </text>
        <text x="400" y="230" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="14">
          Yahoo Finance API
        </text>
      </svg>
    `)}`
  }
}

// Export convenience functions
export const fetchChartData = YahooFinanceChartAPI.fetchChartData.bind(YahooFinanceChartAPI)
export const generateChartImage = YahooFinanceChartAPI.generateChartImage.bind(YahooFinanceChartAPI)
export const generateChartDataURL = YahooFinanceChartAPI.generateChartDataURL.bind(YahooFinanceChartAPI)
export const isYahooFinanceConfigured = YahooFinanceChartAPI.isConfigured.bind(YahooFinanceChartAPI)
