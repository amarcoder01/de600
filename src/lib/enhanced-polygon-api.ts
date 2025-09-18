// Enhanced Polygon.io API with data validation for paid plan
import { Stock } from '@/types'
import { validateStockData, StockDataValidation } from './data-validation'
import { validateSector } from './sector-validation'

// Polygon.io configuration for paid plan
const POLYGON_API_KEY = process.env.NEXT_PUBLIC_POLYGON_API_KEY || process.env.POLYGON_API_KEY
const POLYGON_BASE_URL = 'https://api.polygon.io'

// Enhanced request handler with unlimited request handling
const makeEnhancedRequest = async (url: string, options: RequestInit = {}): Promise<Response> => {
  if (!POLYGON_API_KEY) {
    throw new Error('Polygon API key is required')
  }

  const urlWithKey = new URL(url)
  urlWithKey.searchParams.set('apikey', POLYGON_API_KEY)

  const response = await fetch(urlWithKey.toString(), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    let errorMessage = `Polygon API error: ${response.status} ${response.statusText}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch {}
    throw new Error(errorMessage)
  }

  return response
}

export class EnhancedPolygonAPI {
  private static instance: EnhancedPolygonAPI
  private static cache: Map<string, { data: any; timestamp: number; validation: StockDataValidation }> = new Map()
  private readonly CACHE_DURATION = 30000 // 30 seconds for paid plan real-time data

  static getInstance(): EnhancedPolygonAPI {
    if (!EnhancedPolygonAPI.instance) {
      EnhancedPolygonAPI.instance = new EnhancedPolygonAPI()
    }
    return EnhancedPolygonAPI.instance
  }

  // Enhanced stock data fetching with validation
  async getValidatedStockData(symbol: string): Promise<{ stock: Stock | null; validation: StockDataValidation }> {
    try {
      // Check cache first
      const cached = EnhancedPolygonAPI.cache.get(symbol)
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return { stock: cached.data, validation: cached.validation }
      }

      const ticker = symbol.toUpperCase()
      console.log(`🔍 Fetching validated data for ${ticker}...`)

      // Get comprehensive data from multiple endpoints
      const [snapshotData, detailsData, financialsData] = await Promise.all([
        this.getSnapshotData(ticker),
        this.getTickerDetails(ticker),
        this.getFinancialData(ticker)
      ])

      if (!snapshotData) {
        return { stock: null, validation: this.createEmptyValidation(symbol) }
      }

      // Create stock object with enhanced data
      const stock = this.createEnhancedStock(ticker, snapshotData, detailsData, financialsData)
      
      // Validate the stock data
      const validation = validateStockData(stock)
      
      // Apply sector validation
      const sectorValidation = validateSector(stock.sector)
      if (sectorValidation.correctedData) {
        stock.sector = sectorValidation.correctedData
      }
      validation.sector = sectorValidation

      // Cache the validated result
      EnhancedPolygonAPI.cache.set(symbol, {
        data: stock,
        timestamp: Date.now(),
        validation
      })

      console.log(`✅ Stock data for ${ticker} - Quality Score: ${validation.overallScore}%`)
      
      return { stock, validation }

    } catch (error) {
      console.error(`❌ Error fetching validated data for ${symbol}:`, error)
      return { stock: null, validation: this.createEmptyValidation(symbol) }
    }
  }

  // Get snapshot data with enhanced error handling
  private async getSnapshotData(ticker: string): Promise<any> {
    try {
      const response = await makeEnhancedRequest(
        `${POLYGON_BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`
      )
      const data = await response.json()
      return data.ticker || null
    } catch (error) {
      console.error(`Error fetching snapshot for ${ticker}:`, error)
      return null
    }
  }

  // Get ticker details with comprehensive company info
  private async getTickerDetails(ticker: string): Promise<any> {
    try {
      const response = await makeEnhancedRequest(
        `${POLYGON_BASE_URL}/v3/reference/tickers/${ticker}`
      )
      const data = await response.json()
      return data.results || null
    } catch (error) {
      console.error(`Error fetching details for ${ticker}:`, error)
      return null
    }
  }

  // Get financial data for accurate fundamentals
  private async getFinancialData(ticker: string): Promise<any> {
    try {
      const response = await makeEnhancedRequest(
        `${POLYGON_BASE_URL}/vX/reference/financials?ticker=${ticker}&timeframe=annual&limit=1&order=desc`
      )
      const data = await response.json()
      return data.results?.[0]?.financials || null
    } catch (error) {
      console.error(`Error fetching financials for ${ticker}:`, error)
      return null
    }
  }

  // Create enhanced stock object with validated data
  private createEnhancedStock(
    ticker: string,
    snapshot: any,
    details: any,
    financials: any
  ): Stock {
    // Extract accurate price data
    const currentPrice = this.extractPrice(snapshot)
    const previousClose = snapshot.prevDay?.c || currentPrice
    const change = snapshot.todaysChange || (currentPrice - previousClose)
    const changePercent = snapshot.todaysChangePerc || 
      (previousClose > 0 ? ((change / previousClose) * 100) : 0)

    // Extract accurate volume data
    const volume = this.extractVolume(snapshot)
    
    // Extract market cap with validation
    const marketCap = details?.market_cap || this.estimateMarketCap(currentPrice, details)

    // Extract sector with enhanced mapping
    const sector = this.extractSector(details)

    // Extract financial metrics
    const eps = financials?.income_statement?.basic_earnings_per_share?.value || 0
    const peRatio = eps > 0 ? currentPrice / eps : this.estimatePERatio(sector)

    // Create validated stock object
    const stock: Stock = {
      symbol: ticker,
      name: details?.name || `${ticker} Inc.`,
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      volume: volume,
      marketCap: marketCap,
      pe: peRatio,
      dividend: 0, // Will be enhanced later
      sector: sector,
      industry: details?.sic_description || 'Unknown',
      exchange: this.mapExchange(details?.primary_exchange),
      dayHigh: snapshot.day?.h || snapshot.prevDay?.h || currentPrice,
      dayLow: snapshot.day?.l || snapshot.prevDay?.l || currentPrice,
      fiftyTwoWeekHigh: 0, // Will be enhanced later
      fiftyTwoWeekLow: 0, // Will be enhanced later
      avgVolume: snapshot.min?.av || volume,
      dividendYield: 0, // Will be enhanced later
      beta: this.estimateBeta(ticker, sector),
      eps: eps,
      lastUpdated: new Date().toISOString()
    }

    return stock
  }

  // Extract accurate price with fallback logic
  private extractPrice(snapshot: any): number {
    // Try multiple price sources in order of preference
    const priceSources = [
      snapshot.day?.c,           // Current day close
      snapshot.lastTrade?.p,     // Last trade price
      snapshot.lastQuote?.P,     // Last quote price
      snapshot.min?.c,           // Minute close
      snapshot.prevDay?.c        // Previous day close
    ]

    for (const price of priceSources) {
      if (price && price > 0) {
        return price
      }
    }

    return 0
  }

  // Extract accurate volume with validation
  private extractVolume(snapshot: any): number {
    const volumeSources = [
      snapshot.day?.v,           // Current day volume
      snapshot.prevDay?.v,       // Previous day volume
      snapshot.min?.v            // Minute volume
    ]

    for (const volume of volumeSources) {
      if (volume && volume > 0) {
        // Validate volume is reasonable
        if (volume > 100 && volume < 1000000000) {
          return volume
        }
      }
    }

    return 0
  }

  // Enhanced sector extraction with SIC code mapping
  private extractSector(details: any): string {
    if (!details) return 'Unknown'

    const sicCode = details.sic_code
    const sicDescription = details.sic_description || ''

    // Map SIC codes to sectors
    const sicToSector: Record<string, string> = {
      // Technology (3500-3999, 7370-7379)
      '3570': 'Technology', '3571': 'Technology', '3572': 'Technology',
      '7370': 'Technology', '7371': 'Technology', '7372': 'Technology', '7373': 'Technology',
      
      // Healthcare (2830-2899, 3840-3859, 8000-8099)
      '2834': 'Healthcare', '2835': 'Healthcare', '2836': 'Healthcare',
      '3841': 'Healthcare', '3842': 'Healthcare',
      '8000': 'Healthcare', '8011': 'Healthcare', '8062': 'Healthcare',
      
      // Financial Services (6000-6999)
      '6021': 'Financial Services', '6022': 'Financial Services', '6029': 'Financial Services',
      '6211': 'Financial Services', '6311': 'Financial Services',
      
      // Energy (1300-1399, 2900-2999)
      '1311': 'Energy', '1321': 'Energy', '1381': 'Energy',
      '2911': 'Energy', '2990': 'Energy'
    }

    if (sicCode && sicToSector[sicCode]) {
      return sicToSector[sicCode]
    }

    // Fallback to description-based mapping
    return this.mapSectorFromDescription(sicDescription)
  }

  // Map sector from SIC description
  private mapSectorFromDescription(description: string): string {
    const desc = description.toLowerCase()
    
    if (desc.includes('software') || desc.includes('computer') || desc.includes('technology')) {
      return 'Technology'
    } else if (desc.includes('pharmaceutical') || desc.includes('medical') || desc.includes('health')) {
      return 'Healthcare'
    } else if (desc.includes('bank') || desc.includes('financial') || desc.includes('insurance')) {
      return 'Financial Services'
    } else if (desc.includes('retail') || desc.includes('consumer')) {
      return 'Consumer Discretionary'
    } else if (desc.includes('energy') || desc.includes('oil') || desc.includes('gas')) {
      return 'Energy'
    } else if (desc.includes('manufacturing') || desc.includes('industrial')) {
      return 'Industrials'
    } else {
      return 'Other'
    }
  }

  // Map exchange codes to readable names
  private mapExchange(exchangeCode: string): 'NYSE' | 'NASDAQ' | 'OTC' {
    const exchangeMap: Record<string, 'NYSE' | 'NASDAQ' | 'OTC'> = {
      'XNYS': 'NYSE',
      'XNAS': 'NASDAQ',
      'BATS': 'NASDAQ',
      'ARCX': 'NYSE'
    }
    
    return exchangeMap[exchangeCode] || 'OTC'
  }

  // Estimate market cap if not available
  private estimateMarketCap(price: number, details: any): number {
    const sharesOutstanding = details?.share_class_shares_outstanding || 
                             details?.weighted_shares_outstanding
    
    if (sharesOutstanding && price > 0) {
      return sharesOutstanding * price
    }
    
    return 0
  }

  // Estimate P/E ratio based on sector averages
  private estimatePERatio(sector: string): number {
    const sectorPEAverages: Record<string, number> = {
      'Technology': 25.0,
      'Healthcare': 20.0,
      'Financial Services': 15.0,
      'Consumer Discretionary': 22.0,
      'Energy': 12.0,
      'Industrials': 18.0,
      'Consumer Staples': 20.0,
      'Utilities': 16.0,
      'Real Estate': 15.0,
      'Materials': 14.0,
      'Communication Services': 18.0
    }
    
    return sectorPEAverages[sector] || 20.0
  }

  // Estimate Beta based on known values or sector averages
  private estimateBeta(ticker: string, sector: string): number {
    const knownBetas: Record<string, number> = {
      'AAPL': 1.24, 'MSFT': 1.06, 'GOOGL': 1.04, 'AMZN': 1.15,
      'TSLA': 2.05, 'META': 1.18, 'NVDA': 1.75, 'NFLX': 1.35
    }
    
    if (knownBetas[ticker]) {
      return knownBetas[ticker]
    }
    
    const sectorBetas: Record<string, number> = {
      'Technology': 1.3,
      'Healthcare': 0.9,
      'Financial Services': 1.1,
      'Consumer Discretionary': 1.2,
      'Energy': 1.4,
      'Industrials': 1.1,
      'Utilities': 0.6
    }
    
    return sectorBetas[sector] || 1.0
  }

  // Create empty validation for failed requests
  private createEmptyValidation(symbol: string): StockDataValidation {
    return {
      symbol,
      price: { isValid: false, score: 0, issues: ['Price data unavailable'] },
      volume: { isValid: false, score: 0, issues: ['Volume data unavailable'] },
      sector: { isValid: false, score: 0, issues: ['Sector data unavailable'] },
      marketCap: { isValid: false, score: 0, issues: ['Market cap unavailable'] },
      overallScore: 0
    }
  }

  // Batch fetch multiple stocks with validation
  async getValidatedStocks(symbols: string[]): Promise<Array<{ stock: Stock | null; validation: StockDataValidation }>> {
    const promises = symbols.map(symbol => this.getValidatedStockData(symbol))
    return Promise.all(promises)
  }

  // Clear cache for testing
  clearCache(): void {
    EnhancedPolygonAPI.cache.clear()
    console.log('🧹 Enhanced Polygon API cache cleared')
  }
}

// Export singleton instance
export const enhancedPolygonAPI = EnhancedPolygonAPI.getInstance()
