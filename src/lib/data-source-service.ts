/**
 * Centralized Data Source Service
 * Manages fallback data generation and provides consistent warnings
 */

export interface DataSourceInfo {
  isRealData: boolean
  source: 'yahoo_finance' | 'polygon' | 'fallback' | 'simulated'
  warning?: string
  timestamp: string
  dataPoints: number
}

export interface FallbackDataOptions {
  symbol: string
  timeframe: string
  dataType: 'chart' | 'market' | 'portfolio' | 'risk'
  basePrice?: number
}

export class DataSourceService {
  // Current market prices (updated periodically)
  private static readonly CURRENT_PRICES: { [key: string]: number } = {
    'AAPL': 195.50,
    'MSFT': 415.20,
    'GOOGL': 175.80,
    'TSLA': 245.30,
    'AMZN': 155.40,
    'NVDA': 875.60,
    'META': 485.20,
    'NFLX': 585.40,
    'SPY': 520.80,
    'QQQ': 435.60,
    'IWM': 195.40,
    'VTI': 265.30,
    'VOO': 485.20,
    'ARKK': 45.80
  }

  // Market indices data
  private static readonly MARKET_INDICES = {
    'S&P 500': { value: 5200.50, change: 15.75, changePercent: 0.30, volume: '2.8B' },
    'NASDAQ': { value: 16250.80, change: -25.40, changePercent: -0.16, volume: '4.2B' },
    'Dow Jones': { value: 38500.25, change: 85.60, changePercent: 0.22, volume: '1.5B' },
    'Russell 2000': { value: 2100.75, change: 8.25, changePercent: 0.39, volume: '1.1B' }
  }

  /**
   * Generate realistic fallback price based on symbol characteristics
   */
  static getRealisticPrice(symbol: string): number {
    // Use known current prices
    if (this.CURRENT_PRICES[symbol]) {
      return this.CURRENT_PRICES[symbol]
    }

    // Generate based on symbol characteristics
    if (symbol.length <= 3) {
      // Likely a major stock - higher price range
      return 150 + Math.random() * 300
    } else if (symbol.length <= 5) {
      // Mid-cap range
      return 50 + Math.random() * 200
    } else {
      // Smaller cap or ETF
      return 20 + Math.random() * 100
    }
  }

  /**
   * Generate chart fallback data
   */
  static generateChartFallbackData(options: FallbackDataOptions): any[] {
    const { symbol, timeframe, basePrice } = options
    const price = basePrice || this.getRealisticPrice(symbol)
    const now = Date.now()
    
    // Determine data points and interval based on timeframe
    let numPoints = 100
    let timeInterval = 24 * 60 * 60 * 1000 // 1 day
    
    switch (timeframe) {
      case '1d':
        numPoints = 390 // Market minutes (6.5 hours * 60 minutes)
        timeInterval = 60 * 1000 // 1 minute
        break
      case '5d':
        numPoints = 390 * 5
        timeInterval = 60 * 1000
        break
      case '1mo':
        numPoints = 30
        timeInterval = 24 * 60 * 60 * 1000
        break
      case '3mo':
        numPoints = 90
        timeInterval = 24 * 60 * 60 * 1000
        break
      case '6mo':
        numPoints = 180
        timeInterval = 24 * 60 * 60 * 1000
        break
      case '1y':
        numPoints = 252 // Trading days in a year
        timeInterval = 24 * 60 * 60 * 1000
        break
      case '5y':
        numPoints = 1260 // 5 years of trading days
        timeInterval = 24 * 60 * 60 * 1000
        break
    }

    const dataPoints: any[] = []
    let currentPrice = price
    let trend = 0

    for (let i = 0; i < numPoints; i++) {
      const time = now - (numPoints - i) * timeInterval
      
      // Realistic price movement
      const volatility = timeframe === '1d' ? 0.015 : 0.025
      const trendBias = Math.sin(i / 20) * 0.001
      const randomWalk = (Math.random() - 0.5) * volatility
      
      trend += trendBias
      const change = randomWalk + trend
      currentPrice = Math.max(currentPrice * (1 + change), 0.01)
      
      // Generate OHLC data
      const dailyRange = currentPrice * (0.005 + Math.random() * 0.02)
      const open = currentPrice * (1 + (Math.random() - 0.5) * 0.01)
      const close = currentPrice
      const high = Math.max(open, close) + Math.random() * dailyRange * 0.6
      const low = Math.min(open, close) - Math.random() * dailyRange * 0.4
      
      // Realistic volume
      const baseVolume = timeframe === '1d' ? 1000000 : 5000000
      const volume = Math.floor(baseVolume * (0.5 + Math.random()) * (currentPrice / 100))

      dataPoints.push({
        time,
        open,
        high,
        low,
        close,
        volume,
        change: close - open,
        changePercent: ((close - open) / open) * 100
      })
    }

    console.log(`⚠️ Generated ${dataPoints.length} fallback chart data points for ${symbol} - NOT REAL MARKET DATA`)
    return dataPoints
  }

  /**
   * Get market indices fallback data
   */
  static getMarketIndicesFallbackData(): any[] {
    return Object.entries(this.MARKET_INDICES).map(([name, data]) => ({
      name,
      ...data
    }))
  }

  /**
   * Generate portfolio performance fallback data
   */
  static generatePortfolioFallbackData(initialBalance: number, timeframe: string): any[] {
    const data: any[] = []
    const now = new Date()
    let days = 0
    
    switch (timeframe) {
      case '1D': days = 1; break
      case '1W': days = 7; break
      case '1M': days = 30; break
      case '3M': days = 90; break
      case '1Y': days = 365; break
    }

    let currentValue = initialBalance
    let cumulativeReturn = 0

    for (let i = days; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      
      const dailyReturn = (Math.random() - 0.5) * 0.04
      const dailyReturnPercent = dailyReturn * 100
      
      currentValue = currentValue * (1 + dailyReturn)
      cumulativeReturn += dailyReturnPercent
      
      const positionsValue = currentValue * 0.8
      const cashValue = currentValue * 0.2
      const totalPnL = currentValue - initialBalance
      const totalPnLPercent = ((currentValue - initialBalance) / initialBalance) * 100

      data.push({
        date: date.toISOString().split('T')[0],
        portfolioValue: currentValue,
        cashValue,
        positionsValue,
        totalPnL,
        totalPnLPercent,
        dailyReturn: dailyReturnPercent,
        cumulativeReturn
      })
    }

    console.log(`⚠️ Generated ${data.length} fallback portfolio data points - NOT REAL TRADING DATA`)
    return data
  }

  /**
   * Get appropriate warning message for data type
   */
  static getWarningMessage(dataType: string, source: string): string {
    const warnings = {
      chart: 'Chart data is simulated. Real market data may not be available.',
      market: 'Market data is simulated. Real-time data may not be available.',
      portfolio: 'Portfolio performance is simulated. Real trading data will appear after making trades.',
      risk: 'Risk assessment based on simulated data. Real market data recommended for accurate analysis.'
    }

    return warnings[dataType as keyof typeof warnings] || 'Data is simulated and may not reflect real market conditions.'
  }

  /**
   * Create data source info object
   */
  static createDataSourceInfo(
    isRealData: boolean, 
    source: string, 
    dataPoints: number, 
    dataType: string
  ): DataSourceInfo {
    return {
      isRealData,
      source: source as any,
      warning: isRealData ? undefined : this.getWarningMessage(dataType, source),
      timestamp: new Date().toISOString(),
      dataPoints
    }
  }
}
