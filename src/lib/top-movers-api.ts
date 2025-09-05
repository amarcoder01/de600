import { StockData, MarketStatus } from '@/types/top-movers'

const API_BASE_URL = '/api/market'

export class TopMoversApiService {
  static async getTopGainers(): Promise<{ status: string; results: StockData[]; count?: number }> {
    const response = await fetch(`${API_BASE_URL}/top-movers?type=gainers`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch top gainers: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Handle empty results gracefully
    if (!data.results || data.results.length === 0) {
      console.log('No gainers data available')
      return { status: 'OK', results: [], count: 0 }
    }
    
    return data
  }

  static async getTopLosers(): Promise<{ status: string; results: StockData[]; count?: number }> {
    const response = await fetch(`${API_BASE_URL}/top-movers?type=losers`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch top losers: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Handle empty results gracefully
    if (!data.results || data.results.length === 0) {
      console.log('No losers data available')
      return { status: 'OK', results: [], count: 0 }
    }
    
    return data
  }

  static async getMarketStatus(): Promise<MarketStatus> {
    const response = await fetch(`${API_BASE_URL}/status`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch market status: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  }

  static isMarketOpen(marketStatus: MarketStatus | null): boolean {
    if (!marketStatus) return false
    // Only treat as OPEN during regular trading session (9:30–16:00 ET)
    const now = new Date()
    const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const minutes = et.getHours() * 60 + et.getMinutes()
    const regularOpen = 9 * 60 + 30
    const regularClose = 16 * 60
    const inRegular = minutes >= regularOpen && minutes < regularClose
    return marketStatus.market === 'open' && inRegular
  }

  static formatMarketStatusMessage(marketStatus: MarketStatus | null): string {
    if (!marketStatus) return 'Loading market status...'
    
    if (this.isMarketOpen(marketStatus)) {
      return 'Market Open – Showing Real-Time Data'
    } else {
      return 'Market Closed – Showing Last Close Data'
    }
  }
}
