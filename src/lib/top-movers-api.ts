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
    
    // If API says market is open, trust it (handles all trading sessions)
    if (marketStatus.market === 'open') {
      console.log('✅ API reports market is open')
      return true
    }
    
    // Fallback: check if we're in any trading hours
    const now = new Date()
    const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const day = et.getDay()
    const minutes = et.getHours() * 60 + et.getMinutes()
    
    console.log('🕐 Market status check:', {
      currentTime: et.toLocaleString(),
      dayOfWeek: day,
      minutes: minutes,
      marketStatus: marketStatus.market
    })
    
    // Market is closed on weekends
    if (day === 0 || day === 6) {
      console.log('📅 Weekend - market closed')
      return false
    }
    
    // Extended trading hours: 4:00 AM - 8:00 PM ET (Monday-Friday)
    const preMarketOpen = 4 * 60      // 4:00 AM
    const afterHoursClose = 20 * 60   // 8:00 PM
    
    const isInTradingHours = minutes >= preMarketOpen && minutes < afterHoursClose
    console.log('⏰ Trading hours check:', {
      preMarketOpen: preMarketOpen,
      afterHoursClose: afterHoursClose,
      isInTradingHours: isInTradingHours
    })
    
    return isInTradingHours
  }

  static formatMarketStatusMessage(marketStatus: MarketStatus | null): string {
    if (!marketStatus) return 'Loading market status...'
    
    if (this.isMarketOpen(marketStatus)) {
      // Determine which trading session we're in
      const now = new Date()
      const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const minutes = et.getHours() * 60 + et.getMinutes()
      
      const preMarketOpen = 4 * 60      // 4:00 AM
      const regularOpen = 9 * 60 + 30   // 9:30 AM
      const regularClose = 16 * 60      // 4:00 PM
      const afterHoursClose = 20 * 60   // 8:00 PM
      
      if (minutes >= regularOpen && minutes < regularClose) {
        return 'Market Open – Regular Trading Hours'
      } else if (minutes >= preMarketOpen && minutes < regularOpen) {
        return 'Market Open – Pre-Market Trading'
      } else if (minutes >= regularClose && minutes < afterHoursClose) {
        return 'Market Open – After-Hours Trading'
      } else {
        return 'Market Open – Extended Hours'
      }
    } else {
      return 'Market Closed – Showing Last Close Data'
    }
  }
}
