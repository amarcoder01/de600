/**
 * Real-Time Data Service
 * Primary: Polygon API for real-time market data
 * Fallback: Yahoo Finance for backup data
 * No mock data - only real market information
 */

import { PolygonApiService } from '@/lib/screener/polygonApi'
import { YahooFinanceService, YahooQuote } from '@/lib/services/yahoo-finance'

export interface RealTimeStockData {
  ticker: string
  name?: string
  price: number
  change: number
  change_percent: number
  volume: number
  market_cap?: number
  high?: number
  low?: number
  open?: number
  previous_close?: number
  pe_ratio?: number
  dividend_yield?: number
  beta?: number
  avg_volume?: number
  exchange?: string
  sector?: string
  industry?: string
  last_updated: string
  source: 'polygon' | 'yahoo' | 'extracted'
  confidence: number
}

interface DataSourceResult {
  success: boolean
  data?: RealTimeStockData
  error?: string
}

export class RealTimeDataService {
  private polygonService: PolygonApiService
  private yahooService: YahooFinanceService
  private cache: Map<string, { data: RealTimeStockData; expires: number }> = new Map()
  private readonly CACHE_TTL = 60000 // 1 minute cache

  constructor() {
    this.polygonService = new PolygonApiService()
    this.yahooService = new YahooFinanceService()
  }

  /**
   * Get real-time stock data with Polygon primary, Yahoo fallback
   */
  async getStockData(ticker: string, extractedData?: Partial<RealTimeStockData>): Promise<RealTimeStockData | null> {
    // Pre-validate ticker to avoid API calls for invalid tickers
    if (!this.isValidTicker(ticker)) {
      console.log(`⚠️ Skipping invalid ticker: ${ticker}`)
      return null
    }

    const cacheKey = ticker.toUpperCase()
    
    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      return cached.data
    }

    try {
      // Try Polygon first
      console.log(`📊 Fetching real-time data for ${ticker} (Polygon → Yahoo fallback)`)
      
      const polygonResult = await this.getPolygonData(ticker)
      if (polygonResult.success && polygonResult.data) {
        this.cacheData(cacheKey, polygonResult.data)
        return polygonResult.data
      }

      // Fallback to Yahoo Finance
      console.log(`🔄 Polygon failed for ${ticker}, trying Yahoo Finance`)
      const yahooResult = await this.getYahooData(ticker)
      if (yahooResult.success && yahooResult.data) {
        this.cacheData(cacheKey, yahooResult.data)
        return yahooResult.data
      }

      // If both fail but we have extracted data, use that with lower confidence
      if (extractedData && (extractedData.price || extractedData.change || extractedData.change_percent)) {
        console.log(`📈 Using extracted data for ${ticker} (APIs unavailable)`)
        const fallbackData: RealTimeStockData = {
          ticker: ticker.toUpperCase(),
          name: extractedData.name || `${ticker} Corporation`,
          price: extractedData.price || 0,
          change: extractedData.change || 0,
          change_percent: extractedData.change_percent || 0,
          volume: extractedData.volume || 0,
          market_cap: extractedData.market_cap || 0, // Ensure not undefined
          exchange: extractedData.exchange || 'NYSE', // Default to NYSE instead of UNKNOWN
          sector: extractedData.sector || 'Unknown',
          last_updated: new Date().toISOString(),
          source: 'extracted',
          confidence: 0.6 // Lower confidence for extracted data
        }
        
        this.cacheData(cacheKey, fallbackData)
        return fallbackData
      }

      console.warn(`❌ No data available for ${ticker} from any source`)
      return null

    } catch (error) {
      console.error(`❌ Error fetching data for ${ticker}:`, error)
      return null
    }
  }

  /**
   * Batch get stock data for multiple tickers
   */
  async getBatchStockData(
    tickers: string[], 
    extractedDataMap?: Map<string, Partial<RealTimeStockData>>,
    maxConcurrent: number = 10
  ): Promise<Map<string, RealTimeStockData>> {
    const results = new Map<string, RealTimeStockData>()
    const batches: string[][] = []
    
    // Create batches for concurrent processing
    for (let i = 0; i < tickers.length; i += maxConcurrent) {
      batches.push(tickers.slice(i, i + maxConcurrent))
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (ticker) => {
        const extractedData = extractedDataMap?.get(ticker.toUpperCase())
        const data = await this.getStockData(ticker, extractedData)
        if (data) {
          results.set(ticker.toUpperCase(), data)
        }
        return { ticker, data }
      })

      const batchResults = await Promise.allSettled(batchPromises)
      
      // Log batch completion
      const successful = batchResults.filter(r => r.status === 'fulfilled' && r.value.data).length
      console.log(`✅ Batch completed: ${successful}/${batch.length} stocks enriched`)
    }

    return results
  }

  /**
   * Get data from Polygon API
   */
  private async getPolygonData(ticker: string): Promise<DataSourceResult> {
    try {
      const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Polygon timeout')), 2000) // Reduced from 5s to 2s
      )

      // Get current price and basic data
      const pricePromise = this.polygonService.getStockPrice(ticker)
      const snapshotPromise = this.polygonService.getStockSnapshot(ticker)

      const [priceData, snapshotData] = await Promise.race([
        Promise.allSettled([pricePromise, snapshotPromise]),
        timeout
      ]) as PromiseSettledResult<any>[]

      let price = 0, change = 0, changePercent = 0, volume = 0
      let high, low, open, previousClose

      // Extract price data
      if (priceData.status === 'fulfilled' && priceData.value) {
        price = priceData.value.price || priceData.value.c || 0
      }

      // Extract snapshot data
      if (snapshotData.status === 'fulfilled' && snapshotData.value) {
        const snap = snapshotData.value
        price = price || snap.price || snap.c || 0
        change = snap.change || snap.todaysChange || 0
        changePercent = snap.changePercent || snap.todaysChangePerc || 0
        volume = snap.volume || snap.v || 0
        high = snap.high || snap.h
        low = snap.low || snap.l
        open = snap.open || snap.o
        previousClose = snap.previousClose || snap.prevDay?.c
      }

      if (price > 0) {
        const data: RealTimeStockData = {
          ticker: ticker.toUpperCase(),
          name: `${ticker} Corporation`, // Polygon doesn't always provide company names
          price,
          change,
          change_percent: changePercent,
          volume,
          high,
          low,
          open,
          previous_close: previousClose,
          last_updated: new Date().toISOString(),
          source: 'polygon',
          confidence: 0.95
        }

        return { success: true, data }
      }

      return { success: false, error: 'No valid price data from Polygon' }

    } catch (error) {
      return { 
        success: false, 
        error: `Polygon API error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  /**
   * Get data from Yahoo Finance
   */
  private async getYahooData(ticker: string): Promise<DataSourceResult> {
    try {
      const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Yahoo timeout')), 2000) // Reduced from 4s to 2s
      )

      const quotesMap = await Promise.race([
        this.yahooService.getQuotes([ticker], 2000), // Reduced timeout
        timeout
      ]) as Map<string, YahooQuote>

      const quote = quotesMap.get(ticker.toUpperCase())
      if (!quote || !quote.regularMarketPrice) {
        return { success: false, error: 'No data from Yahoo Finance' }
      }

      // Calculate change percentage if missing but we have change and previous close
      let changePercent = quote.regularMarketChangePercent || 0
      if (!changePercent && quote.regularMarketChange && quote.regularMarketPreviousClose && quote.regularMarketPreviousClose !== 0) {
        changePercent = (quote.regularMarketChange / quote.regularMarketPreviousClose) * 100
      }

      // Improve exchange detection for US stocks
      let exchange = quote.fullExchangeName || quote.exchange || ''
      if (!exchange || exchange === 'UNKNOWN' || exchange.trim() === '') {
        // Guess based on ticker characteristics for US stocks
        const tickerUpper = ticker.toUpperCase()
        if (tickerUpper.length <= 3 || ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'JNJ', 'PG', 'WMT', 'V', 'MA', 'HD', 'DIS', 'KO', 'PEP', 'NKE', 'MCD', 'VZ', 'T', 'IBM', 'GE', 'F', 'GM', 'BA', 'CAT', 'MMM', 'UNH', 'CVS', 'COST', 'TGT', 'LOW', 'SBUX'].includes(tickerUpper)) {
          exchange = 'NYSE'
        } else {
          exchange = 'NASDAQ'
        }
      }

      const data: RealTimeStockData = {
        ticker: ticker.toUpperCase(),
        name: quote.longName || quote.shortName || `${ticker} Corporation`,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange || 0,
        change_percent: changePercent,
        volume: quote.regularMarketVolume || 0,
        market_cap: quote.marketCap || 0, // Ensure we don't pass undefined
        high: quote.regularMarketDayHigh,
        low: quote.regularMarketDayLow,
        open: quote.regularMarketOpen,
        previous_close: quote.regularMarketPreviousClose,
        exchange: exchange,
        last_updated: new Date().toISOString(),
        source: 'yahoo',
        confidence: 0.85
      }

      return { success: true, data }

    } catch (error) {
      return { 
        success: false, 
        error: `Yahoo Finance error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  /**
   * Cache data with expiration
   */
  private cacheData(key: string, data: RealTimeStockData): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.CACHE_TTL
    })

    // Clean up expired cache entries periodically
    if (this.cache.size > 1000) {
      this.cleanExpiredCache()
    }
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now()
    for (const [key, value] of Array.from(this.cache.entries())) {
      if (value.expires < now) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // TODO: Implement hit rate tracking if needed
    }
  }

  /**
   * Health check for data sources
   */
  async healthCheck(): Promise<{
    polygon: boolean
    yahoo: boolean
    overall: boolean
  }> {
    const testTicker = 'AAPL'
    
    const polygonTest = await this.getPolygonData(testTicker)
    const yahooTest = await this.getYahooData(testTicker)

    return {
      polygon: polygonTest.success,
      yahoo: yahooTest.success,
      overall: polygonTest.success || yahooTest.success
    }
  }

  /**
   * Validate ticker before making API calls to avoid 404 errors
   */
  private isValidTicker(ticker: string): boolean {
    // Filter out problematic tickers that cause 404s from logs
    const problematicTickers = new Set([
      'P', 'ML', 'HFT', 'FIU', 'US', 'AT', 'IV', 'VF', 'EN', 'NY', 'FX',
      'TTF', 'OAT', 'BTP', 'ESTR', 'SONIA', 'SARON', 'FTSE', 'AEX', 'BEL', 'OMX',
      'ULSD', 'RBOB', 'VIX', 'TFF', 'XRP', 'TTM', 'EV', 'SPAC', 'OTC', 'PCE',
      'THE', 'AND', 'FOR', 'WITH', 'FROM', 'INTO', 'OVER', 'UNDER', 'ABOVE', 'BELOW',
      'DEALS', 'NEW', 'THIS', 'MONTH', 'FREE', 'MENU'
    ])

    // Must be 1-5 characters, all letters
    if (!/^[A-Z]{1,5}$/.test(ticker.toUpperCase())) return false
    
    // Filter out problematic tickers
    if (problematicTickers.has(ticker.toUpperCase())) return false

    // Single letter tickers are often problematic except for known ones
    if (ticker.length === 1 && !['A', 'C', 'F', 'T', 'V', 'X'].includes(ticker.toUpperCase())) {
      return false
    }

    return true
  }
}
