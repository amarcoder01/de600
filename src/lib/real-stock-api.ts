// Real-time Stock Data API Integration - US Markets Only
import { Stock } from '@/types'

// Alpha Vantage API - Free tier with real-time data
const ALPHA_VANTAGE_API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || 'demo'
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'

// Check if real API is enabled
export function isRealAPIEnabled(): boolean {
  return ALPHA_VANTAGE_API_KEY !== 'demo' && ALPHA_VANTAGE_API_KEY !== ''
}

// Real-time stock data API service
export class RealStockAPI {
  private static instance: RealStockAPI
  private cache: Map<string, { data: Stock; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 30000 // 30 seconds cache for real-time data

  static getInstance(): RealStockAPI {
    if (!RealStockAPI.instance) {
      RealStockAPI.instance = new RealStockAPI()
    }
    return RealStockAPI.instance
  }

  // Get real-time stock data from Alpha Vantage
  async getRealStock(symbol: string): Promise<Stock | null> {
    try {
      // Check cache first
      const cached = this.cache.get(symbol)
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data
      }

      console.log(`📡 Fetching real-time data for ${symbol} from Alpha Vantage...`)

      // Get real-time quote
      const quoteUrl = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      const quoteResponse = await fetch(quoteUrl)
      const quoteData = await quoteResponse.json()

      if (quoteData['Error Message'] || !quoteData['Global Quote']) {
        console.log(`❌ No real-time data available for ${symbol}`)
        return null
      }

      const quote = quoteData['Global Quote']

      // Get company overview for additional data
      const overviewUrl = `${ALPHA_VANTAGE_BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      const overviewResponse = await fetch(overviewUrl)
      const overviewData = await overviewResponse.json()

      // Convert to our Stock format
      const stock: Stock = {
        symbol: quote['01. symbol'] || symbol,
        name: overviewData.Name || quote['01. symbol'] || symbol,
        price: parseFloat(quote['05. price']) || 0,
        change: parseFloat(quote['09. change']) || 0,
        changePercent: parseFloat(quote['10. change percent']?.replace('%', '')) || 0,
        volume: parseInt(quote['06. volume']) || 0,
        marketCap: parseFloat(overviewData.MarketCapitalization) * 1000000 || 0, // Convert from millions
        pe: parseFloat(overviewData.PERatio) || 0,
        dividend: parseFloat(overviewData.DividendYield) || 0,
        sector: overviewData.Sector || 'Unknown',
        industry: overviewData.Industry || 'Unknown',
        exchange: overviewData.Exchange || 'NASDAQ',
        dayHigh: parseFloat(quote['03. high']) || 0,
        dayLow: parseFloat(quote['04. low']) || 0,
        fiftyTwoWeekHigh: parseFloat(overviewData['52WeekHigh']) || 0,
        fiftyTwoWeekLow: parseFloat(overviewData['52WeekLow']) || 0,
        avgVolume: parseInt(overviewData.AverageVolume) || 0,
        dividendYield: parseFloat(overviewData.DividendYield) || 0,
        beta: parseFloat(overviewData.Beta) || 0,
        eps: parseFloat(overviewData.EPS) || 0,
        lastUpdated: new Date().toISOString()
      }

      // Cache the result
      this.cache.set(symbol, { data: stock, timestamp: Date.now() })
      
      console.log(`✅ Real-time data fetched for ${symbol}: $${stock.price} (${stock.changePercent}%)`)
      return stock

    } catch (error) {
      console.error(`❌ Error fetching real-time data for ${symbol}:`, error)
      return null
    }
  }

  // Search stocks using Alpha Vantage
  async searchRealStocks(query: string): Promise<Stock[]> {
    try {
      console.log(`🔍 Searching real stocks for: ${query}`)
      
      // Use Alpha Vantage symbol search
      const searchUrl = `${ALPHA_VANTAGE_BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${ALPHA_VANTAGE_API_KEY}`
      const response = await fetch(searchUrl)
      const data = await response.json()

      if (data['Error Message'] || !data.bestMatches) {
        console.log('❌ No search results found')
        return []
      }

      // Filter for US stocks only
      const usStocks = data.bestMatches.filter((match: any) => 
        match['4. region'] === 'United States' && 
        (match['3. type'] === 'Equity' || match['3. type'] === 'Common Stock')
      )

      console.log(`📊 Found ${usStocks.length} US stocks matching "${query}"`)

      // Get detailed data for each stock (limit to first 10 to avoid rate limits)
      const stocks: Stock[] = []
      for (let i = 0; i < Math.min(usStocks.length, 10); i++) {
        const match = usStocks[i]
        const symbol = match['1. symbol']
        
        // Get real-time data for this stock
        const stock = await this.getRealStock(symbol)
        if (stock) {
          stocks.push(stock)
        }

        // Add small delay to avoid rate limiting
        if (i < Math.min(usStocks.length, 10) - 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      console.log(`✅ Returning ${stocks.length} real-time stock results`)
      return stocks

    } catch (error) {
      console.error('❌ Error searching real stocks:', error)
      return []
    }
  }

  // Get popular US stocks with real-time data
  async getPopularRealStocks(): Promise<Stock[]> {
    const popularSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'JPM', 'JNJ', 'V',
      'PG', 'UNH', 'HD', 'MA', 'BAC', 'PFE', 'ABBV', 'KO', 'PEP', 'TMO'
    ]

    const stocks: Stock[] = []
    
    for (const symbol of popularSymbols) {
      const stock = await this.getRealStock(symbol)
      if (stock) {
        stocks.push(stock)
      }
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    return stocks
  }
}

// Export singleton instance
export const realStockAPI = RealStockAPI.getInstance()