// Advanced Market Intelligence System
// Real-time news sentiment analysis and market monitoring

import { webSearch } from './web-search'

export interface NewsItem {
  title: string
  snippet: string
  url: string
  publishDate?: string
  source?: string
  sentiment?: 'bullish' | 'bearish' | 'neutral'
  sentimentScore?: number
  relevance?: number
}

export interface MarketSentiment {
  overall: 'bullish' | 'bearish' | 'neutral'
  score: number
  confidence: number
  newsCount: number
  topNews: NewsItem[]
  marketFactors: string[]
  timestamp: string
}

export interface MarketUpdate {
  symbol?: string
  updateType: 'price_alert' | 'news_alert' | 'sentiment_change' | 'technical_signal'
  message: string
  severity: 'low' | 'medium' | 'high'
  data?: any
  timestamp: string
}

export class MarketIntelligenceEngine {
  private static instance: MarketIntelligenceEngine
  private sentimentCache: Map<string, MarketSentiment> = new Map()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  static getInstance(): MarketIntelligenceEngine {
    if (!MarketIntelligenceEngine.instance) {
      MarketIntelligenceEngine.instance = new MarketIntelligenceEngine()
    }
    return MarketIntelligenceEngine.instance
  }

  /**
   * Analyze market sentiment for a specific symbol or overall market
   */
  async analyzeMarketSentiment(symbol?: string, forceRefresh = false): Promise<MarketSentiment> {
    const cacheKey = symbol || 'MARKET_OVERALL'
    
    // Check cache first
    if (!forceRefresh && this.sentimentCache.has(cacheKey)) {
      const cached = this.sentimentCache.get(cacheKey)!
      const age = Date.now() - new Date(cached.timestamp).getTime()
      if (age < this.cacheTimeout) {
        return cached
      }
    }

    try {
      console.log(`🔍 Analyzing market sentiment for: ${symbol || 'Overall Market'}`)
      
      // Search for recent news
      const searchQuery = symbol 
        ? `${symbol} stock news market analysis today`
        : 'stock market news today market sentiment analysis'
      
      const newsResults = await webSearch.searchWeb(searchQuery)
      
      // Process news items and analyze sentiment
      const processedNews: NewsItem[] = await this.processNewsItems(newsResults, symbol)
      
      // Calculate overall sentiment
      const sentiment = this.calculateOverallSentiment(processedNews)
      
      // Cache the result
      this.sentimentCache.set(cacheKey, sentiment)
      
      return sentiment

    } catch (error) {
      console.error('❌ Market sentiment analysis error:', error)
      
      // Return fallback sentiment
      return {
        overall: 'neutral',
        score: 0,
        confidence: 50,
        newsCount: 0,
        topNews: [],
        marketFactors: ['Unable to fetch current market sentiment'],
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Process raw news items and assign sentiment scores
   */
  private async processNewsItems(newsResults: any[], symbol?: string): Promise<NewsItem[]> {
    const processedNews: NewsItem[] = []

    for (const item of newsResults.slice(0, 10)) { // Process top 10 news items
      try {
        const newsItem: NewsItem = {
          title: item.title || '',
          snippet: item.snippet || '',
          url: item.link || '',
          source: item.displayLink || '',
          publishDate: item.formattedUrl || '',
          sentiment: this.analyzeSentiment(item.title + ' ' + item.snippet),
          sentimentScore: this.calculateSentimentScore(item.title + ' ' + item.snippet),
          relevance: symbol ? this.calculateRelevance(item.title + ' ' + item.snippet, symbol) : 1.0
        }

        processedNews.push(newsItem)
      } catch (error) {
        console.error('Error processing news item:', error)
      }
    }

    return processedNews.sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
  }

  /**
   * Analyze sentiment of text using keyword-based approach
   */
  private analyzeSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
    const lowerText = text.toLowerCase()
    
    const bullishKeywords = [
      'up', 'rise', 'gain', 'bull', 'positive', 'growth', 'increase', 'rally', 
      'surge', 'boost', 'strong', 'outperform', 'buy', 'upgrade', 'beat', 
      'exceed', 'record', 'high', 'breakthrough', 'success', 'profit', 'revenue'
    ]
    
    const bearishKeywords = [
      'down', 'fall', 'drop', 'bear', 'negative', 'decline', 'decrease', 'crash',
      'plunge', 'weak', 'underperform', 'sell', 'downgrade', 'miss', 'loss',
      'low', 'concern', 'risk', 'warning', 'cut', 'reduce', 'disappointing'
    ]

    let bullishScore = 0
    let bearishScore = 0

    bullishKeywords.forEach(keyword => {
      const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length
      bullishScore += matches
    })

    bearishKeywords.forEach(keyword => {
      const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length
      bearishScore += matches
    })

    if (bullishScore > bearishScore && bullishScore > 0) return 'bullish'
    if (bearishScore > bullishScore && bearishScore > 0) return 'bearish'
    return 'neutral'
  }

  /**
   * Calculate numerical sentiment score (-1 to 1)
   */
  private calculateSentimentScore(text: string): number {
    const sentiment = this.analyzeSentiment(text)
    const lowerText = text.toLowerCase()
    
    // Count positive and negative words
    const positiveWords = (lowerText.match(/\b(good|great|excellent|positive|strong|growth|profit|success|beat|outperform|rally|surge|boost|high|record)\b/g) || []).length
    const negativeWords = (lowerText.match(/\b(bad|poor|negative|weak|loss|decline|fall|drop|miss|underperform|crash|low|concern|risk|warning)\b/g) || []).length
    
    const totalWords = positiveWords + negativeWords
    if (totalWords === 0) return 0
    
    const score = (positiveWords - negativeWords) / Math.max(totalWords, 1)
    return Math.max(-1, Math.min(1, score))
  }

  /**
   * Calculate relevance score for news item to specific symbol
   */
  private calculateRelevance(text: string, symbol: string): number {
    const lowerText = text.toLowerCase()
    const lowerSymbol = symbol.toLowerCase()
    
    let relevance = 0
    
    // Direct symbol mention
    if (lowerText.includes(lowerSymbol)) relevance += 1.0
    
    // Company name mapping (simplified)
    const companyNames: Record<string, string[]> = {
      'aapl': ['apple', 'iphone', 'ipad', 'mac'],
      'tsla': ['tesla', 'elon musk', 'electric vehicle', 'ev'],
      'msft': ['microsoft', 'windows', 'azure', 'office'],
      'googl': ['google', 'alphabet', 'search', 'youtube'],
      'amzn': ['amazon', 'aws', 'prime', 'bezos'],
      'meta': ['facebook', 'instagram', 'whatsapp', 'metaverse'],
      'nvda': ['nvidia', 'gpu', 'ai chip', 'gaming'],
      'nflx': ['netflix', 'streaming', 'content']
    }
    
    const names = companyNames[lowerSymbol] || []
    names.forEach(name => {
      if (lowerText.includes(name)) relevance += 0.8
    })
    
    // Industry relevance
    if (lowerText.includes('tech') || lowerText.includes('technology')) relevance += 0.3
    if (lowerText.includes('stock') || lowerText.includes('market')) relevance += 0.2
    
    return Math.min(relevance, 1.0)
  }

  /**
   * Calculate overall market sentiment from processed news
   */
  private calculateOverallSentiment(newsItems: NewsItem[]): MarketSentiment {
    if (newsItems.length === 0) {
      return {
        overall: 'neutral',
        score: 0,
        confidence: 0,
        newsCount: 0,
        topNews: [],
        marketFactors: ['No recent news available'],
        timestamp: new Date().toISOString()
      }
    }

    // Weight by relevance and calculate scores
    let totalScore = 0
    let totalWeight = 0
    const sentimentCounts = { bullish: 0, bearish: 0, neutral: 0 }

    newsItems.forEach(item => {
      const weight = item.relevance || 1.0
      const score = item.sentimentScore || 0
      
      totalScore += score * weight
      totalWeight += weight
      
      if (item.sentiment) {
        sentimentCounts[item.sentiment]++
      }
    })

    const averageScore = totalWeight > 0 ? totalScore / totalWeight : 0
    
    // Determine overall sentiment
    let overall: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (averageScore > 0.1) overall = 'bullish'
    else if (averageScore < -0.1) overall = 'bearish'

    // Calculate confidence based on consensus
    const maxCount = Math.max(sentimentCounts.bullish, sentimentCounts.bearish, sentimentCounts.neutral)
    const confidence = newsItems.length > 0 ? (maxCount / newsItems.length) * 100 : 0

    // Extract market factors
    const marketFactors = this.extractMarketFactors(newsItems)

    return {
      overall,
      score: Math.round(averageScore * 100) / 100,
      confidence: Math.round(confidence),
      newsCount: newsItems.length,
      topNews: newsItems.slice(0, 5),
      marketFactors,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Extract key market factors from news items
   */
  private extractMarketFactors(newsItems: NewsItem[]): string[] {
    const factors: string[] = []
    const factorKeywords = {
      'Earnings Reports': ['earnings', 'quarterly', 'revenue', 'profit'],
      'Federal Reserve': ['fed', 'federal reserve', 'interest rate', 'monetary policy'],
      'Economic Data': ['gdp', 'inflation', 'unemployment', 'economic'],
      'Geopolitical Events': ['war', 'trade', 'china', 'russia', 'political'],
      'Market Volatility': ['volatility', 'vix', 'uncertainty', 'selloff'],
      'Technology Trends': ['ai', 'artificial intelligence', 'tech', 'innovation'],
      'Energy Markets': ['oil', 'energy', 'crude', 'gas'],
      'Banking Sector': ['bank', 'financial', 'credit', 'lending']
    }

    for (const [factor, keywords] of Object.entries(factorKeywords)) {
      const mentioned = newsItems.some(item => {
        const text = (item.title + ' ' + item.snippet).toLowerCase()
        return keywords.some(keyword => text.includes(keyword))
      })
      
      if (mentioned) {
        factors.push(factor)
      }
    }

    return factors.length > 0 ? factors : ['General Market Activity']
  }

  /**
   * Generate real-time market updates
   */
  generateMarketUpdate(type: 'price_alert' | 'news_alert' | 'sentiment_change' | 'technical_signal', data: any): MarketUpdate {
    const messages = {
      price_alert: `${data.symbol} price movement: ${data.change > 0 ? '+' : ''}${data.change.toFixed(2)}%`,
      news_alert: `Breaking news affecting ${data.symbol || 'market'}: ${data.headline}`,
      sentiment_change: `Market sentiment for ${data.symbol || 'overall market'} shifted to ${data.sentiment}`,
      technical_signal: `Technical signal for ${data.symbol}: ${data.signal} at ${data.price}`
    }

    return {
      symbol: data.symbol,
      updateType: type,
      message: messages[type],
      severity: this.calculateSeverity(type, data),
      data,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Calculate severity of market update
   */
  private calculateSeverity(type: string, data: any): 'low' | 'medium' | 'high' {
    switch (type) {
      case 'price_alert':
        const change = Math.abs(data.change || 0)
        if (change > 5) return 'high'
        if (change > 2) return 'medium'
        return 'low'
      
      case 'sentiment_change':
        return data.confidence > 80 ? 'high' : 'medium'
      
      case 'news_alert':
        return data.impact === 'major' ? 'high' : 'medium'
      
      default:
        return 'medium'
    }
  }

  /**
   * Get market intelligence summary
   */
  async getMarketIntelligenceSummary(symbols: string[] = []): Promise<{
    overallSentiment: MarketSentiment
    symbolSentiments: Record<string, MarketSentiment>
    marketFactors: string[]
    recentUpdates: MarketUpdate[]
  }> {
    try {
      // Get overall market sentiment
      const overallSentiment = await this.analyzeMarketSentiment()
      
      // Get sentiment for specific symbols
      const symbolSentiments: Record<string, MarketSentiment> = {}
      for (const symbol of symbols) {
        symbolSentiments[symbol] = await this.analyzeMarketSentiment(symbol)
      }
      
      // Combine market factors
      const allFactors = new Set([
        ...overallSentiment.marketFactors,
        ...Object.values(symbolSentiments).flatMap(s => s.marketFactors)
      ])
      
      // Generate recent updates (simulated for demo)
      const recentUpdates: MarketUpdate[] = [
        this.generateMarketUpdate('sentiment_change', {
          sentiment: overallSentiment.overall,
          confidence: overallSentiment.confidence
        })
      ]

      return {
        overallSentiment,
        symbolSentiments,
        marketFactors: Array.from(allFactors),
        recentUpdates
      }

    } catch (error) {
      console.error('❌ Market intelligence summary error:', error)
      throw error
    }
  }
}

// Export singleton instance
export const marketIntelligence = MarketIntelligenceEngine.getInstance()

