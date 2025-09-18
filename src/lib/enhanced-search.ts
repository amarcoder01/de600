// Enhanced search functionality for stock watchlist
import { Stock } from '@/types'
import { getValidatedStockData } from './multi-source-api'
import { validateSector } from './sector-validation'

export interface SearchFilters {
  sector?: string
  priceRange?: {
    min?: number
    max?: number
  }
  marketCapRange?: {
    min?: number
    max?: number
  }
  volumeRange?: {
    min?: number
    max?: number
  }
  exchange?: string
  changeDirection?: 'up' | 'down' | 'any'
}

export interface SearchResult {
  stock: Stock
  relevanceScore: number
  matchReasons: string[]
}

export interface SearchOptions {
  limit?: number
  includeFilters?: boolean
  fuzzyMatch?: boolean
  cacheResults?: boolean
}

export class EnhancedStockSearch {
  private static instance: EnhancedStockSearch
  private searchCache = new Map<string, { results: SearchResult[], timestamp: number }>()
  private readonly CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

  static getInstance(): EnhancedStockSearch {
    if (!EnhancedStockSearch.instance) {
      EnhancedStockSearch.instance = new EnhancedStockSearch()
    }
    return EnhancedStockSearch.instance
  }

  // Main search method with enhanced functionality
  async searchStocks(
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      limit = 10,
      includeFilters = true,
      fuzzyMatch = true,
      cacheResults = true
    } = options

    if (!query || query.length < 1) {
      return []
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(query, filters, options)
    if (cacheResults) {
      const cached = this.searchCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.results.slice(0, limit)
      }
    }

    try {
      console.log(`🔍 Enhanced search for: "${query}" with filters:`, filters)

      // Get initial search results from multiple sources
      const rawResults = await this.getMultiSourceResults(query)
      
      // Score and rank results based on relevance
      const scoredResults = rawResults.map(stock => 
        this.calculateRelevanceScore(stock, query, fuzzyMatch)
      ).filter(result => result.relevanceScore > 0)

      // Apply filters if specified
      let filteredResults = includeFilters 
        ? this.applyFilters(scoredResults, filters)
        : scoredResults

      // Sort by relevance score (descending)
      filteredResults.sort((a, b) => b.relevanceScore - a.relevanceScore)

      // Limit results
      const finalResults = filteredResults.slice(0, limit)

      // Cache results
      if (cacheResults) {
        this.searchCache.set(cacheKey, {
          results: finalResults,
          timestamp: Date.now()
        })
        this.cleanupCache()
      }

      console.log(`✅ Enhanced search completed: ${finalResults.length} results`)
      return finalResults

    } catch (error) {
      console.error('❌ Enhanced search failed:', error)
      return []
    }
  }

  // Get search results from multiple sources
  private async getMultiSourceResults(query: string): Promise<Stock[]> {
    const results: Stock[] = []

    try {
      // Try enhanced API search first
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          results.push(...data.data)
        }
      }

      // If no results, try yfinance search
      if (results.length === 0) {
        const yfinanceResponse = await fetch(`/api/stocks/yfinance-search?q=${encodeURIComponent(query)}`)
        if (yfinanceResponse.ok) {
          const yfinanceData = await yfinanceResponse.json()
          if (yfinanceData.success && yfinanceData.results) {
            results.push(...yfinanceData.results)
          }
        }
      }

      // Enhance results with validated data
      const enhancedResults = await Promise.all(
        results.map(async (stock) => {
          try {
            const { stock: validatedStock } = await getValidatedStockData(stock.symbol)
            return validatedStock || stock
          } catch {
            return stock
          }
        })
      )

      return enhancedResults.filter(stock => stock !== null) as Stock[]

    } catch (error) {
      console.error('Error getting multi-source results:', error)
      return []
    }
  }

  // Calculate relevance score for search results
  private calculateRelevanceScore(stock: Stock, query: string, fuzzyMatch: boolean): SearchResult {
    let score = 0
    const matchReasons: string[] = []
    const queryLower = query.toLowerCase()
    const symbolLower = stock.symbol.toLowerCase()
    const nameLower = stock.name.toLowerCase()

    // Exact symbol match (highest priority)
    if (symbolLower === queryLower) {
      score += 100
      matchReasons.push('Exact symbol match')
    }
    // Symbol starts with query
    else if (symbolLower.startsWith(queryLower)) {
      score += 80
      matchReasons.push('Symbol starts with query')
    }
    // Symbol contains query
    else if (symbolLower.includes(queryLower)) {
      score += 60
      matchReasons.push('Symbol contains query')
    }

    // Exact company name match
    if (nameLower === queryLower) {
      score += 90
      matchReasons.push('Exact company name match')
    }
    // Company name starts with query
    else if (nameLower.startsWith(queryLower)) {
      score += 70
      matchReasons.push('Company name starts with query')
    }
    // Company name contains query
    else if (nameLower.includes(queryLower)) {
      score += 50
      matchReasons.push('Company name contains query')
    }

    // Fuzzy matching for partial matches
    if (fuzzyMatch && score === 0) {
      const symbolFuzzy = this.calculateFuzzyScore(symbolLower, queryLower)
      const nameFuzzy = this.calculateFuzzyScore(nameLower, queryLower)
      
      if (symbolFuzzy > 0.7) {
        score += Math.round(symbolFuzzy * 40)
        matchReasons.push('Fuzzy symbol match')
      }
      
      if (nameFuzzy > 0.6) {
        score += Math.round(nameFuzzy * 30)
        matchReasons.push('Fuzzy name match')
      }
    }

    // Boost popular stocks
    const popularSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA']
    if (popularSymbols.includes(stock.symbol)) {
      score += 10
      matchReasons.push('Popular stock')
    }

    // Boost based on volume (liquidity indicator)
    if (stock.volume > 1000000) {
      score += 5
      matchReasons.push('High volume')
    }

    // Boost based on market cap (established company)
    if (stock.marketCap && stock.marketCap > 1000000000) {
      score += 5
      matchReasons.push('Large market cap')
    }

    return {
      stock,
      relevanceScore: score,
      matchReasons
    }
  }

  // Simple fuzzy matching algorithm
  private calculateFuzzyScore(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  // Calculate Levenshtein distance for fuzzy matching
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  // Apply filters to search results
  private applyFilters(results: SearchResult[], filters: SearchFilters): SearchResult[] {
    return results.filter(result => {
      const stock = result.stock

      // Sector filter
      if (filters.sector && stock.sector !== filters.sector) {
        return false
      }

      // Price range filter
      if (filters.priceRange) {
        if (filters.priceRange.min && stock.price < filters.priceRange.min) {
          return false
        }
        if (filters.priceRange.max && stock.price > filters.priceRange.max) {
          return false
        }
      }

      // Market cap range filter
      if (filters.marketCapRange && stock.marketCap) {
        if (filters.marketCapRange.min && stock.marketCap < filters.marketCapRange.min) {
          return false
        }
        if (filters.marketCapRange.max && stock.marketCap > filters.marketCapRange.max) {
          return false
        }
      }

      // Volume range filter
      if (filters.volumeRange) {
        if (filters.volumeRange.min && stock.volume < filters.volumeRange.min) {
          return false
        }
        if (filters.volumeRange.max && stock.volume > filters.volumeRange.max) {
          return false
        }
      }

      // Exchange filter
      if (filters.exchange && stock.exchange !== filters.exchange) {
        return false
      }

      // Change direction filter
      if (filters.changeDirection && filters.changeDirection !== 'any') {
        if (filters.changeDirection === 'up' && stock.changePercent <= 0) {
          return false
        }
        if (filters.changeDirection === 'down' && stock.changePercent >= 0) {
          return false
        }
      }

      return true
    })
  }

  // Generate cache key for search results
  private generateCacheKey(query: string, filters: SearchFilters, options: SearchOptions): string {
    return JSON.stringify({ query: query.toLowerCase(), filters, options })
  }

  // Clean up old cache entries
  private cleanupCache(): void {
    if (this.searchCache.size <= 100) return

    const entries = Array.from(this.searchCache.entries())
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
    
    this.searchCache.clear()
    entries.slice(0, 50).forEach(([key, value]) => {
      this.searchCache.set(key, value)
    })
  }

  // Get available sectors for filtering
  getAvailableSectors(): string[] {
    return [
      'Technology',
      'Healthcare',
      'Financial Services',
      'Consumer Discretionary',
      'Consumer Staples',
      'Energy',
      'Utilities',
      'Industrials',
      'Materials',
      'Communication Services',
      'Real Estate'
    ]
  }

  // Get available exchanges for filtering
  getAvailableExchanges(): string[] {
    return ['NYSE', 'NASDAQ', 'OTC']
  }

  // Clear search cache
  clearCache(): void {
    this.searchCache.clear()
    console.log('🧹 Enhanced search cache cleared')
  }

  // Get search suggestions based on partial query
  async getSearchSuggestions(partialQuery: string): Promise<string[]> {
    if (!partialQuery || partialQuery.length < 2) {
      return []
    }

    const popularStocks = [
      'AAPL - Apple Inc.',
      'MSFT - Microsoft Corporation',
      'GOOGL - Alphabet Inc.',
      'AMZN - Amazon.com Inc.',
      'TSLA - Tesla Inc.',
      'META - Meta Platforms Inc.',
      'NVDA - NVIDIA Corporation',
      'NFLX - Netflix Inc.',
      'AMD - Advanced Micro Devices',
      'CRM - Salesforce Inc.'
    ]

    const queryLower = partialQuery.toLowerCase()
    return popularStocks
      .filter(stock => stock.toLowerCase().includes(queryLower))
      .slice(0, 5)
  }
}

// Export singleton instance
export const enhancedSearch = EnhancedStockSearch.getInstance()

// Export convenience functions
export const searchStocks = async (
  query: string,
  filters?: SearchFilters,
  options?: SearchOptions
): Promise<SearchResult[]> => {
  return enhancedSearch.searchStocks(query, filters, options)
}

export const getSearchSuggestions = async (partialQuery: string): Promise<string[]> => {
  return enhancedSearch.getSearchSuggestions(partialQuery)
}
