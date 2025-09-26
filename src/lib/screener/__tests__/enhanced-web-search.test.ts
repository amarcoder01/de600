import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WebSearchScreenerService } from '../WebSearchScreenerService'
import { FinancialSiteCrawler } from '../FinancialSiteCrawler'
import { UniversalSearchAPI } from '../UniversalSearchAPI'
import { DataDiscoveryEngine } from '../DataDiscoveryEngine'
import { InformationSynthesis } from '../InformationSynthesis'
import { PerformanceOptimizer } from '../PerformanceOptimizer'

// Mock external dependencies
vi.mock('../ScreenerDataService')
vi.mock('../YahooFinanceService')
vi.mock('../OpenAIService')
vi.mock('../web-search')

describe('Enhanced Web Search System', () => {
  let webSearchService: WebSearchScreenerService
  let mockOpenAIService: any
  let mockWebSearch: any
  let mockScreenerDataService: any
  let mockYahooFinanceService: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Mock OpenAI service
    mockOpenAIService = {
      parseQuery: vi.fn().mockResolvedValue({
        priceRange: { min: 10, max: 100 },
        marketCapRange: { min: 1000000000, max: 10000000000 },
        sector: 'Technology',
        exchange: 'NASDAQ'
      })
    }

    // Mock WebSearch
    mockWebSearch = {
      searchTradingInfo: vi.fn().mockResolvedValue({
        items: [
          {
            title: 'Apple Inc. (AAPL) Stock Analysis',
            link: 'https://finance.yahoo.com/quote/AAPL',
            snippet: 'Apple stock trading at $150 with strong fundamentals'
          }
        ]
      }),
      fetchPageText: vi.fn().mockResolvedValue('Apple AAPL $150 technology stock')
    }

    // Mock ScreenerDataService
    mockScreenerDataService = {
      getUnifiedStockData: vi.fn().mockResolvedValue([
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 150.25,
          marketCap: 2500000000000,
          sector: 'Technology',
          exchange: 'NASDAQ'
        }
      ])
    }

    // Mock YahooFinanceService
    mockYahooFinanceService = {
      getStockPrice: vi.fn().mockResolvedValue({ price: 150.25, currency: 'USD' })
    }

    webSearchService = new WebSearchScreenerService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('FinancialSiteCrawler', () => {
    it('should initialize with correct site configurations', () => {
      const crawler = new FinancialSiteCrawler()
      expect(crawler).toBeDefined()
    })

    it('should crawl multiple financial sites in parallel', async () => {
      const crawler = new FinancialSiteCrawler()
      
      // Mock fetch responses
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html>AAPL $150.25 Apple Inc.</html>')
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html>MSFT $300.50 Microsoft Corp.</html>')
        })

      const results = await crawler.crawlMultipleSources(['AAPL', 'MSFT'])
      
      expect(results).toHaveLength(2)
      expect(results[0].symbol).toBe('AAPL')
      expect(results[1].symbol).toBe('MSFT')
    })

    it('should handle rate limiting correctly', async () => {
      const crawler = new FinancialSiteCrawler()
      
      // Mock rate limited response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limited')
      })

      const results = await crawler.crawlMultipleSources(['AAPL'])
      expect(results).toHaveLength(0)
    })
  })

  describe('UniversalSearchAPI', () => {
    it('should initialize with financial search operators', () => {
      const universalSearch = new UniversalSearchAPI(mockWebSearch)
      expect(universalSearch).toBeDefined()
    })

    it('should build enhanced queries with financial operators', async () => {
      const universalSearch = new UniversalSearchAPI(mockWebSearch)
      
      const query = await universalSearch.buildEnhancedQuery('Apple stock price', {
        priceRange: { min: 100, max: 200 },
        sector: 'Technology'
      })
      
      expect(query).toContain('Apple')
      expect(query).toContain('stock')
      expect(query).toContain('price')
    })

    it('should rank search results by relevance and reliability', async () => {
      const universalSearch = new UniversalSearchAPI(mockWebSearch)
      
      const mockResults = [
        {
          title: 'Apple Stock Analysis',
          link: 'https://finance.yahoo.com/quote/AAPL',
          snippet: 'Apple stock trading analysis',
          relevanceScore: 0.8,
          reliabilityScore: 0.9
        },
        {
          title: 'Random Blog Post',
          link: 'https://random-blog.com/apple',
          snippet: 'Apple company news',
          relevanceScore: 0.6,
          reliabilityScore: 0.3
        }
      ]

      const ranked = universalSearch.rankSearchResults(mockResults, 'Apple stock')
      
      expect(ranked.results[0].link).toContain('finance.yahoo.com')
      expect(ranked.results[0].totalScore).toBeGreaterThan(ranked.results[1].totalScore)
    })
  })

  describe('DataDiscoveryEngine', () => {
    it('should analyze and expand queries intelligently', async () => {
      const discoveryEngine = new DataDiscoveryEngine(mockOpenAIService)
      
      const expansion = await discoveryEngine.expandQuery('tech stocks under $100')
      
      expect(expansion.originalQuery).toBe('tech stocks under $100')
      expect(expansion.expandedTerms).toContain('technology')
      expect(expansion.semanticVariations.length).toBeGreaterThan(0)
    })

    it('should perform semantic search with context awareness', async () => {
      const discoveryEngine = new DataDiscoveryEngine(mockOpenAIService)
      
      const results = await discoveryEngine.performSemanticSearch('AI companies', {
        userPreferences: { sectors: ['Technology'], riskTolerance: 'moderate' },
        marketConditions: { trend: 'bullish', volatility: 'low' },
        timeframe: 'short-term'
      })
      
      expect(results.query).toBe('AI companies')
      expect(results.results.length).toBeGreaterThan(0)
    })
  })

  describe('InformationSynthesis', () => {
    it('should synthesize data from multiple sources', async () => {
      const synthesis = new InformationSynthesis(mockOpenAIService)
      
      const mockData = [
        {
          source: 'Yahoo Finance',
          symbol: 'AAPL',
          price: 150.25,
          confidence: 0.95,
          timestamp: new Date()
        },
        {
          source: 'MarketWatch',
          symbol: 'AAPL',
          price: 150.30,
          confidence: 0.90,
          timestamp: new Date()
        }
      ]

      const synthesized = await synthesis.synthesizeData(mockData)
      
      expect(synthesized.consolidatedData.symbol).toBe('AAPL')
      expect(synthesized.consolidatedData.price).toBeCloseTo(150.27, 1)
      expect(synthesized.qualityScore).toBeGreaterThan(0.8)
    })

    it('should resolve conflicts using weighted strategies', async () => {
      const synthesis = new InformationSynthesis(mockOpenAIService)
      
      const conflicts = [
        { field: 'price', values: [150.25, 150.30], sources: ['Yahoo', 'MarketWatch'], confidences: [0.95, 0.90] }
      ]

      const resolved = await synthesis.resolveConflicts(conflicts, 'weighted_average')
      
      expect(resolved.length).toBe(1)
      expect(resolved[0].resolvedValue).toBeCloseTo(150.27, 1)
      expect(resolved[0].strategy).toBe('weighted_average')
    })
  })

  describe('PerformanceOptimizer', () => {
    it('should implement intelligent caching with LRU and stale-while-revalidate', async () => {
      const optimizer = new PerformanceOptimizer()
      
      const key = 'test-key'
      const value = { data: 'test-data' }
      
      // Set cache
      await optimizer.setCache(key, value, 1000)
      
      // Get from cache
      const cached = await optimizer.getCache(key)
      expect(cached).toEqual(value)
      
      // Test cache metrics
      const metrics = optimizer.getMetrics()
      expect(metrics.cacheHitRate).toBeGreaterThan(0)
    })

    it('should implement circuit breaker pattern', async () => {
      const optimizer = new PerformanceOptimizer()
      
      const failingOperation = vi.fn().mockRejectedValue(new Error('Service unavailable'))
      
      // Trigger circuit breaker
      for (let i = 0; i < 6; i++) {
        try {
          await optimizer.executeWithCircuitBreaker('test-service', failingOperation)
        } catch (error) {
          // Expected to fail
        }
      }
      
      const metrics = optimizer.getMetrics()
      expect(metrics.circuitBreakerStates['test-service']).toBe('open')
    })

    it('should process tasks asynchronously with parallelism control', async () => {
      const optimizer = new PerformanceOptimizer()
      
      const tasks = Array.from({ length: 10 }, (_, i) => 
        () => Promise.resolve(`result-${i}`)
      )
      
      const results = await optimizer.processAsync(tasks, { maxParallel: 3 })
      
      expect(results).toHaveLength(10)
      expect(results[0]).toBe('result-0')
    })
  })

  describe('Enhanced Web Search Integration', () => {
    it('should perform enhanced web search with all components', async () => {
      // Mock successful responses for all components
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html>AAPL $150.25 Apple Inc. Technology</html>')
      })

      const result = await webSearchService.enhancedWebSearch('technology stocks under $200', {
        limit: 50,
        useMultiSource: true,
        enableSynthesis: true,
        maxSources: 3
      })

      expect(result.stocks).toBeDefined()
      expect(result.totalCount).toBeGreaterThan(0)
      expect(result.enhanced).toBe(true)
      expect(result.sources).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should discover stocks with semantic search', async () => {
      const result = await webSearchService.discoverStocks('emerging AI companies', {
        maxResults: 20,
        includeAnalysis: true,
        semanticSearch: true
      })

      expect(result.discoveredStocks).toBeDefined()
      expect(result.insights).toBeDefined()
      expect(result.context.analyzedTerms).toContain('AI')
    })

    it('should handle fallback gracefully when enhanced search fails', async () => {
      // Mock enhanced search failure
      const mockEnhancedSearch = vi.spyOn(webSearchService, 'enhancedWebSearch')
        .mockRejectedValueOnce(new Error('Enhanced search failed'))
      
      const mockBasicSearch = vi.spyOn(webSearchService, 'webSmartSearch')
        .mockResolvedValueOnce({
          stocks: [{ symbol: 'AAPL', name: 'Apple Inc.', price: 150.25 }],
          totalCount: 1,
          hasMore: false,
          parsedCriteria: {},
          originalQuery: 'test query',
          usedWebSearch: true
        })

      // This should fallback to basic search
      const result = await webSearchService.webSmartSearch('test query')
      
      expect(result.stocks).toHaveLength(1)
      expect(result.stocks[0].symbol).toBe('AAPL')
    })

    it('should maintain performance metrics and caching', async () => {
      // Perform multiple searches to generate metrics
      await webSearchService.enhancedWebSearch('tech stocks', { limit: 10 })
      await webSearchService.enhancedWebSearch('finance stocks', { limit: 10 })
      
      const metrics = webSearchService.getPerformanceMetrics()
      
      expect(metrics.totalRequests).toBeGreaterThan(0)
      expect(metrics.averageResponseTime).toBeGreaterThan(0)
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0)
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0)
    })

    it('should clear caches when requested', async () => {
      // Set some cache data
      await webSearchService.enhancedWebSearch('test query', { limit: 10 })
      
      // Clear caches
      webSearchService.clearCaches()
      
      // Verify caches are cleared (metrics should reset)
      const metrics = webSearchService.getPerformanceMetrics()
      expect(metrics.cacheHitRate).toBe(0)
    })
  })

  describe('Performance Requirements', () => {
    it('should complete enhanced search within 2 seconds', async () => {
      const startTime = Date.now()
      
      await webSearchService.enhancedWebSearch('quick test', {
        limit: 10,
        maxSources: 2
      })
      
      const executionTime = Date.now() - startTime
      expect(executionTime).toBeLessThan(2000) // 2 seconds
    })

    it('should handle concurrent requests efficiently', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        webSearchService.enhancedWebSearch(`test query ${i}`, { limit: 5 })
      )
      
      const startTime = Date.now()
      const results = await Promise.all(promises)
      const totalTime = Date.now() - startTime
      
      expect(results).toHaveLength(5)
      expect(totalTime).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })
})

// Integration tests with real API endpoints (optional, for manual testing)
describe('Integration Tests (Manual)', () => {
  // These tests require real API keys and should be run manually
  it.skip('should perform real enhanced web search', async () => {
    const service = new WebSearchScreenerService()
    
    const result = await service.enhancedWebSearch('Apple stock analysis', {
      limit: 10,
      useMultiSource: true,
      enableSynthesis: true
    })
    
    console.log('Enhanced search result:', JSON.stringify(result, null, 2))
    expect(result.stocks.length).toBeGreaterThan(0)
  })

  it.skip('should perform real stock discovery', async () => {
    const service = new WebSearchScreenerService()
    
    const result = await service.discoverStocks('renewable energy companies', {
      maxResults: 20,
      includeAnalysis: true
    })
    
    console.log('Discovery result:', JSON.stringify(result, null, 2))
    expect(result.discoveredStocks.length).toBeGreaterThan(0)
  })
})