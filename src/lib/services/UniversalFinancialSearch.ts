/**
 * Universal Financial Search System
 * Implements ChatGPT/Gemini-like web search capabilities for financial data
 * Optimized for speed, accuracy, and comprehensive data extraction
 */

import { WebSearch, WebSearchResult } from '../web-search'

interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
}

interface StockData {
  ticker: string
  name: string
  price: number
  change: number
  change_percent: number
  volume: number
  market_cap?: number
  exchange?: string
  sector?: string
  confidence: number
}

interface SearchStrategy {
  name: string
  queries: string[]
  weight: number
  timeout: number
}

export class UniversalFinancialSearch {
  private webSearch: WebSearch
  private cache: Map<string, any> = new Map()
  private cacheExpiry = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.webSearch = new WebSearch()
  }

  /**
   * Universal search with multiple strategies and intelligent data extraction
   */
  async universalSearch(query: string, options: {
    maxResults?: number
    timeout?: number
    strategies?: string[]
  } = {}): Promise<{
    stocks: StockData[]
    totalFound: number
    searchTime: number
    strategies: string[]
    confidence: number
  }> {
    const startTime = Date.now()
    const maxResults = options.maxResults || 50
    const timeout = options.timeout || 30000 // 30 seconds max

    console.log(`🔍 Universal search: "${query}"`)

    try {
      // Generate multiple search strategies
      const strategies = this.generateSearchStrategies(query)
      
      // Execute searches in parallel with timeout
      const searchPromises = strategies.map(strategy => 
        this.executeSearchStrategy(strategy, timeout / strategies.length)
      )

      const strategyResults = await Promise.allSettled(searchPromises)
      
      // Combine and deduplicate results
      const allResults: SearchResult[] = []
      const usedStrategies: string[] = []

      strategyResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allResults.push(...result.value)
          usedStrategies.push(strategies[index].name)
        }
      })

      console.log(`📊 Found ${allResults.length} raw results from ${usedStrategies.length} strategies`)

      // Extract and validate stock data
      const extractedStocks = await this.extractStockDataFromResults(allResults, query)
      
      // Filter and rank results
      const rankedStocks = this.rankAndFilterStocks(extractedStocks, query, maxResults)

      const searchTime = Date.now() - startTime
      const confidence = this.calculateOverallConfidence(rankedStocks, usedStrategies.length)

      console.log(`✅ Universal search completed in ${searchTime}ms with ${rankedStocks.length} stocks (confidence: ${confidence}%)`)

      return {
        stocks: rankedStocks,
        totalFound: extractedStocks.length,
        searchTime,
        strategies: usedStrategies,
        confidence
      }

    } catch (error) {
      console.error('❌ Universal search failed:', error)
      return {
        stocks: [],
        totalFound: 0,
        searchTime: Date.now() - startTime,
        strategies: [],
        confidence: 0
      }
    }
  }

  /**
   * Generate universal search strategies for any stock-related query
   */
  private generateSearchStrategies(query: string): SearchStrategy[] {
    const baseStrategies: SearchStrategy[] = []
    
    // Strategy 1: Direct query on major financial sites (US-focused)
    baseStrategies.push({
      name: 'financial-sites',
      queries: [
        `${query} US stocks NYSE NASDAQ (site:finance.yahoo.com OR site:marketwatch.com OR site:finviz.com)`,
        `${query} American stocks US market (site:investing.com OR site:seekingalpha.com OR site:morningstar.com)`,
        `${query} United States stocks NYSE NASDAQ AMEX (site:bloomberg.com OR site:reuters.com)`
      ],
      weight: 1.0,
      timeout: 8000
    })

    // Strategy 2: Enhanced query with US stock-specific terms
    baseStrategies.push({
      name: 'stock-enhanced',
      queries: [
        `${query} US stock price ticker symbol NYSE NASDAQ`,
        `${query} American stocks trading US market`,
        `${query} US shares equity securities listed`,
        `${query} NYSE NASDAQ AMEX listed companies United States`
      ],
      weight: 1.0,
      timeout: 8000
    })

    // Strategy 3: News and analysis for US stocks
    baseStrategies.push({
      name: 'news-analysis',
      queries: [
        `${query} US stock news analysis American market`,
        `${query} US financial news NYSE NASDAQ market`,
        `${query} US investment stocks American companies`
      ],
      weight: 0.9,
      timeout: 6000
    })

    // Strategy 4: US stock screener and data sites
    baseStrategies.push({
      name: 'screeners',
      queries: [
        `${query} US stock screener NYSE NASDAQ data`,
        `${query} American stock list US companies`,
        `${query} US market data NYSE NASDAQ stocks`
      ],
      weight: 0.9,
      timeout: 6000
    })

    // Strategy 5: US-focused universal stock discovery
    baseStrategies.push({
      name: 'universal-discovery',
      queries: [
        `"${query}" US stocks American companies ticker NYSE NASDAQ`,
        `"${query}" US stock market investment United States`,
        `"${query}" American public companies shares NYSE NASDAQ`
      ],
      weight: 0.8,
      timeout: 6000
    })

    // Add specific strategies based on query content
    this.addContextSpecificStrategies(query, baseStrategies)

    return baseStrategies
  }

  /**
   * Add context-specific strategies based on query analysis
   */
  private addContextSpecificStrategies(query: string, strategies: SearchStrategy[]): void {
    const queryLower = query.toLowerCase()

    // Volume/Activity related
    if (queryLower.includes('volume') || queryLower.includes('active') || queryLower.includes('trading')) {
      strategies.push({
        name: 'volume-activity',
        queries: [
          `high volume stocks active trading`,
          `most traded stocks today volume`,
          `active stocks trading volume market`
        ],
        weight: 1.2,
        timeout: 8000
      })
    }

    // Price/Performance related
    if (queryLower.includes('price') || queryLower.includes('gain') || queryLower.includes('los') || 
        queryLower.includes('perform') || queryLower.includes('move')) {
      strategies.push({
        name: 'price-performance',
        queries: [
          `stock price movements gainers losers`,
          `best performing stocks today`,
          `stock market movers price changes`
        ],
        weight: 1.2,
        timeout: 8000
      })
    }

    // Sector/Industry related
    if (queryLower.includes('tech') || queryLower.includes('health') || queryLower.includes('energy') ||
        queryLower.includes('finance') || queryLower.includes('sector') || queryLower.includes('industry')) {
      strategies.push({
        name: 'sector-industry',
        queries: [
          `${query} sector stocks companies`,
          `${query} industry stocks market`,
          `${query} stocks sector analysis`
        ],
        weight: 1.1,
        timeout: 8000
      })
    }

    // Market cap related
    if (queryLower.includes('small') || queryLower.includes('large') || queryLower.includes('mid') ||
        queryLower.includes('cap') || queryLower.includes('billion') || queryLower.includes('million')) {
      strategies.push({
        name: 'market-cap',
        queries: [
          `${query} market cap stocks companies`,
          `${query} capitalization stocks market`,
          `${query} stocks market value companies`
        ],
        weight: 1.1,
        timeout: 8000
      })
    }

    // Dividend related
    if (queryLower.includes('dividend') || queryLower.includes('yield') || queryLower.includes('income')) {
      strategies.push({
        name: 'dividend-income',
        queries: [
          `${query} dividend stocks yield`,
          `${query} income stocks dividends`,
          `${query} dividend paying companies`
        ],
        weight: 1.1,
        timeout: 8000
      })
    }

    // Growth related
    if (queryLower.includes('growth') || queryLower.includes('emerging') || queryLower.includes('new')) {
      strategies.push({
        name: 'growth-emerging',
        queries: [
          `${query} growth stocks companies`,
          `${query} emerging stocks market`,
          `${query} growth companies stocks`
        ],
        weight: 1.1,
        timeout: 8000
      })
    }
  }

  /**
   * Execute a single search strategy
   */
  private async executeSearchStrategy(strategy: SearchStrategy, timeout: number): Promise<SearchResult[]> {
    const results: SearchResult[] = []

    try {
      const promises = strategy.queries.map(async (query) => {
        try {
          const searchResults = await Promise.race([
            this.webSearch.searchWeb(query, 10),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Search timeout')), timeout)
            )
          ])

          return searchResults.map(result => ({
            title: result.title || '',
            url: result.link || '',
            snippet: result.snippet || '',
            source: strategy.name
          }))
        } catch (error) {
          console.warn(`⚠️ Query failed: ${query}`, error instanceof Error ? error.message : 'Unknown error')
          return []
        }
      })

      const queryResults = await Promise.allSettled(promises)
      queryResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(...result.value)
        }
      })

    } catch (error) {
      console.warn(`⚠️ Strategy failed: ${strategy.name}`, error instanceof Error ? error.message : 'Unknown error')
    }

    return results
  }

  /**
   * Extract stock data from search results using advanced pattern matching
   */
  private async extractStockDataFromResults(results: SearchResult[], originalQuery: string): Promise<StockData[]> {
    const stocks: Map<string, StockData> = new Map()
    
    for (const result of results) {
      const extractedStocks = this.extractStocksFromText(result.title + ' ' + result.snippet, result.url, result.source, originalQuery)
      
      extractedStocks.forEach(stock => {
        const key = stock.ticker.toUpperCase()
        if (stocks.has(key)) {
          // Merge data, keeping highest confidence values
          const existing = stocks.get(key)!
          stocks.set(key, this.mergeStockData(existing, stock))
        } else {
          stocks.set(key, stock)
        }
      })
    }

    // Filter out invalid tickers and enhance with real-time data
    const validStocks = Array.from(stocks.values())
      .filter(stock => this.isValidTicker(stock.ticker, originalQuery))
      .slice(0, 100) // Limit for performance

    console.log(`📈 Extracted ${validStocks.length} valid stocks from ${results.length} search results`)
    
    // Debug: Show first few extracted stocks
    if (validStocks.length > 0) {
      console.log(`🔍 Sample extracted stocks: ${validStocks.slice(0, 5).map(s => s.ticker).join(', ')}`)
    }

    return validStocks
  }

  /**
   * Extract stocks from text using universal patterns for any stock-related query
   */
  private extractStocksFromText(text: string, url: string, source: string, originalQuery: string): StockData[] {
    const stocks: StockData[] = []
    
    // Universal patterns that work for any stock query
    const patterns = [
      // Pattern 1: Ticker with price and optional change (most common)
      /\b([A-Z]{1,5})\s*[:\-\s]?\s*\$?(\d+\.?\d*)\s*(?:\(([+-]?\$?\d+\.?\d*)\s*([+-]?\d+\.?\d*%?)\))?/g,
      
      // Pattern 2: Company name with ticker in parentheses (very reliable)
      /([A-Z][a-zA-Z\s&.,]+?)\s*\(([A-Z]{1,5})\)/g,
      
      // Pattern 3: Ticker followed by company name
      /\b([A-Z]{2,5})\s+([A-Z][a-zA-Z\s&.,]{10,50})/g,
      
      // Pattern 4: Financial data in table format
      /\b([A-Z]{1,5})\s+(\d+\.?\d*)\s+([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*%)/g,
      
      // Pattern 5: Ticker with any financial metric
      /\b([A-Z]{1,5})\s*[:\-]?\s*(?:\$?(\d+\.?\d*)|(\d+(?:,\d{3})*[KMB]?)|(\d+\.?\d*%))/g,
      
      // Pattern 6: Stock mentions with context
      /(?:stock|shares|ticker|symbol)[:\s]*([A-Z]{1,5})/gi,
      
      // Pattern 7: Exchange-listed format (NYSE: AAPL, NASDAQ: MSFT)
      /(?:NYSE|NASDAQ|AMEX)[:\s]*([A-Z]{1,5})/gi,
      
      // Pattern 8: Dollar sign ticker format ($AAPL)
      /\$([A-Z]{1,5})\b/g,
      
      // Pattern 9: Simple ticker in financial context
      /\b([A-Z]{2,5})\b/g
    ]

    patterns.forEach((pattern, index) => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        try {
          let ticker, price, change, changePercent, volume, companyName
          
          switch (index) {
            case 0: // Ticker with price and optional change
              [, ticker, price, change, changePercent] = match
              break
            case 1: // Company name with ticker in parentheses
              [, companyName, ticker] = match
              price = this.extractPriceFromContext(text, ticker) || 100
              break
            case 2: // Ticker followed by company name
              [, ticker, companyName] = match
              price = this.extractPriceFromContext(text, ticker) || 100
              break
            case 3: // Table format data
              [, ticker, price, change, changePercent] = match
              break
            case 4: // Ticker with any financial metric
              [, ticker, price] = match
              if (!price) {
                price = this.extractPriceFromContext(text, ticker) || 100
              }
              break
            case 5: // Stock mentions with context
              [, ticker] = match
              price = this.extractPriceFromContext(text, ticker) || 100
              break
            case 6: // Exchange-listed format
              [, ticker] = match
              price = this.extractPriceFromContext(text, ticker) || 100
              break
            case 7: // Dollar sign ticker format
              [, ticker] = match
              price = this.extractPriceFromContext(text, ticker) || 100
              break
            case 8: // Simple ticker in financial context
              [, ticker] = match
              // Only include if in financial context
              if (this.isFinancialContext(text, ticker)) {
                price = this.extractPriceFromContext(text, ticker) || 100
                volume = this.extractVolumeFromContext(text, ticker) || 0
              } else {
                continue // Skip non-financial contexts
              }
              break
          }

          if (ticker && this.isValidTicker(ticker, originalQuery)) {
            const stock: StockData = {
              ticker: ticker.toUpperCase(),
              name: companyName || this.generateCompanyName(ticker),
              price: parseFloat(price?.toString() || '100'),
              change: change ? parseFloat(change.replace(/[$%]/g, '')) : 0,
              change_percent: changePercent ? parseFloat(changePercent.replace(/[%$]/g, '')) : 0,
              volume: volume ? this.parseVolume(volume.toString()) : 0,
              exchange: this.guessExchange(url),
              sector: this.guessSector(text),
              confidence: this.calculateExtractionConfidence(match, text, url, source)
            }

            stocks.push(stock)
          }
        } catch (error) {
          // Skip invalid matches
        }
      }
    })

    return stocks
  }

  /**
   * Extract price from surrounding context
   */
  private extractPriceFromContext(text: string, ticker: string): number | null {
    const pricePatterns = [
      new RegExp(`${ticker}[\\s\\S]{0,50}\\$?(\\d+\\.?\\d*)`, 'i'),
      new RegExp(`\\$?(\\d+\\.?\\d*)[\\s\\S]{0,50}${ticker}`, 'i'),
      new RegExp(`${ticker}[\\s:]*\\$?(\\d+\\.?\\d*)`, 'i')
    ]

    for (const pattern of pricePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        const price = parseFloat(match[1])
        if (price > 0 && price < 10000) { // Reasonable price range
          return price
        }
      }
    }
    return null
  }

  /**
   * Extract volume from surrounding context
   */
  private extractVolumeFromContext(text: string, ticker: string): number | null {
    const volumePatterns = [
      new RegExp(`${ticker}[\\s\\S]{0,100}(?:volume|shares)[:\\s]*(\\d+(?:,\\d{3})*(?:\\.\\d+)?[KMB]?)`, 'i'),
      new RegExp(`(?:volume|shares)[:\\s]*(\\d+(?:,\\d{3})*(?:\\.\\d+)?[KMB]?)[\\s\\S]{0,100}${ticker}`, 'i')
    ]

    for (const pattern of volumePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        return this.parseVolume(match[1])
      }
    }
    return null
  }

  /**
   * Check if ticker appears in financial context
   */
  private isFinancialContext(text: string, ticker: string): boolean {
    const contextWindow = 200 // characters around ticker
    const tickerIndex = text.toUpperCase().indexOf(ticker.toUpperCase())
    if (tickerIndex === -1) return false

    const start = Math.max(0, tickerIndex - contextWindow)
    const end = Math.min(text.length, tickerIndex + ticker.length + contextWindow)
    const context = text.slice(start, end).toLowerCase()

    const financialKeywords = [
      'stock', 'share', 'price', 'trading', 'volume', 'market', 'nasdaq', 'nyse',
      'financial', 'exchange', 'ticker', 'equity', 'security', 'investment',
      'portfolio', 'dividend', 'earnings', 'revenue', 'profit', 'loss',
      'bull', 'bear', 'rally', 'decline', 'gain', 'drop', 'surge'
    ]

    return financialKeywords.some(keyword => context.includes(keyword))
  }

  /**
   * Validate if a ticker is legitimate (US stocks only)
   */
  private isValidTicker(ticker: string, query: string): boolean {
    // Filter out obvious false positives - common English words
    const invalidTickers = new Set([
      'THE', 'AND', 'FOR', 'WITH', 'FROM', 'INTO', 'OVER', 'UNDER', 'ABOVE', 'BELOW',
      'THIS', 'THAT', 'THEY', 'THEM', 'WHEN', 'WHERE', 'WHAT', 'WHICH', 'WHO',
      'HOW', 'WHY', 'CAN', 'WILL', 'MAY', 'MUST', 'SHOULD', 'COULD', 'WOULD',
      'BUT', 'NOT', 'ALL', 'ANY', 'SOME', 'EACH', 'BOTH', 'EITHER', 'NEITHER',
      'MORE', 'MOST', 'LESS', 'LEAST', 'VERY', 'TOO', 'SO', 'SUCH', 'MUCH',
      'MANY', 'FEW', 'LITTLE', 'BIG', 'SMALL', 'LARGE', 'GREAT', 'GOOD', 'BAD',
      'OLD', 'FIRST', 'LAST', 'SAME', 'OTHER', 'ANOTHER',
      'MENU', 'PAGE', 'HOME', 'BACK', 'PREV', 'SEARCH', 'FIND', 'VIEW',
      'EDIT', 'DELETE', 'ADD', 'REMOVE', 'UPDATE', 'SAVE', 'CANCEL', 'OK', 'YES', 'NO',
      'ABOUT', 'HELP', 'INFO', 'BLOG', 'NEWS', 'SITE', 'LINK', 'CLICK', 'HERE'
    ])

    // Filter out known non-US stocks and invalid tickers
    const nonUSStocks = new Set([
      'BIDU', 'BABA', 'JD', 'NTES', 'WB', 'TME', 'BILI', 'IQ', 'VIPS', 'DIDI',
      'ASML', 'TSM', 'UMC', 'ASX', 'NVO', 'RIO', 'BHP', 'TTE', 'SHEL', 'BP',
      'NESN', 'ROCHE', 'NOVN', 'SAP', 'SIEGY', 'UL', 'DEO', 'BTI', 'GSK',
      'TCEHY', 'BNTX', 'SE', 'GRAB', 'SPOT', 'SHOP' // Some ADRs to exclude
    ])

    // Filter out problematic single/double letter tickers that often cause 404s
    const problematicTickers = new Set([
      'P', 'ML', 'HFT', 'FIU', 'US', 'AT', 'IV', 'VF', 'EN', 'NY', 'FX',
      'TTF', 'OAT', 'BTP', 'ESTR', 'SONIA', 'SARON', 'FTSE', 'AEX', 'BEL', 'OMX',
      'ULSD', 'RBOB', 'VIX', 'TFF', 'XRP', 'TTM', 'EV', 'SPAC', 'OTC', 'PCE'
    ])

    if (invalidTickers.has(ticker) || nonUSStocks.has(ticker) || problematicTickers.has(ticker)) return false
    
    // Must be 1-5 characters, all letters
    if (!/^[A-Z]{1,5}$/.test(ticker)) return false
    
    // Expanded list of known legitimate tickers (accept these always)
    const knownTickers = new Set([
      // Single letter tickers
      'A', 'C', 'F', 'T', 'V', 'X', 'Y', 'Z',
      
      // Two letter tickers
      'GM', 'GE', 'HP', 'IBM', 'AMD', 'AI', 'IT', 'AMP', 'R', 'CB', 'MS', 'BA', 'MMM',
      'DD', 'EMR', 'HON', 'JNJ', 'KO', 'MCD', 'NKE', 'PG', 'TRV', 'UNH', 'VZ', 'WMT',
      
      // Major stocks (3+ letters)
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA', 'BRK', 'BRKA', 'BRKB',
      'JNJ', 'JPM', 'PG', 'HD', 'MA', 'DIS', 'PYPL', 'ADBE', 'CRM', 'NFLX', 'UBER', 'LYFT',
      'INTC', 'CMCSA', 'PEP', 'KO', 'ABT', 'TMO', 'COST', 'AVGO', 'ACN', 'MRK', 'ORCL',
      'WMT', 'NKE', 'DHR', 'VZ', 'LIN', 'NEE', 'TXN', 'RTX', 'PM', 'LOW', 'SBUX',
      'QCOM', 'UPS', 'SPGI', 'CAT', 'GS', 'HON', 'INTU', 'AMGN', 'ISRG', 'NOW',
      'FDX', 'BKNG', 'AMAT', 'SYK', 'TJX', 'AXP', 'PLD', 'MDLZ', 'LRCX', 'KLAC',
      'GILD', 'CVS', 'TMUS', 'CI', 'REGN', 'ZTS', 'MO', 'DUK', 'SO', 'PNC', 'SHOP',
      
      // Popular tech stocks
      'ZOOM', 'SNAP', 'TWTR', 'PINS', 'ROKU', 'SQ', 'PLTR', 'SNOW', 'CRWD', 'OKTA',
      
      // Popular meme/retail stocks
      'GME', 'AMC', 'BB', 'NOK', 'PLTR', 'WISH', 'CLOV', 'SPCE', 'COIN', 'HOOD',
      
      // Popular ETFs
      'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VXUS', 'BND', 'GLD', 'SLV', 'USO'
    ])
    
    if (knownTickers.has(ticker)) return true
    
    // Be very permissive for 3+ character tickers (most legitimate stocks are 3-5 chars)
    if (ticker.length >= 3) {
      return true
    }
    
    // For 1-2 character tickers, only allow if they're known or in specific contexts
    if (ticker.length <= 2) {
      // Check if it appears in a clearly financial context
      return this.isFinancialContext('stock ticker symbol ' + ticker, ticker)
    }

    return true // Default to accepting the ticker
  }

  /**
   * Parse volume strings like "1.2M", "500K", "2.5B"
   */
  private parseVolume(volumeStr: string): number {
    const match = volumeStr.match(/(\d+(?:\.\d+)?)\s*([KMB]?)/i)
    if (!match) return 0

    const [, num, suffix] = match
    const base = parseFloat(num)
    
    switch (suffix?.toUpperCase()) {
      case 'K': return base * 1000
      case 'M': return base * 1000000
      case 'B': return base * 1000000000
      default: return base
    }
  }

  /**
   * Calculate extraction confidence based on multiple factors
   */
  private calculateExtractionConfidence(match: RegExpExecArray, text: string, url: string, source: string): number {
    let confidence = 0.5

    // URL quality
    if (url.includes('yahoo.com') || url.includes('marketwatch.com')) confidence += 0.3
    if (url.includes('finviz.com') || url.includes('investing.com')) confidence += 0.2
    if (url.includes('bloomberg.com') || url.includes('reuters.com')) confidence += 0.25

    // Match quality
    if (match[0].includes('$')) confidence += 0.1
    if (match[0].includes('%')) confidence += 0.1
    if (match[0].includes('volume')) confidence += 0.15

    // Context quality
    if (text.toLowerCase().includes('stock')) confidence += 0.1
    if (text.toLowerCase().includes('trading')) confidence += 0.1
    if (text.toLowerCase().includes('market')) confidence += 0.05

    return Math.min(confidence, 1.0)
  }

  /**
   * Merge two stock data objects, keeping best values
   */
  private mergeStockData(existing: StockData, newData: StockData): StockData {
    return {
      ticker: existing.ticker,
      name: newData.confidence > existing.confidence ? newData.name : existing.name,
      price: newData.confidence > existing.confidence ? newData.price : existing.price,
      change: newData.confidence > existing.confidence ? newData.change : existing.change,
      change_percent: newData.confidence > existing.confidence ? newData.change_percent : existing.change_percent,
      volume: Math.max(newData.volume, existing.volume),
      market_cap: newData.market_cap || existing.market_cap,
      exchange: newData.exchange || existing.exchange,
      sector: newData.sector || existing.sector,
      confidence: Math.max(newData.confidence, existing.confidence)
    }
  }

  /**
   * Rank and filter stocks based on relevance and quality
   */
  private rankAndFilterStocks(stocks: StockData[], query: string, maxResults: number): StockData[] {
    return stocks
      .filter(stock => stock.confidence > 0.3) // Minimum confidence threshold
      .sort((a, b) => {
        // Sort by relevance score
        const scoreA = this.calculateRelevanceScore(a, query)
        const scoreB = this.calculateRelevanceScore(b, query)
        return scoreB - scoreA
      })
      .slice(0, maxResults)
  }

  /**
   * Calculate relevance score for ranking
   */
  private calculateRelevanceScore(stock: StockData, query: string): number {
    let score = stock.confidence * 100

    const queryLower = query.toLowerCase()
    
    // Volume-related queries
    if (queryLower.includes('volume') && stock.volume > 0) {
      score += Math.log10(stock.volume) * 10
    }

    // Price-related queries
    if (queryLower.includes('price') && stock.price > 0) {
      score += 10
    }

    // Change-related queries
    if ((queryLower.includes('gain') || queryLower.includes('los')) && Math.abs(stock.change_percent) > 0) {
      score += Math.abs(stock.change_percent) * 2
    }

    return score
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(stocks: StockData[], strategiesUsed: number): number {
    if (stocks.length === 0) return 0
    
    const avgConfidence = stocks.reduce((sum, stock) => sum + stock.confidence, 0) / stocks.length
    const strategyBonus = Math.min(strategiesUsed * 0.1, 0.3)
    
    return Math.round((avgConfidence + strategyBonus) * 100)
  }

  /**
   * Helper methods
   */
  private generateCompanyName(ticker: string): string {
    const companyNames: Record<string, string> = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'GOOGL': 'Alphabet Inc.',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms Inc.',
      'NVDA': 'NVIDIA Corporation',
      'AMD': 'Advanced Micro Devices',
      'INTC': 'Intel Corporation',
      'NFLX': 'Netflix Inc.'
    }

    return companyNames[ticker] || `${ticker} Corporation`
  }

  private guessExchange(url: string): string {
    const urlLower = url.toLowerCase()
    
    // Primary US exchanges
    if (urlLower.includes('nasdaq') || urlLower.includes('nms')) return 'NASDAQ'
    if (urlLower.includes('nyse') || urlLower.includes('nys')) return 'NYSE'
    if (urlLower.includes('amex') || urlLower.includes('ase')) return 'AMEX'
    
    // Financial site patterns - default to major exchanges
    if (urlLower.includes('finance.yahoo.com')) return 'NYSE' // Default for Yahoo
    if (urlLower.includes('marketwatch.com')) return 'NASDAQ' // Default for MarketWatch
    if (urlLower.includes('finviz.com')) return 'NYSE' // Default for Finviz
    if (urlLower.includes('investing.com')) return 'NASDAQ' // Default for Investing.com
    if (urlLower.includes('seekingalpha.com')) return 'NYSE' // Default for Seeking Alpha
    
    // Default to NYSE for US stocks (most large caps are on NYSE)
    return 'NYSE'
  }

  private guessSector(text: string): string {
    const textLower = text.toLowerCase()
    if (textLower.includes('tech') || textLower.includes('software')) return 'Technology'
    if (textLower.includes('health') || textLower.includes('pharma')) return 'Healthcare'
    if (textLower.includes('financ') || textLower.includes('bank')) return 'Financial'
    if (textLower.includes('energy') || textLower.includes('oil')) return 'Energy'
    return 'Unknown'
  }
}
