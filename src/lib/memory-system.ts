// Advanced Memory System for TradeGPT
import { AIChatMessage, ChatSession } from '@/types'

export interface MemoryContext {
  userId: string
  sessionId: string
  conversationHistory: AIChatMessage[]
  userPreferences: UserPreferences
  tradingProfile: TradingProfile
  marketContext: MarketContext
  recentInteractions: RecentInteraction[]
  learningInsights: LearningInsight[]
  riskProfile: RiskProfile
  performanceMetrics: PerformanceMetrics
}

export interface UserPreferences {
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  tradingStyle: 'day_trading' | 'swing_trading' | 'long_term' | 'mixed'
  preferredSectors: string[]
  watchlist: string[]
  investmentGoals: string[]
  timeHorizon: 'short_term' | 'medium_term' | 'long_term'
  preferredAnalysis: 'technical' | 'fundamental' | 'both'
  notificationPreferences: {
    priceAlerts: boolean
    newsAlerts: boolean
    strategyUpdates: boolean
    riskWarnings: boolean
  }
}

export interface TradingProfile {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  accountSize: 'small' | 'medium' | 'large'
  tradingFrequency: 'daily' | 'weekly' | 'monthly' | 'occasional'
  preferredInstruments: string[]
  pastPerformance: {
    winRate: number
    averageReturn: number
    maxDrawdown: number
    sharpeRatio: number
  }
  riskManagement: {
    maxPositionSize: number
    stopLossPreference: number
    takeProfitPreference: number
    maxPortfolioRisk: number
  }
}

export interface MarketContext {
  currentMarketRegime: 'bull' | 'bear' | 'sideways' | 'volatile'
  marketSentiment: 'positive' | 'negative' | 'neutral'
  volatilityLevel: 'low' | 'medium' | 'high'
  sectorRotation: Record<string, number>
  economicCalendar: EconomicEvent[]
  earningsSeason: boolean
  fedPolicy: 'accommodative' | 'neutral' | 'restrictive'
}

export interface EconomicEvent {
  date: string
  event: string
  impact: 'high' | 'medium' | 'low'
  description: string
}

export interface RecentInteraction {
  timestamp: Date
  query: string
  symbols: string[]
  toolsUsed: string[]
  userFeedback: 'positive' | 'negative' | 'neutral'
  outcome: 'profitable' | 'loss' | 'neutral' | 'unknown'
  confidence: number
}

export interface LearningInsight {
  pattern: string
  frequency: number
  successRate: number
  lastObserved: Date
  recommendation: string
}

export interface RiskProfile {
  currentRiskLevel: 'low' | 'medium' | 'high'
  portfolioConcentration: number
  correlationRisk: number
  liquidityRisk: number
  marketRisk: number
  recentRiskEvents: RiskEvent[]
}

export interface RiskEvent {
  timestamp: Date
  type: 'high_volatility' | 'concentration' | 'correlation' | 'liquidity'
  severity: 'low' | 'medium' | 'high'
  description: string
  actionTaken: string
}

export interface PerformanceMetrics {
  predictionAccuracy: number
  recommendationSuccess: number
  userSatisfaction: number
  responseTime: number
  toolUsageEfficiency: number
}

export class MemorySystem {
  private static instance: MemorySystem
  private memoryStore = new Map<string, MemoryContext>()
  private readonly MEMORY_TTL = 24 * 60 * 60 * 1000 // 24 hours

  static getInstance(): MemorySystem {
    if (!MemorySystem.instance) {
      MemorySystem.instance = new MemorySystem()
    }
    return MemorySystem.instance
  }

  // Initialize or retrieve memory context for a user session
  async getMemoryContext(userId: string, sessionId: string): Promise<MemoryContext> {
    const key = `${userId}:${sessionId}`
    
    if (this.memoryStore.has(key)) {
      const context = this.memoryStore.get(key)!
      if (Date.now() - context.recentInteractions[0]?.timestamp.getTime() < this.MEMORY_TTL) {
        return context
      }
    }

    // Create new memory context
    const context: MemoryContext = {
      userId,
      sessionId,
      conversationHistory: [],
      userPreferences: await this.getDefaultPreferences(),
      tradingProfile: await this.getDefaultTradingProfile(),
      marketContext: await this.getCurrentMarketContext(),
      recentInteractions: [],
      learningInsights: [],
      riskProfile: await this.getDefaultRiskProfile(),
      performanceMetrics: {
        predictionAccuracy: 0.75,
        recommendationSuccess: 0.70,
        userSatisfaction: 0.80,
        responseTime: 2000,
        toolUsageEfficiency: 0.85
      }
    }

    this.memoryStore.set(key, context)
    return context
  }

  // Update memory with new interaction
  async updateMemory(
    userId: string, 
    sessionId: string, 
    message: AIChatMessage,
    toolsUsed: string[] = [],
    userFeedback?: 'positive' | 'negative' | 'neutral'
  ): Promise<void> {
    const context = await this.getMemoryContext(userId, sessionId)
    
    // Update conversation history
    context.conversationHistory.push(message)
    
    // Keep only last 50 messages for performance
    if (context.conversationHistory.length > 50) {
      context.conversationHistory = context.conversationHistory.slice(-50)
    }

    // Extract symbols from message
    const symbols = this.extractSymbols(message.content)
    
    // Record recent interaction
    const interaction: RecentInteraction = {
      timestamp: new Date(),
      query: message.content,
      symbols,
      toolsUsed,
      userFeedback: userFeedback || 'neutral',
      outcome: 'unknown',
      confidence: message.metadata?.confidence || 0.5
    }
    
    context.recentInteractions.unshift(interaction)
    
    // Keep only last 100 interactions
    if (context.recentInteractions.length > 100) {
      context.recentInteractions = context.recentInteractions.slice(0, 100)
    }

    // Update learning insights
    await this.updateLearningInsights(context, interaction)
    
    // Update market context
    await this.updateMarketContext(context)
    
    // Update risk profile
    await this.updateRiskProfile(context, symbols)
  }

  // Learn from user preferences and behavior
  async learnFromInteraction(
    userId: string,
    sessionId: string,
    interaction: RecentInteraction
  ): Promise<void> {
    const context = await this.getMemoryContext(userId, sessionId)
    
    // Analyze patterns in user behavior
    const patterns = this.analyzeUserPatterns(context.recentInteractions)
    
    // Update user preferences based on behavior - disabled for now
    // await this.updateUserPreferences(context, patterns)
    
    // Update trading profile based on interactions
    await this.updateTradingProfile(context, patterns)
  }

  // Get personalized recommendations based on memory
  async getPersonalizedRecommendations(
    userId: string,
    sessionId: string,
    query: string
  ): Promise<PersonalizedRecommendation[]> {
    const context = await this.getMemoryContext(userId, sessionId)
    
    const recommendations: PersonalizedRecommendation[] = []
    
    // Analyze query intent
    const intent = this.analyzeQueryIntent(query)
    
    // Generate recommendations based on user profile and market context
    if (intent.includes('analysis') || intent.includes('prediction')) {
      recommendations.push(...await this.getAnalysisRecommendations(context, query))
    }
    
    if (intent.includes('strategy') || intent.includes('trade')) {
      recommendations.push(...await this.getStrategyRecommendations(context, query))
    }
    
    if (intent.includes('portfolio') || intent.includes('risk')) {
      recommendations.push(...await this.getPortfolioRecommendations(context, query))
    }
    
    return recommendations
  }

  // Get conversation context for AI
  async getConversationContext(
    userId: string,
    sessionId: string,
    maxMessages: number = 10
  ): Promise<AIChatMessage[]> {
    const context = await this.getMemoryContext(userId, sessionId)
    return context.conversationHistory.slice(-maxMessages)
  }

  // Update user preferences
  async updateUserPreferences(
    userId: string,
    sessionId: string,
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    const context = await this.getMemoryContext(userId, sessionId)
    context.userPreferences = { ...context.userPreferences, ...preferences }
  }

  // Get market-aware suggestions
  async getMarketAwareSuggestions(
    userId: string,
    sessionId: string
  ): Promise<string[]> {
    const context = await this.getMemoryContext(userId, sessionId)
    const suggestions: string[] = []
    
    // Market-specific suggestions
    if (context.marketContext.currentMarketRegime === 'bull') {
      suggestions.push(
        "What growth stocks should I consider in this bull market?",
        "How can I optimize my portfolio for continued upside?",
        "Which sectors are leading this rally?"
      )
    } else if (context.marketContext.currentMarketRegime === 'bear') {
      suggestions.push(
        "What defensive stocks should I consider?",
        "How can I hedge my portfolio against further downside?",
        "Which sectors are most resilient in this market?"
      )
    }
    
    // User-specific suggestions based on preferences
    if (context.userPreferences.preferredSectors.length > 0) {
      suggestions.push(
        `What's the latest analysis on ${context.userPreferences.preferredSectors[0]}?`,
        `How are my preferred sectors performing today?`
      )
    }
    
    // Risk-aware suggestions
    if (context.riskProfile.currentRiskLevel === 'high') {
      suggestions.push(
        "How can I reduce my portfolio risk?",
        "What defensive positions should I consider?"
      )
    }
    
    return suggestions.slice(0, 5) // Return top 5 suggestions
  }

  // Private helper methods
  private async getDefaultPreferences(): Promise<UserPreferences> {
    return {
      riskTolerance: 'moderate',
      tradingStyle: 'mixed',
      preferredSectors: ['Technology', 'Healthcare', 'Finance'],
      watchlist: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'],
      investmentGoals: ['growth', 'income', 'diversification'],
      timeHorizon: 'medium_term',
      preferredAnalysis: 'both',
      notificationPreferences: {
        priceAlerts: true,
        newsAlerts: true,
        strategyUpdates: true,
        riskWarnings: true
      }
    }
  }

  private async getDefaultTradingProfile(): Promise<TradingProfile> {
    return {
      experienceLevel: 'intermediate',
      accountSize: 'medium',
      tradingFrequency: 'weekly',
      preferredInstruments: ['stocks', 'etfs'],
      pastPerformance: {
        winRate: 0.65,
        averageReturn: 0.12,
        maxDrawdown: -0.15,
        sharpeRatio: 1.2
      },
      riskManagement: {
        maxPositionSize: 0.05,
        stopLossPreference: 0.02,
        takeProfitPreference: 0.06,
        maxPortfolioRisk: 0.02
      }
    }
  }

  private async getCurrentMarketContext(): Promise<MarketContext> {
    // This would integrate with real market data
    return {
      currentMarketRegime: 'bull',
      marketSentiment: 'positive',
      volatilityLevel: 'medium',
      sectorRotation: {
        'Technology': 0.25,
        'Healthcare': 0.20,
        'Finance': 0.15,
        'Consumer': 0.12,
        'Energy': 0.08
      },
      economicCalendar: [],
      earningsSeason: false,
      fedPolicy: 'neutral'
    }
  }

  private async getDefaultRiskProfile(): Promise<RiskProfile> {
    return {
      currentRiskLevel: 'medium',
      portfolioConcentration: 0.30,
      correlationRisk: 0.45,
      liquidityRisk: 0.15,
      marketRisk: 0.25,
      recentRiskEvents: []
    }
  }

  private extractSymbols(content: string): string[] {
    const symbolPattern = /\b[A-Z]{1,5}\b/g
    const matches = content.match(symbolPattern) || []
    return Array.from(new Set(matches)).filter(symbol => 
      !['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'ANY', 'CAN', 'HAD', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'MAN', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WAY', 'WHO', 'BOY', 'DID', 'ITS', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE'].includes(symbol)
    )
  }

  private analyzeQueryIntent(query: string): string[] {
    const intents: string[] = []
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('price') || lowerQuery.includes('quote')) intents.push('price')
    if (lowerQuery.includes('analysis') || lowerQuery.includes('technical')) intents.push('analysis')
    if (lowerQuery.includes('predict') || lowerQuery.includes('forecast')) intents.push('prediction')
    if (lowerQuery.includes('strategy') || lowerQuery.includes('trade')) intents.push('strategy')
    if (lowerQuery.includes('portfolio') || lowerQuery.includes('risk')) intents.push('portfolio')
    if (lowerQuery.includes('news') || lowerQuery.includes('sentiment')) intents.push('news')
    
    return intents
  }

  private async updateLearningInsights(context: MemoryContext, interaction: RecentInteraction): Promise<void> {
    // Analyze patterns and update insights
    const patterns = this.analyzeUserPatterns(context.recentInteractions)
    
    for (const pattern of patterns) {
      const existingInsight = context.learningInsights.find(i => i.pattern === pattern.type)
      if (existingInsight) {
        existingInsight.frequency++
        existingInsight.lastObserved = new Date()
      } else {
        context.learningInsights.push({
          pattern: pattern.type,
          frequency: 1,
          successRate: 0.5,
          lastObserved: new Date(),
          recommendation: pattern.recommendation
        })
      }
    }
  }

  private analyzeUserPatterns(interactions: RecentInteraction[]): Array<{type: string, recommendation: string}> {
    const patterns: Array<{type: string, recommendation: string}> = []
    
    // Analyze trading patterns
    const tradingQueries = interactions.filter(i => 
      i.query.toLowerCase().includes('trade') || 
      i.query.toLowerCase().includes('buy') || 
      i.query.toLowerCase().includes('sell')
    )
    
    if (tradingQueries.length > 5) {
      patterns.push({
        type: 'frequent_trading',
        recommendation: 'Consider longer-term strategies to reduce transaction costs'
      })
    }
    
    // Analyze risk patterns
    const riskQueries = interactions.filter(i => 
      i.query.toLowerCase().includes('risk') || 
      i.query.toLowerCase().includes('volatile')
    )
    
    if (riskQueries.length > 3) {
      patterns.push({
        type: 'risk_conscious',
        recommendation: 'Focus on defensive stocks and diversification'
      })
    }
    
    return patterns
  }

  private async updateMarketContext(context: MemoryContext): Promise<void> {
    // This would integrate with real market data APIs
    // For now, we'll simulate market context updates
    const marketData = await this.fetchMarketData()
    context.marketContext = { ...context.marketContext, ...marketData }
  }

  private async updateRiskProfile(context: MemoryContext, symbols: string[]): Promise<void> {
    // Update risk profile based on recent interactions
    const recentSymbols = context.recentInteractions
      .slice(0, 10)
      .flatMap(i => i.symbols)
    
    const uniqueSymbols = Array.from(new Set(recentSymbols))
    context.riskProfile.portfolioConcentration = uniqueSymbols.length > 0 ? 
      Math.min(1.0, uniqueSymbols.length / 20) : 0.3
  }

  // Removed duplicate private updateUserPreferences function

  private async updateTradingProfile(context: MemoryContext, patterns: any[]): Promise<void> {
    // Update trading profile based on learned patterns
    // Implementation would be more sophisticated in production
  }

  private async getAnalysisRecommendations(context: MemoryContext, query: string): Promise<PersonalizedRecommendation[]> {
    // Generate analysis-specific recommendations
    return []
  }

  private async getStrategyRecommendations(context: MemoryContext, query: string): Promise<PersonalizedRecommendation[]> {
    // Generate strategy-specific recommendations
    return []
  }

  private async getPortfolioRecommendations(context: MemoryContext, query: string): Promise<PersonalizedRecommendation[]> {
    // Generate portfolio-specific recommendations
    return []
  }

  private async fetchMarketData(): Promise<Partial<MarketContext>> {
    // This would integrate with real market data APIs
    return {}
  }
}

export interface PersonalizedRecommendation {
  type: 'analysis' | 'strategy' | 'portfolio' | 'risk'
  title: string
  description: string
  confidence: number
  symbols?: string[]
  reasoning: string
}

// Export singleton instance
export const memorySystem = MemorySystem.getInstance()
