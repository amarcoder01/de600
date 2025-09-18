import { yfinanceAPI } from './yfinance-api'
import { yahooFinanceAPI } from './yahoo-finance-api'
import { polygonAPI } from './polygon-api'

export interface RealTimePriceData {
  symbol: string
  price: number
  name?: string
  change?: number
  changePercent?: number
  volume?: number
  lastUpdated: string
}

export class RealTimePriceService {
  // Get real-time price without caching for price alerts
  static async getRealTimePrice(symbol: string): Promise<RealTimePriceData | null> {
    try {
      console.log(`🔍 Getting real-time price for ${symbol}...`)
      
      // Try multiple sources in parallel for faster response
      const pricePromises = [
        this.getFromYFinance(symbol),
        this.getFromYahooFinance(symbol),
        this.getFromPolygon(symbol)
      ]

      // Wait for the first successful response
      const results = await Promise.allSettled(pricePromises)
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          console.log(`✅ Real-time price for ${symbol}: $${result.value.price}`)
          return result.value
        }
      }

      console.warn(`⚠️ No real-time price available for ${symbol}`)
      return null
    } catch (error) {
      console.error(`❌ Error getting real-time price for ${symbol}:`, error)
      return null
    }
  }

  // Get price from yfinance (most reliable for real-time)
  private static async getFromYFinance(symbol: string): Promise<RealTimePriceData | null> {
    try {
      const stock = await yfinanceAPI.getStockData(symbol)
      if (stock && stock.price > 0) {
        return {
          symbol: stock.symbol,
          price: stock.price,
          name: stock.name,
          change: stock.change,
          changePercent: stock.changePercent,
          volume: stock.volume,
          lastUpdated: new Date().toISOString()
        }
      }
      return null
    } catch (error) {
      console.log(`❌ yfinance failed for ${symbol}:`, error)
      return null
    }
  }

  // Get price from Yahoo Finance
  private static async getFromYahooFinance(symbol: string): Promise<RealTimePriceData | null> {
    try {
      const stock = await yahooFinanceAPI.getStockData(symbol)
      if (stock && stock.price > 0) {
        return {
          symbol: stock.symbol,
          price: stock.price,
          name: stock.name,
          change: stock.change,
          changePercent: stock.changePercent,
          volume: stock.volume,
          lastUpdated: new Date().toISOString()
        }
      }
      return null
    } catch (error) {
      console.log(`❌ Yahoo Finance failed for ${symbol}:`, error)
      return null
    }
  }

  // Get price from Polygon
  private static async getFromPolygon(symbol: string): Promise<RealTimePriceData | null> {
    try {
      const stock = await polygonAPI.getUSStockData(symbol)
      if (stock && stock.price > 0) {
        return {
          symbol: stock.symbol,
          price: stock.price,
          name: stock.name,
          change: stock.change,
          changePercent: stock.changePercent,
          volume: stock.volume,
          lastUpdated: new Date().toISOString()
        }
      }
      return null
    } catch (error) {
      console.log(`❌ Polygon failed for ${symbol}:`, error)
      return null
    }
  }

  // Get real-time prices for multiple symbols
  static async getRealTimePrices(symbols: string[]): Promise<Record<string, RealTimePriceData>> {
    const prices: Record<string, RealTimePriceData> = {}
    
    try {
      // Get prices for all symbols in parallel
      const pricePromises = symbols.map(async (symbol) => {
        const priceData = await this.getRealTimePrice(symbol)
        if (priceData) {
          prices[symbol] = priceData
        }
      })

      await Promise.all(pricePromises)
      return prices
    } catch (error) {
      console.error('❌ Error getting real-time prices:', error)
      return prices
    }
  }
}
