// ChartImg API Integration for Financial Charts
// https://chartimg.com/

interface ChartImgOptions {
  symbol: string
  timeframe?: string
  width?: number
  height?: number
  theme?: 'light' | 'dark'
  indicators?: string[]
  chartType?: 'candlestick' | 'line' | 'area' | 'bar'
}

interface ChartImgResponse {
  url: string
  success: boolean
  error?: string
}

export class ChartImgAPI {
  private static readonly BASE_URL = 'https://api.chartimg.com'
  private static readonly API_KEY = process.env.NEXT_PUBLIC_CHARTIMG_API_KEY || process.env.CHARTIMG_API_KEY

  // Check if ChartImg is configured
  static isConfigured(): boolean {
    return !!(this.API_KEY && this.API_KEY.trim() !== '' && this.API_KEY !== 'your_chartimg_api_key_here')
  }

  // Get API status
  static getAPIStatus(): { configured: boolean; key: string } {
    return {
      configured: this.isConfigured(),
      key: this.API_KEY ? `${this.API_KEY.substring(0, 8)}...` : 'Not set'
    }
  }

  // Generate chart URL
  static generateChartURL(options: ChartImgOptions): string {
    if (!this.isConfigured()) {
      throw new Error('ChartImg API key is required. Please add CHARTIMG_API_KEY to your environment variables.')
    }

    const {
      symbol,
      timeframe = '1d',
      width = 800,
      height = 400,
      theme = 'dark',
      indicators = [],
      chartType = 'candlestick'
    } = options

    // Build query parameters
    const params = new URLSearchParams({
      symbol: symbol.toUpperCase(),
      timeframe,
      width: width.toString(),
      height: height.toString(),
      theme,
      chartType,
      apikey: this.API_KEY!
    })

    // Add indicators if specified
    if (indicators.length > 0) {
      params.append('indicators', indicators.join(','))
    }

    return `${this.BASE_URL}/chart?${params.toString()}`
  }

  // Generate chart image
  static async generateChart(options: ChartImgOptions): Promise<ChartImgResponse> {
    try {
      const url = this.generateChartURL(options)
      
      console.log('Generating ChartImg chart for:', options.symbol)
      console.log('Chart URL:', url.replace(this.API_KEY!, '[API_KEY]'))

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'image/png,image/jpeg,image/webp',
        },
      })

      if (!response.ok) {
        throw new Error(`ChartImg API error: ${response.status} ${response.statusText}`)
      }

      // For image responses, we return the URL directly
      return {
        url,
        success: true
      }

    } catch (error) {
      console.error('Error generating ChartImg chart:', error)
      return {
        url: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Generate multiple chart types
  static async generateMultipleCharts(symbol: string, timeframes: string[] = ['1d', '5d', '1mo']): Promise<ChartImgResponse[]> {
    const charts = await Promise.all(
      timeframes.map(timeframe => 
        this.generateChart({
          symbol,
          timeframe,
          width: 800,
          height: 400,
          theme: 'dark',
          chartType: 'candlestick'
        })
      )
    )

    return charts
  }

  // Generate chart with technical indicators
  static async generateChartWithIndicators(
    symbol: string, 
    indicators: string[] = ['sma', 'ema', 'rsi'],
    timeframe: string = '1d'
  ): Promise<ChartImgResponse> {
    return this.generateChart({
      symbol,
      timeframe,
      width: 800,
      height: 500,
      theme: 'dark',
      indicators,
      chartType: 'candlestick'
    })
  }

  // Get available indicators
  static getAvailableIndicators(): string[] {
    return [
      'sma',      // Simple Moving Average
      'ema',      // Exponential Moving Average
      'rsi',      // Relative Strength Index
      'macd',     // MACD
      'bbands',   // Bollinger Bands
      'volume',   // Volume
      'vwap',     // Volume Weighted Average Price
      'atr',      // Average True Range
      'stoch',    // Stochastic Oscillator
      'adx',      // Average Directional Index
      'cci',      // Commodity Channel Index
      'williams_r' // Williams %R
    ]
  }

  // Get available timeframes
  static getAvailableTimeframes(): { value: string; label: string }[] {
    return [
      { value: '1m', label: '1 Minute' },
      { value: '5m', label: '5 Minutes' },
      { value: '15m', label: '15 Minutes' },
      { value: '30m', label: '30 Minutes' },
      { value: '1h', label: '1 Hour' },
      { value: '4h', label: '4 Hours' },
      { value: '1d', label: '1 Day' },
      { value: '1w', label: '1 Week' },
      { value: '1mo', label: '1 Month' }
    ]
  }

  // Get available chart types
  static getAvailableChartTypes(): { value: string; label: string }[] {
    return [
      { value: 'candlestick', label: 'Candlestick' },
      { value: 'line', label: 'Line' },
      { value: 'area', label: 'Area' },
      { value: 'bar', label: 'Bar' },
      { value: 'ohlc', label: 'OHLC' }
    ]
  }

  // Generate fallback chart when API fails
  static generateFallbackChart(symbol: string): string {
    // Return a placeholder chart URL or base64 encoded simple chart
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1a1a1a"/>
        <text x="400" y="200" text-anchor="middle" fill="#8b5cf6" font-family="Arial" font-size="24">
          ${symbol} Chart
        </text>
        <text x="400" y="230" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="14">
          ChartImg API not configured
        </text>
      </svg>
    `)}`
  }
}

// Export convenience functions
export const generateChart = ChartImgAPI.generateChart.bind(ChartImgAPI)
export const generateChartURL = ChartImgAPI.generateChartURL.bind(ChartImgAPI)
export const generateChartWithIndicators = ChartImgAPI.generateChartWithIndicators.bind(ChartImgAPI)
export const isChartImgConfigured = ChartImgAPI.isConfigured.bind(ChartImgAPI)
