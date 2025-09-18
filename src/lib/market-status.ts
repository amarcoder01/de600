import { polygonAPI } from './polygon-api'

export interface MarketStatus {
  isOpen: boolean
  isPreMarket: boolean
  isPostMarket: boolean
  isExtendedHours: boolean
  nextOpen: string | null
  nextClose: string | null
  currentTime: string
  marketTime: string
  status: 'open' | 'closed' | 'pre-market' | 'post-market'
  lastUpdated: string
}

export interface MarketHours {
  preMarketStart: string // 4:00 AM ET
  marketOpen: string     // 9:30 AM ET
  marketClose: string    // 4:00 PM ET
  postMarketEnd: string  // 8:00 PM ET
}

export class MarketStatusService {
  private static instance: MarketStatusService
  private static cache: { status: MarketStatus; timestamp: number } | null = null
  private static readonly CACHE_DURATION = 60000 // 1 minute cache for market status

  static getInstance(): MarketStatusService {
    if (!MarketStatusService.instance) {
      MarketStatusService.instance = new MarketStatusService()
    }
    return MarketStatusService.instance
  }

  // Market holidays for 2024-2025 (US stock market)
  private readonly marketHolidays = [
    '2024-01-01', // New Year's Day
    '2024-01-15', // Martin Luther King Jr. Day
    '2024-02-19', // Presidents Day
    '2024-03-29', // Good Friday
    '2024-05-27', // Memorial Day
    '2024-06-19', // Juneteenth
    '2024-07-04', // Independence Day
    '2024-09-02', // Labor Day
    '2024-11-28', // Thanksgiving
    '2024-11-29', // Day after Thanksgiving (early close)
    '2024-12-25', // Christmas Day
    '2025-01-01', // New Year's Day
    '2025-01-20', // Martin Luther King Jr. Day
    '2025-02-17', // Presidents Day
    '2025-04-18', // Good Friday
    '2025-05-26', // Memorial Day
    '2025-06-19', // Juneteenth
    '2025-07-04', // Independence Day
    '2025-09-01', // Labor Day
    '2025-11-27', // Thanksgiving
    '2025-11-28', // Day after Thanksgiving (early close)
    '2025-12-25', // Christmas Day
  ]

  // Early close days (1:00 PM ET close)
  private readonly earlyCloseDays = [
    '2024-07-03', // Day before Independence Day
    '2024-11-29', // Day after Thanksgiving
    '2024-12-24', // Christmas Eve
    '2025-07-03', // Day before Independence Day
    '2025-11-28', // Day after Thanksgiving
    '2025-12-24', // Christmas Eve
  ]

  /**
   * Get current market status with timezone-aware calculations
   */
  async getMarketStatus(): Promise<MarketStatus> {
    try {
      // Check cache first
      if (MarketStatusService.cache && 
          Date.now() - MarketStatusService.cache.timestamp < MarketStatusService.CACHE_DURATION) {
        return MarketStatusService.cache.status
      }

      // Try to get status from Polygon API first
      let marketStatus: MarketStatus
      try {
        const polygonStatus = await this.getPolygonMarketStatus()
        if (polygonStatus) {
          marketStatus = polygonStatus
        } else {
          marketStatus = this.calculateMarketStatus()
        }
      } catch (error) {
        console.warn('Polygon market status failed, using local calculation:', error)
        marketStatus = this.calculateMarketStatus()
      }

      // Cache the result
      MarketStatusService.cache = {
        status: marketStatus,
        timestamp: Date.now()
      }

      return marketStatus
    } catch (error) {
      console.error('Error getting market status:', error)
      // Return safe fallback
      return this.getSafeMarketStatus()
    }
  }

  /**
   * Get market status from Polygon API
   */
  private async getPolygonMarketStatus(): Promise<MarketStatus | null> {
    try {
      const polygonService = polygonAPI
      const status = await polygonService.getMarketStatus()
      
      if (status) {
        const now = new Date()
        const marketTime = this.getMarketTime()
        
        return {
          isOpen: status.isOpen,
          isPreMarket: this.isPreMarketHours(marketTime),
          isPostMarket: this.isPostMarketHours(marketTime),
          isExtendedHours: this.isExtendedHours(marketTime),
          nextOpen: status.nextOpen || null,
          nextClose: status.nextClose || null,
          currentTime: now.toISOString(),
          marketTime: marketTime.toISOString(),
          status: this.determineMarketStatus(status.isOpen, marketTime),
          lastUpdated: now.toISOString()
        }
      }
      
      return null
    } catch (error) {
      console.warn('Failed to get Polygon market status:', error)
      return null
    }
  }

  /**
   * Calculate market status using local logic with proper timezone handling
   */
  private calculateMarketStatus(): MarketStatus {
    const now = new Date()
    const marketTime = this.getMarketTime()
    const marketDate = this.formatDate(marketTime)
    
    const isHoliday = this.isMarketHoliday(marketDate)
    const isWeekend = this.isWeekend(marketTime)
    const isEarlyClose = this.isEarlyCloseDay(marketDate)
    
    const marketHours = this.getMarketHours(marketTime, isEarlyClose)
    
    let isOpen = false
    let isPreMarket = false
    let isPostMarket = false
    let status: MarketStatus['status'] = 'closed'
    
    if (!isHoliday && !isWeekend) {
      const currentMinutes = marketTime.getHours() * 60 + marketTime.getMinutes()
      const preMarketStart = this.parseTime(marketHours.preMarketStart)
      const marketOpen = this.parseTime(marketHours.marketOpen)
      const marketClose = this.parseTime(marketHours.marketClose)
      const postMarketEnd = this.parseTime(marketHours.postMarketEnd)
      
      if (currentMinutes >= preMarketStart && currentMinutes < marketOpen) {
        isPreMarket = true
        status = 'pre-market'
      } else if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
        isOpen = true
        status = 'open'
      } else if (currentMinutes >= marketClose && currentMinutes < postMarketEnd) {
        isPostMarket = true
        status = 'post-market'
      } else {
        status = 'closed'
      }
    }
    
    const nextOpen = this.calculateNextOpen(marketTime, isHoliday, isWeekend)
    const nextClose = this.calculateNextClose(marketTime, isOpen, isEarlyClose)
    
    return {
      isOpen,
      isPreMarket,
      isPostMarket,
      isExtendedHours: isPreMarket || isPostMarket,
      nextOpen: nextOpen?.toISOString() || null,
      nextClose: nextClose?.toISOString() || null,
      currentTime: now.toISOString(),
      marketTime: marketTime.toISOString(),
      status,
      lastUpdated: now.toISOString()
    }
  }

  /**
   * Get current time in Eastern Time (market timezone)
   */
  private getMarketTime(): Date {
    const now = new Date()
    // Convert to Eastern Time
    return new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
  }

  /**
   * Get market hours for a given date
   */
  private getMarketHours(date: Date, isEarlyClose: boolean = false): MarketHours {
    return {
      preMarketStart: '04:00', // 4:00 AM ET
      marketOpen: '09:30',     // 9:30 AM ET
      marketClose: isEarlyClose ? '13:00' : '16:00', // 1:00 PM ET or 4:00 PM ET
      postMarketEnd: '20:00'   // 8:00 PM ET
    }
  }

  /**
   * Parse time string to minutes since midnight
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  /**
   * Check if current time is in pre-market hours
   */
  private isPreMarketHours(marketTime: Date): boolean {
    const minutes = marketTime.getHours() * 60 + marketTime.getMinutes()
    const preMarketStart = this.parseTime('04:00')
    const marketOpen = this.parseTime('09:30')
    
    return !this.isWeekend(marketTime) && 
           !this.isMarketHoliday(this.formatDate(marketTime)) &&
           minutes >= preMarketStart && minutes < marketOpen
  }

  /**
   * Check if current time is in post-market hours
   */
  private isPostMarketHours(marketTime: Date): boolean {
    const minutes = marketTime.getHours() * 60 + marketTime.getMinutes()
    const marketClose = this.parseTime('16:00')
    const postMarketEnd = this.parseTime('20:00')
    
    return !this.isWeekend(marketTime) && 
           !this.isMarketHoliday(this.formatDate(marketTime)) &&
           minutes >= marketClose && minutes < postMarketEnd
  }

  /**
   * Check if current time is in extended hours (pre or post market)
   */
  private isExtendedHours(marketTime: Date): boolean {
    return this.isPreMarketHours(marketTime) || this.isPostMarketHours(marketTime)
  }

  /**
   * Determine market status string
   */
  private determineMarketStatus(isOpen: boolean, marketTime: Date): MarketStatus['status'] {
    if (isOpen) return 'open'
    if (this.isPreMarketHours(marketTime)) return 'pre-market'
    if (this.isPostMarketHours(marketTime)) return 'post-market'
    return 'closed'
  }

  /**
   * Check if date is a weekend
   */
  private isWeekend(date: Date): boolean {
    const day = date.getDay()
    return day === 0 || day === 6 // Sunday or Saturday
  }

  /**
   * Check if date is a market holiday
   */
  private isMarketHoliday(dateStr: string): boolean {
    return this.marketHolidays.includes(dateStr)
  }

  /**
   * Check if date is an early close day
   */
  private isEarlyCloseDay(dateStr: string): boolean {
    return this.earlyCloseDays.includes(dateStr)
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  /**
   * Calculate next market open time
   */
  private calculateNextOpen(currentTime: Date, isHoliday: boolean, isWeekend: boolean): Date | null {
    const nextOpen = new Date(currentTime)
    
    // If it's weekend or holiday, find next business day
    if (isWeekend || isHoliday) {
      do {
        nextOpen.setDate(nextOpen.getDate() + 1)
      } while (this.isWeekend(nextOpen) || this.isMarketHoliday(this.formatDate(nextOpen)))
    }
    
    // Set to 9:30 AM ET
    nextOpen.setHours(9, 30, 0, 0)
    
    // If we're past market open today and it's a trading day, move to next trading day
    if (currentTime.getHours() >= 9 && (currentTime.getHours() > 9 || currentTime.getMinutes() >= 30)) {
      if (!isWeekend && !isHoliday) {
        nextOpen.setDate(nextOpen.getDate() + 1)
        // Find next trading day
        while (this.isWeekend(nextOpen) || this.isMarketHoliday(this.formatDate(nextOpen))) {
          nextOpen.setDate(nextOpen.getDate() + 1)
        }
      }
    }
    
    return nextOpen
  }

  /**
   * Calculate next market close time
   */
  private calculateNextClose(currentTime: Date, isOpen: boolean, isEarlyClose: boolean): Date | null {
    if (!isOpen) return null
    
    const nextClose = new Date(currentTime)
    nextClose.setHours(isEarlyClose ? 13 : 16, 0, 0, 0) // 1:00 PM or 4:00 PM ET
    
    return nextClose
  }

  /**
   * Get safe fallback market status when all else fails
   */
  private getSafeMarketStatus(): MarketStatus {
    const now = new Date()
    const marketTime = this.getMarketTime()
    
    return {
      isOpen: false,
      isPreMarket: false,
      isPostMarket: false,
      isExtendedHours: false,
      nextOpen: null,
      nextClose: null,
      currentTime: now.toISOString(),
      marketTime: marketTime.toISOString(),
      status: 'closed',
      lastUpdated: now.toISOString()
    }
  }

  /**
   * Get appropriate cache duration based on market status
   */
  getCacheDuration(marketStatus: MarketStatus): number {
    if (marketStatus.isOpen) {
      return 30000 // 30 seconds during market hours
    } else if (marketStatus.isExtendedHours) {
      return 60000 // 1 minute during extended hours
    } else {
      return 300000 // 5 minutes when market is closed
    }
  }

  /**
   * Check if data should be considered fresh based on market status
   */
  isDataFresh(timestamp: Date, marketStatus: MarketStatus): boolean {
    const now = new Date()
    const dataAge = now.getTime() - timestamp.getTime()
    
    let maxAge: number
    if (marketStatus.isOpen) {
      maxAge = 2 * 60 * 1000 // 2 minutes during market hours
    } else if (marketStatus.isExtendedHours) {
      maxAge = 5 * 60 * 1000 // 5 minutes during extended hours
    } else {
      maxAge = 30 * 60 * 1000 // 30 minutes when market is closed
    }
    
    return dataAge < maxAge
  }

  /**
   * Get the current trading date (accounts for market timezone and holidays)
   */
  getCurrentTradingDate(): string {
    const marketTime = this.getMarketTime()
    let tradingDate = new Date(marketTime)
    
    // If it's before 4 AM ET, use previous day
    if (marketTime.getHours() < 4) {
      tradingDate.setDate(tradingDate.getDate() - 1)
    }
    
    // Find the most recent trading day
    while (this.isWeekend(tradingDate) || this.isMarketHoliday(this.formatDate(tradingDate))) {
      tradingDate.setDate(tradingDate.getDate() - 1)
    }
    
    return this.formatDate(tradingDate)
  }

  /**
   * Get the previous trading date
   */
  getPreviousTradingDate(daysBack: number = 1): string {
    const marketTime = this.getMarketTime()
    let tradingDate = new Date(marketTime)
    
    // If it's before 4 AM ET, use previous day as starting point
    if (marketTime.getHours() < 4) {
      tradingDate.setDate(tradingDate.getDate() - 1)
    }
    
    let tradingDaysBack = 0
    
    while (tradingDaysBack < daysBack) {
      tradingDate.setDate(tradingDate.getDate() - 1)
      
      // Skip weekends and holidays
      if (!this.isWeekend(tradingDate) && !this.isMarketHoliday(this.formatDate(tradingDate))) {
        tradingDaysBack++
      }
    }
    
    return this.formatDate(tradingDate)
  }
}

// Export singleton instance
export const marketStatusService = MarketStatusService.getInstance()
