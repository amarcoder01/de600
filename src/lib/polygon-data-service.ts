import { NextRequest } from 'next/server'

// Polygon.io API interfaces
interface PolygonAggregateResponse {
  ticker: string
  queryCount: number
  resultsCount: number
  adjusted: boolean
  results: PolygonBar[]
  status: string
  request_id: string
  count: number
}

interface PolygonBar {
  c: number // Close price
  h: number // High price
  l: number // Low price
  n: number // Number of transactions
  o: number // Open price
  t: number // Timestamp
  v: number // Volume
  vw: number // Volume weighted average price
}

interface PolygonTickerDetails {
  ticker: string
  name: string
  market: string
  locale: string
  primary_exchange: string
  type: string
  active: boolean
  currency_name: string
  cik: string
  composite_figi: string
  share_class_figi: string
  market_cap: number
  phone_number: string
  address: any
  description: string
  sic_code: string
  sic_description: string
  ticker_root: string
  homepage_url: string
  total_employees: number
  list_date: string
  branding: any
  share_class_shares_outstanding: number
  weighted_shares_outstanding: number
  pe_ratio?: number
  beta?: number
  dividend_yield?: number
}

interface PolygonSnapshot {
  ticker: string
  todaysChangePerc: number
  todaysChange: number
  updated: number
  timeframe: string
  market_status: string
  fmv: number
  day: {
    c: number
    h: number
    l: number
    o: number
    v: number
    vw: number
  }
  min: {
    av: number
    c: number
    h: number
    l: number
    o: number
    t: number
    v: number
    vw: number
  }
  prevDay: {
    c: number
    h: number
    l: number
    o: number
    v: number
    vw: number
  }
}

// Enhanced market data interface
interface EnhancedMarketData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap?: number
  avgVolume?: number
  high52Week?: number
  low52Week?: number
  peRatio?: number
  dividendYield?: number
  beta?: number
  sector?: string
  industry?: string
  lastUpdated: string
  historicalData: HistoricalDataPoint[]
  technicalIndicators: TechnicalIndicators
  marketMetrics: MarketMetrics
}

interface HistoricalDataPoint {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  vwap: number
  transactions: number
}

interface TechnicalIndicators {
  rsi: number
  macd: { macd: number; signal: number; histogram: number }
  sma20: number
  sma50: number
  sma200: number
  ema12: number
  ema26: number
  bollingerBands: { upper: number; middle: number; lower: number }
  stochastic: { k: number; d: number }
  atr: number
  adx: number
  williamsR: number
}

interface MarketMetrics {
  volatility: number
  momentum: number
  trend: number
  strength: number
  support: number
  resistance: number
  volumeProfile: number
}

class PolygonDataService {
  private apiKey: string
  private baseUrl = 'https://api.polygon.io'
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  constructor() {
    this.apiKey = process.env.POLYGON_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('POLYGON_API_KEY environment variable is required')
    }
    console.log(`🔑 Polygon API Key loaded: ${this.apiKey.substring(0, 8)}...${this.apiKey.substring(this.apiKey.length - 4)}`)
  }

  // Cache management
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data
    }
    this.cache.delete(key)
    return null
  }

  private setCachedData(key: string, data: any, ttlMinutes: number = 5): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    })
  }

  // Fetch historical aggregated data with extended range (5 years for $29 plan)
  async getHistoricalData(
    symbol: string,
    timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'day',
    multiplier: number = 1,
    from: string,
    to: string
  ): Promise<HistoricalDataPoint[]> {
    const cacheKey = `historical_${symbol}_${timespan}_${multiplier}_${from}_${to}`
    const cached = this.getCachedData(cacheKey)
    if (cached) return cached

    try {
      // For $29 plan: Use the correct endpoint with proper parameters
      // The $29 plan supports up to 5 years of historical data
      const url = `${this.baseUrl}/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=50000&apikey=${this.apiKey}`
      console.log(`🔍 Fetching historical data for ${symbol} from: ${url}`)
      
      const response = await fetch(url)
      console.log(`📡 Historical response status: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Polygon API historical error response:`, errorText)
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`)
      }

      const responseText = await response.text()
      console.log(`📄 Historical response preview:`, responseText.substring(0, 200))
      
      let data: PolygonAggregateResponse
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error(`❌ Failed to parse historical JSON response:`, responseText)
        throw new Error(`Invalid JSON response from Polygon API: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`)
      }
      
      // $29 plan supports both OK and DELAYED status
      if ((data.status !== 'OK' && data.status !== 'DELAYED') || !data.results) {
        throw new Error(`Polygon API returned status: ${data.status}`)
      }

      const historicalData: HistoricalDataPoint[] = data.results.map(bar => ({
        date: new Date(bar.t).toISOString().split('T')[0],
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
        vwap: bar.vw,
        transactions: bar.n
      }))

      this.setCachedData(cacheKey, historicalData, 60) // Cache for 1 hour
      return historicalData
    } catch (error) {
      console.error('Error fetching historical data from Polygon:', error)
      throw error
    }
  }

  // Get extended historical data (up to 5 years for $29 plan)
  async getExtendedHistoricalData(symbol: string, years: number = 5): Promise<HistoricalDataPoint[]> {
    // $29 plan supports up to 5 years of historical data
    const maxYears = Math.min(years, 5)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setFullYear(endDate.getFullYear() - maxYears)

    const from = startDate.toISOString().split('T')[0]
    const to = endDate.toISOString().split('T')[0]

    console.log(`📊 Fetching ${maxYears} years of historical data for ${symbol} (${from} to ${to})`)
    return this.getHistoricalData(symbol, 'day', 1, from, to)
  }

  // Get real-time snapshot data (for strategy execution)
  async getSnapshot(symbol: string): Promise<PolygonSnapshot> {
    const cacheKey = `snapshot_${symbol}`
    const cached = this.getCachedData(cacheKey)
    if (cached) return cached

    try {
      // Format symbol for Polygon API (ensure it's uppercase and properly formatted)
      const formattedSymbol = symbol.toUpperCase().trim()
      const url = `${this.baseUrl}/v2/snapshot/locale/us/markets/stocks/tickers/${formattedSymbol}?apikey=${this.apiKey}`
      console.log(`🔍 Fetching snapshot for ${formattedSymbol} from: ${url}`)
      
      const response = await fetch(url)
      console.log(`📡 Response status: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Polygon API error response:`, errorText)
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`)
      }

      const responseText = await response.text()
      console.log(`📄 Response preview:`, responseText.substring(0, 200))
      
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error(`❌ Failed to parse JSON response:`, responseText)
        throw new Error(`Invalid JSON response from Polygon API: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`)
      }
      
      if ((data.status !== 'OK' && data.status !== 'DELAYED') || !data.ticker) {
        throw new Error(`Polygon API returned status: ${data.status}`)
      }

      this.setCachedData(cacheKey, data.ticker, 1) // Cache for 1 minute
      return data.ticker
    } catch (error) {
      console.error('Error fetching snapshot from Polygon:', error)
      throw error
    }
  }

  // Get ticker details and fundamentals
  async getTickerDetails(symbol: string): Promise<PolygonTickerDetails> {
    const cacheKey = `details_${symbol}`
    const cached = this.getCachedData(cacheKey)
    if (cached) return cached

    try {
      const url = `${this.baseUrl}/v3/reference/tickers/${symbol}?apikey=${this.apiKey}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.status !== 'OK' || !data.results) {
        throw new Error(`Polygon API returned status: ${data.status}`)
      }

      this.setCachedData(cacheKey, data.results, 1440) // Cache for 24 hours
      return data.results
    } catch (error) {
      console.error('Error fetching ticker details from Polygon:', error)
      throw error
    }
  }

  // Get market status (useful for strategy timing)
  async getMarketStatus(): Promise<{ status: string; isOpen: boolean; nextOpen?: string; nextClose?: string }> {
    try {
      const url = `${this.baseUrl}/v1/marketstatus/now?apikey=${this.apiKey}`
      console.log(`🔍 Fetching market status from: ${url}`)
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Market status API error: ${response.status}`)
      }

      const data = await response.json()
      return {
        status: data.status,
        isOpen: data.status === 'open',
        nextOpen: data.next_open,
        nextClose: data.next_close
      }
    } catch (error) {
      console.error('Error fetching market status:', error)
      // Fallback to basic market hours check
      const now = new Date()
      const etTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
      const day = etTime.getDay()
      const hour = etTime.getHours()
      const minute = etTime.getMinutes()
      const timeInMinutes = hour * 60 + minute
      
      const isOpen = day >= 1 && day <= 5 && timeInMinutes >= 570 && timeInMinutes < 960
      return {
        status: isOpen ? 'open' : 'closed',
        isOpen
      }
    }
  }

  // Get comprehensive market data
  async getEnhancedMarketData(symbol: string): Promise<EnhancedMarketData> {
    try {
      console.log(`🔍 Fetching comprehensive market data for ${symbol}...`)
      
      // Fetch data in parallel with proper error handling
      const [snapshot, details, historicalData] = await Promise.all([
        this.getSnapshot(symbol),
        this.getTickerDetails(symbol).catch((error) => {
          console.warn(`⚠️ Could not fetch ticker details for ${symbol}:`, error.message)
          return null
        }),
        this.getExtendedHistoricalData(symbol, 2).catch((error) => {
          console.warn(`⚠️ Could not fetch historical data for ${symbol}:`, error.message)
          return []
        })
      ])

      // Validate essential data
      if (!snapshot || !snapshot.day) {
        throw new Error(`Invalid snapshot data for ${symbol}`)
      }

      if (!historicalData || historicalData.length < 20) {
        throw new Error(`Insufficient historical data for ${symbol} (need at least 20 data points)`)
      }

      // Calculate technical indicators with validation
      const technicalIndicators = this.calculateTechnicalIndicators(historicalData)
      
      // Calculate market metrics with validation
      const marketMetrics = this.calculateMarketMetrics(historicalData, snapshot)

      // Calculate additional fundamental metrics
      const peRatio = details?.pe_ratio || undefined
      const beta = details?.beta || 1.0
      const dividendYield = details?.dividend_yield || 0

      // Extract sector and industry from SIC description
      const sicDescription = details?.sic_description || 'Unknown'
      const sector = this.extractSectorFromSIC(sicDescription)
      const industry = sicDescription

      // Enhanced market data with comprehensive validation
      const enhancedData = {
        symbol: symbol.toUpperCase(),
        price: snapshot.day.c,
        change: snapshot.todaysChange,
        changePercent: snapshot.todaysChangePerc,
        volume: snapshot.day.v,
        marketCap: details?.market_cap || undefined,
        peRatio: peRatio,
        beta: beta,
        dividendYield: dividendYield,
        sector: sector,
        industry: industry,
        avgVolume: this.calculateAverageVolume(historicalData),
        high52Week: this.calculate52WeekHigh(historicalData),
        low52Week: this.calculate52WeekLow(historicalData),
        lastUpdated: new Date().toISOString(),
        historicalData,
        technicalIndicators,
        marketMetrics
      }

      // Validate calculated data
      this.validateEnhancedMarketData(enhancedData, symbol)

      console.log(`✅ Enhanced market data for ${symbol}:`, {
        price: enhancedData.price,
        volume: enhancedData.volume?.toLocaleString(),
        marketCap: enhancedData.marketCap?.toLocaleString(),
        peRatio: enhancedData.peRatio,
        beta: enhancedData.beta,
        volatility: marketMetrics.volatility?.toFixed(4),
        rsi: technicalIndicators.rsi?.toFixed(2),
        macd: technicalIndicators.macd?.macd?.toFixed(3)
      })

      return enhancedData
    } catch (error) {
      console.error(`❌ Error getting enhanced market data for ${symbol}:`, error)
      throw error
    }
  }

  // Extract sector from SIC description
  private extractSectorFromSIC(sicDescription: string): string {
    const description = sicDescription.toLowerCase()
    
    // Technology
    if (description.includes('computer') || description.includes('software') || 
        description.includes('technology') || description.includes('semiconductor') ||
        description.includes('internet') || description.includes('telecommunications')) {
      return 'Technology'
    }
    
    // Healthcare
    if (description.includes('health') || description.includes('medical') || 
        description.includes('pharmaceutical') || description.includes('biotechnology') ||
        description.includes('drug') || description.includes('hospital')) {
      return 'Healthcare'
    }
    
    // Financial Services
    if (description.includes('bank') || description.includes('financial') || 
        description.includes('insurance') || description.includes('investment') ||
        description.includes('credit') || description.includes('lending')) {
      return 'Financial Services'
    }
    
    // Consumer Discretionary
    if (description.includes('retail') || description.includes('automotive') || 
        description.includes('entertainment') || description.includes('restaurant') ||
        description.includes('hotel') || description.includes('apparel')) {
      return 'Consumer Discretionary'
    }
    
    // Consumer Staples
    if (description.includes('food') || description.includes('beverage') || 
        description.includes('household') || description.includes('personal care') ||
        description.includes('tobacco')) {
      return 'Consumer Staples'
    }
    
    // Energy
    if (description.includes('oil') || description.includes('gas') || 
        description.includes('energy') || description.includes('petroleum') ||
        description.includes('utility')) {
      return 'Energy'
    }
    
    // Industrials
    if (description.includes('manufacturing') || description.includes('aerospace') || 
        description.includes('defense') || description.includes('machinery') ||
        description.includes('construction') || description.includes('transportation')) {
      return 'Industrials'
    }
    
    // Materials
    if (description.includes('chemical') || description.includes('mining') || 
        description.includes('metal') || description.includes('forest') ||
        description.includes('paper') || description.includes('steel')) {
      return 'Materials'
    }
    
    // Real Estate
    if (description.includes('real estate') || description.includes('property') || 
        description.includes('reit') || description.includes('commercial property')) {
      return 'Real Estate'
    }
    
    // Communication Services
    if (description.includes('media') || description.includes('broadcasting') || 
        description.includes('publishing') || description.includes('advertising')) {
      return 'Communication Services'
    }
    
    // Utilities
    if (description.includes('electric') || description.includes('water') || 
        description.includes('natural gas') || description.includes('utility')) {
      return 'Utilities'
    }
    
    return 'Other'
  }

  // Validate enhanced market data
  private validateEnhancedMarketData(data: EnhancedMarketData, symbol: string): void {
    const errors: string[] = []

    // Validate price
    if (!data.price || data.price <= 0) {
      errors.push('Invalid price')
    }

    // Validate volume
    if (!data.volume || data.volume < 0) {
      errors.push('Invalid volume')
    }

    // Validate technical indicators
    if (data.technicalIndicators.rsi < 0 || data.technicalIndicators.rsi > 100) {
      errors.push('Invalid RSI value')
    }

    if (data.marketMetrics.volatility < 0) {
      errors.push('Invalid volatility value')
    }

    if (errors.length > 0) {
      throw new Error(`Data validation failed for ${symbol}: ${errors.join(', ')}`)
    }
  }

  // Calculate comprehensive technical indicators
  private calculateTechnicalIndicators(data: HistoricalDataPoint[]): TechnicalIndicators {
    const prices = data.map(d => d.close)
    const highs = data.map(d => d.high)
    const lows = data.map(d => d.low)
    const volumes = data.map(d => d.volume)

    return {
      rsi: this.calculateRSI(prices, 14),
      macd: this.calculateMACD(prices, 12, 26, 9),
      sma20: this.calculateSMA(prices, 20),
      sma50: this.calculateSMA(prices, 50),
      sma200: this.calculateSMA(prices, 200),
      ema12: this.calculateEMA(prices, 12),
      ema26: this.calculateEMA(prices, 26),
      bollingerBands: this.calculateBollingerBands(prices, 20, 2),
      stochastic: this.calculateStochastic(highs, lows, prices, 14),
      atr: this.calculateATR(highs, lows, prices, 14),
      adx: this.calculateADX(highs, lows, prices, 14),
      williamsR: this.calculateWilliamsR(highs, lows, prices, 14)
    }
  }

  // Calculate market metrics
  private calculateMarketMetrics(data: HistoricalDataPoint[], snapshot: PolygonSnapshot): MarketMetrics {
    const prices = data.map(d => d.close)
    const volumes = data.map(d => d.volume)
    
    return {
      volatility: this.calculateVolatility(prices),
      momentum: this.calculateMomentum(prices),
      trend: this.calculateTrend(prices),
      strength: this.calculateStrength(prices, volumes),
      support: this.calculateSupport(data),
      resistance: this.calculateResistance(data),
      volumeProfile: this.calculateVolumeProfile(volumes)
    }
  }

  // Technical indicator calculations
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50
    
    let gains = 0
    let losses = 0
    
    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1]
      if (change > 0) gains += change
      else losses -= change
    }
    
    const avgGain = gains / period
    const avgLoss = losses / period
    
    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  private calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): { macd: number; signal: number; histogram: number } {
    if (prices.length < slowPeriod) return { macd: 0, signal: 0, histogram: 0 }
    
    // Calculate EMA values for the entire price series
    const ema12Values = this.calculateEMAValues(prices, fastPeriod)
    const ema26Values = this.calculateEMAValues(prices, slowPeriod)
    
    // Get the latest values
    const ema12 = ema12Values[ema12Values.length - 1]
    const ema26 = ema26Values[ema26Values.length - 1]
    const macd = ema12 - ema26
    
    // Calculate signal line using EMA of MACD values
    const macdValues = ema12Values.map((ema12, i) => ema12 - ema26Values[i])
    const signal = this.calculateEMA(macdValues, signalPeriod)
    const histogram = macd - signal
    
    return { macd, signal, histogram }
  }

  // Calculate EMA values for the entire series
  private calculateEMAValues(prices: number[], period: number): number[] {
    if (prices.length === 0) return []
    
    const multiplier = 2 / (period + 1)
    const emaValues: number[] = []
    let ema = prices[0]
    
    for (let i = 0; i < prices.length; i++) {
      if (i === 0) {
        ema = prices[i]
      } else {
        ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
      }
      emaValues.push(ema)
    }
    
    return emaValues
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0
    
    const multiplier = 2 / (period + 1)
    let ema = prices[0]
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
    }
    
    return ema
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0
    
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0)
    return sum / period
  }

  private calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number } {
    if (prices.length < period) {
      const price = prices[prices.length - 1] || 0
      return { upper: price * 1.02, middle: price, lower: price * 0.98 }
    }
    
    const sma = this.calculateSMA(prices, period)
    const variance = prices.slice(-period).reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period
    const standardDeviation = Math.sqrt(variance)
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    }
  }

  private calculateStochastic(highs: number[], lows: number[], closes: number[], period: number = 14): { k: number; d: number } {
    if (closes.length < period) return { k: 50, d: 50 }
    
    const recentHighs = highs.slice(-period)
    const recentLows = lows.slice(-period)
    const currentClose = closes[closes.length - 1]
    
    const highest = Math.max(...recentHighs)
    const lowest = Math.min(...recentLows)
    
    const k = ((currentClose - lowest) / (highest - lowest)) * 100
    const d = k // Simplified D calculation
    
    return { k, d }
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return 0
    
    const trueRanges = []
    
    for (let i = 1; i < closes.length; i++) {
      const high = highs[i]
      const low = lows[i]
      const prevClose = closes[i - 1]
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      )
      
      trueRanges.push(tr)
    }
    
    return this.calculateSMA(trueRanges, period)
  }

  private calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    // Simplified ADX calculation
    if (closes.length < period + 1) return 0
    
    let dmPlus = 0
    let dmMinus = 0
    
    for (let i = 1; i < Math.min(period + 1, closes.length); i++) {
      const highDiff = highs[i] - highs[i - 1]
      const lowDiff = lows[i - 1] - lows[i]
      
      if (highDiff > lowDiff && highDiff > 0) dmPlus += highDiff
      if (lowDiff > highDiff && lowDiff > 0) dmMinus += lowDiff
    }
    
    return Math.abs(dmPlus - dmMinus) / (dmPlus + dmMinus) * 100
  }

  private calculateWilliamsR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (closes.length < period) return -50
    
    const recentHighs = highs.slice(-period)
    const recentLows = lows.slice(-period)
    const currentClose = closes[closes.length - 1]
    
    const highest = Math.max(...recentHighs)
    const lowest = Math.min(...recentLows)
    
    return ((highest - currentClose) / (highest - lowest)) * -100
  }

  // Market metrics calculations
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0
    
    // Calculate log returns for better statistical properties
    const logReturns = []
    for (let i = 1; i < prices.length; i++) {
      logReturns.push(Math.log(prices[i] / prices[i - 1]))
    }
    
    // Calculate mean return
    const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length
    
    // Calculate variance
    const variance = logReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / logReturns.length
    
    // Calculate standard deviation and annualize (252 trading days)
    const dailyVolatility = Math.sqrt(variance)
    const annualizedVolatility = dailyVolatility * Math.sqrt(252)
    
    // Validate volatility is within reasonable bounds
    if (annualizedVolatility < 0.001 || annualizedVolatility > 2.0) {
      console.warn(`⚠️ Unusual volatility calculated: ${annualizedVolatility.toFixed(4)} for price series`)
    }
    
    return annualizedVolatility
  }

  private calculateMomentum(prices: number[]): number {
    if (prices.length < 10) return 0
    
    const recent = prices.slice(-10)
    const older = prices.slice(-20, -10)
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
    
    return (recentAvg - olderAvg) / olderAvg
  }

  private calculateTrend(prices: number[]): number {
    if (prices.length < 20) return 0
    
    // Use linear regression for more accurate trend calculation
    const n = Math.min(20, prices.length)
    const recentPrices = prices.slice(-n)
    const xValues = Array.from({length: n}, (_, i) => i)
    
    // Calculate means
    const xMean = xValues.reduce((a, b) => a + b, 0) / n
    const yMean = recentPrices.reduce((a, b) => a + b, 0) / n
    
    // Calculate slope (trend)
    let numerator = 0
    let denominator = 0
    
    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (recentPrices[i] - yMean)
      denominator += Math.pow(xValues[i] - xMean, 2)
    }
    
    if (denominator === 0) return 0
    
    const slope = numerator / denominator
    
    // Normalize trend to -1 to 1 range
    const normalizedTrend = Math.tanh(slope / recentPrices[0] * 100)
    
    return normalizedTrend
  }

  private calculateStrength(prices: number[], volumes: number[]): number {
    if (prices.length < 2 || volumes.length < 2) return 0
    
    let strength = 0
    for (let i = 1; i < prices.length; i++) {
      const priceChange = (prices[i] - prices[i - 1]) / prices[i - 1]
      const volumeWeight = volumes[i] / Math.max(...volumes)
      strength += priceChange * volumeWeight
    }
    
    return strength / prices.length
  }

  private calculateSupport(data: HistoricalDataPoint[]): number {
    const lows = data.map(d => d.low)
    return Math.min(...lows.slice(-20)) // Support from recent 20 days
  }

  private calculateResistance(data: HistoricalDataPoint[]): number {
    const highs = data.map(d => d.high)
    return Math.max(...highs.slice(-20)) // Resistance from recent 20 days
  }

  private calculateVolumeProfile(volumes: number[]): number {
    if (volumes.length === 0) return 0
    
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
    const recentVolume = volumes[volumes.length - 1]
    
    return recentVolume / avgVolume
  }

  private calculateAverageVolume(data: HistoricalDataPoint[]): number {
    if (data.length === 0) return 0
    
    const volumes = data.slice(-30).map(d => d.volume) // Last 30 days
    return volumes.reduce((a, b) => a + b, 0) / volumes.length
  }

  private calculate52WeekHigh(data: HistoricalDataPoint[]): number {
    const yearData = data.slice(-252) // Approximately 1 year of trading days
    return Math.max(...yearData.map(d => d.high))
  }

  private calculate52WeekLow(data: HistoricalDataPoint[]): number {
    const yearData = data.slice(-252) // Approximately 1 year of trading days
    return Math.min(...yearData.map(d => d.low))
  }
}

export { PolygonDataService, type EnhancedMarketData, type HistoricalDataPoint, type TechnicalIndicators, type MarketMetrics }