import { WebSearchResult } from '@/lib/web-search'
import { FilterCriteria } from '@/types/screener'

export interface CrawledStockData {
  ticker: string
  name?: string
  price?: number
  change?: number
  changePercent?: number
  volume?: number
  marketCap?: number
  exchange?: string
  sector?: string
  industry?: string
  peRatio?: number
  dividendYield?: number
  confidence: number
  source: string
  timestamp: string
}

export interface CrawlerConfig {
  name: string
  baseUrl: string
  selectors: {
    ticker?: string
    name?: string
    price?: string
    change?: string
    changePercent?: string
    volume?: string
    marketCap?: string
    exchange?: string
    sector?: string
    industry?: string
    peRatio?: string
    dividendYield?: string
  }
  dataExtractors: DataExtractor[]
  reliability: number // 0-1 confidence score
  rateLimit: number // ms between requests
  timeout: number // request timeout in ms
}

export interface DataExtractor {
  name: string
  pattern: RegExp
  transform?: (match: string) => any
  confidence: number
}

export class FinancialSiteCrawler {
  private crawlers: Map<string, CrawlerConfig> = new Map()
  private requestQueue: Map<string, number> = new Map() // Track last request time per domain
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; isOpen: boolean }> = new Map()
  private readonly maxFailures = 5
  private readonly circuitBreakerTimeout = 300000 // 5 minutes

  constructor() {
    this.initializeCrawlers()
  }

  private initializeCrawlers() {
    // Yahoo Finance crawler
    this.crawlers.set('yahoo', {
      name: 'Yahoo Finance',
      baseUrl: 'https://finance.yahoo.com',
      selectors: {
        ticker: '[data-symbol]',
        price: '[data-field="regularMarketPrice"]',
        change: '[data-field="regularMarketChange"]',
        changePercent: '[data-field="regularMarketChangePercent"]',
        volume: '[data-field="regularMarketVolume"]',
        marketCap: '[data-field="marketCap"]'
      },
      dataExtractors: [
        {
          name: 'price',
          pattern: /"regularMarketPrice":\{"raw":([0-9.]+)/,
          transform: (match) => parseFloat(match),
          confidence: 0.95
        },
        {
          name: 'changePercent',
          pattern: /"regularMarketChangePercent":\{"raw":([\-0-9.]+)/,
          transform: (match) => parseFloat(match),
          confidence: 0.95
        },
        {
          name: 'volume',
          pattern: /"regularMarketVolume":\{"raw":([0-9]+)/,
          transform: (match) => parseInt(match),
          confidence: 0.9
        }
      ],
      reliability: 0.95,
      rateLimit: 1000,
      timeout: 8000
    })

    // MarketWatch crawler
    this.crawlers.set('marketwatch', {
      name: 'MarketWatch',
      baseUrl: 'https://www.marketwatch.com',
      selectors: {
        price: '.intraday__price .value',
        change: '.change--point--q .value',
        changePercent: '.change--percent--q .value'
      },
      dataExtractors: [
        {
          name: 'price',
          pattern: /\$([0-9,]+\.?[0-9]*)/,
          transform: (match) => parseFloat(match.replace(/,/g, '')),
          confidence: 0.9
        },
        {
          name: 'changePercent',
          pattern: /([\-+]?[0-9.]+)%/,
          transform: (match) => parseFloat(match),
          confidence: 0.85
        }
      ],
      reliability: 0.85,
      rateLimit: 1500,
      timeout: 10000
    })

    // Finviz crawler
    this.crawlers.set('finviz', {
      name: 'Finviz',
      baseUrl: 'https://finviz.com',
      selectors: {
        ticker: '.screener-link-primary',
        sector: 'td:nth-child(3)',
        industry: 'td:nth-child(4)',
        marketCap: 'td:nth-child(7)'
      },
      dataExtractors: [
        {
          name: 'ticker',
          pattern: /\/quote\.ashx\?t=([A-Z]+)/,
          confidence: 0.95
        },
        {
          name: 'marketCap',
          pattern: /([0-9.]+[BMK])/,
          transform: (match) => {
            const num = parseFloat(match)
            if (match.includes('B')) return num * 1e9
            if (match.includes('M')) return num * 1e6
            if (match.includes('K')) return num * 1e3
            return num
          },
          confidence: 0.9
        }
      ],
      reliability: 0.9,
      rateLimit: 2000,
      timeout: 12000
    })

    // Investing.com crawler
    this.crawlers.set('investing', {
      name: 'Investing.com',
      baseUrl: 'https://www.investing.com',
      selectors: {
        price: '[data-test="instrument-price-last"]',
        change: '[data-test="instrument-price-change"]',
        changePercent: '[data-test="instrument-price-change-percent"]'
      },
      dataExtractors: [
        {
          name: 'price',
          pattern: /([0-9,]+\.?[0-9]*)/,
          transform: (match) => parseFloat(match.replace(/,/g, '')),
          confidence: 0.85
        }
      ],
      reliability: 0.8,
      rateLimit: 2000,
      timeout: 10000
    })

    // Seeking Alpha crawler
    this.crawlers.set('seekingalpha', {
      name: 'Seeking Alpha',
      baseUrl: 'https://seekingalpha.com',
      selectors: {
        price: '[data-test-id="price"]',
        changePercent: '[data-test-id="change-percent"]'
      },
      dataExtractors: [
        {
          name: 'price',
          pattern: /\$([0-9.]+)/,
          transform: (match) => parseFloat(match),
          confidence: 0.8
        }
      ],
      reliability: 0.75,
      rateLimit: 3000,
      timeout: 15000
    })
  }

  async crawlMultipleSources(
    query: string,
    sources: string[] = ['yahoo', 'marketwatch', 'finviz'],
    maxResults: number = 50
  ): Promise<CrawledStockData[]> {
    const results: CrawledStockData[] = []
    const crawlPromises = sources.map(source => this.crawlSource(source, query, maxResults))
    
    const crawlResults = await Promise.allSettled(crawlPromises)
    
    for (const result of crawlResults) {
      if (result.status === 'fulfilled') {
        results.push(...result.value)
      }
    }

    // Deduplicate and merge data by ticker
    return this.mergeStockData(results)
  }

  private async crawlSource(source: string, query: string, maxResults: number): Promise<CrawledStockData[]> {
    const config = this.crawlers.get(source)
    if (!config) {
      throw new Error(`Unknown crawler source: ${source}`)
    }

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(source)) {
      console.warn(`Circuit breaker open for ${source}, skipping`)
      return []
    }

    try {
      // Rate limiting
      await this.respectRateLimit(source, config.rateLimit)

      // Build search URL based on source
      const searchUrl = this.buildSearchUrl(source, query, config)
      
      // Fetch and parse content
      const content = await this.fetchWithTimeout(searchUrl, config.timeout)
      const stockData = await this.extractStockData(content, config, source)
      
      // Reset circuit breaker on success
      this.resetCircuitBreaker(source)
      
      return stockData.slice(0, maxResults)
    } catch (error) {
      console.error(`Error crawling ${source}:`, error)
      this.recordFailure(source)
      return []
    }
  }

  private buildSearchUrl(source: string, query: string, config: CrawlerConfig): string {
    const encodedQuery = encodeURIComponent(query)
    
    switch (source) {
      case 'yahoo':
        return `${config.baseUrl}/lookup?s=${encodedQuery}`
      case 'marketwatch':
        return `${config.baseUrl}/tools/screener/stock?search=${encodedQuery}`
      case 'finviz':
        return `${config.baseUrl}/screener.ashx?v=111&s=${encodedQuery}`
      case 'investing':
        return `${config.baseUrl}/search/?q=${encodedQuery}&tab=quotes`
      case 'seekingalpha':
        return `${config.baseUrl}/search?q=${encodedQuery}`
      default:
        return `${config.baseUrl}/search?q=${encodedQuery}`
    }
  }

  private async fetchWithTimeout(url: string, timeout: number): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.text()
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private async extractStockData(
    content: string,
    config: CrawlerConfig,
    source: string
  ): Promise<CrawledStockData[]> {
    const results: CrawledStockData[] = []
    const timestamp = new Date().toISOString()
    
    // Extract tickers first
    const tickers = this.extractTickers(content)
    
    for (const ticker of tickers) {
      const stockData: CrawledStockData = {
        ticker,
        confidence: config.reliability,
        source: config.name,
        timestamp
      }
      
      // Apply data extractors
      for (const extractor of config.dataExtractors) {
        const matches = content.match(extractor.pattern)
        if (matches && matches[1]) {
          const value = extractor.transform ? extractor.transform(matches[1]) : matches[1]
          ;(stockData as any)[extractor.name] = value
          stockData.confidence = Math.min(stockData.confidence, extractor.confidence)
        }
      }
      
      results.push(stockData)
    }
    
    return results
  }

  private extractTickers(content: string): string[] {
    const tickers = new Set<string>()
    
    // Multiple ticker extraction patterns
    const patterns = [
      /\b([A-Z]{1,5})\b/g, // Basic ticker pattern
      /ticker["']?:\s*["']([A-Z]{1,5})["']/gi, // JSON ticker field
      /symbol["']?:\s*["']([A-Z]{1,5})["']/gi, // JSON symbol field
      /\/quote\.ashx\?t=([A-Z]{1,5})/g, // Finviz quote links
      /\/quote\/([A-Z]{1,5})/g, // General quote links
      /data-symbol["']?=["']([A-Z]{1,5})["']/g // Data attributes
    ]
    
    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const ticker = match[1].toUpperCase()
        if (this.isValidTicker(ticker)) {
          tickers.add(ticker)
        }
      }
    }
    
    return Array.from(tickers)
  }

  private isValidTicker(ticker: string): boolean {
    // Filter out common false positives
    const blacklist = ['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'HAD', 'BY', 'UP', 'DO', 'NO', 'IF', 'MY', 'ON', 'AS', 'WE', 'HE', 'BE', 'TO', 'OF', 'IT', 'IS', 'IN', 'AT', 'OR', 'AN', 'A', 'I']
    return ticker.length >= 1 && ticker.length <= 5 && !blacklist.includes(ticker)
  }

  private mergeStockData(results: CrawledStockData[]): CrawledStockData[] {
    const merged = new Map<string, CrawledStockData>()
    
    for (const stock of results) {
      const existing = merged.get(stock.ticker)
      if (!existing) {
        merged.set(stock.ticker, stock)
      } else {
        // Merge data, preferring higher confidence sources
        const mergedStock: CrawledStockData = {
          ...existing,
          confidence: Math.max(existing.confidence, stock.confidence)
        }
        
        // Merge individual fields, preferring non-null values from higher confidence sources
        const fields = ['name', 'price', 'change', 'changePercent', 'volume', 'marketCap', 'exchange', 'sector', 'industry', 'peRatio', 'dividendYield']
        for (const field of fields) {
          const existingValue = (existing as any)[field]
          const newValue = (stock as any)[field]
          
          if (newValue !== undefined && newValue !== null) {
            if (existingValue === undefined || existingValue === null || stock.confidence > existing.confidence) {
              ;(mergedStock as any)[field] = newValue
            }
          }
        }
        
        merged.set(stock.ticker, mergedStock)
      }
    }
    
    return Array.from(merged.values())
  }

  private async respectRateLimit(source: string, rateLimit: number): Promise<void> {
    const lastRequest = this.requestQueue.get(source) || 0
    const timeSinceLastRequest = Date.now() - lastRequest
    
    if (timeSinceLastRequest < rateLimit) {
      const waitTime = rateLimit - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.requestQueue.set(source, Date.now())
  }

  private isCircuitBreakerOpen(source: string): boolean {
    const breaker = this.circuitBreakers.get(source)
    if (!breaker) return false
    
    if (breaker.isOpen) {
      const timeSinceLastFailure = Date.now() - breaker.lastFailure
      if (timeSinceLastFailure > this.circuitBreakerTimeout) {
        breaker.isOpen = false
        breaker.failures = 0
      }
    }
    
    return breaker.isOpen
  }

  private recordFailure(source: string): void {
    const breaker = this.circuitBreakers.get(source) || { failures: 0, lastFailure: 0, isOpen: false }
    breaker.failures++
    breaker.lastFailure = Date.now()
    
    if (breaker.failures >= this.maxFailures) {
      breaker.isOpen = true
      console.warn(`Circuit breaker opened for ${source} after ${breaker.failures} failures`)
    }
    
    this.circuitBreakers.set(source, breaker)
  }

  private resetCircuitBreaker(source: string): void {
    this.circuitBreakers.delete(source)
  }

  // Get available crawler sources
  getAvailableSources(): string[] {
    return Array.from(this.crawlers.keys())
  }

  // Get crawler configuration
  getCrawlerConfig(source: string): CrawlerConfig | undefined {
    return this.crawlers.get(source)
  }
}

export const financialSiteCrawler = new FinancialSiteCrawler()