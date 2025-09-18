// Stock Market Data API Service - US Markets Only
import { Stock, WatchlistItem } from '@/types'
import { realStockAPI, isRealAPIEnabled } from './real-stock-api'
import { polygonAPI } from './polygon-api'

// Mock real-time data for demonstration (in production, use real APIs)
const MOCK_STOCKS: Record<string, Stock> = {
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 185.50,
    change: 4.25,
    changePercent: 2.34,
    volume: 45678900,
    marketCap: 2890000000000,
    pe: 28.5,
    dividend: 0.96,
    sector: 'Technology',
    industry: 'Consumer Electronics',
    exchange: 'NASDAQ',
    dayHigh: 187.20,
    dayLow: 182.15,
    fiftyTwoWeekHigh: 199.62,
    fiftyTwoWeekLow: 124.17,
    avgVolume: 52000000,
    dividendYield: 0.52,
    beta: 1.24,
    eps: 6.50,
    lastUpdated: new Date().toISOString()
  },
  MSFT: {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 378.85,
    change: -2.15,
    changePercent: -0.56,
    volume: 23456780,
    marketCap: 2810000000000,
    pe: 32.1,
    dividend: 3.00,
    sector: 'Technology',
    industry: 'Software',
    exchange: 'NASDAQ',
    dayHigh: 382.50,
    dayLow: 376.20,
    fiftyTwoWeekHigh: 420.82,
    fiftyTwoWeekLow: 213.43,
    avgVolume: 25000000,
    dividendYield: 0.79,
    beta: 0.89,
    eps: 11.80,
    lastUpdated: new Date().toISOString()
  },
  GOOGL: {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 138.75,
    change: 1.85,
    changePercent: 1.35,
    volume: 28901234,
    marketCap: 1750000000000,
    pe: 26.8,
    dividend: 0.00,
    sector: 'Communication Services',
    industry: 'Internet Content & Information',
    exchange: 'NASDAQ',
    dayHigh: 140.20,
    dayLow: 136.50,
    fiftyTwoWeekHigh: 151.55,
    fiftyTwoWeekLow: 83.34,
    avgVolume: 30000000,
    dividendYield: 0.00,
    beta: 1.05,
    eps: 5.18,
    lastUpdated: new Date().toISOString()
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    price: 244.80,
    change: 6.30,
    changePercent: 2.64,
    volume: 89012345,
    marketCap: 778000000000,
    pe: 68.5,
    dividend: 0.00,
    sector: 'Consumer Discretionary',
    industry: 'Electric Vehicles',
    exchange: 'NASDAQ',
    dayHigh: 248.50,
    dayLow: 240.15,
    fiftyTwoWeekHigh: 299.29,
    fiftyTwoWeekLow: 101.81,
    avgVolume: 95000000,
    dividendYield: 0.00,
    beta: 2.34,
    eps: 3.57,
    lastUpdated: new Date().toISOString()
  },
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 890.50,
    change: 15.20,
    changePercent: 1.74,
    volume: 34567890,
    marketCap: 2200000000000,
    pe: 72.3,
    dividend: 0.16,
    sector: 'Technology',
    industry: 'Semiconductors',
    exchange: 'NASDAQ',
    dayHigh: 895.75,
    dayLow: 875.30,
    fiftyTwoWeekHigh: 950.02,
    fiftyTwoWeekLow: 180.68,
    avgVolume: 40000000,
    dividendYield: 0.02,
    beta: 1.68,
    eps: 12.31,
    lastUpdated: new Date().toISOString()
  },
  AMZN: {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    price: 145.50,
    change: -1.25,
    changePercent: -0.85,
    volume: 45678901,
    marketCap: 1520000000000,
    pe: 45.2,
    dividend: 0.00,
    sector: 'Consumer Discretionary',
    industry: 'E-commerce',
    exchange: 'NASDAQ',
    dayHigh: 147.80,
    dayLow: 144.20,
    fiftyTwoWeekHigh: 155.20,
    fiftyTwoWeekLow: 81.43,
    avgVolume: 50000000,
    dividendYield: 0.00,
    beta: 1.15,
    eps: 3.22,
    lastUpdated: new Date().toISOString()
  },
  META: {
    symbol: 'META',
    name: 'Meta Platforms, Inc.',
    price: 325.80,
    change: 8.45,
    changePercent: 2.66,
    volume: 18901234,
    marketCap: 828000000000,
    pe: 22.5,
    dividend: 2.00,
    sector: 'Communication Services',
    industry: 'Social Media',
    exchange: 'NASDAQ',
    dayHigh: 328.50,
    dayLow: 320.15,
    fiftyTwoWeekHigh: 384.33,
    fiftyTwoWeekLow: 88.09,
    avgVolume: 20000000,
    dividendYield: 0.61,
    beta: 1.32,
    eps: 14.48,
    lastUpdated: new Date().toISOString()
  },
  JPM: {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    price: 155.75,
    change: 2.30,
    changePercent: 1.50,
    volume: 12345678,
    marketCap: 456000000000,
    pe: 11.2,
    dividend: 4.00,
    sector: 'Financials',
    industry: 'Banking',
    exchange: 'NYSE',
    dayHigh: 157.20,
    dayLow: 154.10,
    fiftyTwoWeekHigh: 172.96,
    fiftyTwoWeekLow: 104.40,
    avgVolume: 15000000,
    dividendYield: 2.57,
    beta: 1.08,
    eps: 13.90,
    lastUpdated: new Date().toISOString()
  },
  JNJ: {
    symbol: 'JNJ',
    name: 'Johnson & Johnson',
    price: 162.45,
    change: -0.85,
    changePercent: -0.52,
    volume: 7890123,
    marketCap: 425000000000,
    pe: 15.8,
    dividend: 4.68,
    sector: 'Healthcare',
    industry: 'Pharmaceuticals',
    exchange: 'NYSE',
    dayHigh: 164.20,
    dayLow: 161.50,
    fiftyTwoWeekHigh: 182.63,
    fiftyTwoWeekLow: 143.78,
    avgVolume: 8000000,
    dividendYield: 2.88,
    beta: 0.63,
    eps: 10.28,
    lastUpdated: new Date().toISOString()
  },
  V: {
    symbol: 'V',
    name: 'Visa Inc.',
    price: 265.30,
    change: 3.75,
    changePercent: 1.43,
    volume: 5678901,
    marketCap: 545000000000,
    pe: 31.5,
    dividend: 1.80,
    sector: 'Financials',
    industry: 'Payment Processing',
    exchange: 'NYSE',
    dayHigh: 267.80,
    dayLow: 262.50,
    fiftyTwoWeekHigh: 290.96,
    fiftyTwoWeekLow: 184.60,
    avgVolume: 6000000,
    dividendYield: 0.68,
    beta: 0.98,
    eps: 8.42,
    lastUpdated: new Date().toISOString()
  }
}

// Popular US stock symbols by sector
export const POPULAR_STOCKS = {
  'Technology': ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'AMZN'],
  'Healthcare': ['JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'TMO'],
  'Financials': ['JPM', 'BAC', 'WFC', 'V', 'MA', 'GS'],
  'Consumer Discretionary': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX'],
  'Communication Services': ['GOOGL', 'META', 'DIS', 'NFLX', 'T', 'VZ'],
  'Industrials': ['BA', 'CAT', 'GE', 'MMM', 'UPS', 'HON'],
  'Energy': ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'MPC'],
  'Consumer Staples': ['PG', 'KO', 'PEP', 'WMT', 'COST', 'CL'],
  'Utilities': ['NEE', 'DUK', 'SO', 'AEP', 'EXC', 'XEL'],
  'Real Estate': ['AMT', 'PLD', 'CCI', 'EQIX', 'PSA', 'O'],
  'Materials': ['LIN', 'APD', 'SHW', 'FCX', 'NEM', 'DOW']
}

// API functions for stock data
export class StockAPI {
  private static instance: StockAPI
  private cache: Map<string, { data: Stock; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 60000 // 1 minute cache

  static getInstance(): StockAPI {
    if (!StockAPI.instance) {
      StockAPI.instance = new StockAPI()
    }
    return StockAPI.instance
  }

  // Get stock data with caching
  async getStock(symbol: string): Promise<Stock | null> {
    try {
      // Check cache first
      const cached = this.cache.get(symbol)
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return this.addRealTimeVariation(cached.data)
      }

      // Try our server-side API first (uses Polygon.io internally)
      console.log('Fetching US stock data via API for', symbol)
      try {
        const response = await fetch(`/api/stocks/${symbol}`)
        if (response.ok) {
          const stockData = await response.json()
          console.log('Successfully fetched stock data for', symbol, ':', stockData.name)
          this.cache.set(symbol, { data: stockData, timestamp: Date.now() })
          return stockData
        } else {
          console.log('API response not ok for', symbol, ':', response.status)
        }
      } catch (error) {
        console.error('Error fetching from API for', symbol, ':', error)
      }

      // Try other real APIs as fallback if enabled
      if (isRealAPIEnabled()) {
        console.log('Polygon failed, trying other APIs for', symbol)
        const realStock = await realStockAPI.getRealStock(symbol)
        if (realStock) {
          this.cache.set(symbol, { data: realStock, timestamp: Date.now() })
          return realStock
        }
      }

      // Fallback to mock data (for development)
      const stockData = MOCK_STOCKS[symbol.toUpperCase()]
      if (stockData) {
        console.log('Using mock data for', symbol)
        this.cache.set(symbol, { data: stockData, timestamp: Date.now() })
        return this.addRealTimeVariation(stockData)
      }

      return null
    } catch (error) {
      console.error('Error fetching stock data:', error)
      return null
    }
  }

  // Get multiple stocks
  async getStocks(symbols: string[]): Promise<Stock[]> {
    const promises = symbols.map(symbol => this.getStock(symbol))
    const results = await Promise.all(promises)
    return results.filter(stock => stock !== null) as Stock[]
  }

  // Search stocks by symbol, name, or partial match
  async searchStocks(query: string): Promise<Stock[]> {
    const searchTerm = query.trim()
    
    if (!searchTerm) {
      return []
    }

    console.log('🔍 Searching for stocks:', searchTerm)

    // First, try real-time API search
    if (isRealAPIEnabled()) {
      try {
        console.log('📡 Trying real-time API search...')
        const realResults = await realStockAPI.searchRealStocks(searchTerm)
        if (realResults.length > 0) {
          console.log(`✅ Found ${realResults.length} stocks via real-time API`)
          return realResults
        }
      } catch (error) {
        console.error('❌ Real-time API search error:', error)
      }
    }

    // Fallback: Enhanced mock data search with better matching
    console.log('🔄 Falling back to enhanced mock search...')
    
    const results: Stock[] = []
    const lowerQuery = searchTerm.toLowerCase()
    
    // Search through all available mock stocks
    const allMockStocks = [
      ...Object.values(MOCK_STOCKS),
      // Add more popular stocks for better coverage
      {
        symbol: 'PFE', name: 'Pfizer Inc.', price: 28.45, change: 0.23, changePercent: 0.81,
        volume: 45678900, marketCap: 161200000000, pe: 15.2, dividend: 1.64,
        sector: 'Healthcare', industry: 'Pharmaceuticals', exchange: 'NYSE' as const,
        dayHigh: 28.67, dayLow: 28.12, fiftyTwoWeekHigh: 52.75, fiftyTwoWeekLow: 25.20,
        avgVolume: 23456789, dividendYield: 5.8, beta: 0.65, eps: 1.87, lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'FORD', name: 'Ford Motor Company', price: 12.34, change: -0.15, changePercent: -1.20,
        volume: 34567890, marketCap: 49200000000, pe: 8.9, dividend: 0.60,
        sector: 'Consumer Discretionary', industry: 'Automotive', exchange: 'NYSE' as const,
        dayHigh: 12.45, dayLow: 12.20, fiftyTwoWeekHigh: 15.42, fiftyTwoWeekLow: 9.63,
        avgVolume: 45678901, dividendYield: 4.9, beta: 1.45, eps: 1.39, lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'IBM', name: 'International Business Machines Corp.', price: 165.78, change: 1.23, changePercent: 0.75,
        volume: 23456789, marketCap: 149800000000, pe: 22.1, dividend: 6.64,
        sector: 'Technology', industry: 'Information Technology', exchange: 'NYSE' as const,
        dayHigh: 166.20, dayLow: 164.50, fiftyTwoWeekHigh: 175.43, fiftyTwoWeekLow: 120.55,
        avgVolume: 34567890, dividendYield: 4.0, beta: 0.85, eps: 7.50, lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'GE', name: 'General Electric Company', price: 134.56, change: 2.34, changePercent: 1.77,
        volume: 34567890, marketCap: 147600000000, pe: 18.9, dividend: 0.32,
        sector: 'Industrials', industry: 'Industrial Conglomerates', exchange: 'NYSE' as const,
        dayHigh: 135.20, dayLow: 132.80, fiftyTwoWeekHigh: 140.25, fiftyTwoWeekLow: 60.48,
        avgVolume: 45678901, dividendYield: 0.2, beta: 1.15, eps: 7.12, lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'ZOOM', name: 'Zoom Video Communications Inc.', price: 68.90, change: -1.20, changePercent: -1.71,
        volume: 12345678, marketCap: 21000000000, pe: 45.2, dividend: 0,
        sector: 'Technology', industry: 'Software', exchange: 'NASDAQ' as const,
        dayHigh: 70.15, dayLow: 68.45, fiftyTwoWeekHigh: 89.50, fiftyTwoWeekLow: 60.00,
        avgVolume: 23456789, dividendYield: 0, beta: 1.85, eps: 1.52, lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'UBER', name: 'Uber Technologies Inc.', price: 72.34, change: 0.89, changePercent: 1.25,
        volume: 23456789, marketCap: 148000000000, pe: 0, dividend: 0,
        sector: 'Technology', industry: 'Software', exchange: 'NYSE' as const,
        dayHigh: 72.80, dayLow: 71.50, fiftyTwoWeekHigh: 78.50, fiftyTwoWeekLow: 25.58,
        avgVolume: 34567890, dividendYield: 0, beta: 1.35, eps: -0.45, lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'META', name: 'Meta Platforms Inc.', price: 485.58, change: 8.92, changePercent: 1.87,
        volume: 23456789, marketCap: 1234000000000, pe: 24.8, dividend: 0,
        sector: 'Communication Services', industry: 'Internet Content & Information', exchange: 'NASDAQ' as const,
        dayHigh: 488.20, dayLow: 480.15, fiftyTwoWeekHigh: 523.57, fiftyTwoWeekLow: 88.09,
        avgVolume: 25000000, dividendYield: 0, beta: 1.28, eps: 19.58, lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.12, change: -1.23, changePercent: -0.69,
        volume: 45678901, marketCap: 1850000000000, pe: 58.2, dividend: 0,
        sector: 'Consumer Discretionary', industry: 'Internet Retail', exchange: 'NASDAQ' as const,
        dayHigh: 180.50, dayLow: 177.20, fiftyTwoWeekHigh: 189.77, fiftyTwoWeekLow: 101.15,
        avgVolume: 50000000, dividendYield: 0, beta: 1.15, eps: 3.06, lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'JPM', name: 'JPMorgan Chase & Co.', price: 195.67, change: 1.45, changePercent: 0.75,
        volume: 12345678, marketCap: 564000000000, pe: 12.8, dividend: 4.20,
        sector: 'Financials', industry: 'Banks', exchange: 'NYSE' as const,
        dayHigh: 196.80, dayLow: 194.50, fiftyTwoWeekHigh: 200.11, fiftyTwoWeekLow: 120.78,
        avgVolume: 15000000, dividendYield: 2.1, beta: 1.12, eps: 15.28, lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'JNJ', name: 'Johnson & Johnson', price: 162.34, change: -0.56, changePercent: -0.34,
        volume: 8901234, marketCap: 392000000000, pe: 16.2, dividend: 4.76,
        sector: 'Healthcare', industry: 'Pharmaceuticals', exchange: 'NYSE' as const,
        dayHigh: 163.20, dayLow: 161.80, fiftyTwoWeekHigh: 175.43, fiftyTwoWeekLow: 144.95,
        avgVolume: 10000000, dividendYield: 2.9, beta: 0.65, eps: 10.02, lastUpdated: new Date().toISOString()
      }
    ]

    // Enhanced search logic
    for (const stock of allMockStocks) {
      const symbolMatch = stock.symbol.toLowerCase().includes(lowerQuery)
      const nameMatch = stock.name.toLowerCase().includes(lowerQuery)
      const sectorMatch = stock.sector.toLowerCase().includes(lowerQuery)
      const industryMatch = stock.industry.toLowerCase().includes(lowerQuery)
      
      // Exact symbol match gets highest priority
      if (stock.symbol.toLowerCase() === lowerQuery) {
        results.unshift(stock) // Add to beginning
        continue
      }
      
      // Symbol starts with query
      if (stock.symbol.toLowerCase().startsWith(lowerQuery)) {
        results.push(stock)
        continue
      }
      
      // Symbol contains query
      if (symbolMatch) {
        results.push(stock)
        continue
      }
      
      // Name contains query
      if (nameMatch) {
        results.push(stock)
        continue
      }
      
      // Sector or industry match
      if (sectorMatch || industryMatch) {
        results.push(stock)
        continue
      }
    }

    // Remove duplicates and limit results
    const uniqueResults = results.filter((stock, index, self) => 
      index === self.findIndex(s => s.symbol === stock.symbol)
    ).slice(0, 10)

    console.log(`✅ Found ${uniqueResults.length} stocks via enhanced mock search`)
    return uniqueResults
  }

  // Get stocks by sector
  async getStocksBySector(sector: string): Promise<Stock[]> {
    const symbols = POPULAR_STOCKS[sector as keyof typeof POPULAR_STOCKS] || []
    return this.getStocks(symbols)
  }

  // Get trending stocks
  async getTrendingStocks(): Promise<Stock[]> {
    // Use predefined trending symbols and fetch via API
    const trendingSymbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'META']
    return this.getStocks(trendingSymbols)
  }

  // Add real-time price variations (simulates live data)
  private addRealTimeVariation(stock: Stock): Stock {
    const variation = (Math.random() - 0.5) * 0.02 // ±1% variation
    const newPrice = stock.price * (1 + variation)
    const newChange = newPrice - (stock.price - stock.change)
    const newChangePercent = (newChange / (stock.price - stock.change)) * 100

    return {
      ...stock,
      price: Math.round(newPrice * 100) / 100,
      change: Math.round(newChange * 100) / 100,
      changePercent: Math.round(newChangePercent * 100) / 100,
      lastUpdated: new Date().toISOString()
    }
  }

  // Get market summary
  async getMarketSummary() {
    const majorIndices = {
      'S&P 500': { value: 4567.89, change: 12.34, changePercent: 0.27 },
      'NASDAQ': { value: 14234.56, change: 45.67, changePercent: 0.32 },
      'Dow Jones': { value: 36789.12, change: -23.45, changePercent: -0.06 }
    }

    return majorIndices
  }

  // Convert stock to watchlist item
  stockToWatchlistItem(stock: Stock): WatchlistItem {
    return {
      id: crypto.randomUUID(),
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price,
      change: stock.change,
      changePercent: stock.changePercent,
      type: 'stock',
      exchange: stock.exchange,
      sector: stock.sector,
      industry: stock.industry,
      volume: stock.volume,
      marketCap: stock.marketCap,
      addedAt: new Date()
    }
  }
}

// Export singleton instance
export const stockAPI = StockAPI.getInstance()

// Real-time data simulation
export function startRealTimeUpdates(callback: (symbol: string, data: Stock) => void) {
  const symbols = Object.keys(MOCK_STOCKS)
  
  const updateInterval = setInterval(() => {
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)]
    stockAPI.getStock(randomSymbol).then(stock => {
      if (stock) {
        callback(randomSymbol, stock)
      }
    })
  }, 3000) // Update every 3 seconds

  return () => clearInterval(updateInterval)
}