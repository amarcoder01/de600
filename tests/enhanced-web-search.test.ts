import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { FinancialSiteCrawler } from '../src/lib/services/FinancialSiteCrawler'
import { UniversalSearchAPI } from '../src/lib/services/UniversalSearchAPI'
import { DataDiscoveryEngine } from '../src/lib/services/DataDiscoveryEngine'
import { InformationSynthesis } from '../src/lib/services/InformationSynthesis'
import { PerformanceOptimizer } from '../src/lib/services/PerformanceOptimizer'
import { WebSearchScreenerService } from '../src/lib/screener/WebSearchScreenerService';

// Mock external dependencies
jest.mock('../src/lib/web-search', () => ({
  webSearch: {
    searchWebPaginated: jest.fn(),
    fetchPageText: jest.fn()
  }
}));

jest.mock('../src/lib/services/openai-service', () => ({
  OpenAIService: jest.fn().mockImplementation(() => ({
    parseQuery: jest.fn(),
    analyzeContent: jest.fn()
  }))
}));

jest.mock('../src/lib/services/ScreenerDataService', () => ({
  ScreenerDataService: {
    getInstance: jest.fn(() => ({
      getUnifiedStockData: jest.fn()
    }))
  }
}));

jest.mock('../src/lib/services/yahoo-finance', () => ({
  YahooFinanceService: jest.fn().mockImplementation(() => ({
    getQuote: jest.fn(),
    getQuotes: jest.fn()
  }))
}));

describe('Enhanced Web Search System', () => {
  let financialCrawler: FinancialSiteCrawler;
  let universalSearch: UniversalSearchAPI;
  let discoveryEngine: DataDiscoveryEngine;
  let informationSynthesis: InformationSynthesis;
  let performanceOptimizer: PerformanceOptimizer;
  let webSearchService: WebSearchScreenerService;

  beforeEach(() => {
    // Initialize services
    financialCrawler = new FinancialSiteCrawler();
    universalSearch = new UniversalSearchAPI();
    discoveryEngine = new DataDiscoveryEngine();
    informationSynthesis = new InformationSynthesis();
    performanceOptimizer = new PerformanceOptimizer();
    webSearchService = new WebSearchScreenerService();

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('FinancialSiteCrawler', () => {
    it('should initialize with default financial sites', () => {
      expect(financialCrawler).toBeDefined();
      expect(typeof financialCrawler.crawlFinancialSites).toBe('function');
    });

    it('should handle crawling errors gracefully', async () => {
      const mockQuery = 'AAPL stock price';
      const result = await financialCrawler.crawlFinancialSites(mockQuery);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(typeof result.metadata).toBe('object');
    });

    it('should respect rate limiting', async () => {
      const startTime = Date.now();
      await financialCrawler.crawlFinancialSites('test query 1');
      await financialCrawler.crawlFinancialSites('test query 2');
      const endTime = Date.now();
      
      // Should have some delay due to rate limiting
      expect(endTime - startTime).toBeGreaterThan(100);
    });
  });

  describe('UniversalSearchAPI', () => {
    it('should initialize with financial search operators', () => {
      expect(universalSearch).toBeDefined();
      expect(typeof universalSearch.universalSearch).toBe('function');
    });

    it('should build enhanced queries with operators', async () => {
      const query = 'Apple stock earnings';
      const result = await universalSearch.universalSearch(query);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(typeof result.metadata).toBe('object');
    });

    it('should rank results by relevance and reliability', async () => {
      const query = 'Tesla financial data';
      const result = await universalSearch.universalSearch(query);
      
      if (result.results.length > 1) {
        // Check if results are sorted by relevance score
        for (let i = 0; i < result.results.length - 1; i++) {
          expect(result.results[i].relevanceScore).toBeGreaterThanOrEqual(
            result.results[i + 1].relevanceScore
          );
        }
      }
    });
  });

  describe('DataDiscoveryEngine', () => {
    it('should analyze and expand queries intelligently', async () => {
      const query = 'tech stocks with high growth';
      const result = await discoveryEngine.analyzeQuery(query);
      
      expect(result).toBeDefined();
      expect(typeof result.intent).toBe('string');
      expect(Array.isArray(result.entities)).toBe(true);
      expect(Array.isArray(result.keywords)).toBe(true);
    });

    it('should generate semantic search results', async () => {
      const query = 'renewable energy companies';
      const result = await discoveryEngine.performSemanticSearch(query);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(typeof result.confidence).toBe('number');
    });

    it('should provide discovery insights', async () => {
      const query = 'AI stocks trending';
      const result = await discoveryEngine.generateDiscoveryInsights(query);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
      expect(Array.isArray(result.relatedQueries)).toBe(true);
    });
  });

  describe('InformationSynthesis', () => {
    it('should validate data from multiple sources', async () => {
      const mockData = [
        { source: 'yahoo', data: { price: 150, volume: 1000000 } },
        { source: 'marketwatch', data: { price: 151, volume: 1100000 } }
      ];
      
      const result = await informationSynthesis.validateData(mockData);
      
      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should resolve conflicts between sources', async () => {
      const conflictingData = [
        { source: 'source1', value: 100, confidence: 0.8 },
        { source: 'source2', value: 105, confidence: 0.9 }
      ];
      
      const result = await informationSynthesis.resolveConflicts(conflictingData);
      
      expect(result).toBeDefined();
      expect(typeof result.resolvedValue).toBe('number');
      expect(typeof result.confidence).toBe('number');
    });

    it('should perform fact-checking', async () => {
      const claim = 'Apple is the most valuable company';
      const result = await informationSynthesis.factCheck(claim);
      
      expect(result).toBeDefined();
      expect(typeof result.isFactual).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.sources)).toBe(true);
    });
  });

  describe('PerformanceOptimizer', () => {
    it('should initialize with default configuration', () => {
      expect(performanceOptimizer).toBeDefined();
      expect(typeof performanceOptimizer.executeWithOptimization).toBe('function');
    });

    it('should cache results effectively', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };
      
      // Set cache
      performanceOptimizer.setCache(key, value);
      
      // Get from cache
      const cached = performanceOptimizer.getCache(key);
      expect(cached).toEqual(value);
    });

    it('should handle circuit breaker functionality', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      
      // This should trigger circuit breaker after multiple failures
      for (let i = 0; i < 6; i++) {
        try {
          await performanceOptimizer.executeWithCircuitBreaker('test-service', mockOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      const metrics = performanceOptimizer.getMetrics();
      expect(metrics.circuitBreakerStates['test-service']).toBeDefined();
    });

    it('should collect performance metrics', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      await performanceOptimizer.executeWithOptimization(mockOperation);
      
      const metrics = performanceOptimizer.getMetrics();
      expect(typeof metrics.averageResponseTime).toBe('number');
      expect(typeof metrics.cacheHitRate).toBe('number');
      expect(typeof metrics.errorRate).toBe('number');
    });
  });

  describe('WebSearchScreenerService Integration', () => {
    it('should perform enhanced web search', async () => {
      const query = 'high dividend yield stocks';
      const options = {
        useMultiSource: true,
        useSynthesis: true,
        includeMetrics: true
      };
      
      const result = await webSearchService.enhancedWebSearch(query, {}, options);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.stocks)).toBe(true);
      expect(typeof result.metadata).toBe('object');
      
      if (options.includeMetrics) {
        expect(result.performanceMetrics).toBeDefined();
      }
    });

    it('should discover stocks with semantic search', async () => {
      const context = 'Looking for technology companies with strong AI capabilities';
      const options = { enrichWithPriceData: true };
      
      const result = await webSearchService.discoverStocks(context, options);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.discoveredStocks)).toBe(true);
      expect(typeof result.insights).toBe('object');
    });

    it('should maintain backward compatibility', async () => {
      const query = 'Apple stock';
      const filters = { minPrice: 100, maxPrice: 200 };
      
      // Original method should still work
      const result = await webSearchService.webSmartSearch(query, filters);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.stocks)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const invalidQuery = '';
      
      const result = await webSearchService.enhancedWebSearch(invalidQuery);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.stocks)).toBe(true);
      // Should return empty results rather than throw
      expect(result.stocks.length).toBe(0);
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 500ms for basic queries', async () => {
      const startTime = Date.now();
      
      await webSearchService.enhancedWebSearch('AAPL');
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
    }, 1000);

    it('should handle concurrent requests efficiently', async () => {
      const queries = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
      const startTime = Date.now();
      
      const promises = queries.map(query => 
        webSearchService.enhancedWebSearch(query)
      );
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      expect(results).toHaveLength(5);
      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
    }, 3000);

    it('should maintain cache hit rate above 70%', async () => {
      // Warm up cache
      await webSearchService.enhancedWebSearch('AAPL');
      await webSearchService.enhancedWebSearch('AAPL'); // Should hit cache
      
      const metrics = webSearchService.getPerformanceMetrics();
      expect(metrics.cacheHitRate).toBeGreaterThan(0.7);
    });
  });
});