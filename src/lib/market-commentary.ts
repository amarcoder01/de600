// Real-Time Market Commentary System
// Live market updates and intelligent commentary

import { marketIntelligence, MarketSentiment, MarketUpdate } from './market-intelligence'
import { predictionMemory } from './prediction-memory'

export interface MarketCommentary {
  id: string
  type: 'opening_bell' | 'closing_bell' | 'mid_day' | 'breaking_news' | 'trend_alert' | 'custom'
  title: string
  content: string
  symbols: string[]
  severity: 'low' | 'medium' | 'high'
  sentiment: 'bullish' | 'bearish' | 'neutral'
  actionable: boolean
  recommendations?: string[]
  timestamp: string
  expiresAt?: string
}

export interface LiveMarketData {
  timestamp: string
  marketStatus: 'pre_market' | 'open' | 'after_hours' | 'closed'
  majorIndices: {
    symbol: string
    price: number
    change: number
    changePercent: number
  }[]
  topMovers: {
    gainers: { symbol: string; change: number }[]
    losers: { symbol: string; change: number }[]
  }
  sectorPerformance: {
    sector: string
    performance: number
  }[]
  marketBreadth: {
    advancing: number
    declining: number
    unchanged: number
  }
}

export interface MarketAlert {
  id: string
  type: 'price_threshold' | 'volume_spike' | 'news_impact' | 'sentiment_shift' | 'technical_breakout'
  symbol: string
  message: string
  data: any
  priority: 'low' | 'medium' | 'high' | 'urgent'
  timestamp: string
  acknowledged: boolean
}

export class MarketCommentaryEngine {
  private static instance: MarketCommentaryEngine
  private commentaryHistory: MarketCommentary[] = []
  private activeAlerts: MarketAlert[] = []
  private marketData: LiveMarketData | null = null
  private isMonitoring = false
  private updateInterval: NodeJS.Timeout | null = null

  static getInstance(): MarketCommentaryEngine {
    if (!MarketCommentaryEngine.instance) {
      MarketCommentaryEngine.instance = new MarketCommentaryEngine()
    }
    return MarketCommentaryEngine.instance
  }

  /**
   * Start real-time market monitoring
   */
  startMarketMonitoring(): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    console.log('📊 Starting real-time market monitoring...')

    // Update market data every 30 seconds during market hours
    this.updateInterval = setInterval(() => {
      this.updateMarketData()
      this.generateMarketCommentary()
    }, 30000)

    // Initial update
    this.updateMarketData()
    this.generateMarketCommentary()
  }

  /**
   * Stop market monitoring
   */
  stopMarketMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
    this.isMonitoring = false
    console.log('📊 Stopped market monitoring')
  }

  /**
   * Update live market data (simulated for demo)
   */
  private async updateMarketData(): Promise<void> {
    try {
      // Simulate market data updates
      const now = new Date()
      const hour = now.getHours()
      
      let marketStatus: 'pre_market' | 'open' | 'after_hours' | 'closed'
      if (hour >= 9 && hour < 16) {
        marketStatus = 'open'
      } else if (hour >= 4 && hour < 9) {
        marketStatus = 'pre_market'
      } else if (hour >= 16 && hour < 20) {
        marketStatus = 'after_hours'
      } else {
        marketStatus = 'closed'
      }

      // Simulate market data
      this.marketData = {
        timestamp: now.toISOString(),
        marketStatus,
        majorIndices: [
          {
            symbol: 'SPY',
            price: 450 + Math.random() * 20,
            change: (Math.random() - 0.5) * 10,
            changePercent: (Math.random() - 0.5) * 2
          },
          {
            symbol: 'QQQ',
            price: 380 + Math.random() * 20,
            change: (Math.random() - 0.5) * 12,
            changePercent: (Math.random() - 0.5) * 3
          },
          {
            symbol: 'IWM',
            price: 190 + Math.random() * 10,
            change: (Math.random() - 0.5) * 8,
            changePercent: (Math.random() - 0.5) * 2.5
          }
        ],
        topMovers: {
          gainers: [
            { symbol: 'NVDA', change: 5.2 + Math.random() * 3 },
            { symbol: 'AAPL', change: 3.1 + Math.random() * 2 },
            { symbol: 'MSFT', change: 2.8 + Math.random() * 2 }
          ],
          losers: [
            { symbol: 'TSLA', change: -(4.1 + Math.random() * 3) },
            { symbol: 'META', change: -(2.9 + Math.random() * 2) },
            { symbol: 'AMZN', change: -(2.1 + Math.random() * 2) }
          ]
        },
        sectorPerformance: [
          { sector: 'Technology', performance: (Math.random() - 0.5) * 4 },
          { sector: 'Healthcare', performance: (Math.random() - 0.5) * 3 },
          { sector: 'Financial', performance: (Math.random() - 0.5) * 3 },
          { sector: 'Energy', performance: (Math.random() - 0.5) * 5 },
          { sector: 'Consumer', performance: (Math.random() - 0.5) * 2 }
        ],
        marketBreadth: {
          advancing: Math.floor(Math.random() * 2000) + 1000,
          declining: Math.floor(Math.random() * 2000) + 1000,
          unchanged: Math.floor(Math.random() * 500) + 100
        }
      }

      // Generate alerts based on market conditions
      this.checkForAlerts()

    } catch (error) {
      console.error('❌ Error updating market data:', error)
    }
  }

  /**
   * Check for market alerts
   */
  private checkForAlerts(): void {
    if (!this.marketData) return

    const now = new Date().toISOString()

    // Check for significant index moves
    this.marketData.majorIndices.forEach(index => {
      if (Math.abs(index.changePercent) > 2) {
        this.addAlert({
          type: 'price_threshold',
          symbol: index.symbol,
          message: `${index.symbol} moved ${index.changePercent > 0 ? '+' : ''}${index.changePercent.toFixed(2)}% - significant market movement detected`,
          data: { price: index.price, change: index.change, changePercent: index.changePercent },
          priority: Math.abs(index.changePercent) > 3 ? 'high' : 'medium',
          timestamp: now
        })
      }
    })

    // Check top movers for unusual activity
    const allMovers = [...this.marketData.topMovers.gainers, ...this.marketData.topMovers.losers]
    allMovers.forEach(mover => {
      if (Math.abs(mover.change) > 5) {
        this.addAlert({
          type: 'volume_spike',
          symbol: mover.symbol,
          message: `${mover.symbol} experiencing unusual activity with ${mover.change > 0 ? '+' : ''}${mover.change.toFixed(2)}% movement`,
          data: { change: mover.change },
          priority: Math.abs(mover.change) > 8 ? 'high' : 'medium',
          timestamp: now
        })
      }
    })

    // Check sector performance
    this.marketData.sectorPerformance.forEach(sector => {
      if (Math.abs(sector.performance) > 3) {
        this.addAlert({
          type: 'sentiment_shift',
          symbol: 'SECTOR',
          message: `${sector.sector} sector showing strong ${sector.performance > 0 ? 'performance' : 'weakness'} with ${sector.performance > 0 ? '+' : ''}${sector.performance.toFixed(2)}% movement`,
          data: { sector: sector.sector, performance: sector.performance },
          priority: 'medium',
          timestamp: now
        })
      }
    })
  }

  /**
   * Add market alert
   */
  private addAlert(alertData: Omit<MarketAlert, 'id' | 'acknowledged'>): void {
    const alert: MarketAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      acknowledged: false,
      ...alertData
    }

    this.activeAlerts.push(alert)

    // Keep only last 50 alerts
    if (this.activeAlerts.length > 50) {
      this.activeAlerts = this.activeAlerts.slice(-50)
    }

    console.log(`🚨 New market alert: ${alert.message}`)
  }

  /**
   * Generate intelligent market commentary
   */
  private async generateMarketCommentary(): Promise<void> {
    if (!this.marketData) return

    try {
      const now = new Date()
      const hour = now.getHours()
      const minute = now.getMinutes()

      // Generate opening bell commentary
      if (hour === 9 && minute >= 30 && minute <= 35 && this.marketData.marketStatus === 'open') {
        await this.generateOpeningBellCommentary()
      }

      // Generate mid-day commentary
      if (hour === 12 && minute >= 0 && minute <= 5) {
        await this.generateMidDayCommentary()
      }

      // Generate closing bell commentary
      if (hour === 16 && minute >= 0 && minute <= 5 && this.marketData.marketStatus === 'after_hours') {
        await this.generateClosingBellCommentary()
      }

      // Generate trend alerts for significant moves
      await this.generateTrendAlerts()

    } catch (error) {
      console.error('❌ Error generating market commentary:', error)
    }
  }

  /**
   * Generate opening bell commentary
   */
  private async generateOpeningBellCommentary(): Promise<void> {
    if (!this.marketData) return

    const overallSentiment = await marketIntelligence.analyzeMarketSentiment()
    const indices = this.marketData.majorIndices
    const topGainer = this.marketData.topMovers.gainers[0]
    const topLoser = this.marketData.topMovers.losers[0]

    const commentary: MarketCommentary = {
      id: `opening_${Date.now()}`,
      type: 'opening_bell',
      title: '🔔 Opening Bell Market Commentary',
      content: this.generateOpeningContent(indices, topGainer, topLoser, overallSentiment),
      symbols: [indices[0].symbol, topGainer.symbol, topLoser.symbol],
      severity: this.calculateSeverity(indices),
      sentiment: overallSentiment.overall,
      actionable: true,
      recommendations: this.generateOpeningRecommendations(indices, overallSentiment),
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // Expires in 4 hours
    }

    this.addCommentary(commentary)
  }

  /**
   * Generate mid-day commentary
   */
  private async generateMidDayCommentary(): Promise<void> {
    if (!this.marketData) return

    const overallSentiment = await marketIntelligence.analyzeMarketSentiment()
    const breadth = this.marketData.marketBreadth
    const advanceDeclineRatio = breadth.advancing / breadth.declining

    const commentary: MarketCommentary = {
      id: `midday_${Date.now()}`,
      type: 'mid_day',
      title: '🕛 Mid-Day Market Update',
      content: this.generateMidDayContent(breadth, advanceDeclineRatio, overallSentiment),
      symbols: ['SPY', 'QQQ'],
      severity: advanceDeclineRatio > 1.5 || advanceDeclineRatio < 0.67 ? 'high' : 'medium',
      sentiment: advanceDeclineRatio > 1.2 ? 'bullish' : advanceDeclineRatio < 0.8 ? 'bearish' : 'neutral',
      actionable: true,
      recommendations: this.generateMidDayRecommendations(advanceDeclineRatio, overallSentiment),
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    }

    this.addCommentary(commentary)
  }

  /**
   * Generate closing bell commentary
   */
  private async generateClosingBellCommentary(): Promise<void> {
    if (!this.marketData) return

    const overallSentiment = await marketIntelligence.analyzeMarketSentiment()
    const indices = this.marketData.majorIndices
    const sectors = this.marketData.sectorPerformance

    const commentary: MarketCommentary = {
      id: `closing_${Date.now()}`,
      type: 'closing_bell',
      title: '🔔 Closing Bell Market Summary',
      content: this.generateClosingContent(indices, sectors, overallSentiment),
      symbols: indices.map(i => i.symbol),
      severity: this.calculateSeverity(indices),
      sentiment: overallSentiment.overall,
      actionable: true,
      recommendations: this.generateClosingRecommendations(indices, sectors, overallSentiment),
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Expires in 24 hours
    }

    this.addCommentary(commentary)
  }

  /**
   * Generate trend alerts
   */
  private async generateTrendAlerts(): Promise<void> {
    if (!this.marketData) return

    // Check for significant sector rotations
    const sectors = this.marketData.sectorPerformance
    const topSector = sectors.reduce((max, sector) => sector.performance > max.performance ? sector : max)
    const bottomSector = sectors.reduce((min, sector) => sector.performance < min.performance ? sector : min)

    if (Math.abs(topSector.performance - bottomSector.performance) > 4) {
      const commentary: MarketCommentary = {
        id: `trend_${Date.now()}`,
        type: 'trend_alert',
        title: '📈 Sector Rotation Alert',
        content: `Significant sector rotation detected: ${topSector.sector} leading with ${topSector.performance > 0 ? '+' : ''}${topSector.performance.toFixed(2)}% while ${bottomSector.sector} lags at ${bottomSector.performance.toFixed(2)}%. This rotation may signal changing market dynamics and potential opportunities.`,
        symbols: ['SPY', 'QQQ'],
        severity: 'high',
        sentiment: 'neutral',
        actionable: true,
        recommendations: [
          `Consider exposure to ${topSector.sector} sector leaders`,
          `Review positions in ${bottomSector.sector} sector`,
          'Monitor sector ETFs for rotation opportunities'
        ],
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      }

      this.addCommentary(commentary)
    }
  }

  /**
   * Helper methods for content generation
   */
  private generateOpeningContent(indices: any[], topGainer: any, topLoser: any, sentiment: MarketSentiment): string {
    const spyChange = indices.find(i => i.symbol === 'SPY')?.changePercent || 0
    const direction = spyChange > 0 ? 'higher' : spyChange < 0 ? 'lower' : 'flat'
    
    return `Markets opened ${direction} with ${sentiment.overall} sentiment prevailing. SPY ${spyChange > 0 ? '+' : ''}${spyChange.toFixed(2)}%. Early leaders include ${topGainer.symbol} (+${topGainer.change.toFixed(2)}%) while ${topLoser.symbol} faces pressure (${topLoser.change.toFixed(2)}%). Market sentiment analysis shows ${sentiment.confidence}% confidence in current ${sentiment.overall} outlook based on ${sentiment.newsCount} recent news items.`
  }

  private generateMidDayContent(breadth: any, ratio: number, sentiment: MarketSentiment): string {
    const breadthDescription = ratio > 1.5 ? 'strong' : ratio > 1.0 ? 'positive' : ratio > 0.8 ? 'mixed' : 'weak'
    
    return `Mid-day market breadth shows ${breadthDescription} participation with ${breadth.advancing} advancing vs ${breadth.declining} declining stocks (ratio: ${ratio.toFixed(2)}). Market sentiment remains ${sentiment.overall} with ${sentiment.confidence}% confidence. Key market factors include: ${sentiment.marketFactors.slice(0, 3).join(', ')}.`
  }

  private generateClosingContent(indices: any[], sectors: any[], sentiment: MarketSentiment): string {
    const spyClose = indices.find(i => i.symbol === 'SPY')
    const bestSector = sectors.reduce((max, s) => s.performance > max.performance ? s : max)
    const worstSector = sectors.reduce((min, s) => s.performance < min.performance ? s : min)
    
    return `Markets closed with SPY ${spyClose?.changePercent > 0 ? '+' : ''}${spyClose?.changePercent.toFixed(2)}%. Sector leadership: ${bestSector.sector} (+${bestSector.performance.toFixed(2)}%) led while ${worstSector.sector} (${worstSector.performance.toFixed(2)}%) lagged. Overall sentiment: ${sentiment.overall} (${sentiment.confidence}% confidence) based on analysis of ${sentiment.newsCount} news items.`
  }

  private generateOpeningRecommendations(indices: any[], sentiment: MarketSentiment): string[] {
    const recommendations = []
    
    if (sentiment.overall === 'bullish' && sentiment.confidence > 70) {
      recommendations.push('Consider increasing market exposure on strength')
    } else if (sentiment.overall === 'bearish' && sentiment.confidence > 70) {
      recommendations.push('Consider defensive positioning or hedging')
    }
    
    recommendations.push('Monitor volume and breadth for confirmation')
    recommendations.push('Watch for sector rotation opportunities')
    
    return recommendations
  }

  private generateMidDayRecommendations(ratio: number, sentiment: MarketSentiment): string[] {
    const recommendations = []
    
    if (ratio > 1.5) {
      recommendations.push('Strong breadth supports continued upside')
    } else if (ratio < 0.67) {
      recommendations.push('Weak breadth suggests caution ahead')
    }
    
    recommendations.push('Monitor afternoon trading for trend continuation')
    recommendations.push('Consider position sizing based on breadth signals')
    
    return recommendations
  }

  private generateClosingRecommendations(indices: any[], sectors: any[], sentiment: MarketSentiment): string[] {
    const recommendations = []
    
    recommendations.push('Review overnight news and futures for gap direction')
    recommendations.push('Plan next day strategy based on closing action')
    
    if (sentiment.overall === 'bullish') {
      recommendations.push('Look for continuation patterns in strong names')
    } else {
      recommendations.push('Consider defensive strategies for tomorrow')
    }
    
    return recommendations
  }

  private calculateSeverity(indices: any[]): 'low' | 'medium' | 'high' {
    const maxMove = Math.max(...indices.map(i => Math.abs(i.changePercent)))
    if (maxMove > 2) return 'high'
    if (maxMove > 1) return 'medium'
    return 'low'
  }

  /**
   * Add commentary to history
   */
  private addCommentary(commentary: MarketCommentary): void {
    this.commentaryHistory.push(commentary)
    
    // Keep only last 100 commentaries
    if (this.commentaryHistory.length > 100) {
      this.commentaryHistory = this.commentaryHistory.slice(-100)
    }

    console.log(`📝 Generated market commentary: ${commentary.title}`)
  }

  /**
   * Get recent market commentary
   */
  getRecentCommentary(limit = 10): MarketCommentary[] {
    const now = Date.now()
    
    return this.commentaryHistory
      .filter(c => !c.expiresAt || new Date(c.expiresAt).getTime() > now)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(limit = 20): MarketAlert[] {
    return this.activeAlerts
      .filter(a => !a.acknowledged)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.activeAlerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      console.log(`✅ Alert acknowledged: ${alertId}`)
    }
  }

  /**
   * Get current market data
   */
  getCurrentMarketData(): LiveMarketData | null {
    return this.marketData
  }

  /**
   * Generate personalized market commentary for a user session
   */
  async generatePersonalizedCommentary(sessionId: string): Promise<MarketCommentary> {
    const context = predictionMemory.getPersonalizedContext(sessionId)
    const recentCommentary = this.getRecentCommentary(5)
    const marketData = this.getCurrentMarketData()
    
    // Focus on user's watchlist and preferences
    const relevantSymbols = context.recentSymbols.slice(0, 5)
    const userRiskProfile = context.preferences.riskTolerance
    
    let content = `Personalized market update for your ${userRiskProfile} risk profile. `
    
    if (relevantSymbols.length > 0) {
      content += `Tracking your discussed symbols: ${relevantSymbols.join(', ')}. `
    }
    
    if (marketData) {
      const relevantMovers = [
        ...marketData.topMovers.gainers,
        ...marketData.topMovers.losers
      ].filter(mover => relevantSymbols.includes(mover.symbol))
      
      if (relevantMovers.length > 0) {
        content += `Notable moves in your symbols: ${relevantMovers.map(m => 
          `${m.symbol} ${m.change > 0 ? '+' : ''}${m.change.toFixed(2)}%`
        ).join(', ')}. `
      }
    }
    
    // Add insights based on user intents
    if (context.userIntents.includes('risk_analysis')) {
      content += `Risk monitoring: Current market volatility ${marketData?.marketStatus === 'open' ? 'requires attention' : 'should be monitored'}. `
    }
    
    if (context.userIntents.includes('portfolio_optimization')) {
      content += `Portfolio note: Consider rebalancing opportunities based on current sector performance. `
    }

    const commentary: MarketCommentary = {
      id: `personalized_${sessionId}_${Date.now()}`,
      type: 'custom',
      title: '👤 Your Personalized Market Update',
      content,
      symbols: relevantSymbols,
      severity: 'medium',
      sentiment: 'neutral',
      actionable: true,
      recommendations: [
        'Review your watchlist for opportunities',
        'Consider your risk tolerance in current market conditions',
        'Monitor symbols you\'ve been discussing'
      ],
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    }

    return commentary
  }
}

// Export singleton instance
export const marketCommentary = MarketCommentaryEngine.getInstance()

// Auto-start market monitoring
marketCommentary.startMarketMonitoring()

