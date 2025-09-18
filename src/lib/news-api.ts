// Real-time News & Sentiment Analysis API Service
import { NewsItem, SentimentScore, EarningsEvent } from '@/types'

// News API configuration
const NEWS_API_KEY = process.env.NEWS_API_KEY
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY

export class NewsService {
  private static cache = new Map<string, { data: any; timestamp: number }>()
  private static CACHE_DURATION = 300000 // 5 minutes

  // Get real-time financial news
  static async getFinancialNews(symbol?: string, limit: number = 20): Promise<NewsItem[]> {
    const cacheKey = `news_${symbol || 'general'}_${limit}`
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      console.log(`📰 Fetching financial news for ${symbol || 'general market'}...`)
      
      let news: NewsItem[] = []
      
      // 1. Try NewsAPI.org (primary source)
      if (NEWS_API_KEY) {
        try {
          const query = symbol ? `${symbol} stock market` : 'financial market'
          const response = await fetch(
            `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=${limit}&apiKey=${NEWS_API_KEY}`
          )
          
          if (response.ok) {
            const data = await response.json()
            news = data.articles?.map((article: any) => ({
              id: article.url,
              title: article.title,
              description: article.description,
              content: article.content,
              url: article.url,
              imageUrl: article.urlToImage,
              source: article.source.name,
              publishedAt: new Date(article.publishedAt),
              sentiment: null, // Will be calculated separately
              relevance: this.calculateRelevance(article, symbol),
              category: this.categorizeNews(article.title, article.description)
            })) || []
          }
        } catch (error) {
          console.log('❌ NewsAPI failed:', error)
        }
      }
      
      // 2. Fallback to Alpha Vantage News API
      if (news.length === 0 && ALPHA_VANTAGE_API_KEY) {
        try {
          const response = await fetch(
            `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol || 'FOREX'}&apikey=${ALPHA_VANTAGE_API_KEY}`
          )
          
          if (response.ok) {
            const data = await response.json()
            news = data.feed?.map((article: any) => ({
              id: article.url,
              title: article.title,
              description: article.summary,
              content: article.summary,
              url: article.url,
              imageUrl: article.banner_image,
              source: article.source,
              publishedAt: new Date(article.time_published),
              sentiment: {
                score: parseFloat(article.overall_sentiment_score),
                label: article.overall_sentiment_label,
                confidence: parseFloat(article.overall_sentiment_label_confidence)
              },
              relevance: this.calculateRelevance(article, symbol),
              category: this.categorizeNews(article.title, article.summary)
            })) || []
          }
        } catch (error) {
          console.log('❌ Alpha Vantage News failed:', error)
        }
      }
      
      // 3. Return empty array if no real data available
      if (news.length === 0) {
        console.log('⚠️ No real news data available - returning empty results')
        return []
      }
      
      // Sort by relevance and recency
      news.sort((a, b) => {
        const relevanceDiff = (b.relevance || 0) - (a.relevance || 0)
        if (Math.abs(relevanceDiff) > 0.1) return relevanceDiff
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      })
      
      this.cache.set(cacheKey, { data: news, timestamp: Date.now() })
      console.log(`✅ Fetched ${news.length} news articles`)
      
      return news
         } catch (error) {
       console.error('❌ Error fetching news:', error)
       return []
     }
  }

  // Get earnings calendar
  static async getEarningsCalendar(days: number = 30): Promise<EarningsEvent[]> {
    const cacheKey = `earnings_${days}`
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      console.log(`📅 Fetching earnings calendar for next ${days} days...`)
      
      let earnings: EarningsEvent[] = []
      
      // Try Alpha Vantage Earnings Calendar
      if (ALPHA_VANTAGE_API_KEY) {
        try {
          const response = await fetch(
            `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&horizon=${days}day&apikey=${ALPHA_VANTAGE_API_KEY}`
          )
          
          if (response.ok) {
            const csvText = await response.text()
            const lines = csvText.split('\n').slice(1) // Skip header
            
            earnings = lines
              .filter(line => line.trim())
              .map(line => {
                const [symbol, name, reportDate, estimate, actual] = line.split(',')
                return {
                  id: `${symbol}_${reportDate}`,
                  symbol: symbol,
                  companyName: name,
                  reportDate: new Date(reportDate),
                  estimate: parseFloat(estimate) || 0,
                  actual: parseFloat(actual) || null,
                  prediction: parseFloat(estimate) || 0,
                  sentiment: { score: 0.5, label: 'neutral', confidence: 0.6 }
                }
              })
          }
        } catch (error) {
          console.log('❌ Alpha Vantage Earnings failed:', error)
        }
      }
      
      // If no real earnings data available, return empty array
      if (earnings.length === 0) {
        console.log('⚠️ No real earnings data available - returning empty results')
        return []
      }
      
      this.cache.set(cacheKey, { data: earnings, timestamp: Date.now() })
      console.log(`✅ Fetched ${earnings.length} real earnings events`)
      
      return earnings
    } catch (error) {
      console.error('❌ Error fetching earnings:', error)
      return []
    }
  }

  // Get social media sentiment
  static async getSocialMediaSentiment(symbol: string): Promise<SentimentScore> {
    const cacheKey = `social_${symbol}`
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      console.log(`📱 Fetching social media sentiment for ${symbol}...`)
      
      // Try to get real social media sentiment from available APIs
      let sentiment: SentimentScore | null = null
      
      // Try Finnhub sentiment if available
      if (FINNHUB_API_KEY) {
        try {
          // Add timeout and better error handling
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
          
          const response = await fetch(`https://finnhub.io/api/v1/stock/sentiment?symbol=${symbol}&from=2024-01-01&token=${FINNHUB_API_KEY}`, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'TradingPlatform/1.0'
            }
          })
          
          clearTimeout(timeoutId)
          
          if (response.ok) {
            const data = await response.json()
            if (data.reddit && data.twitter) {
              const redditSentiment = data.reddit.reduce((acc: number, item: any) => acc + (item.sentiment || 0), 0) / data.reddit.length
              const twitterSentiment = data.twitter.reduce((acc: number, item: any) => acc + (item.sentiment || 0), 0) / data.twitter.length
              const avgSentiment = (redditSentiment + twitterSentiment) / 2
              sentiment = {
                score: avgSentiment,
                label: avgSentiment > 0.1 ? 'positive' : avgSentiment < -0.1 ? 'negative' : 'neutral',
                confidence: 0.8
              }
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('⏰ Finnhub sentiment timeout')
          } else {
            console.log('❌ Finnhub sentiment failed:', error instanceof Error ? error.message : 'Unknown error')
          }
        }
      }
      
      // If no real sentiment available, return neutral
      if (!sentiment) {
        console.log('⚠️ No real social sentiment available - returning neutral')
        sentiment = { score: 0, label: 'neutral', confidence: 0.5 }
      }
      
      this.cache.set(cacheKey, { data: sentiment, timestamp: Date.now() })
      console.log(`✅ Social sentiment for ${symbol}: ${sentiment.score.toFixed(3)} (${sentiment.label})`)
      
      return sentiment
    } catch (error) {
      console.error('❌ Error fetching social sentiment:', error)
      return { score: 0, label: 'neutral', confidence: 0.5 }
    }
  }

  // Analyze news sentiment using AI
  static async analyzeNewsSentiment(news: NewsItem[]): Promise<NewsItem[]> {
    try {
      console.log(`🤖 Analyzing sentiment for ${news.length} news articles...`)
      
      const analyzedNews = await Promise.all(
        news.map(async (item) => {
          if (item.sentiment) return item // Already has sentiment
          
          // Simple sentiment analysis (in production, use OpenAI API or similar)
          const sentiment = this.analyzeTextSentiment(item.title + ' ' + item.description)
          
          return {
            ...item,
            sentiment
          }
        })
      )
      
      console.log(`✅ Analyzed sentiment for ${analyzedNews.length} articles`)
      return analyzedNews
    } catch (error) {
      console.error('❌ Error analyzing sentiment:', error)
      return news
    }
  }

  // Helper methods
  private static calculateRelevance(article: any, symbol?: string): number {
    if (!symbol) return 0.5
    
    const text = `${article.title} ${article.description}`.toLowerCase()
    const symbolLower = symbol.toLowerCase()
    
    if (text.includes(symbolLower)) return 1.0
    if (text.includes(symbolLower.replace('.', ''))) return 0.9
    
    // Check for company name variations
    const companyNames: { [key: string]: string[] } = {
      'AAPL': ['apple', 'iphone', 'ipad', 'macbook'],
      'GOOGL': ['google', 'alphabet', 'android', 'youtube'],
      'MSFT': ['microsoft', 'windows', 'office', 'azure'],
      'TSLA': ['tesla', 'electric vehicle', 'ev', 'musk'],
      'AMZN': ['amazon', 'aws', 'prime', 'bezos']
    }
    
    const variations = companyNames[symbol] || []
    for (const variation of variations) {
      if (text.includes(variation)) return 0.8
    }
    
    return 0.3
  }

  private static categorizeNews(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase()
    
    if (text.includes('earnings') || text.includes('quarterly') || text.includes('revenue')) {
      return 'Earnings'
    }
    if (text.includes('merger') || text.includes('acquisition') || text.includes('buyout')) {
      return 'M&A'
    }
    if (text.includes('ceo') || text.includes('executive') || text.includes('leadership')) {
      return 'Leadership'
    }
    if (text.includes('product') || text.includes('launch') || text.includes('release')) {
      return 'Product'
    }
    if (text.includes('regulation') || text.includes('legal') || text.includes('lawsuit')) {
      return 'Regulatory'
    }
    if (text.includes('market') || text.includes('trading') || text.includes('stock')) {
      return 'Market'
    }
    
    return 'General'
  }

  private static analyzeTextSentiment(text: string): SentimentScore {
    const positiveWords = ['up', 'rise', 'gain', 'positive', 'growth', 'profit', 'success', 'strong', 'bullish']
    const negativeWords = ['down', 'fall', 'loss', 'negative', 'decline', 'weak', 'bearish', 'crash', 'drop']
    
    const words = text.toLowerCase().split(/\s+/)
    let positiveCount = 0
    let negativeCount = 0
    
    for (const word of words) {
      if (positiveWords.includes(word)) positiveCount++
      if (negativeWords.includes(word)) negativeCount++
    }
    
    const total = positiveCount + negativeCount
    if (total === 0) return { score: 0, label: 'neutral', confidence: 0.5 }
    
    const score = (positiveCount - negativeCount) / total
    const confidence = Math.min(total / 10, 1) // Higher confidence with more sentiment words
    
    let label: 'positive' | 'negative' | 'neutral' = 'neutral'
    if (score > 0.2) label = 'positive'
    else if (score < -0.2) label = 'negative'
    
    return { score, label, confidence }
  }


}

// Export singleton instance
export const newsService = new NewsService()
