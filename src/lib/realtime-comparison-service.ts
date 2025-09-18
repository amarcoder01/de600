import { RealTimePriceService } from './real-time-price-service'
import { PolygonStockAPI } from './polygon-api'

export interface StockUpdate {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume?: number
  timestamp: number
  isUpdating?: boolean
}

export interface CachedStockData {
  data: StockUpdate
  lastUpdated: number
  expiresAt: number
}

export interface ComparisonSubscriber {
  onUpdate: (symbol: string, data: StockUpdate) => void
  onConnectionChange?: (connected: boolean) => void
  onError?: (error: Error) => void
}

class RealTimeComparisonService {
  private static instance: RealTimeComparisonService
  private realTimePriceService: RealTimePriceService
  private polygonAPI: PolygonStockAPI
  private subscribers: Set<ComparisonSubscriber> = new Set()
  private subscribedSymbols: Set<string> = new Set()
  private cache: Map<string, CachedStockData> = new Map()
  private updateInterval: NodeJS.Timeout | null = null
  private isConnected = false
  private lastUpdateTime = 0
  
  // Cache configuration
  private readonly CACHE_DURATION = 5000 // 5 seconds
  private readonly UPDATE_INTERVAL = 3000 // 3 seconds
  private readonly MAX_CACHE_SIZE = 100
  private readonly BATCH_SIZE = 10
  
  private constructor() {
    this.realTimePriceService = new RealTimePriceService()
    this.polygonAPI = new PolygonStockAPI()
    this.setupPolygonWebSocket()
  }

  static getInstance(): RealTimeComparisonService {
    if (!RealTimeComparisonService.instance) {
      RealTimeComparisonService.instance = new RealTimeComparisonService()
    }
    return RealTimeComparisonService.instance
  }

  private setupPolygonWebSocket() {
    try {
      // Initialize Polygon API connection
      console.log('Setting up Polygon API connection...')
      this.isConnected = true
      this.notifyConnectionChange(true)
    } catch (error) {
      console.warn('Failed to setup Polygon API connection:', error)
      this.isConnected = false
      this.notifyConnectionChange(false)
    }
  }

  private handlePolygonMessage(event: any) {
    try {
      if (event.data && Array.isArray(event.data)) {
        event.data.forEach((message: any) => {
          if (message.ev === 'T' || message.ev === 'A') { // Trade or Aggregate
            const symbol = message.sym || message.T
            if (symbol && this.subscribedSymbols.has(symbol)) {
              const price = message.p || message.c
              const volume = message.v || message.V
              
              if (price) {
                this.updateStockData(symbol, {
                  symbol,
                  price,
                  change: 0, // Will be calculated
                  changePercent: 0, // Will be calculated
                  volume,
                  timestamp: Date.now(),
                  isUpdating: true
                })
              }
            }
          }
        })
      }
    } catch (error) {
      console.error('Error handling Polygon message:', error)
    }
  }

  subscribe(subscriber: ComparisonSubscriber): () => void {
    this.subscribers.add(subscriber)
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(subscriber)
      if (this.subscribers.size === 0) {
        this.stopUpdates()
      }
    }
  }

  addSymbols(symbols: string[]) {
    const newSymbols = symbols.filter(symbol => !this.subscribedSymbols.has(symbol))
    
    if (newSymbols.length > 0) {
      newSymbols.forEach(symbol => this.subscribedSymbols.add(symbol))
      
      // Fetch initial data for new symbols
      this.fetchInitialData(newSymbols)
      
      // Start updates if not already running
      if (!this.updateInterval && this.subscribers.size > 0) {
        this.startUpdates()
      }
    }
  }

  removeSymbols(symbols: string[]) {
    symbols.forEach(symbol => {
      this.subscribedSymbols.delete(symbol)
      this.cache.delete(symbol)
    })
    
    // Stop updates if no symbols left
    if (this.subscribedSymbols.size === 0) {
      this.stopUpdates()
    }
  }

  private async fetchInitialData(symbols: string[]) {
    try {
      // Batch fetch to avoid overwhelming the API
      const batches = this.createBatches(symbols, this.BATCH_SIZE)
      
      for (const batch of batches) {
        const promises = batch.map(symbol => this.fetchSingleStock(symbol))
        await Promise.allSettled(promises)
        
        // Small delay between batches to respect rate limits
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    } catch (error) {
      console.error('Error fetching initial data:', error)
    }
  }

  private async fetchSingleStock(symbol: string) {
    try {
      // Check cache first
      const cached = this.getCachedData(symbol)
      if (cached && !this.isCacheExpired(cached)) {
        this.notifySubscribers(symbol, cached.data)
        return
      }

      // Fetch from real-time service
      const data = await RealTimePriceService.getRealTimePrice(symbol)
      
      if (data) {
        const stockUpdate: StockUpdate = {
          symbol: data.symbol,
          price: data.price,
          change: data.change || 0,
          changePercent: data.changePercent || 0,
          volume: data.volume,
          timestamp: Date.now(),
          isUpdating: false
        }
        
        this.updateStockData(symbol, stockUpdate)
      }
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error)
    }
  }

  private updateStockData(symbol: string, data: StockUpdate) {
    // Calculate change if not provided
    const cached = this.getCachedData(symbol)
    if (cached && !data.change) {
      data.change = data.price - cached.data.price
      data.changePercent = ((data.change / cached.data.price) * 100)
    }
    
    // Update cache
    this.setCachedData(symbol, data)
    
    // Notify subscribers
    this.notifySubscribers(symbol, data)
    
    this.lastUpdateTime = Date.now()
  }

  private getCachedData(symbol: string): CachedStockData | null {
    return this.cache.get(symbol) || null
  }

  private setCachedData(symbol: string, data: StockUpdate) {
    // Implement LRU cache behavior
    if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(symbol)) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }
    
    const cachedData: CachedStockData = {
      data,
      lastUpdated: Date.now(),
      expiresAt: Date.now() + this.CACHE_DURATION
    }
    
    this.cache.set(symbol, cachedData)
  }

  private isCacheExpired(cached: CachedStockData): boolean {
    return Date.now() > cached.expiresAt
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize))
    }
    return batches
  }

  private startUpdates() {
    if (this.updateInterval) return
    
    this.updateInterval = setInterval(() => {
      this.refreshAllSymbols()
    }, this.UPDATE_INTERVAL)
  }

  private stopUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  private async refreshAllSymbols() {
    if (this.subscribedSymbols.size === 0) return
    
    const symbols = Array.from(this.subscribedSymbols)
    const batches = this.createBatches(symbols, this.BATCH_SIZE)
    
    for (const batch of batches) {
      const promises = batch.map(symbol => this.fetchSingleStock(symbol))
      await Promise.allSettled(promises)
    }
  }

  async refreshSymbol(symbol: string) {
    if (this.subscribedSymbols.has(symbol)) {
      await this.fetchSingleStock(symbol)
    }
  }

  async refreshAll() {
    await this.refreshAllSymbols()
  }

  getLatestData(symbol: string): StockUpdate | null {
    const cached = this.getCachedData(symbol)
    return cached ? cached.data : null
  }

  getConnectionStatus(): boolean {
    return this.isConnected
  }

  getLastUpdateTime(): number {
    return this.lastUpdateTime
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      subscribedSymbols: this.subscribedSymbols.size,
      subscribers: this.subscribers.size
    }
  }

  private notifySubscribers(symbol: string, data: StockUpdate) {
    this.subscribers.forEach(subscriber => {
      try {
        subscriber.onUpdate(symbol, data)
      } catch (error) {
        console.error('Error notifying subscriber:', error)
      }
    })
  }

  private notifyConnectionChange(connected: boolean) {
    this.subscribers.forEach(subscriber => {
      try {
        subscriber.onConnectionChange?.(connected)
      } catch (error) {
        console.error('Error notifying connection change:', error)
      }
    })
  }

  private notifyError(error: Error) {
    this.subscribers.forEach(subscriber => {
      try {
        subscriber.onError?.(error)
      } catch (error) {
        console.error('Error notifying error:', error)
      }
    })
  }

  // Cleanup method
  destroy() {
    this.stopUpdates()
    this.subscribers.clear()
    this.subscribedSymbols.clear()
    this.cache.clear()
  }
}

export default RealTimeComparisonService
export { RealTimeComparisonService }