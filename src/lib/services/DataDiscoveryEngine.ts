import { FilterCriteria } from '@/types/screener'
import { SearchResult } from './UniversalSearchAPI'
import { CrawledStockData } from './FinancialSiteCrawler'

export interface QueryExpansion {
  originalQuery: string
  expandedQueries: string[]
  semanticQueries: string[]
  contextualQueries: string[]
  synonyms: string[]
  relatedTerms: string[]
}

export interface SemanticSearchResult {
  query: string
  results: SearchResult[]
  semanticScore: number
  contextRelevance: number
  temporalRelevance: number
}

export interface DiscoveryContext {
  userIntent: string
  searchHistory: string[]
  marketContext: {
    trending: string[]
    sectors: string[]
    events: string[]
  }
  temporalContext: {
    timeframe: string
    marketHours: boolean
    tradingDay: boolean
  }
}

export interface IntelligentQuery {
  original: string
  refined: string
  confidence: number
  intent: string
  entities: string[]
  sentiment: 'positive' | 'negative' | 'neutral'
  urgency: 'low' | 'medium' | 'high'
}

export class DataDiscoveryEngine {
  private queryCache: Map<string, QueryExpansion> = new Map()
  private semanticCache: Map<string, SemanticSearchResult[]> = new Map()
  private contextHistory: DiscoveryContext[] = []
  private financialTerms: Map<string, string[]> = new Map()
  private marketEvents: Map<string, { keywords: string[]; weight: number }> = new Map()
  private readonly cacheTimeout = 600000 // 10 minutes

  constructor() {
    this.initializeFinancialTerms()
    this.initializeMarketEvents()
  }

  private initializeFinancialTerms() {
    const terms = {
      'stock': ['equity', 'share', 'security', 'ticker', 'symbol'],
      'price': ['value', 'cost', 'quote', 'rate', 'level'],
      'earnings': ['profit', 'income', 'revenue', 'eps', 'quarterly results'],
      'market': ['exchange', 'trading', 'marketplace', 'bourse'],
      'analysis': ['research', 'study', 'evaluation', 'assessment', 'review'],
      'growth': ['expansion', 'increase', 'rise', 'development', 'progress'],
      'dividend': ['payout', 'distribution', 'yield', 'income'],
      'volatility': ['fluctuation', 'instability', 'variation', 'risk'],
      'volume': ['trading volume', 'liquidity', 'activity', 'turnover'],
      'capitalization': ['market cap', 'valuation', 'worth', 'size'],
      'sector': ['industry', 'vertical', 'segment', 'category'],
      'performance': ['returns', 'results', 'outcome', 'achievement'],
      'forecast': ['prediction', 'projection', 'outlook', 'estimate'],
      'trend': ['direction', 'pattern', 'movement', 'trajectory'],
      'investment': ['portfolio', 'holding', 'position', 'allocation']
    }

    Object.entries(terms).forEach(([key, synonyms]) => {
      this.financialTerms.set(key, synonyms)
    })
  }

  private initializeMarketEvents() {
    const events = {
      'earnings_season': {
        keywords: ['earnings', 'quarterly', 'results', 'eps', 'guidance'],
        weight: 1.5
      },
      'fed_meeting': {
        keywords: ['federal reserve', 'interest rates', 'monetary policy', 'fed'],
        weight: 1.3
      },
      'market_volatility': {
        keywords: ['volatility', 'vix', 'uncertainty', 'risk'],
        weight: 1.2
      },
      'sector_rotation': {
        keywords: ['sector rotation', 'rebalancing', 'allocation'],
        weight: 1.1
      },
      'ipo': {
        keywords: ['initial public offering', 'ipo', 'listing', 'debut'],
        weight: 1.4
      },
      'merger_acquisition': {
        keywords: ['merger', 'acquisition', 'takeover', 'deal'],
        weight: 1.3
      }
    }

    Object.entries(events).forEach(([key, event]) => {
      this.marketEvents.set(key, event)
    })
  }

  async discoverData(
    query: string,
    context?: Partial<DiscoveryContext>,
    options: {
      enableSemanticSearch?: boolean
      enableQueryExpansion?: boolean
      enableContextualSearch?: boolean
      maxResults?: number
    } = {}
  ): Promise<{
    intelligentQuery: IntelligentQuery
    queryExpansion: QueryExpansion
    semanticResults: SemanticSearchResult[]
    discoveryInsights: any
  }> {
    const startTime = Date.now()
    
    const config = {
      enableSemanticSearch: true,
      enableQueryExpansion: true,
      enableContextualSearch: true,
      maxResults: 50,
      ...options
    }

    try {
      // Step 1: Analyze and refine the query
      const intelligentQuery = await this.analyzeQuery(query, context)
      
      // Step 2: Expand the query with related terms
      const queryExpansion = config.enableQueryExpansion 
        ? await this.expandQuery(query, context)
        : this.createBasicExpansion(query)
      
      // Step 3: Perform semantic search
      const semanticResults = config.enableSemanticSearch
        ? await this.performSemanticSearch(queryExpansion, context)
        : []
      
      // Step 4: Generate discovery insights
      const discoveryInsights = this.generateDiscoveryInsights(
        intelligentQuery,
        queryExpansion,
        semanticResults,
        context
      )
      
      // Update context history
      if (context) {
        this.updateContextHistory(context)
      }
      
      return {
        intelligentQuery,
        queryExpansion,
        semanticResults,
        discoveryInsights
      }
    } catch (error) {
      console.error('Data discovery error:', error)
      throw new Error(`Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async analyzeQuery(query: string, context?: Partial<DiscoveryContext>): Promise<IntelligentQuery> {
    // Extract entities (tickers, company names, financial terms)
    const entities = this.extractEntities(query)
    
    // Determine user intent
    const intent = this.determineIntent(query, entities)
    
    // Analyze sentiment
    const sentiment = this.analyzeSentiment(query)
    
    // Determine urgency
    const urgency = this.determineUrgency(query, context)
    
    // Refine the query
    const refined = this.refineQuery(query, intent, entities)
    
    // Calculate confidence
    const confidence = this.calculateQueryConfidence(query, entities, intent)
    
    return {
      original: query,
      refined,
      confidence,
      intent,
      entities,
      sentiment,
      urgency
    }
  }

  private extractEntities(query: string): string[] {
    const entities: string[] = []
    
    // Extract stock tickers (1-5 uppercase letters)
    const tickerPattern = /\b[A-Z]{1,5}\b/g
    const tickers = query.match(tickerPattern) || []
    entities.push(...tickers.filter(ticker => this.isValidTicker(ticker)))
    
    // Extract company names (capitalized words)
    const companyPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
    const companies = query.match(companyPattern) || []
    entities.push(...companies.filter(company => this.isLikelyCompanyName(company)))
    
    // Extract financial terms
    const queryLower = query.toLowerCase()
    Array.from(this.financialTerms.entries()).forEach(([term, synonyms]) => {
      if (queryLower.includes(term) || synonyms.some(syn => queryLower.includes(syn))) {
        entities.push(term)
      }
    })
    
    return Array.from(new Set(entities))
  }

  private determineIntent(query: string, entities: string[]): string {
    const queryLower = query.toLowerCase()
    
    // Price inquiry
    if (queryLower.includes('price') || queryLower.includes('quote') || queryLower.includes('cost')) {
      return 'price_inquiry'
    }
    
    // Analysis request
    if (queryLower.includes('analysis') || queryLower.includes('research') || queryLower.includes('study')) {
      return 'analysis_request'
    }
    
    // News and updates
    if (queryLower.includes('news') || queryLower.includes('update') || queryLower.includes('latest')) {
      return 'news_inquiry'
    }
    
    // Performance comparison
    if (queryLower.includes('compare') || queryLower.includes('vs') || queryLower.includes('versus')) {
      return 'comparison_request'
    }
    
    // Screening/filtering
    if (queryLower.includes('find') || queryLower.includes('search') || queryLower.includes('filter')) {
      return 'screening_request'
    }
    
    // Earnings information
    if (queryLower.includes('earnings') || queryLower.includes('eps') || queryLower.includes('quarterly')) {
      return 'earnings_inquiry'
    }
    
    // General information
    return 'general_inquiry'
  }

  private analyzeSentiment(query: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'excellent', 'strong', 'bullish', 'growth', 'profit', 'gain', 'rise', 'up']
    const negativeWords = ['bad', 'poor', 'weak', 'bearish', 'loss', 'decline', 'fall', 'down', 'crash', 'drop']
    
    const queryLower = query.toLowerCase()
    const positiveCount = positiveWords.filter(word => queryLower.includes(word)).length
    const negativeCount = negativeWords.filter(word => queryLower.includes(word)).length
    
    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  }

  private determineUrgency(query: string, context?: Partial<DiscoveryContext>): 'low' | 'medium' | 'high' {
    const queryLower = query.toLowerCase()
    
    // High urgency indicators
    const highUrgencyWords = ['urgent', 'immediate', 'now', 'asap', 'breaking', 'alert', 'crash', 'surge']
    if (highUrgencyWords.some(word => queryLower.includes(word))) {
      return 'high'
    }
    
    // Medium urgency indicators
    const mediumUrgencyWords = ['today', 'current', 'latest', 'recent', 'live', 'real-time']
    if (mediumUrgencyWords.some(word => queryLower.includes(word))) {
      return 'medium'
    }
    
    // Market hours context
    if (context?.temporalContext?.marketHours) {
      return 'medium'
    }
    
    return 'low'
  }

  private refineQuery(query: string, intent: string, entities: string[]): string {
    let refined = query
    
    // Add context based on intent
    switch (intent) {
      case 'price_inquiry':
        refined += ' stock price quote current'
        break
      case 'analysis_request':
        refined += ' financial analysis research report'
        break
      case 'news_inquiry':
        refined += ' news updates latest information'
        break
      case 'earnings_inquiry':
        refined += ' earnings report quarterly results'
        break
    }
    
    // Add financial context
    if (entities.some(entity => this.isValidTicker(entity))) {
      refined += ' stock market financial'
    }
    
    return refined.trim()
  }

  private calculateQueryConfidence(query: string, entities: string[], intent: string): number {
    let confidence = 0.5 // Base confidence
    
    // Entity recognition bonus
    if (entities.length > 0) {
      confidence += Math.min(entities.length * 0.1, 0.3)
    }
    
    // Intent clarity bonus
    if (intent !== 'general_inquiry') {
      confidence += 0.2
    }
    
    // Query length and structure
    const words = query.split(/\s+/)
    if (words.length >= 3 && words.length <= 10) {
      confidence += 0.1
    }
    
    // Financial terms bonus
    const financialTermCount = entities.filter(entity => 
      this.financialTerms.has(entity.toLowerCase())
    ).length
    confidence += Math.min(financialTermCount * 0.05, 0.15)
    
    return Math.min(confidence, 1.0)
  }

  async expandQuery(query: string, context?: Partial<DiscoveryContext>): Promise<QueryExpansion> {
    const cacheKey = `${query}_${JSON.stringify(context || {})}`
    const cached = this.queryCache.get(cacheKey)
    if (cached) {
      return cached
    }
    
    const expandedQueries: string[] = []
    const semanticQueries: string[] = []
    const contextualQueries: string[] = []
    const synonyms: string[] = []
    const relatedTerms: string[] = []
    
    // Generate synonym-based expansions
    const queryWords = query.toLowerCase().split(/\s+/)
    for (const word of queryWords) {
      const termSynonyms = this.financialTerms.get(word) || []
      synonyms.push(...termSynonyms)
      
      // Create expanded queries with synonyms
      for (const synonym of termSynonyms.slice(0, 2)) {
        const expandedQuery = query.replace(new RegExp(word, 'gi'), synonym)
        expandedQueries.push(expandedQuery)
      }
    }
    
    // Generate semantic variations
    semanticQueries.push(
      `${query} financial data`,
      `${query} market information`,
      `${query} investment analysis`,
      `${query} stock research`
    )
    
    // Generate contextual queries based on market events
    Array.from(this.marketEvents.entries()).forEach(([event, eventData]) => {
      if (eventData.keywords.some(keyword => 
        query.toLowerCase().includes(keyword.toLowerCase())
      )) {
        contextualQueries.push(`${query} ${event.replace('_', ' ')}`)
        relatedTerms.push(...eventData.keywords)
      }
    })
    
    // Add temporal context
    if (context?.temporalContext) {
      if (context.temporalContext.marketHours) {
        contextualQueries.push(`${query} live trading`)
      }
      if (context.temporalContext.tradingDay) {
        contextualQueries.push(`${query} today market`)
      }
    }
    
    // Add sector context
    if (context?.marketContext?.sectors) {
      for (const sector of context.marketContext.sectors.slice(0, 2)) {
        contextualQueries.push(`${query} ${sector} sector`)
      }
    }
    
    const expansion: QueryExpansion = {
      originalQuery: query,
      expandedQueries: Array.from(new Set(expandedQueries)).slice(0, 10),
      semanticQueries: Array.from(new Set(semanticQueries)).slice(0, 8),
      contextualQueries: Array.from(new Set(contextualQueries)).slice(0, 6),
      synonyms: Array.from(new Set(synonyms)).slice(0, 15),
      relatedTerms: Array.from(new Set(relatedTerms)).slice(0, 12)
    }
    
    this.queryCache.set(cacheKey, expansion)
    return expansion
  }

  private createBasicExpansion(query: string): QueryExpansion {
    return {
      originalQuery: query,
      expandedQueries: [query],
      semanticQueries: [query],
      contextualQueries: [query],
      synonyms: [],
      relatedTerms: []
    }
  }

  async performSemanticSearch(
    expansion: QueryExpansion,
    context?: Partial<DiscoveryContext>
  ): Promise<SemanticSearchResult[]> {
    const results: SemanticSearchResult[] = []
    
    // Search with expanded queries
    const allQueries = [
      ...expansion.expandedQueries,
      ...expansion.semanticQueries,
      ...expansion.contextualQueries
    ]
    
    for (const query of allQueries.slice(0, 8)) {
      try {
        // This would integrate with the UniversalSearchAPI
        // For now, we'll create a placeholder result
        const semanticResult: SemanticSearchResult = {
          query,
          results: [], // Would be populated by actual search
          semanticScore: this.calculateSemanticScore(query, expansion.originalQuery),
          contextRelevance: this.calculateContextRelevance(query, context),
          temporalRelevance: this.calculateTemporalRelevance(query, context)
        }
        
        results.push(semanticResult)
      } catch (error) {
        console.error(`Semantic search error for query "${query}":`, error)
      }
    }
    
    return results.sort((a, b) => 
      (b.semanticScore + b.contextRelevance + b.temporalRelevance) - 
      (a.semanticScore + a.contextRelevance + a.temporalRelevance)
    )
  }

  private calculateSemanticScore(query: string, originalQuery: string): number {
    const queryWords = query.toLowerCase().split(/\s+/)
    const originalWords = originalQuery.toLowerCase().split(/\s+/)
    
    const commonWords = queryWords.filter(word => originalWords.includes(word))
    const semanticSimilarity = commonWords.length / Math.max(queryWords.length, originalWords.length)
    
    return Math.min(semanticSimilarity + 0.3, 1.0)
  }

  private calculateContextRelevance(query: string, context?: Partial<DiscoveryContext>): number {
    if (!context) return 0.5
    
    let relevance = 0.5
    
    // Market context relevance
    if (context.marketContext) {
      const { trending, sectors, events } = context.marketContext
      const queryLower = query.toLowerCase()
      
      if (trending.some(trend => queryLower.includes(trend.toLowerCase()))) {
        relevance += 0.2
      }
      
      if (sectors.some(sector => queryLower.includes(sector.toLowerCase()))) {
        relevance += 0.15
      }
      
      if (events.some(event => queryLower.includes(event.toLowerCase()))) {
        relevance += 0.1
      }
    }
    
    return Math.min(relevance, 1.0)
  }

  private calculateTemporalRelevance(query: string, context?: Partial<DiscoveryContext>): number {
    if (!context?.temporalContext) return 0.5
    
    let relevance = 0.5
    const queryLower = query.toLowerCase()
    
    // Real-time relevance
    if (context.temporalContext.marketHours && 
        (queryLower.includes('live') || queryLower.includes('current'))) {
      relevance += 0.3
    }
    
    // Trading day relevance
    if (context.temporalContext.tradingDay && 
        (queryLower.includes('today') || queryLower.includes('now'))) {
      relevance += 0.2
    }
    
    return Math.min(relevance, 1.0)
  }

  generateDiscoveryInsights(
    intelligentQuery: IntelligentQuery,
    expansion: QueryExpansion,
    semanticResults: SemanticSearchResult[],
    context?: Partial<DiscoveryContext>
  ): any {
    return {
      queryAnalysis: {
        complexity: this.assessQueryComplexity(intelligentQuery),
        specificity: this.assessQuerySpecificity(intelligentQuery),
        marketRelevance: this.assessMarketRelevance(intelligentQuery, context)
      },
      expansionEffectiveness: {
        synonymCount: expansion.synonyms.length,
        semanticVariations: expansion.semanticQueries.length,
        contextualEnhancements: expansion.contextualQueries.length
      },
      searchStrategy: {
        recommendedApproach: this.recommendSearchStrategy(intelligentQuery),
        prioritySources: this.identifyPrioritySources(intelligentQuery),
        timeframe: this.suggestTimeframe(intelligentQuery, context)
      },
      insights: {
        userIntent: intelligentQuery.intent,
        confidence: intelligentQuery.confidence,
        urgency: intelligentQuery.urgency,
        sentiment: intelligentQuery.sentiment
      }
    }
  }

  private assessQueryComplexity(query: IntelligentQuery): 'low' | 'medium' | 'high' {
    const factors = [
      query.entities.length > 3,
      query.original.split(/\s+/).length > 8,
      query.intent === 'comparison_request',
      query.original.includes('and') || query.original.includes('or')
    ]
    
    const complexityScore = factors.filter(Boolean).length
    if (complexityScore >= 3) return 'high'
    if (complexityScore >= 2) return 'medium'
    return 'low'
  }

  private assessQuerySpecificity(query: IntelligentQuery): 'low' | 'medium' | 'high' {
    if (query.entities.length >= 2 && query.confidence > 0.8) return 'high'
    if (query.entities.length >= 1 && query.confidence > 0.6) return 'medium'
    return 'low'
  }

  private assessMarketRelevance(query: IntelligentQuery, context?: Partial<DiscoveryContext>): number {
    let relevance = 0.5
    
    // Financial entities boost relevance
    const financialEntities = query.entities.filter(entity => 
      this.isValidTicker(entity) || this.financialTerms.has(entity.toLowerCase())
    )
    relevance += Math.min(financialEntities.length * 0.1, 0.3)
    
    // Market context boost
    if (context?.marketContext) {
      relevance += 0.2
    }
    
    return Math.min(relevance, 1.0)
  }

  private recommendSearchStrategy(query: IntelligentQuery): string {
    switch (query.intent) {
      case 'price_inquiry':
        return 'real_time_data'
      case 'analysis_request':
        return 'comprehensive_research'
      case 'news_inquiry':
        return 'news_aggregation'
      case 'comparison_request':
        return 'comparative_analysis'
      case 'screening_request':
        return 'filtered_search'
      default:
        return 'general_search'
    }
  }

  private identifyPrioritySources(query: IntelligentQuery): string[] {
    const sources = ['yahoo', 'marketwatch', 'bloomberg']
    
    switch (query.intent) {
      case 'price_inquiry':
        return ['yahoo', 'marketwatch', 'nasdaq']
      case 'analysis_request':
        return ['seekingalpha', 'morningstar', 'zacks']
      case 'news_inquiry':
        return ['reuters', 'bloomberg', 'cnbc']
      default:
        return sources
    }
  }

  private suggestTimeframe(query: IntelligentQuery, context?: Partial<DiscoveryContext>): string {
    if (query.urgency === 'high') return 'real_time'
    if (query.urgency === 'medium') return 'intraday'
    if (query.intent === 'analysis_request') return 'historical'
    return 'recent'
  }

  private updateContextHistory(context: Partial<DiscoveryContext>): void {
    const fullContext: DiscoveryContext = {
      userIntent: 'general',
      searchHistory: [],
      marketContext: {
        trending: [],
        sectors: [],
        events: []
      },
      temporalContext: {
        timeframe: 'current',
        marketHours: false,
        tradingDay: false
      },
      ...context
    }
    
    this.contextHistory.push(fullContext)
    
    // Keep only recent history
    if (this.contextHistory.length > 50) {
      this.contextHistory = this.contextHistory.slice(-50)
    }
  }

  private isValidTicker(ticker: string): boolean {
    const blacklist = ['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'HAD', 'BY', 'UP', 'DO', 'NO', 'IF', 'MY', 'ON', 'AS', 'WE', 'HE', 'BE', 'TO', 'OF', 'IT', 'IS', 'IN', 'AT', 'OR', 'AN', 'A', 'I']
    return ticker.length >= 1 && ticker.length <= 5 && !blacklist.includes(ticker.toUpperCase())
  }

  private isLikelyCompanyName(name: string): boolean {
    const companyIndicators = ['Inc', 'Corp', 'Ltd', 'LLC', 'Company', 'Group', 'Holdings', 'Technologies', 'Systems', 'Solutions']
    return companyIndicators.some(indicator => name.includes(indicator)) || 
           (name.length > 3 && /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(name))
  }

  // Public methods
  clearCache(): void {
    this.queryCache.clear()
    this.semanticCache.clear()
  }

  getContextHistory(): DiscoveryContext[] {
    return [...this.contextHistory]
  }

  getFinancialTerms(): Map<string, string[]> {
    return new Map(this.financialTerms)
  }
}

export const dataDiscoveryEngine = new DataDiscoveryEngine()