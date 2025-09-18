// Real-time stock updates service
import { Stock } from '@/types'

export interface StockUpdate {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: string
}

export interface Subscription {
  symbols: string[]
  callback: (updates: StockUpdate[]) => void
  interval: number
}

class RealTimeUpdatesService {
  private subscriptions = new Map<string, Subscription>()
  private intervals = new Map<string, NodeJS.Timeout>()
  private isMarketOpen = false
  private lastMarketCheck = 0
  private marketCheckInterval = 60000 // Check market status every minute

  constructor() {
    this.checkMarketStatus()
    
    // Set up periodic market status checks
    setInterval(() => {
      this.checkMarketStatus()
    }, this.marketCheckInterval)
  }

  /**
   * Check if the market is currently open
   */
  private checkMarketStatus(): void {
    const now = new Date()
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
    const day = easternTime.getDay() // 0 = Sunday, 6 = Saturday
    const hour = easternTime.getHours()
    const minute = easternTime.getMinutes()
    const timeInMinutes = hour * 60 + minute
    
    // Market is open Monday-Friday, 9:30 AM - 4:00 PM ET
    const marketOpen = 9 * 60 + 30 // 9:30 AM
    const marketClose = 16 * 60 // 4:00 PM
    
    const wasOpen = this.isMarketOpen
    this.isMarketOpen = day >= 1 && day <= 5 && timeInMinutes >= marketOpen && timeInMinutes < marketClose
    this.lastMarketCheck = Date.now()
    
    // If market status changed, update all subscriptions
    if (wasOpen !== this.isMarketOpen) {
      console.log(`📊 Market status changed: ${this.isMarketOpen ? 'OPEN' : 'CLOSED'}`)
      this.updateAllSubscriptions()
    }
  }

  /**
   * Subscribe to real-time updates for a set of symbols
   */
  subscribe(
    subscriptionId: string,
    symbols: string[],
    callback: (updates: StockUpdate[]) => void,
    interval: number = 30000 // Default 30 seconds
  ): void {
    // Store subscription
    this.subscriptions.set(subscriptionId, {
      symbols: [...symbols],
      callback,
      interval
    })

    // Start polling if market is open
    if (this.isMarketOpen) {
      this.startPolling(subscriptionId)
    }

    console.log(`📡 Subscribed to real-time updates: ${subscriptionId} (${symbols.length} symbols)`)
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe(subscriptionId: string): void {
    this.stopPolling(subscriptionId)
    this.subscriptions.delete(subscriptionId)
    console.log(`📡 Unsubscribed from real-time updates: ${subscriptionId}`)
  }

  /**
   * Update symbols for an existing subscription
   */
  updateSymbols(subscriptionId: string, symbols: string[]): void {
    const subscription = this.subscriptions.get(subscriptionId)
    if (subscription) {
      subscription.symbols = [...symbols]
      
      // Restart polling with new symbols if market is open
      if (this.isMarketOpen) {
        this.stopPolling(subscriptionId)
        this.startPolling(subscriptionId)
      }

      console.log(`📡 Updated symbols for subscription: ${subscriptionId} (${symbols.length} symbols)`)
    }
  }

  /**
   * Start polling for a subscription
   */
  private startPolling(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) return

    // Stop any existing polling
    this.stopPolling(subscriptionId)

    // Start new polling interval
    const intervalId = setInterval(async () => {
      try {
        await this.fetchUpdates(subscriptionId)
      } catch (error) {
        console.error(`Failed to fetch updates for ${subscriptionId}:`, error)
      }
    }, subscription.interval)

    this.intervals.set(subscriptionId, intervalId)

    // Fetch initial data immediately
    this.fetchUpdates(subscriptionId)

    console.log(`⏰ Started polling for ${subscriptionId} every ${subscription.interval}ms`)
  }

  /**
   * Stop polling for a subscription
   */
  private stopPolling(subscriptionId: string): void {
    const interval = this.intervals.get(subscriptionId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(subscriptionId)
      console.log(`⏹️ Stopped polling for ${subscriptionId}`)
    }
  }

  /**
   * Fetch updates for a subscription
   */
  private async fetchUpdates(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription || subscription.symbols.length === 0) return

    try {
      // Batch symbols into smaller groups to avoid overwhelming the API
      const batchSize = 10
      const updates: StockUpdate[] = []

      for (let i = 0; i < subscription.symbols.length; i += batchSize) {
        const batch = subscription.symbols.slice(i, i + batchSize)
        
        // Add small delay between batches
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        const batchUpdates = await this.fetchBatchUpdates(batch)
        updates.push(...batchUpdates)
      }

      // Call subscription callback with updates
      if (updates.length > 0) {
        subscription.callback(updates)
        console.log(`📈 Delivered ${updates.length} real-time updates to ${subscriptionId}`)
      }

    } catch (error) {
      console.error(`Error fetching updates for ${subscriptionId}:`, error)
    }
  }

  /**
   * Fetch updates for a batch of symbols
   */
  private async fetchBatchUpdates(symbols: string[]): Promise<StockUpdate[]> {
    const updates: StockUpdate[] = []

    // Use Yahoo Finance API as fallback for real-time data
    const { YahooFinanceAPI } = await import('./yahoo-finance-api')
    const yahooFinanceService = new YahooFinanceAPI()

    for (const symbol of symbols) {
      try {
        const stockData = await yahooFinanceService.getStockData(symbol)
        
        if (stockData) {
          updates.push({
            symbol: stockData.symbol,
            price: stockData.price,
            change: stockData.change,
            changePercent: stockData.changePercent,
            volume: stockData.volume,
            timestamp: new Date().toISOString()
          })
        }
      } catch (error) {
        // Silently skip failed symbols to avoid disrupting the batch
        console.warn(`Failed to fetch real-time data for ${symbol}:`, error)
      }
    }

    return updates
  }

  /**
   * Update all subscriptions based on market status
   */
  private updateAllSubscriptions(): void {
    if (this.isMarketOpen) {
      // Market opened - start all subscriptions
      Array.from(this.subscriptions.keys()).forEach(subscriptionId => {
        this.startPolling(subscriptionId)
      })
    } else {
      // Market closed - stop all subscriptions
      Array.from(this.subscriptions.keys()).forEach(subscriptionId => {
        this.stopPolling(subscriptionId)
      })
    }
  }

  /**
   * Get current market status
   */
  getMarketStatus(): { isOpen: boolean; lastCheck: number } {
    return {
      isOpen: this.isMarketOpen,
      lastCheck: this.lastMarketCheck
    }
  }

  /**
   * Get subscription info
   */
  getSubscriptionInfo(): {
    count: number
    subscriptions: Array<{
      id: string
      symbolCount: number
      interval: number
      isPolling: boolean
    }>
  } {
    return {
      count: this.subscriptions.size,
      subscriptions: Array.from(this.subscriptions.entries()).map(([id, sub]) => ({
        id,
        symbolCount: sub.symbols.length,
        interval: sub.interval,
        isPolling: this.intervals.has(id)
      }))
    }
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    // Clear all intervals
    Array.from(this.intervals.values()).forEach(interval => {
      clearInterval(interval)
    })
    
    // Clear all maps
    this.subscriptions.clear()
    this.intervals.clear()
    
    console.log('🧹 Real-time updates service cleaned up')
  }
}

// Create singleton instance
export const realTimeUpdatesService = new RealTimeUpdatesService()

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    realTimeUpdatesService.cleanup()
  })
}
