// Prediction Context Memory System
// Remember user preferences and previous analyses for personalized recommendations

export interface UserPreference {
  userId?: string
  sessionId: string
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  investmentGoals: string[]
  preferredSectors: string[]
  watchlist: string[]
  tradingStyle: 'day_trading' | 'swing_trading' | 'long_term' | 'mixed'
  preferredAnalysisDepth: 'quick' | 'detailed' | 'comprehensive'
  notificationPreferences: {
    priceAlerts: boolean
    newsAlerts: boolean
    sentimentChanges: boolean
    technicalSignals: boolean
  }
  lastUpdated: string
}

export interface PredictionHistory {
  id: string
  sessionId: string
  symbol: string
  predictionType: 'nextDay' | 'multiDay' | 'ranking' | 'marketTrend'
  prediction: any
  userAction?: 'followed' | 'ignored' | 'modified'
  outcome?: 'accurate' | 'partially_accurate' | 'inaccurate'
  confidence: number
  timestamp: string
  contextFactors: string[]
}

export interface ChatContext {
  sessionId: string
  conversationHistory: {
    role: 'user' | 'assistant'
    content: string
    timestamp: string
    toolsUsed?: string[]
    prediction?: any
  }[]
  discussedSymbols: Set<string>
  userIntents: string[]
  conversationThemes: string[]
  lastActivity: string
}

export interface PersonalizedInsight {
  type: 'recommendation' | 'warning' | 'opportunity' | 'reminder'
  title: string
  message: string
  symbols: string[]
  confidence: number
  priority: 'low' | 'medium' | 'high'
  actionable: boolean
  basedOn: string[]
  timestamp: string
}

export class PredictionMemoryEngine {
  private static instance: PredictionMemoryEngine
  private userPreferences: Map<string, UserPreference> = new Map()
  private predictionHistory: Map<string, PredictionHistory[]> = new Map()
  private chatContexts: Map<string, ChatContext> = new Map()
  private personalizedInsights: Map<string, PersonalizedInsight[]> = new Map()

  static getInstance(): PredictionMemoryEngine {
    if (!PredictionMemoryEngine.instance) {
      PredictionMemoryEngine.instance = new PredictionMemoryEngine()
    }
    return PredictionMemoryEngine.instance
  }

  /**
   * Initialize or get user preferences
   */
  getUserPreferences(sessionId: string): UserPreference {
    if (!this.userPreferences.has(sessionId)) {
      const defaultPreferences: UserPreference = {
        sessionId,
        riskTolerance: 'moderate',
        investmentGoals: [],
        preferredSectors: [],
        watchlist: [],
        tradingStyle: 'mixed',
        preferredAnalysisDepth: 'detailed',
        notificationPreferences: {
          priceAlerts: true,
          newsAlerts: true,
          sentimentChanges: true,
          technicalSignals: false
        },
        lastUpdated: new Date().toISOString()
      }
      this.userPreferences.set(sessionId, defaultPreferences)
    }
    return this.userPreferences.get(sessionId)!
  }

  /**
   * Update user preferences based on chat interactions
   */
  updateUserPreferences(sessionId: string, updates: Partial<UserPreference>): void {
    const current = this.getUserPreferences(sessionId)
    const updated = {
      ...current,
      ...updates,
      lastUpdated: new Date().toISOString()
    }
    this.userPreferences.set(sessionId, updated)
    console.log(`📝 Updated preferences for session ${sessionId}:`, Object.keys(updates))
  }

  /**
   * Learn from user interactions and update preferences
   */
  learnFromInteraction(sessionId: string, interaction: {
    query: string
    toolsUsed: string[]
    symbols: string[]
    userFeedback?: 'positive' | 'negative' | 'neutral'
  }): void {
    const preferences = this.getUserPreferences(sessionId)
    
    // Infer risk tolerance from queries
    if (interaction.query.toLowerCase().includes('conservative') || 
        interaction.query.toLowerCase().includes('safe')) {
      if (preferences.riskTolerance !== 'conservative') {
        this.updateUserPreferences(sessionId, { riskTolerance: 'conservative' })
      }
    } else if (interaction.query.toLowerCase().includes('aggressive') || 
               interaction.query.toLowerCase().includes('high risk')) {
      if (preferences.riskTolerance !== 'aggressive') {
        this.updateUserPreferences(sessionId, { riskTolerance: 'aggressive' })
      }
    }

    // Update watchlist with frequently mentioned symbols
    const newWatchlist = new Set([...preferences.watchlist, ...interaction.symbols])
    if (newWatchlist.size > preferences.watchlist.length) {
      this.updateUserPreferences(sessionId, { 
        watchlist: Array.from(newWatchlist).slice(0, 20) // Limit to 20 symbols
      })
    }

    // Infer trading style
    if (interaction.query.toLowerCase().includes('tomorrow') || 
        interaction.query.toLowerCase().includes('day trading')) {
      if (preferences.tradingStyle !== 'day_trading') {
        this.updateUserPreferences(sessionId, { tradingStyle: 'day_trading' })
      }
    } else if (interaction.query.toLowerCase().includes('long term') || 
               interaction.query.toLowerCase().includes('invest')) {
      if (preferences.tradingStyle !== 'long_term') {
        this.updateUserPreferences(sessionId, { tradingStyle: 'long_term' })
      }
    }

    // Infer investment goals
    const goalKeywords = {
      'growth': ['growth', 'appreciate', 'capital gains'],
      'income': ['dividend', 'income', 'yield'],
      'value': ['value', 'undervalued', 'cheap'],
      'speculation': ['speculative', 'volatile', 'risky']
    }

    const newGoals = new Set(preferences.investmentGoals)
    for (const [goal, keywords] of Object.entries(goalKeywords)) {
      if (keywords.some(keyword => interaction.query.toLowerCase().includes(keyword))) {
        newGoals.add(goal)
      }
    }

    if (newGoals.size > preferences.investmentGoals.length) {
      this.updateUserPreferences(sessionId, { 
        investmentGoals: Array.from(newGoals)
      })
    }
  }

  /**
   * Store prediction in history
   */
  storePrediction(sessionId: string, prediction: {
    symbol: string
    predictionType: 'nextDay' | 'multiDay' | 'ranking' | 'marketTrend'
    prediction: any
    confidence: number
    contextFactors: string[]
  }): string {
    if (!this.predictionHistory.has(sessionId)) {
      this.predictionHistory.set(sessionId, [])
    }

    const predictionId = `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const historyItem: PredictionHistory = {
      id: predictionId,
      sessionId,
      symbol: prediction.symbol,
      predictionType: prediction.predictionType,
      prediction: prediction.prediction,
      confidence: prediction.confidence,
      timestamp: new Date().toISOString(),
      contextFactors: prediction.contextFactors
    }

    const history = this.predictionHistory.get(sessionId)!
    history.push(historyItem)

    // Keep only last 50 predictions per session
    if (history.length > 50) {
      history.splice(0, history.length - 50)
    }

    console.log(`💾 Stored prediction ${predictionId} for ${prediction.symbol}`)
    return predictionId
  }

  /**
   * Get prediction history for analysis
   */
  getPredictionHistory(sessionId: string, symbol?: string, limit = 10): PredictionHistory[] {
    const history = this.predictionHistory.get(sessionId) || []
    
    let filtered = history
    if (symbol) {
      filtered = history.filter(h => h.symbol.toLowerCase() === symbol.toLowerCase())
    }

    return filtered
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  /**
   * Update or maintain chat context
   */
  updateChatContext(sessionId: string, entry: {
    role: 'user' | 'assistant'
    content: string
    toolsUsed?: string[]
    prediction?: any
  }): void {
    if (!this.chatContexts.has(sessionId)) {
      this.chatContexts.set(sessionId, {
        sessionId,
        conversationHistory: [],
        discussedSymbols: new Set(),
        userIntents: [],
        conversationThemes: [],
        lastActivity: new Date().toISOString()
      })
    }

    const context = this.chatContexts.get(sessionId)!
    
    // Add to conversation history
    context.conversationHistory.push({
      ...entry,
      timestamp: new Date().toISOString()
    })

    // Extract symbols from content
    const symbolPattern = /\b[A-Z]{1,5}\b/g
    const potentialSymbols = entry.content.match(symbolPattern) || []
    const commonStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'SPY', 'QQQ']
    
    potentialSymbols.forEach(symbol => {
      if (commonStocks.includes(symbol) || symbol.length <= 4) {
        context.discussedSymbols.add(symbol)
      }
    })

    // Extract user intents
    if (entry.role === 'user') {
      const intents = this.extractUserIntents(entry.content)
      context.userIntents.push(...intents)
      
      // Keep only recent intents
      if (context.userIntents.length > 20) {
        context.userIntents = context.userIntents.slice(-20)
      }
    }

    // Update themes
    const themes = this.extractConversationThemes(entry.content)
    context.conversationThemes.push(...themes)
    context.conversationThemes = Array.from(new Set(context.conversationThemes)) // Remove duplicates

    // Keep only last 30 conversation entries
    if (context.conversationHistory.length > 30) {
      context.conversationHistory = context.conversationHistory.slice(-30)
    }

    context.lastActivity = new Date().toISOString()
  }

  /**
   * Extract user intents from message content
   */
  private extractUserIntents(content: string): string[] {
    const intents: string[] = []
    const lowerContent = content.toLowerCase()

    const intentPatterns = {
      'price_prediction': ['predict', 'forecast', 'price target', 'tomorrow', 'next week'],
      'risk_analysis': ['risk', 'volatility', 'safe', 'dangerous'],
      'portfolio_optimization': ['optimize', 'allocate', 'rebalance', 'portfolio'],
      'investment_advice': ['should i buy', 'should i sell', 'recommend', 'advice'],
      'market_sentiment': ['sentiment', 'market mood', 'bullish', 'bearish'],
      'news_analysis': ['news', 'recent', 'what happened', 'why'],
      'comparison': ['compare', 'versus', 'vs', 'better than'],
      'education': ['explain', 'what is', 'how does', 'learn']
    }

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      if (patterns.some(pattern => lowerContent.includes(pattern))) {
        intents.push(intent)
      }
    }

    return intents
  }

  /**
   * Extract conversation themes
   */
  private extractConversationThemes(content: string): string[] {
    const themes: string[] = []
    const lowerContent = content.toLowerCase()

    const themeKeywords = {
      'technology': ['tech', 'ai', 'software', 'cloud', 'digital'],
      'energy': ['oil', 'gas', 'renewable', 'energy', 'solar'],
      'healthcare': ['health', 'pharma', 'medical', 'biotech'],
      'finance': ['bank', 'financial', 'credit', 'insurance'],
      'consumer': ['retail', 'consumer', 'brand', 'shopping'],
      'industrial': ['industrial', 'manufacturing', 'materials'],
      'crypto': ['crypto', 'bitcoin', 'blockchain', 'ethereum'],
      'real_estate': ['real estate', 'reit', 'property'],
      'commodities': ['gold', 'silver', 'commodity', 'materials']
    }

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        themes.push(theme)
      }
    }

    return themes
  }

  /**
   * Generate personalized insights based on user history and preferences
   */
  generatePersonalizedInsights(sessionId: string): PersonalizedInsight[] {
    const preferences = this.getUserPreferences(sessionId)
    const chatContext = this.chatContexts.get(sessionId)
    const predictionHistory = this.getPredictionHistory(sessionId, undefined, 20)
    
    const insights: PersonalizedInsight[] = []

    // Watchlist insights
    if (preferences.watchlist.length > 0) {
      insights.push({
        type: 'recommendation',
        title: 'Watchlist Update Available',
        message: `Based on your interest in ${preferences.watchlist.slice(0, 3).join(', ')}, you might want to check recent market developments.`,
        symbols: preferences.watchlist.slice(0, 3),
        confidence: 80,
        priority: 'medium',
        actionable: true,
        basedOn: ['user_preferences', 'watchlist'],
        timestamp: new Date().toISOString()
      })
    }

    // Risk tolerance insights
    if (preferences.riskTolerance === 'conservative' && chatContext?.discussedSymbols) {
      const volatileSymbols = Array.from(chatContext.discussedSymbols).filter(s => 
        ['TSLA', 'NVDA', 'AMD', 'PLTR'].includes(s)
      )
      
      if (volatileSymbols.length > 0) {
        insights.push({
          type: 'warning',
          title: 'High Volatility Warning',
          message: `Based on your conservative risk profile, consider the high volatility of ${volatileSymbols.join(', ')}.`,
          symbols: volatileSymbols,
          confidence: 90,
          priority: 'high',
          actionable: true,
          basedOn: ['risk_tolerance', 'symbol_analysis'],
          timestamp: new Date().toISOString()
        })
      }
    }

    // Prediction accuracy insights
    const recentPredictions = predictionHistory.filter(p => 
      Date.now() - new Date(p.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    )

    if (recentPredictions.length >= 3) {
      const avgConfidence = recentPredictions.reduce((sum, p) => sum + p.confidence, 0) / recentPredictions.length
      
      insights.push({
        type: 'reminder',
        title: 'Prediction Performance Review',
        message: `You've received ${recentPredictions.length} predictions this week with average confidence of ${avgConfidence.toFixed(1)}%. Consider reviewing outcomes.`,
        symbols: Array.from(new Set(recentPredictions.map(p => p.symbol))),
        confidence: 75,
        priority: 'low',
        actionable: true,
        basedOn: ['prediction_history', 'performance_tracking'],
        timestamp: new Date().toISOString()
      })
    }

    // Conversation theme insights
    if (chatContext?.conversationThemes.includes('technology') && !preferences.preferredSectors.includes('technology')) {
      insights.push({
        type: 'opportunity',
        title: 'Technology Sector Interest Detected',
        message: 'You\'ve been discussing tech stocks frequently. Consider adding technology to your preferred sectors for more targeted insights.',
        symbols: ['AAPL', 'MSFT', 'GOOGL', 'NVDA'],
        confidence: 85,
        priority: 'medium',
        actionable: true,
        basedOn: ['conversation_analysis', 'sector_preferences'],
        timestamp: new Date().toISOString()
      })
    }

    // Store insights for this session
    this.personalizedInsights.set(sessionId, insights)

    return insights
  }

  /**
   * Get chat context for session
   */
  getChatContext(sessionId: string): ChatContext | undefined {
    return this.chatContexts.get(sessionId)
  }

  /**
   * Get personalized context for AI responses
   */
  getPersonalizedContext(sessionId: string): {
    preferences: UserPreference
    recentSymbols: string[]
    userIntents: string[]
    conversationThemes: string[]
    insights: PersonalizedInsight[]
  } {
    const preferences = this.getUserPreferences(sessionId)
    const chatContext = this.getChatContext(sessionId)
    const insights = this.generatePersonalizedInsights(sessionId)

    return {
      preferences,
      recentSymbols: chatContext ? Array.from(chatContext.discussedSymbols).slice(-10) : [],
      userIntents: chatContext?.userIntents.slice(-5) || [],
      conversationThemes: chatContext?.conversationThemes || [],
      insights
    }
  }

  /**
   * Clear old data to manage memory
   */
  cleanupOldData(maxAgeHours = 24): void {
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000)

    // Clean up chat contexts
    for (const [sessionId, context] of Array.from(this.chatContexts.entries())) {
      if (new Date(context.lastActivity).getTime() < cutoffTime) {
        this.chatContexts.delete(sessionId)
        console.log(`🧹 Cleaned up chat context for session ${sessionId}`)
      }
    }

    // Clean up prediction history
    for (const [sessionId, history] of Array.from(this.predictionHistory.entries())) {
      const filtered = history.filter(h => new Date(h.timestamp).getTime() >= cutoffTime)
      if (filtered.length < history.length) {
        this.predictionHistory.set(sessionId, filtered)
        console.log(`🧹 Cleaned up ${history.length - filtered.length} old predictions for session ${sessionId}`)
      }
    }
  }
}

// Export singleton instance
export const predictionMemory = PredictionMemoryEngine.getInstance()

// Auto-cleanup every hour
setInterval(() => {
  predictionMemory.cleanupOldData(24) // Keep data for 24 hours
}, 60 * 60 * 1000)

