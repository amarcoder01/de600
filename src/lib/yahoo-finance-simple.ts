// Simple Yahoo Finance API - Reliable real-time data
import { Stock } from '@/types'

export class YahooFinanceSimple {
  private static cache = new Map<string, { data: Stock; timestamp: number }>()
  private static CACHE_DURATION = 30000 // 30 seconds cache

  // Get real-time stock data from Yahoo Finance
  async getStockData(symbol: string): Promise<Stock | null> {
    try {
      // Check cache first
      const cached = YahooFinanceSimple.cache.get(symbol)
      if (cached && Date.now() - cached.timestamp < YahooFinanceSimple.CACHE_DURATION) {
        return cached.data
      }

      console.log(`📡 Fetching Yahoo Finance data for ${symbol}...`)

      // Use Yahoo Finance API endpoint
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`)
      
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
      const meta = result.meta
      const quote = result.indicators.quote[0]
      const timestamps = result.timestamp

      // Get current price and previous close
      const currentPrice = meta.regularMarketPrice || 0
      const previousClose = meta.previousClose || currentPrice
      const change = currentPrice - previousClose
      const changePercent = ((change / previousClose) * 100) || 0

      // Get volume data
      const volume = quote.volume ? quote.volume[quote.volume.length - 1] : 0
      const avgVolume = meta.averageVolume || volume

      // Get high/low data
      const dayHigh = quote.high ? Math.max(...quote.high.filter((h: number | null) => h !== null)) : currentPrice
      const dayLow = quote.low ? Math.min(...quote.low.filter((l: number | null) => l !== null)) : currentPrice

      // Create stock object
      const stock: Stock = {
        symbol: symbol.toUpperCase(),
        name: meta.symbol || symbol.toUpperCase(),
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        volume: volume,
        marketCap: meta.marketCap || 0,
        pe: meta.trailingPE || 0,
        dividend: 0, // Not provided by this endpoint
        sector: 'Technology', // Default
        industry: 'Technology', // Default
        exchange: meta.exchangeName === 'NYQ' ? 'NYSE' : 'NASDAQ',
        dayHigh: dayHigh,
        dayLow: dayLow,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || currentPrice,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow || currentPrice,
        avgVolume: avgVolume,
        dividendYield: 0, // Not provided by this endpoint
        beta: meta.beta || 0,
        eps: meta.trailingEps || 0,
        lastUpdated: new Date().toISOString()
      }

      // Cache the result
      YahooFinanceSimple.cache.set(symbol, { data: stock, timestamp: Date.now() })
      
      console.log(`✅ Yahoo Finance data for ${symbol}: $${currentPrice} (${changePercent.toFixed(2)}%)`)
      return stock

    } catch (error) {
      console.error(`❌ Error fetching Yahoo Finance data for ${symbol}:`, error)
      return null
    }
  }

  // Search stocks using Yahoo Finance
  async searchStocks(query: string): Promise<Stock[]> {
    try {
      console.log(`🔍 Searching stocks for "${query}" via Yahoo Finance...`)
      
      // Use Yahoo Finance search endpoint
      const response = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`)
      
      if (!response.ok) {
        console.log(`❌ Yahoo Finance search failed:`, response.status)
        return []
      }

      const data = await response.json()
      
      if (!data.quotes || data.quotes.length === 0) {
        console.log(`❌ No Yahoo Finance search results for "${query}"`)
        return []
      }

      // Convert to our Stock format
      const stocks: Stock[] = []
      
      for (const quote of data.quotes.slice(0, 10)) {
        const stock: Stock = {
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol,
          price: quote.regularMarketPrice || 0,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          volume: quote.regularMarketVolume || 0,
          marketCap: quote.marketCap || 0,
          pe: quote.trailingPE || 0,
          dividend: 0,
          sector: quote.sector || 'Technology',
          industry: quote.industry || 'Technology',
          exchange: quote.exchange === 'NYQ' ? 'NYSE' : 'NASDAQ',
          dayHigh: quote.regularMarketDayHigh || quote.regularMarketPrice || 0,
          dayLow: quote.regularMarketDayLow || quote.regularMarketPrice || 0,
          fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || quote.regularMarketPrice || 0,
          fiftyTwoWeekLow: quote.fiftyTwoWeekLow || quote.regularMarketPrice || 0,
          avgVolume: quote.averageVolume || quote.regularMarketVolume || 0,
          dividendYield: 0,
          beta: quote.beta || 0,
          eps: quote.trailingEps || 0,
          lastUpdated: new Date().toISOString()
        }
        
        stocks.push(stock)
      }

      console.log(`✅ Yahoo Finance search found ${stocks.length} stocks`)
      return stocks

    } catch (error) {
      console.error(`❌ Error searching stocks via Yahoo Finance:`, error)
      return []
    }
  }

  // Get chart data for technical analysis
  async getChartData(symbol: string, range: string = '1d'): Promise<any> {
    try {
      console.log(`📊 Fetching chart data for ${symbol} (${range})...`)
      
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=${range}`)
      
      if (!response.ok) {
        console.log(`❌ Chart data failed for ${symbol}:`, response.status)
        return null
      }

      const data = await response.json()
      
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        console.log(`❌ No chart data for ${symbol}`)
        return null
      }

      const result = data.chart.result[0]
      const timestamps = result.timestamp
      const quote = result.indicators.quote[0]

      // Convert to chart format
      const chartData = timestamps.map((timestamp: number, index: number) => ({
        time: timestamp * 1000, // Convert to milliseconds
        open: quote.open ? quote.open[index] : 0,
        high: quote.high ? quote.high[index] : 0,
        low: quote.low ? quote.low[index] : 0,
        close: quote.close ? quote.close[index] : 0,
        volume: quote.volume ? quote.volume[index] : 0
      })).filter((candle: any) => candle.close > 0) // Filter out invalid data

      console.log(`✅ Chart data for ${symbol}: ${chartData.length} candles`)
      return {
        symbol: symbol,
        range: range,
        data: chartData,
        meta: result.meta
      }

    } catch (error) {
      console.error(`❌ Error fetching chart data for ${symbol}:`, error)
      return null
    }
  }
}

export const yahooFinanceSimple = new YahooFinanceSimple()
