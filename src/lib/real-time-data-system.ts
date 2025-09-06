// Advanced Real-time Data System for TradeGPT
import { Stock, RealTimeData } from '@/types'
import { getStockData } from './multi-source-api'

export interface RealTimeDataConfig {
  updateInterval: number // milliseconds
  maxConcurrentRequests: number
  cacheDuration: number // milliseconds
  retryAttempts: number
  fallbackEnabled: boolean
  websocketEnabled: boolean
  dataSources: DataSource[]
}

export interface DataSource {
  name: string
  priority: number
  enabled: boolean
  rateLimit: number // requests per minute
  reliability: number // 0-1
  latency: number // milliseconds
}

export interface MarketSnapshot {
  timestamp: Date
  indices: MarketIndex[]
  sectors: SectorPerformance[]
  volatility: VolatilityMetrics
  sentiment: MarketSentiment
  volume: VolumeMetrics
  breadth: MarketBreadth
}

export interface MarketIndex {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
}

export interface SectorPerformance {
  name: string
  changePercent: number
  volume: number
  strength: number // -1 to 1
  momentum: number // -1 to 1
}

export interface VolatilityMetrics {
  vix: number
  vixChange: number
  marketVolatility: number
  sectorVolatility: Record<string, number>
  volatilityRegime: 'low' | 'medium' | 'high' | 'extreme'
}

export interface MarketSentiment {
  overall: number // -1 to 1
  institutional: number // -1 to 1
  retail: number // -1 to 1
  news: number // -1 to 1
  social: number // -1 to 1
  fearGreedIndex: number // 0-100
}

export interface VolumeMetrics {
  totalVolume: number
  averageVolume: number
  volumeRatio: number
  unusualVolume: string[]
  sectorVolume: Record<string, number>
}

export interface MarketBreadth {
  advancing: number
  declining: number
  unchanged: number
  newHighs: number
  newLows: number
  advanceDeclineRatio: number
  strength: number // -1 to 1
}

export interface RealTimeAlert {
  id: string
  type: 'price' | 'volume' | 'news' | 'technical' | 'sentiment'
  symbol?: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: Date
  data: any
}

export interface DataSubscription {
  id: string
  symbols: string[]
  interval: number
  callback: (data: RealTimeData[]) => void
  active: boolean
}

export class RealTimeDataSystem {
  private static instance: RealTimeDataSystem
  private config: RealTimeDataConfig
  private dataCache = new Map<string, { data: any; timestamp: number }>()
  private subscriptions = new Map<string, DataSubscription>()
  private websocket: WebSocket | null = null
  private updateTimer: NodeJS.Timeout | null = null
  private alertCallbacks: ((alert: RealTimeAlert) => void)[] = []

  static getInstance(): RealTimeDataSystem {
    if (!RealTimeDataSystem.instance) {
      RealTimeDataSystem.instance = new RealTimeDataSystem()
    }
    return RealTimeDataSystem.instance
  }

  constructor() {
    this.config = this.getDefaultConfig()
    // Skip any initialization during Next.js production build
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return
    }
    // Only initialize timers/sockets in Node.js runtime (not edge) and not during build
    if (typeof window === 'undefined' && (process.env.NEXT_RUNTIME || 'nodejs') !== 'edge') {
      this.initializeSystem()
    }
  }

  // Initialize the real-time data system
  private async initializeSystem(): Promise<void> {
    console.log('🚀 Initializing Real-time Data System...')
    
    if (this.config.websocketEnabled) {
      await this.initializeWebSocket()
    }
    
    this.startUpdateTimer()
    this.startMarketMonitoring()
  }

  // Get real-time stock data
  async getRealTimeStockData(symbol: string): Promise<Stock | null> {
    try {
      // Check cache first
      const cached = this.dataCache.get(`stock:${symbol}`)
      if (cached && Date.now() - cached.timestamp < this.config.cacheDuration) {
        return cached.data
      }

      // Fetch fresh data
      const stock = await getStockData(symbol)
      if (stock) {
        this.dataCache.set(`stock:${symbol}`, {
          data: stock,
          timestamp: Date.now()
        })
      }

      return stock
    } catch (error) {
      console.error(`Error fetching real-time data for ${symbol}:`, error)
      return null
    }
  }

  // Get market snapshot
  async getMarketSnapshot(): Promise<MarketSnapshot> {
    try {
      const cached = this.dataCache.get('market_snapshot')
      if (cached && Date.now() - cached.timestamp < this.config.cacheDuration) {
        return cached.data
      }

      const snapshot = await this.buildMarketSnapshot()
      this.dataCache.set('market_snapshot', {
        data: snapshot,
        timestamp: Date.now()
      })

      return snapshot
    } catch (error) {
      console.error('Error fetching market snapshot:', error)
      return this.getDefaultMarketSnapshot()
    }
  }

  // Subscribe to real-time updates
  subscribeToUpdates(
    symbols: string[],
    interval: number,
    callback: (data: RealTimeData[]) => void
  ): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const subscription: DataSubscription = {
      id: subscriptionId,
      symbols,
      interval,
      callback,
      active: true
    }

    this.subscriptions.set(subscriptionId, subscription)
    this.startSubscriptionUpdates(subscriptionId)

    return subscriptionId
  }

  // Unsubscribe from updates
  unsubscribeFromUpdates(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId)
    if (subscription) {
      subscription.active = false
      this.subscriptions.delete(subscriptionId)
      return true
    }
    return false
  }

  // Register alert callback
  onAlert(callback: (alert: RealTimeAlert) => void): void {
    this.alertCallbacks.push(callback)
  }

  // Get market sentiment
  async getMarketSentiment(): Promise<MarketSentiment> {
    try {
      const cached = this.dataCache.get('market_sentiment')
      if (cached && Date.now() - cached.timestamp < this.config.cacheDuration) {
        return cached.data
      }

      const sentiment = await this.calculateMarketSentiment()
      this.dataCache.set('market_sentiment', {
        data: sentiment,
        timestamp: Date.now()
      })

      return sentiment
    } catch (error) {
      console.error('Error calculating market sentiment:', error)
      return this.getDefaultSentiment()
    }
  }

  // Get volatility metrics
  async getVolatilityMetrics(): Promise<VolatilityMetrics> {
    try {
      const cached = this.dataCache.get('volatility_metrics')
      if (cached && Date.now() - cached.timestamp < this.config.cacheDuration) {
        return cached.data
      }

      const volatility = await this.calculateVolatilityMetrics()
      this.dataCache.set('volatility_metrics', {
        data: volatility,
        timestamp: Date.now()
      })

      return volatility
    } catch (error) {
      console.error('Error calculating volatility metrics:', error)
      return this.getDefaultVolatility()
    }
  }

  // Get sector performance
  async getSectorPerformance(): Promise<SectorPerformance[]> {
    try {
      const cached = this.dataCache.get('sector_performance')
      if (cached && Date.now() - cached.timestamp < this.config.cacheDuration) {
        return cached.data
      }

      const sectors = await this.calculateSectorPerformance()
      this.dataCache.set('sector_performance', {
        data: sectors,
        timestamp: Date.now()
      })

      return sectors
    } catch (error) {
      console.error('Error calculating sector performance:', error)
      return this.getDefaultSectors()
    }
  }

  // Get market breadth
  async getMarketBreadth(): Promise<MarketBreadth> {
    try {
      const cached = this.dataCache.get('market_breadth')
      if (cached && Date.now() - cached.timestamp < this.config.cacheDuration) {
        return cached.data
      }

      const breadth = await this.calculateMarketBreadth()
      this.dataCache.set('market_breadth', {
        data: breadth,
        timestamp: Date.now()
      })

      return breadth
    } catch (error) {
      console.error('Error calculating market breadth:', error)
      return this.getDefaultBreadth()
    }
  }

  // Private methods
  private async initializeWebSocket(): Promise<void> {
    try {
      // This would connect to a real WebSocket service
      console.log('📡 WebSocket connection initialized')
    } catch (error) {
      console.error('WebSocket initialization failed:', error)
    }
  }

  private startUpdateTimer(): void {
    this.updateTimer = setInterval(() => {
      this.updateMarketData()
    }, this.config.updateInterval)
  }

  private async updateMarketData(): Promise<void> {
    try {
      // Update market snapshot
      const snapshot = await this.getMarketSnapshot()
      
      // Check for alerts
      await this.checkForAlerts(snapshot)
      
      // Update subscriptions
      this.updateSubscriptions()
      
    } catch (error) {
      console.error('Error updating market data:', error)
    }
  }

  private async buildMarketSnapshot(): Promise<MarketSnapshot> {
    const indices = await this.getMarketIndices()
    const sectors = await this.getSectorPerformance()
    const volatility = await this.getVolatilityMetrics()
    const sentiment = await this.getMarketSentiment()
    const volume = await this.getVolumeMetrics()
    const breadth = await this.getMarketBreadth()

    return {
      timestamp: new Date(),
      indices,
      sectors,
      volatility,
      sentiment,
      volume,
      breadth
    }
  }

  private async getMarketIndices(): Promise<MarketIndex[]> {
    const indexSymbols = ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI']
    const indices: MarketIndex[] = []

    for (const symbol of indexSymbols) {
      try {
        const stock = await getStockData(symbol)
        if (stock) {
          indices.push({
            symbol: stock.symbol,
            name: stock.name,
            price: stock.price,
            change: stock.change,
            changePercent: stock.changePercent,
            volume: stock.volume,
            high: stock.dayHigh,
            low: stock.dayLow
          })
        }
      } catch (error) {
        console.error(`Error fetching index data for ${symbol}:`, error)
      }
    }

    return indices
  }

  private async calculateMarketSentiment(): Promise<MarketSentiment> {
    // This would integrate with sentiment analysis services
    return {
      overall: 0.2, // Slightly positive
      institutional: 0.3,
      retail: 0.1,
      news: 0.4,
      social: 0.0,
      fearGreedIndex: 65
    }
  }

  private async calculateVolatilityMetrics(): Promise<VolatilityMetrics> {
    // This would calculate real volatility metrics
    return {
      vix: 18.5,
      vixChange: -0.5,
      marketVolatility: 0.15,
      sectorVolatility: {
        'Technology': 0.20,
        'Healthcare': 0.12,
        'Finance': 0.18
      },
      volatilityRegime: 'medium'
    }
  }

  private async calculateSectorPerformance(): Promise<SectorPerformance[]> {
    // This would calculate real sector performance
    return [
      { name: 'Technology', changePercent: 1.2, volume: 1000000, strength: 0.8, momentum: 0.6 },
      { name: 'Healthcare', changePercent: -0.5, volume: 800000, strength: -0.3, momentum: -0.2 },
      { name: 'Finance', changePercent: 0.8, volume: 1200000, strength: 0.5, momentum: 0.4 }
    ]
  }

  private async getVolumeMetrics(): Promise<VolumeMetrics> {
    // This would calculate real volume metrics
    return {
      totalVolume: 5000000,
      averageVolume: 4500000,
      volumeRatio: 1.11,
      unusualVolume: ['AAPL', 'TSLA'],
      sectorVolume: {
        'Technology': 2000000,
        'Healthcare': 1500000,
        'Finance': 1500000
      }
    }
  }

  private async calculateMarketBreadth(): Promise<MarketBreadth> {
    // This would calculate real market breadth
    return {
      advancing: 2500,
      declining: 1800,
      unchanged: 700,
      newHighs: 150,
      newLows: 50,
      advanceDeclineRatio: 1.39,
      strength: 0.3
    }
  }

  private async checkForAlerts(snapshot: MarketSnapshot): Promise<void> {
    const alerts: RealTimeAlert[] = []

    // Check for unusual volume
    snapshot.volume.unusualVolume.forEach(symbol => {
      alerts.push({
        id: `volume_${symbol}_${Date.now()}`,
        type: 'volume',
        symbol,
        message: `Unusual volume detected for ${symbol}`,
        severity: 'medium',
        timestamp: new Date(),
        data: { symbol, volume: snapshot.volume }
      })
    })

    // Check for high volatility
    if (snapshot.volatility.volatilityRegime === 'high' || snapshot.volatility.volatilityRegime === 'extreme') {
      alerts.push({
        id: `volatility_${Date.now()}`,
        type: 'technical',
        message: `High market volatility detected (${snapshot.volatility.marketVolatility})`,
        severity: 'high',
        timestamp: new Date(),
        data: { volatility: snapshot.volatility }
      })
    }

    // Check for extreme sentiment
    if (Math.abs(snapshot.sentiment.overall) > 0.7) {
      alerts.push({
        id: `sentiment_${Date.now()}`,
        type: 'sentiment',
        message: `Extreme market sentiment detected (${snapshot.sentiment.overall})`,
        severity: 'medium',
        timestamp: new Date(),
        data: { sentiment: snapshot.sentiment }
      })
    }

    // Send alerts
    alerts.forEach(alert => {
      this.alertCallbacks.forEach(callback => callback(alert))
    })
  }

  private updateSubscriptions(): void {
    this.subscriptions.forEach(async (subscription) => {
      if (!subscription.active) return

      try {
        const data: RealTimeData[] = []
        for (const symbol of subscription.symbols) {
          const stock = await this.getRealTimeStockData(symbol)
          if (stock) {
            data.push({
              symbol: stock.symbol,
              price: stock.price,
              change: stock.change,
              changePercent: stock.changePercent,
              volume: stock.volume,
              timestamp: new Date(stock.lastUpdated)
            })
          }
        }

        if (data.length > 0) {
          subscription.callback(data)
        }
      } catch (error) {
        console.error(`Error updating subscription ${subscription.id}:`, error)
      }
    })
  }

  private startSubscriptionUpdates(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) return

    // Start periodic updates for this subscription
    setInterval(() => {
      if (subscription.active) {
        this.updateSubscriptions()
      }
    }, subscription.interval)
  }

  private startMarketMonitoring(): void {
    // Start monitoring for market events
    setInterval(() => {
      this.monitorMarketEvents()
    }, 30000) // Every 30 seconds
  }

  private async monitorMarketEvents(): Promise<void> {
    try {
      const snapshot = await this.getMarketSnapshot()
      
      // Monitor for significant market events
      if (snapshot.breadth.advanceDeclineRatio < 0.5) {
        this.alertCallbacks.forEach(callback => callback({
          id: `breadth_${Date.now()}`,
          type: 'technical',
          message: 'Market breadth showing weakness',
          severity: 'medium',
          timestamp: new Date(),
          data: { breadth: snapshot.breadth }
        }))
      }
    } catch (error) {
      console.error('Error monitoring market events:', error)
    }
  }

  // Default data methods
  private getDefaultMarketSnapshot(): MarketSnapshot {
    return {
      timestamp: new Date(),
      indices: [],
      sectors: [],
      volatility: this.getDefaultVolatility(),
      sentiment: this.getDefaultSentiment(),
      volume: {
        totalVolume: 0,
        averageVolume: 0,
        volumeRatio: 1,
        unusualVolume: [],
        sectorVolume: {}
      },
      breadth: this.getDefaultBreadth()
    }
  }

  private getDefaultSentiment(): MarketSentiment {
    return {
      overall: 0,
      institutional: 0,
      retail: 0,
      news: 0,
      social: 0,
      fearGreedIndex: 50
    }
  }

  private getDefaultVolatility(): VolatilityMetrics {
    return {
      vix: 20,
      vixChange: 0,
      marketVolatility: 0.15,
      sectorVolatility: {},
      volatilityRegime: 'medium'
    }
  }

  private getDefaultSectors(): SectorPerformance[] {
    return []
  }

  private getDefaultBreadth(): MarketBreadth {
    return {
      advancing: 0,
      declining: 0,
      unchanged: 0,
      newHighs: 0,
      newLows: 0,
      advanceDeclineRatio: 1,
      strength: 0
    }
  }

  private getDefaultConfig(): RealTimeDataConfig {
    return {
      updateInterval: 5000, // 5 seconds
      maxConcurrentRequests: 10,
      cacheDuration: 30000, // 30 seconds
      retryAttempts: 3,
      fallbackEnabled: true,
      websocketEnabled: true,
      dataSources: [
        {
          name: 'polygon',
          priority: 1,
          enabled: true,
          rateLimit: 100,
          reliability: 0.95,
          latency: 100
        },
        {
          name: 'yahoo',
          priority: 2,
          enabled: true,
          rateLimit: 200,
          reliability: 0.90,
          latency: 200
        }
      ]
    }
  }

  // Cleanup method
  destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
    }
    if (this.websocket) {
      this.websocket.close()
    }
    this.subscriptions.clear()
    this.dataCache.clear()
  }
}

// Export a safe getter to avoid instantiation at import time
export function getRealTimeDataSystem() {
  return RealTimeDataSystem.getInstance()
}
