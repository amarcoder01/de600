// API Route for Real-time News & Sentiment Analysis
import { NextRequest, NextResponse } from 'next/server'
import { fetchPolygonNews } from '@/lib/news/polygon-news'

interface NewsAPIResponse {
  status: string
  totalResults: number
  articles: NewsAPIArticle[]
}

// Fetch news from Polygon.io (modular, behind feature flag)
async function fetchNewsFromPolygon(query?: string, category?: string, limit: number = 20, page: number = 1): Promise<NewsItem[]> {
  // Build search query consistent with category handling
  let searchQuery = query
  if (!searchQuery && category && category !== 'all') {
    const keywords = CATEGORY_KEYWORDS[category as keyof typeof CATEGORY_KEYWORDS] || []
    if (keywords.length > 0) {
      searchQuery = keywords.join(' OR ')
    }
  }
  // Default general market terms if nothing specified (parity with NewsAPI path)
  if (!searchQuery) {
    searchQuery = 'stock market OR trading OR investing OR financial news'
  }

  const { results } = await fetchPolygonNews({ q: searchQuery, limit, page, daysBack: 7 })

  // Emulated pagination: fetchPolygonNews over-fetched N*limit; return just current window
  const start = (page - 1) * limit
  const end = start + limit
  const pageResults = results.slice(start, end)

  // Map Polygon results to internal NewsItem shape
  const newsItems: NewsItem[] = pageResults.map((item, index) => {
    const title = item.title || 'Untitled'
    const description = item.description || 'No description available'
    const source = item.publisher?.name || 'Unknown'
    const symbols = (item.tickers && item.tickers.length > 0)
      ? item.tickers.slice(0, 5)
      : extractStockSymbols(title, description)
    const sentiment = analyzeSentiment(title, description)
    const impact = determineImpact(title, description, source)
    const category = categorizeNews(title, description)
    const aiInsights = generateAIInsights(title, description, symbols)

    return {
      id: item.id || `polygon_news_${Date.now()}_${start + index}`,
      title,
      summary: description,
      content: description,
      source,
      url: item.article_url || '#',
      publishedAt: item.published_utc || new Date().toISOString(),
      category,
      sentiment,
      impact,
      symbols,
      aiInsights,
      relatedStocks: symbols.slice(0, 3)
    }
  })

  return newsItems
}

// Fetch top headlines via Polygon (uses general market terms)
async function fetchTopHeadlinesFromPolygon(limit: number = 20, page: number = 1): Promise<NewsItem[]> {
  return fetchNewsFromPolygon(undefined, 'all', limit, page)
}

interface NewsAPIArticle {
  source: {
    id: string | null
    name: string
  }
  author: string | null
  title: string
  description: string | null
  url: string
  urlToImage: string | null
  publishedAt: string
  content: string | null
}

interface NewsItem {
  id: string
  title: string
  summary: string
  content: string
  source: string
  url: string
  publishedAt: string
  category: 'market' | 'earnings' | 'economy' | 'technology' | 'politics' | 'crypto'
  sentiment: 'positive' | 'negative' | 'neutral'
  impact: 'high' | 'medium' | 'low'
  symbols: string[]
  aiInsights?: string[]
  relatedStocks?: string[]
}

interface MarketUpdate {
  id: string
  type: 'price_alert' | 'volume_spike' | 'earnings' | 'analyst_rating'
  symbol: string
  title: string
  message: string
  timestamp: string
  priority: 'high' | 'medium' | 'low'
}

// News Source Configuration
// Use env-driven selection to avoid impacting existing behavior.
// Default remains NewsAPI to ensure zero-impact if env not set.
const NEWS_SOURCE = process.env.NEWS_SOURCE || 'newsapi'
// NewsAPI Configuration (fallback-safe: use env or existing value)
const NEWS_API_KEY = process.env.NEWS_API_KEY || 'e1ea318668a84a58bb26d1c155813b03'
const NEWS_API_BASE_URL = 'https://newsapi.org/v2'

// Stock symbols for financial news
const FINANCIAL_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'JPM', 'BAC',
  'WFC', 'XOM', 'CVX', 'JNJ', 'PG', 'UNH', 'HD', 'MA', 'V', 'PYPL', 'ADBE', 'CRM',
  'NFLX', 'INTC', 'AMD', 'ORCL', 'CSCO', 'IBM', 'QCOM', 'TXN', 'AVGO', 'MU',
  'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'DIA', 'VEA', 'VWO', 'BND', 'GLD', 'SLV'
]

// Keywords for different news categories
const CATEGORY_KEYWORDS = {
  market: ['stock market', 'trading', 'investing', 'financial markets', 'wall street', 's&p 500', 'nasdaq', 'dow jones'],
  earnings: ['earnings', 'quarterly results', 'financial results', 'revenue', 'profit', 'loss'],
  economy: ['federal reserve', 'fed', 'interest rates', 'inflation', 'gdp', 'unemployment', 'economic data'],
  technology: ['tech', 'technology', 'artificial intelligence', 'ai', 'software', 'hardware', 'digital'],
  politics: ['congress', 'senate', 'house', 'biden', 'trump', 'policy', 'regulation', 'government'],
  crypto: ['bitcoin', 'crypto', 'cryptocurrency', 'blockchain', 'ethereum', 'btc', 'eth']
}

// Generate dynamic market updates
function generateMarketUpdates(limit: number = 10, page: number = 1): MarketUpdate[] {
  const updates: MarketUpdate[] = []
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'JPM', 'BAC', 'WFC', 'XOM', 'CVX', 'JNJ', 'PG', 'UNH', 'HD', 'MA', 'V', 'PYPL', 'ADBE', 'CRM', 'NFLX', 'INTC', 'AMD', 'ORCL', 'CSCO', 'IBM', 'QCOM', 'TXN', 'AVGO', 'MU', 'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'DIA', 'VEA', 'VWO', 'BND', 'GLD', 'SLV']
  const types: Array<'price_alert' | 'volume_spike' | 'earnings' | 'analyst_rating'> = ['price_alert', 'volume_spike', 'earnings', 'analyst_rating']
  const priorities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low']
  
  const startIndex = (page - 1) * limit
  
  for (let i = 0; i < limit; i++) {
    const index = startIndex + i
    const symbol = symbols[index % symbols.length]
    const type = types[index % types.length]
    const priority = priorities[index % priorities.length]
    
    let title = ''
    let message = ''
    
    switch (type) {
      case 'price_alert':
        const prices = [100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600]
        const price = prices[index % prices.length]
        const direction = index % 2 === 0 ? 'Breaks' : 'Falls Below'
        title = `${symbol} ${direction} $${price} Level`
        message = `${symbol} stock has ${direction.toLowerCase()} the $${price} ${index % 2 === 0 ? 'resistance' : 'support'} level with ${index % 2 === 0 ? 'strong' : 'weak'} volume, indicating potential ${index % 2 === 0 ? 'continuation' : 'reversal'} of the trend.`
        break
      case 'volume_spike':
        const volumes = [2, 3, 4, 5, 6]
        const volume = volumes[index % volumes.length]
        title = `Unusual Volume Activity in ${symbol}`
        message = `${symbol} experiencing ${volume}x average volume, suggesting significant institutional activity and potential price movement.`
        break
      case 'earnings':
        const companies = ['Apple', 'Microsoft', 'Google', 'Amazon', 'Tesla', 'NVIDIA', 'Meta', 'Netflix', 'JPMorgan', 'Bank of America']
        const company = companies[index % companies.length]
        title = `${company} Earnings ${index % 2 === 0 ? 'Beat' : 'Miss'} Expectations`
        message = `${company} reported ${index % 2 === 0 ? 'strong' : 'weak'} quarterly earnings, with ${index % 2 === 0 ? 'revenue growth' : 'declining sales'} leading the ${index % 2 === 0 ? 'gains' : 'losses'}.`
        break
      case 'analyst_rating':
        const analysts = ['Goldman Sachs', 'Morgan Stanley', 'JPMorgan', 'Bank of America', 'Citigroup', 'Wells Fargo', 'Barclays', 'Deutsche Bank', 'UBS', 'Credit Suisse']
        const analyst = analysts[index % analysts.length]
        const actions = ['Upgrades', 'Downgrades', 'Maintains']
        const action = actions[index % actions.length]
        const ratings = ['Buy', 'Sell', 'Hold', 'Overweight', 'Underweight']
        const rating = ratings[index % ratings.length]
        const targets = [150, 200, 250, 300, 350, 400, 450, 500]
        const target = targets[index % targets.length]
        title = `${analyst} ${action} ${symbol} to ${rating}`
        message = `${analyst} ${action.toLowerCase()} ${symbol} to ${rating} with $${target} price target, citing ${index % 2 === 0 ? 'strong growth prospects' : 'concerns about valuation'}.`
        break
    }
    
    // Generate timestamp with some randomness
    const minutesAgo = 30 + (index * 15) + Math.floor(Math.random() * 60)
    const timestamp = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString()
    
    updates.push({
      id: `update_${Date.now()}_${index}`,
      type,
      symbol,
      title,
      message,
      timestamp,
      priority
    })
  }
  
  return updates
}

// Helper function to analyze sentiment based on keywords
function analyzeSentiment(title: string, description: string): 'positive' | 'negative' | 'neutral' {
  const text = `${title} ${description}`.toLowerCase()
  
  const positiveKeywords = [
    'surge', 'jump', 'rise', 'gain', 'up', 'higher', 'positive', 'growth', 'profit', 'beat', 'exceed',
    'strong', 'bullish', 'rally', 'breakout', 'record', 'high', 'success', 'win', 'boost', 'increase'
  ]
  
  const negativeKeywords = [
    'fall', 'drop', 'decline', 'down', 'lower', 'negative', 'loss', 'miss', 'weak', 'bearish',
    'crash', 'plunge', 'sell-off', 'concern', 'risk', 'worry', 'fear', 'doubt', 'uncertainty'
  ]
  
  const positiveCount = positiveKeywords.filter(keyword => text.includes(keyword)).length
  const negativeCount = negativeKeywords.filter(keyword => text.includes(keyword)).length
  
  if (positiveCount > negativeCount) return 'positive'
  if (negativeCount > positiveCount) return 'negative'
  return 'neutral'
}

// Helper function to determine impact level
function determineImpact(title: string, description: string, source: string): 'high' | 'medium' | 'low' {
  const text = `${title} ${description}`.toLowerCase()
  
  // High impact indicators
  const highImpactKeywords = [
    'federal reserve', 'fed', 'interest rates', 'earnings', 'quarterly results', 'merger', 'acquisition',
    'bankruptcy', 'layoffs', 'ceo', 'executive', 'regulatory', 'investigation', 'lawsuit'
  ]
  
  // Medium impact indicators
  const mediumImpactKeywords = [
    'stock', 'market', 'trading', 'investment', 'analyst', 'rating', 'upgrade', 'downgrade',
    'product', 'launch', 'partnership', 'expansion', 'growth'
  ]
  
  // High impact sources
  const highImpactSources = [
    'reuters', 'bloomberg', 'wall street journal', 'financial times', 'cnbc', 'marketwatch'
  ]
  
  if (highImpactKeywords.some(keyword => text.includes(keyword)) || 
      highImpactSources.some(sourceName => source.toLowerCase().includes(sourceName))) {
    return 'high'
  }
  
  if (mediumImpactKeywords.some(keyword => text.includes(keyword))) {
    return 'medium'
  }
  
  return 'low'
}

// Helper function to extract stock symbols from text
function extractStockSymbols(title: string, description: string): string[] {
  const text = `${title} ${description}`.toUpperCase()
  const symbols: string[] = []
  
  // Look for common stock symbols in the text
  FINANCIAL_SYMBOLS.forEach(symbol => {
    if (text.includes(symbol)) {
      symbols.push(symbol)
    }
  })
  
  return symbols.slice(0, 5) // Limit to 5 symbols
}

// Helper function to categorize news
function categorizeNews(title: string, description: string): 'market' | 'earnings' | 'economy' | 'technology' | 'politics' | 'crypto' {
  const text = `${title} ${description}`.toLowerCase()
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category as any
    }
  }
  
  return 'market' // Default category
}

// Helper function to generate AI insights
function generateAIInsights(title: string, description: string, symbols: string[]): string[] {
  const insights: string[] = []
  const text = `${title} ${description}`.toLowerCase()
  
  if (text.includes('earnings') && symbols.length > 0) {
    insights.push(`Strong earnings may drive positive momentum in ${symbols[0]} and related stocks`)
  }
  
  if (text.includes('federal reserve') || text.includes('interest rates')) {
    insights.push('Rate changes typically impact growth stocks and financial sector performance')
  }
  
  if (text.includes('technology') || text.includes('ai')) {
    insights.push('Tech sector developments may influence broader market sentiment')
  }
  
  if (symbols.length > 0) {
    insights.push(`Monitor ${symbols[0]} for potential trading opportunities`)
  }
  
  return insights.length > 0 ? insights : ['Consider market impact and related sector movements']
}

// Fetch news from NewsAPI
async function fetchNewsFromAPI(query?: string, category?: string, limit: number = 20, page: number = 1): Promise<NewsItem[]> {
  try {
    let url = `${NEWS_API_BASE_URL}/everything?`
    const params = new URLSearchParams({
      apiKey: NEWS_API_KEY,
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: limit.toString(),
      page: page.toString()
    })
    
    if (query) {
      params.append('q', query)
    } else {
      // Default to financial news if no specific query
      params.append('q', 'stock market OR trading OR investing OR financial news')
    }
    
    // Add date filter for recent news (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    params.append('from', sevenDaysAgo.toISOString().split('T')[0])
    
    url += params.toString()
    
    console.log('📰 Fetching news from NewsAPI:', url)
    
    const response = await fetch(url)
    const data: NewsAPIResponse = await response.json()
    
    if (data.status !== 'ok') {
      throw new Error(`NewsAPI error: ${data.status}`)
    }
    
    // Transform NewsAPI articles to our format
    const newsItems: NewsItem[] = data.articles.map((article, index) => {
      const symbols = extractStockSymbols(article.title, article.description || '')
      const sentiment = analyzeSentiment(article.title, article.description || '')
      const impact = determineImpact(article.title, article.description || '', article.source.name)
      const category = categorizeNews(article.title, article.description || '')
      const aiInsights = generateAIInsights(article.title, article.description || '', symbols)
      
      return {
        id: `news_${Date.now()}_${index}`,
        title: article.title,
        summary: article.description || 'No description available',
        content: article.content || article.description || 'No content available',
        source: article.source.name,
        url: article.url,
        publishedAt: article.publishedAt,
        category,
        sentiment,
        impact,
        symbols,
        aiInsights,
        relatedStocks: symbols.slice(0, 3)
      }
    })
    
    console.log(`✅ Fetched ${newsItems.length} news articles from NewsAPI`)
    return newsItems
    
  } catch (error) {
    console.error('❌ Error fetching news from NewsAPI:', error)
    throw error
  }
}

// Fetch top headlines for market updates
async function fetchTopHeadlines(limit: number = 20, page: number = 1): Promise<NewsItem[]> {
  try {
    const url = `${NEWS_API_BASE_URL}/top-headlines?country=us&category=business&apiKey=${NEWS_API_KEY}&pageSize=${limit}&page=${page}`
    
    console.log('📰 Fetching top headlines from NewsAPI')
    
    const response = await fetch(url)
    const data: NewsAPIResponse = await response.json()
    
    if (data.status !== 'ok') {
      throw new Error(`NewsAPI error: ${data.status}`)
    }
    
    const newsItems: NewsItem[] = data.articles.map((article, index) => {
      const symbols = extractStockSymbols(article.title, article.description || '')
      const sentiment = analyzeSentiment(article.title, article.description || '')
      const impact = determineImpact(article.title, article.description || '', article.source.name)
      const category = categorizeNews(article.title, article.description || '')
      const aiInsights = generateAIInsights(article.title, article.description || '', symbols)
      
      return {
        id: `headline_${Date.now()}_${index}`,
        title: article.title,
        summary: article.description || 'No description available',
        content: article.content || article.description || 'No content available',
        source: article.source.name,
        url: article.url,
        publishedAt: article.publishedAt,
        category,
        sentiment,
        impact,
        symbols,
        aiInsights,
        relatedStocks: symbols.slice(0, 3)
      }
    })
    
    console.log(`✅ Fetched ${newsItems.length} top headlines from NewsAPI`)
    return newsItems
    
  } catch (error) {
    console.error('❌ Error fetching top headlines from NewsAPI:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const sentiment = searchParams.get('sentiment')
  const limit = parseInt(searchParams.get('limit') || '20')
  const page = parseInt(searchParams.get('page') || '1')
  const type = searchParams.get('type') || 'news'
  const query = searchParams.get('q') || searchParams.get('query')
  
  try {

    console.log('📰 News API request:', { category, sentiment, limit, page, type, query })

    if (type === 'market-updates') {
      const updates = generateMarketUpdates(limit, page)
      
      // Sort by timestamp (newest first)
      const sortedUpdates = updates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      return NextResponse.json({
        success: true,
        data: sortedUpdates,
        count: sortedUpdates.length,
        page: page,
        hasMore: sortedUpdates.length === limit,
        timestamp: new Date().toISOString()
      })
    }

    // Fetch real news from selected source with safe fallback
    let newsItems: NewsItem[] = []

    if (NEWS_SOURCE === 'polygon') {
      try {
        if (query) {
          newsItems = await fetchNewsFromPolygon(query, category || undefined, limit, page)
        } else if (category && category !== 'all') {
          newsItems = await fetchNewsFromPolygon(undefined, category || undefined, limit, page)
        } else {
          newsItems = await fetchTopHeadlinesFromPolygon(limit, page)
        }
      } catch (polygonError) {
        console.warn('⚠️ Polygon news failed, falling back to NewsAPI:', polygonError)
        // Fallback to existing NewsAPI behavior
        if (query) {
          newsItems = await fetchNewsFromAPI(query, category || undefined, limit, page)
        } else if (category && category !== 'all') {
          const categoryKeywords = CATEGORY_KEYWORDS[category as keyof typeof CATEGORY_KEYWORDS] || []
          const searchQuery = categoryKeywords.join(' OR ')
          newsItems = await fetchNewsFromAPI(searchQuery, category || undefined, limit, page)
        } else {
          newsItems = await fetchTopHeadlines(limit, page)
        }
      }
    } else {
      // Original NewsAPI path (default)
      if (query) {
        newsItems = await fetchNewsFromAPI(query, category || undefined, limit, page)
      } else if (category && category !== 'all') {
        const categoryKeywords = CATEGORY_KEYWORDS[category as keyof typeof CATEGORY_KEYWORDS] || []
        const searchQuery = categoryKeywords.join(' OR ')
        newsItems = await fetchNewsFromAPI(searchQuery, category || undefined, limit, page)
      } else {
        newsItems = await fetchTopHeadlines(limit, page)
      }
    }

    // Apply sentiment filter if specified
    if (sentiment && sentiment !== 'all') {
      newsItems = newsItems.filter(item => item.sentiment === sentiment)
    }

    // Apply limit
    const limitedNews = newsItems.slice(0, limit)
    
    // Determine if there might be more articles available
    // Relaxed logic: if we received any articles, allow client to attempt loading more.
    // This avoids hiding the Load More button when upstream APIs return fewer than `limit`
    // on the first page (common with certain endpoints like top-headlines).
    const hasMore = limitedNews.length > 0

    // If no news found, provide helpful message
    if (limitedNews.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        total: 0,
        page: page,
        hasMore: false,
        message: `No news articles found for ${category || 'all categories'}. Try selecting a specific category or using different search terms.`,
        filters: { category, sentiment, query },
        source: 'NewsAPI.org',
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json({
      success: true,
      data: limitedNews,
      count: limitedNews.length,
      total: newsItems.length,
      page: page,
      hasMore: hasMore,
      filters: { category, sentiment, query },
      source: NEWS_SOURCE === 'polygon' ? 'Polygon.io' : 'NewsAPI.org',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
     console.error('❌ Error fetching news:', error)
     
     // Return fallback data if NewsAPI fails
     const fallbackNews: NewsItem[] = [
       {
         id: 'fallback_1',
         title: 'Market Update: S&P 500 Shows Resilience',
         summary: 'The S&P 500 continues to demonstrate strength despite market volatility, with technology stocks leading the gains.',
         content: 'The S&P 500 index has shown remarkable resilience in recent trading sessions, with technology stocks leading the market gains. Investors remain optimistic about the economic recovery and corporate earnings growth.',
         source: 'MarketWatch',
         url: 'https://marketwatch.com',
         publishedAt: new Date().toISOString(),
         category: 'market',
         sentiment: 'positive',
         impact: 'medium',
         symbols: ['SPY', 'QQQ', 'AAPL', 'MSFT'],
         aiInsights: ['Technology sector continues to lead market gains', 'Consider exposure to growth-oriented ETFs'],
         relatedStocks: ['SPY', 'QQQ', 'AAPL']
       }
     ]
     
    return NextResponse.json({
      success: false,
       message: 'NewsAPI service temporarily unavailable, using fallback data',
       data: fallbackNews,
       count: fallbackNews.length,
       page: page,
       hasMore: false, // No more articles available when API fails
       error: error instanceof Error ? error.message : 'Unknown error',
       timestamp: new Date().toISOString()
     })
   }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, newsId } = body

    console.log('📰 News API POST request:', { action, newsId })

    switch (action) {
      case 'bookmark':
        // In a real implementation, this would save to a database
        return NextResponse.json({
          success: true,
          message: 'News bookmarked successfully',
          data: { newsId, bookmarked: true }
        })

      case 'share':
        // In a real implementation, this would track sharing analytics
        return NextResponse.json({
          success: true,
          message: 'News shared successfully',
          data: { newsId, shared: true }
        })

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ Error processing news action:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process news action',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
