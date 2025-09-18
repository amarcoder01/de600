// Yahoo Finance API Service - Reliable fallback for stock data
import { Stock } from '@/types'

interface YahooFinanceQuote {
  symbol: string
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
  regularMarketVolume: number
  regularMarketDayHigh: number
  regularMarketDayLow: number
  marketCap: number
  trailingPE: number
  dividendYield: number
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  averageVolume: number
  beta: number
  eps: number
  longName: string
  sector: string
  industry: string
  exchange: string
}

export class YahooFinanceAPI {
  private static cache = new Map<string, { data: Stock; timestamp: number }>()
  private static CACHE_DURATION = 60000 // 1 minute cache

  // Get stock data from Yahoo Finance
  async getStockData(symbol: string): Promise<Stock | null> {
    try {
      // Check cache first
      const cached = YahooFinanceAPI.cache.get(symbol)
      if (cached && Date.now() - cached.timestamp < YahooFinanceAPI.CACHE_DURATION) {
        return cached.data
      }

      console.log(`📡 Fetching data for ${symbol} from Yahoo Finance...`)

      // Use Yahoo Finance API (free, no API key required)
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
      const response = await fetch(url)

      if (!response.ok) {
        console.log(`❌ Yahoo Finance failed for ${symbol}:`, response.status)
        return null
      }

      const data = await response.json()
      
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        console.log(`❌ No Yahoo Finance data for ${symbol}`)
        return null
      }

      const result = data.chart.result[0]
      const quote = result.quote && result.quote.length > 0 ? result.quote[0] : null
      const meta = result.meta

      if (!meta || !meta.regularMarketPrice) {
        console.log(`❌ No valid market data for ${symbol}`)
        return null
      }

      // Get additional company info
      const companyInfo = await this.getCompanyInfo(symbol)

      // Map to our Stock interface
      const stock: Stock = {
        symbol: symbol.toUpperCase(),
        name: companyInfo.name || meta.symbol || symbol.toUpperCase(),
        price: meta.regularMarketPrice || 0,
        change: (meta.regularMarketPrice || 0) - (meta.previousClose || meta.regularMarketPrice || 0),
        changePercent: meta.previousClose ? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100 : 0,
        volume: quote?.volume || 0,
        marketCap: companyInfo.marketCap || 0,
        pe: companyInfo.pe || 0,
        dividend: companyInfo.dividend || 0,
        sector: companyInfo.sector || 'Unknown',
        industry: companyInfo.industry || 'Unknown',
        exchange: this.mapExchange(meta.exchangeName),
        dayHigh: quote?.high || meta.regularMarketPrice || 0,
        dayLow: quote?.low || meta.regularMarketPrice || 0,
        fiftyTwoWeekHigh: companyInfo.fiftyTwoWeekHigh || meta.regularMarketPrice || 0,
        fiftyTwoWeekLow: companyInfo.fiftyTwoWeekLow || meta.regularMarketPrice || 0,
        avgVolume: companyInfo.avgVolume || quote?.volume || 0,
        dividendYield: companyInfo.dividendYield || 0,
        beta: companyInfo.beta || 0,
        eps: companyInfo.eps || 0,
        lastUpdated: new Date().toISOString()
      }

      // Cache the result
      YahooFinanceAPI.cache.set(symbol, { data: stock, timestamp: Date.now() })
      
      console.log(`✅ Yahoo Finance data fetched for ${symbol}: $${stock.price} (${stock.changePercent.toFixed(2)}%)`)
      return stock

    } catch (error) {
      console.error(`❌ Error fetching Yahoo Finance data for ${symbol}:`, error)
      return null
    }
  }

  // Get additional company information
  private async getCompanyInfo(symbol: string): Promise<{
    name: string
    marketCap: number
    pe: number
    dividend: number
    sector: string
    industry: string
    fiftyTwoWeekHigh: number
    fiftyTwoWeekLow: number
    avgVolume: number
    dividendYield: number
    beta: number
    eps: number
  }> {
    try {
      const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,defaultKeyStatistics,financialData`
      const response = await fetch(url)
      
      if (!response.ok) {
        return this.getDefaultCompanyInfo()
      }

      const data = await response.json()
      const summaryDetail = data.quoteSummary?.result?.[0]?.summaryDetail
      const defaultKeyStatistics = data.quoteSummary?.result?.[0]?.defaultKeyStatistics
      const financialData = data.quoteSummary?.result?.[0]?.financialData

      return {
        name: data.quoteSummary?.result?.[0]?.price?.longName || symbol,
        marketCap: summaryDetail?.marketCap?.raw || 0,
        pe: financialData?.forwardPE?.raw || 0,
        dividend: summaryDetail?.dividendRate?.raw || 0,
        sector: financialData?.sector || 'Unknown',
        industry: financialData?.industry || 'Unknown',
        fiftyTwoWeekHigh: summaryDetail?.fiftyTwoWeekHigh?.raw || 0,
        fiftyTwoWeekLow: summaryDetail?.fiftyTwoWeekLow?.raw || 0,
        avgVolume: summaryDetail?.averageVolume?.raw || 0,
        dividendYield: summaryDetail?.dividendYield?.raw || 0,
        beta: defaultKeyStatistics?.beta?.raw || 0,
        eps: financialData?.eps?.raw || 0
      }
    } catch (error) {
      console.log(`⚠️ Could not fetch company info for ${symbol}, using defaults`)
      return this.getDefaultCompanyInfo()
    }
  }

  private getDefaultCompanyInfo() {
    return {
      name: '',
      marketCap: 0,
      pe: 0,
      dividend: 0,
      sector: 'Unknown',
      industry: 'Unknown',
      fiftyTwoWeekHigh: 0,
      fiftyTwoWeekLow: 0,
      avgVolume: 0,
      dividendYield: 0,
      beta: 0,
      eps: 0
    }
  }

  private mapExchange(exchangeName: string): 'NYSE' | 'NASDAQ' | 'OTC' {
    if (exchangeName?.includes('NYSE')) return 'NYSE'
    if (exchangeName?.includes('NASDAQ')) return 'NASDAQ'
    return 'OTC'
  }

  // Search stocks using Yahoo Finance
  async searchStocks(query: string): Promise<Stock[]> {
    try {
      console.log(`🔍 Searching stocks for "${query}" via Yahoo Finance...`)
      
      // Use Yahoo Finance search API
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`
      const response = await fetch(url)

      if (!response.ok) {
        console.log(`❌ Yahoo Finance search failed:`, response.status)
        return []
      }

      const data = await response.json()
      const quotes = data.quotes || []

      // Fetch detailed data for each quote
      const stockPromises = quotes.slice(0, 8).map(async (quote: any) => {
        try {
          const stock = await this.getStockData(quote.symbol)
          if (stock) {
            return stock
          } else {
            // Fallback to basic data
            return {
              symbol: quote.symbol,
              name: quote.longname || quote.shortname || quote.symbol,
              price: quote.regularMarketPrice || 0,
              change: quote.regularMarketChange || 0,
              changePercent: quote.regularMarketChangePercent || 0,
              volume: quote.regularMarketVolume || 0,
              marketCap: quote.marketCap || 0,
              pe: quote.trailingPE || 0,
              dividend: 0,
              sector: quote.sector || 'Unknown',
              industry: quote.industry || 'Unknown',
              exchange: this.mapExchange(quote.exchange),
              dayHigh: quote.regularMarketDayHigh || quote.regularMarketPrice || 0,
              dayLow: quote.regularMarketDayLow || quote.regularMarketPrice || 0,
              fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
              fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
              avgVolume: quote.averageVolume || 0,
              dividendYield: quote.dividendYield || 0,
              beta: quote.beta || 0,
              eps: quote.eps || 0,
              lastUpdated: new Date().toISOString()
            }
          }
        } catch (error) {
          console.error(`Error processing quote for ${quote.symbol}:`, error)
          return null
        }
      })

      const results = await Promise.all(stockPromises)
      const validResults = results.filter(stock => stock !== null) as Stock[]
      
      console.log(`✅ Yahoo Finance search found ${validResults.length} stocks`)
      return validResults

    } catch (error) {
      console.error(`❌ Error searching stocks via Yahoo Finance:`, error)
      return []
    }
  }
}

export const yahooFinanceAPI = new YahooFinanceAPI()
