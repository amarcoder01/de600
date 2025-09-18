// Mock Polygon API service for testing when real API key is not available
export interface MockStockData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  exchange: string
  sector: string
  industry: string
}

// Sample stock data for testing
const MOCK_STOCKS: MockStockData[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 185.25,
    change: 2.15,
    changePercent: 1.17,
    volume: 45234567,
    marketCap: 2850000000000,
    exchange: 'NASDAQ',
    sector: 'Technology',
    industry: 'Consumer Electronics'
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 378.90,
    change: -1.25,
    changePercent: -0.33,
    volume: 23456789,
    marketCap: 2820000000000,
    exchange: 'NASDAQ',
    sector: 'Technology',
    industry: 'Software'
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 142.50,
    change: 0.85,
    changePercent: 0.60,
    volume: 18765432,
    marketCap: 1780000000000,
    exchange: 'NASDAQ',
    sector: 'Technology',
    industry: 'Internet Services'
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    price: 248.75,
    change: 5.20,
    changePercent: 2.13,
    volume: 67890123,
    marketCap: 790000000000,
    exchange: 'NASDAQ',
    sector: 'Consumer Cyclical',
    industry: 'Auto Manufacturers'
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 875.30,
    change: 12.45,
    changePercent: 1.44,
    volume: 34567890,
    marketCap: 2150000000000,
    exchange: 'NASDAQ',
    sector: 'Technology',
    industry: 'Semiconductors'
  }
]

export class MockPolygonAPI {
  static async searchStocks(query: string): Promise<MockStockData[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const searchTerm = query.toLowerCase()
    return MOCK_STOCKS.filter(stock => 
      stock.symbol.toLowerCase().includes(searchTerm) ||
      stock.name.toLowerCase().includes(searchTerm)
    )
  }
  
  static async getStockData(symbol: string): Promise<MockStockData | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    return MOCK_STOCKS.find(stock => 
      stock.symbol.toLowerCase() === symbol.toLowerCase()
    ) || null
  }
  
  static async getMultipleStocks(symbols: string[]): Promise<MockStockData[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400))
    
    return MOCK_STOCKS.filter(stock => 
      symbols.some(symbol => 
        symbol.toLowerCase() === stock.symbol.toLowerCase()
      )
    )
  }
  
  // Generate random price updates for real-time simulation
  static generatePriceUpdate(stock: MockStockData): MockStockData {
    const changePercent = (Math.random() - 0.5) * 0.02 // ±1% change
    const newPrice = stock.price * (1 + changePercent)
    const change = newPrice - stock.price
    
    return {
      ...stock,
      price: Math.round(newPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 10000) / 100
    }
  }
}

// Check if we should use mock data
export const shouldUseMockData = () => {
  const apiKey = process.env.POLYGON_API_KEY || process.env.NEXT_PUBLIC_POLYGON_API_KEY
  return !apiKey || apiKey === 'your_polygon_api_key_here' || apiKey === '911d34d8-24ac-48a4-85dc-a0c3d9237826'
}