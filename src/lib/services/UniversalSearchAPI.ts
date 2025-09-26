import { WebSearch } from '@/lib/web-search'
import { FilterCriteria } from '@/types/screener'
import { CrawledStockData } from './FinancialSiteCrawler'

export interface SearchOperator {
  name: string
  operator: string
  description: string
  examples: string[]
}

export interface SearchResult {
  title: string
  url: string
  snippet: string
  relevanceScore: number
  source: string
  extractedData?: any
  timestamp: string
}

export interface RankedSearchResults {
  results: SearchResult[]
  totalResults: number
  searchTime: number
  query: string
  refinedQuery: string
  suggestions: string[]
}

export interface SearchConfig {
  maxResults: number
  includeSnippets: boolean
  enableRanking: boolean
  sources: string[]
  operators: string[]
  timeout: number
}

export class UniversalSearchAPI {
  private webSearch: WebSearch
  private searchOperators: Map<string, SearchOperator> = new Map()
  private domainReliability: Map<string, number> = new Map()
  private searchCache: Map<string, { results: RankedSearchResults; timestamp: number }> = new Map()
  private readonly cacheTimeout = 300000 // 5 minutes

  constructor() {
    this.webSearch = new WebSearch()
    this.initializeSearchOperators()
    this.initializeDomainReliability()
  }

  private initializeSearchOperators() {
    const operators: SearchOperator[] = [
      {
        name: 'site',
        operator: 'site:',
        description: 'Search within specific financial websites',
        examples: ['site:finance.yahoo.com AAPL', 'site:marketwatch.com Tesla stock']
      },
      {
        name: 'intitle',
        operator: 'intitle:',
        description: 'Search for terms in page titles',
        examples: ['intitle:"stock price" MSFT', 'intitle:earnings GOOGL']
      },
      {
        name: 'inurl',
        operator: 'inurl:',
        description: 'Search for terms in URLs',
        examples: ['inurl:quote AMZN', 'inurl:financials TSLA']
      },
      {
        name: 'filetype',
        operator: 'filetype:',
        description: 'Search for specific file types',
        examples: ['filetype:pdf annual report AAPL', 'filetype:xlsx earnings MSFT']
      },
      {
        name: 'daterange',
        operator: 'after: before:',
        description: 'Search within date ranges',
        examples: ['AAPL earnings after:2023-01-01', 'Tesla news before:2023-12-31']
      },
      {
        name: 'related',
        operator: 'related:',
        description: 'Find related financial websites',
        examples: ['related:finance.yahoo.com', 'related:marketwatch.com']
      },
      {
        name: 'cache',
        operator: 'cache:',
        description: 'View cached versions of financial pages',
        examples: ['cache:finance.yahoo.com/quote/AAPL']
      },
      {
        name: 'define',
        operator: 'define:',
        description: 'Get definitions of financial terms',
        examples: ['define:P/E ratio', 'define:market capitalization']
      }
    ]

    operators.forEach(op => this.searchOperators.set(op.name, op))
  }

  private initializeDomainReliability() {
    // Reliability scores for financial data sources (0-1)
    const domains = {
      'finance.yahoo.com': 0.95,
      'marketwatch.com': 0.90,
      'bloomberg.com': 0.95,
      'reuters.com': 0.90,
      'cnbc.com': 0.85,
      'finviz.com': 0.85,
      'investing.com': 0.80,
      'seekingalpha.com': 0.75,
      'fool.com': 0.70,
      'zacks.com': 0.75,
      'morningstar.com': 0.85,
      'sec.gov': 0.98,
      'nasdaq.com': 0.90,
      'nyse.com': 0.90,
      'wsj.com': 0.92,
      'ft.com': 0.88,
      'barrons.com': 0.85,
      'kiplinger.com': 0.75,
      'investopedia.com': 0.80,
      'reddit.com': 0.60
    }

    Object.entries(domains).forEach(([domain, score]) => {
      this.domainReliability.set(domain, score)
    })
  }

  async universalSearch(
    query: string,
    filters?: FilterCriteria,
    config: Partial<SearchConfig> = {}
  ): Promise<RankedSearchResults> {
    const startTime = Date.now()
    
    const searchConfig: SearchConfig = {
      maxResults: 50,
      includeSnippets: true,
      enableRanking: true,
      sources: ['google', 'financial_sites'],
      operators: ['site', 'intitle', 'inurl'],
      timeout: 10000,
      ...config
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(query, filters, searchConfig)
    const cached = this.searchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.results
    }

    try {
      // Build enhanced query with operators
      const enhancedQuery = this.buildEnhancedQuery(query, filters, searchConfig)
      
      // Perform parallel searches
      const searchPromises = [
        this.performGoogleSearch(enhancedQuery, searchConfig),
        this.performFinancialSiteSearch(query, filters, searchConfig)
      ]

      const searchResults = await Promise.allSettled(searchPromises)
      const allResults: SearchResult[] = []

      // Collect results from all sources
      for (const result of searchResults) {
        if (result.status === 'fulfilled') {
          allResults.push(...result.value)
        }
      }

      // Rank and filter results
      const rankedResults = searchConfig.enableRanking 
        ? this.rankSearchResults(allResults, query, filters)
        : allResults

      // Generate search suggestions
      const suggestions = this.generateSearchSuggestions(query, filters, rankedResults)

      const finalResults: RankedSearchResults = {
        results: rankedResults.slice(0, searchConfig.maxResults),
        totalResults: rankedResults.length,
        searchTime: Date.now() - startTime,
        query,
        refinedQuery: enhancedQuery,
        suggestions
      }

      // Cache results
      this.searchCache.set(cacheKey, {
        results: finalResults,
        timestamp: Date.now()
      })

      return finalResults
    } catch (error) {
      console.error('Universal search error:', error)
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private buildEnhancedQuery(query: string, filters?: FilterCriteria, config?: SearchConfig): string {
    let enhancedQuery = query
    const operators = config?.operators || []

    // Add site operators for financial websites
    if (operators.includes('site')) {
      const financialSites = [
        'finance.yahoo.com',
        'marketwatch.com',
        'finviz.com',
        'investing.com',
        'seekingalpha.com'
      ]
      
      const siteOperators = financialSites.map(site => `site:${site}`).join(' OR ')
      enhancedQuery += ` (${siteOperators})`
    }

    // Add title operators for better relevance
    if (operators.includes('intitle')) {
      const titleTerms = ['stock', 'price', 'quote', 'financial', 'earnings']
      const titleOperators = titleTerms.map(term => `intitle:${term}`).join(' OR ')
      enhancedQuery += ` (${titleOperators})`
    }

    // Add filter-specific operators
    if (filters) {
      if (filters.priceMin || filters.priceMax) {
        if (filters.priceMin) enhancedQuery += ` "price" ">$${filters.priceMin}"`
        if (filters.priceMax) enhancedQuery += ` "price" "<$${filters.priceMax}"`
      }
      
      if (filters.sector) {
        enhancedQuery += ` "${filters.sector}" sector`
      }
      
      if (filters.exchange) {
        enhancedQuery += ` "${filters.exchange}" exchange`
      }
      
      if (filters.marketCapMin || filters.marketCapMax) {
        enhancedQuery += ` "market cap" "market capitalization"`
      }
    }

    // Add date operators for recent information
    if (operators.includes('daterange')) {
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      enhancedQuery += ` after:${oneMonthAgo.toISOString().split('T')[0]}`
    }

    return enhancedQuery.trim()
  }

  private async performGoogleSearch(query: string, config: SearchConfig): Promise<SearchResult[]> {
    try {
      const results = await this.webSearch.searchWeb(query, Math.min(config.maxResults, 20))

      return results.map(result => ({
        title: result.title,
        url: result.link,
        snippet: result.snippet || '',
        relevanceScore: this.calculateRelevanceScore(result, query),
        source: 'Google Search',
        timestamp: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Google search error:', error)
      return []
    }
  }

  private async performFinancialSiteSearch(
    query: string,
    filters?: FilterCriteria,
    config?: SearchConfig
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = []
    const financialSites = ['yahoo', 'marketwatch', 'finviz']

    for (const site of financialSites) {
      try {
        const siteQuery = `site:${this.getSiteDomain(site)} ${query}`
        const siteResults = await this.webSearch.searchWeb(siteQuery, 10)

        const mappedResults = siteResults.map(result => ({
          title: result.title,
          url: result.link,
          snippet: result.snippet || '',
          relevanceScore: this.calculateRelevanceScore(result, query),
          source: `${site} (Financial Site)`,
          timestamp: new Date().toISOString()
        }))

        results.push(...mappedResults)
      } catch (error) {
        console.error(`Financial site search error for ${site}:`, error)
      }
    }

    return results
  }

  private getSiteDomain(site: string): string {
    const domains = {
      yahoo: 'finance.yahoo.com',
      marketwatch: 'marketwatch.com',
      finviz: 'finviz.com',
      investing: 'investing.com',
      seekingalpha: 'seekingalpha.com'
    }
    return (domains as any)[site] || site
  }

  private calculateRelevanceScore(result: any, query: string): number {
    let score = 0.5 // Base score

    // Domain reliability bonus
    if (result.url) {
      try {
        const domain = new URL(result.url).hostname
        const reliability = this.domainReliability.get(domain) || 0.5
        score += reliability * 0.3
      } catch (error) {
        console.warn('Invalid URL for relevance calculation:', result.url)
      }
    }

    // Title relevance
    const titleWords = result.title.toLowerCase().split(/\s+/)
    const queryWords = query.toLowerCase().split(/\s+/)
    const titleMatches = queryWords.filter(word => 
      titleWords.some((titleWord: string) => titleWord.includes(word))
    ).length
    score += (titleMatches / queryWords.length) * 0.2

    // Snippet relevance
    if (result.snippet) {
      const snippetWords = result.snippet.toLowerCase().split(/\s+/)
      const snippetMatches = queryWords.filter(word =>
        snippetWords.some((snippetWord: string) => snippetWord.includes(word))
      ).length
      score += (snippetMatches / queryWords.length) * 0.15
    }

    // URL relevance
    if (result.url) {
      const urlWords = result.url.toLowerCase().split(/[\W_]+/)
      const urlMatches = queryWords.filter(word =>
        urlWords.some((urlWord: string) => urlWord.includes(word))
      ).length
      score += (urlMatches / queryWords.length) * 0.1
    }

    // Financial keywords bonus
    const financialKeywords = ['stock', 'price', 'quote', 'financial', 'earnings', 'market', 'trading', 'investment']
    const hasFinancialKeywords = financialKeywords.some(keyword => 
      result.title.toLowerCase().includes(keyword) || 
      (result.snippet && result.snippet.toLowerCase().includes(keyword))
    )
    if (hasFinancialKeywords) {
      score += 0.1
    }

    return Math.min(score, 1.0)
  }

  private rankSearchResults(
    results: SearchResult[],
    query: string,
    filters?: FilterCriteria
  ): SearchResult[] {
    return results
      .sort((a, b) => {
        // Primary sort by relevance score
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore
        }
        
        // Secondary sort by domain reliability
        const domainA = new URL(a.url).hostname
        const domainB = new URL(b.url).hostname
        const reliabilityA = this.domainReliability.get(domainA) || 0.5
        const reliabilityB = this.domainReliability.get(domainB) || 0.5
        
        return reliabilityB - reliabilityA
      })
      .filter((result, index, array) => {
        // Remove near-duplicate results
        return !array.slice(0, index).some(prev => 
          this.calculateSimilarity(result.title, prev.title) > 0.8
        )
      })
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/)
    const words2 = str2.toLowerCase().split(/\s+/)
    const intersection = words1.filter(word => words2.includes(word))
    const union = Array.from(new Set([...words1, ...words2]))
    return intersection.length / union.length
  }

  private generateSearchSuggestions(
    query: string,
    filters?: FilterCriteria,
    results?: SearchResult[]
  ): string[] {
    const suggestions: string[] = []
    
    // Query expansion suggestions
    suggestions.push(`${query} stock price`)
    suggestions.push(`${query} financial data`)
    suggestions.push(`${query} earnings report`)
    suggestions.push(`${query} market analysis`)
    
    // Filter-based suggestions
    if (filters?.sector) {
      suggestions.push(`${query} ${filters.sector} sector`)
    }
    
    if (filters?.exchange) {
      suggestions.push(`${query} ${filters.exchange} listed`)
    }
    
    // Result-based suggestions
    if (results && results.length > 0) {
      const commonTerms = this.extractCommonTerms(results)
      commonTerms.slice(0, 3).forEach(term => {
        suggestions.push(`${query} ${term}`)
      })
    }
    
    return Array.from(new Set(suggestions)).slice(0, 8)
  }

  private extractCommonTerms(results: SearchResult[]): string[] {
    const termFreq = new Map<string, number>()
    
    results.forEach(result => {
      const text = `${result.title} ${result.snippet}`.toLowerCase()
      const words = text.match(/\b[a-z]{3,}\b/g) || []
      
      words.forEach(word => {
        if (!this.isStopWord(word)) {
          termFreq.set(word, (termFreq.get(word) || 0) + 1)
        }
      })
    })
    
    return Array.from(termFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([term]) => term)
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'within', 'without', 'along', 'following', 'across', 'behind', 'beyond', 'plus', 'except', 'but', 'up', 'out', 'around', 'down', 'off', 'above', 'below']
    return stopWords.includes(word)
  }

  private generateCacheKey(query: string, filters?: FilterCriteria, config?: SearchConfig): string {
    const key = {
      query,
      filters: filters || {},
      config: config || {}
    }
    return btoa(JSON.stringify(key)).replace(/[^a-zA-Z0-9]/g, '')
  }

  // Public methods for getting search operators and domain reliability
  getSearchOperators(): SearchOperator[] {
    return Array.from(this.searchOperators.values())
  }

  getDomainReliability(): Map<string, number> {
    return new Map(this.domainReliability)
  }

  // Clear cache
  clearCache(): void {
    this.searchCache.clear()
  }

  // Get cache statistics
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.searchCache.size,
      hitRate: 0 // Would need to track hits/misses for accurate calculation
    }
  }
}

export const universalSearchAPI = new UniversalSearchAPI()