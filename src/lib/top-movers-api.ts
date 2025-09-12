import { StockData, MarketStatus } from '@/types/top-movers'
import { getMarketStatus, formatMarketStatusMessage, getUserTimezone, type MarketStatusInfo } from './market-status-utils'

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

  static isMarketOpen(marketStatus: MarketStatus | null, userTimezone?: string, userPreferences?: { timezone?: string }): boolean {
    if (!marketStatus) return false
    
    // If API says market is open, trust it (handles all trading sessions)
    if (marketStatus.market === 'open') {
      console.log('✅ API reports market is open')
      return true
    }
    
    // Use timezone-aware market status calculation
    const marketStatusInfo = getMarketStatus(userTimezone, userPreferences)
    console.log('🕐 Market status check:', {
      marketStatus: marketStatus.market,
      calculatedStatus: marketStatusInfo.status,
      isOpen: marketStatusInfo.isOpen,
      userTimezone: marketStatusInfo.timezoneInfo.userTimezone,
      currentTimeLocal: marketStatusInfo.currentTimeLocal,
      currentTimeET: marketStatusInfo.currentTimeET
    })
    
    return marketStatusInfo.isOpen
  }

  static formatMarketStatusMessage(marketStatus: MarketStatus | null, userTimezone?: string, userPreferences?: { timezone?: string }): string {
    if (!marketStatus) return 'Loading market status...'
    
    // Use timezone-aware market status calculation
    const marketStatusInfo = getMarketStatus(userTimezone, userPreferences)
    return formatMarketStatusMessage(marketStatusInfo)
  }
}
