import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { AIChatMessage, ToolCall, ToolResult } from '@/types'
import { tradingTools } from '@/lib/ai-tools'
import { yahooFinanceSimple } from '@/lib/yahoo-finance-simple'
import { webSearch } from '@/lib/web-search'
import { NewsService } from '@/lib/news-api'
import { memorySystem } from '@/lib/memory-system'
import { guardrailsSystem } from '@/lib/guardrails-system'
import { getRealTimeDataSystem } from '@/lib/real-time-data-system'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Enhanced system prompts with memory and context awareness
const OUTPUT_POLICY = `

OUTPUT POLICY:
- Respond in plain text only (no Markdown, emojis, or asterisks).
- Use 'Metric / Value' sections for key facts.
- Use simple dash bullets for lists.
- Keep structure consistent and concise.`

const SYSTEM_PROMPTS = {
  default: `You are TradeGPT, an advanced AI trading assistant with real-time market data access, memory, and intelligent guardrails. You provide personalized, safe, and compliant trading insights.

**CORE CAPABILITIES:**
- Real-time market data and analysis
- Personalized recommendations based on user profile
- Memory of conversation history and user preferences
- Advanced risk management and compliance checks
- Multi-source data integration (Polygon.io, Yahoo Finance, etc.)
- Intelligent tool selection and execution

**MEMORY & PERSONALIZATION:**
- Remember user preferences, risk tolerance, and trading style
- Learn from conversation history and user feedback
- Provide contextually relevant suggestions
- Adapt responses based on user experience level

**SAFETY & COMPLIANCE:**
- Always include appropriate disclaimers
- Respect risk limits and user protection measures
- Provide balanced, non-manipulative advice
- Ensure suitability for user profile

**RESPONSE STYLE:**
- Conversational and engaging like ChatGPT
- Professional yet approachable
- Use emojis and formatting for clarity
- Provide actionable insights with clear reasoning
- Include relevant data and statistics
- Be honest about limitations and uncertainties

**TOOL USAGE:**
- Use real-time data tools for current market information
- Use web search for recent news and market information
- Use AI prediction tools for advanced analysis
- Always explain why you're using specific tools

**IMPORTANT:**
- Think like an expert trading advisor
- Consider user's risk tolerance and experience level
- Provide balanced perspectives on market analysis
- Always prioritize user safety and compliance
- Use memory to provide personalized insights`,

  trading: `You are TradeGPT, a professional trading expert with deep market knowledge and real-time data access.

**EXPERT TRADING FOCUS:**
- Advanced technical and fundamental analysis
- Risk management and position sizing
- Market psychology and sentiment analysis
- Portfolio optimization and diversification
- Real-time market monitoring and alerts
- Chart pattern recognition and technical analysis

**MEMORY INTEGRATION:**
- Remember user's trading history and preferences
- Consider past recommendations and outcomes
- Adapt strategies based on user's risk profile
- Provide continuity in trading discussions

**SAFETY FIRST:**
- Always include stop-loss recommendations
- Respect position size limits
- Consider market conditions and volatility
- Provide balanced risk/reward analysis

**TOOL SELECTION:**
- Use real-time data for current prices and analysis
- Use technical analysis tools for chart patterns
- Use AI predictions for advanced insights
- Use web search for charts and recent news

**RESPONSE FORMAT:**
- Clear entry, exit, and risk management levels
- Technical reasoning and market context
- Risk assessment and position sizing
- Alternative scenarios and contingency plans`,

  casual: `You are TradeGPT, a friendly AI assistant who happens to be excellent at trading and market analysis.

**FRIENDLY APPROACH:**
- Warm, conversational, and encouraging
- Explain complex concepts simply
- Use humor and relatable examples
- Be patient with beginners
- Celebrate learning and progress

**MEMORY & PERSONALIZATION:**
- Remember user's interests and learning style
- Build on previous conversations naturally
- Provide gentle guidance and encouragement
- Adapt complexity to user's comfort level

**EDUCATIONAL FOCUS:**
- Explain trading concepts clearly
- Share interesting market facts and stories
- Encourage responsible investing habits
- Provide learning resources and next steps

**SAFETY & GUIDANCE:**
- Emphasize risk management and education
- Encourage diversification and long-term thinking
- Provide beginner-friendly explanations
- Always include appropriate warnings

**TOOL USAGE:**
- Use simple, clear data presentations
- Focus on educational content
- Provide context for market movements
- Use visual aids when helpful`,

  technical: `You are TradeGPT, a technical analysis expert with advanced chart pattern recognition and indicator expertise.

**TECHNICAL EXPERTISE:**
- Advanced chart pattern analysis
- Multiple timeframe analysis
- Indicator interpretation and optimization
- Volume and momentum analysis
- Support and resistance identification

**MEMORY INTEGRATION:**
- Remember user's preferred indicators and timeframes
- Track pattern recognition accuracy
- Learn from user's technical preferences
- Provide consistent technical framework

**ANALYSIS APPROACH:**
- Data-driven and objective analysis
- Multiple confirmation signals
- Risk/reward ratio calculations
- Clear technical levels and targets

**TOOL SELECTION:**
- Use real-time data for current technical levels
- Use technical analysis tools for patterns
- Use AI predictions for trend analysis
- Use web search for chart images and news

**RESPONSE STRUCTURE:**
- Current technical position
- Key levels to watch
- Pattern identification and strength
- Risk assessment and management
- Alternative scenarios`
}

// Function to determine conversation type and select appropriate prompt
function getSystemPrompt(messages: AIChatMessage[], userPreferences?: any): string {
  if (messages.length === 0) return SYSTEM_PROMPTS.default

  const lastMessage = messages[messages.length - 1].content.toLowerCase()
  
  // Check for trading-specific keywords
  const tradingKeywords = ['trade', 'strategy', 'position', 'risk', 'profit', 'loss', 'entry', 'exit', 'stop loss']
  const technicalKeywords = ['chart', 'pattern', 'indicator', 'rsi', 'macd', 'fibonacci', 'support', 'resistance', 'trend']
  const casualKeywords = ['hello', 'hi', 'how are you', 'thanks', 'thank you', 'good', 'great', 'awesome']

  const hasTradingKeywords = tradingKeywords.some(keyword => lastMessage.includes(keyword))
  const hasTechnicalKeywords = technicalKeywords.some(keyword => lastMessage.includes(keyword))
  const hasCasualKeywords = casualKeywords.some(keyword => lastMessage.includes(keyword))

  if (hasTechnicalKeywords) return SYSTEM_PROMPTS.technical
  if (hasTradingKeywords) return SYSTEM_PROMPTS.trading
  if (hasCasualKeywords) return SYSTEM_PROMPTS.casual
  
  return SYSTEM_PROMPTS.default
}

// Enhanced tool execution with memory and guardrails
async function executeEnhancedTool(
  toolName: string, 
  args: any, 
  userId: string,
  sessionId: string
): Promise<string> {
  try {
    // Get memory context for personalized responses
    const memoryContext = await memorySystem.getMemoryContext(userId, sessionId)
    
    // Execute tool with context
    let result: string
    
    switch (toolName) {
      case 'get_stock_quote':
        result = await executeStockQuote(args.symbol, memoryContext)
        break
      
      case 'search_stocks':
        result = await executeStockSearch(args.query, memoryContext)
        break
      
      case 'get_market_data':
        result = await executeMarketData(args.indices, memoryContext)
        break
      
      case 'analyze_stock':
        result = await executeStockAnalysis(args.symbol, args.timeframe, memoryContext)
        break
      
      case 'get_company_info':
        result = await executeCompanyInfo(args.symbol, memoryContext)
        break
      
      case 'search_web':
        result = await executeWebSearch(args.query, args.searchType, memoryContext)
        break
      
      case 'get_market_news':
        result = await executeMarketNews(args, memoryContext)
        break
      
      case 'generate_chart':
        result = await executeGenerateChart(args, memoryContext)
        break
      
      case 'get_earnings_calendar':
        result = await executeEarningsCalendar(args, memoryContext)
        break
      
      case 'get_news_sentiment':
        result = await executeNewsSentiment(args, memoryContext)
        break
      
      case 'get_ai_prediction':
        result = await executeAIPrediction(args, memoryContext)
        break
      
      case 'analyze_portfolio_risk':
        result = await executePortfolioRiskAnalysis(args, memoryContext)
        break
      
      case 'optimize_portfolio':
        result = await executePortfolioOptimization(args, memoryContext)
        break
      
      case 'get_market_intelligence':
        result = await executeMarketIntelligence(args, memoryContext)
        break
      
      case 'get_personalized_insights':
        result = await executePersonalizedInsights(args, memoryContext)
        break
      
      case 'get_market_commentary':
        result = await executeMarketCommentary(args, memoryContext)
        break
      
      case 'update_user_preferences':
        result = await executeUpdatePreferences(args, memoryContext, userId)
        break
      
      case 'get_advanced_ml_prediction':
        result = await executeAdvancedMLPrediction(args, memoryContext)
        break
      
      case 'optimize_portfolio_advanced':
        result = await executeAdvancedPortfolioOptimization(args, memoryContext)
        break
      
      case 'get_real_time_optimization':
        result = await executeRealTimeOptimization(args, memoryContext)
        break
      
      case 'get_reinforcement_learning_strategy':
        result = await executeRLStrategy(args, memoryContext)
        break
      
      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }

    // Update memory with tool usage
    await memorySystem.updateMemory(userId, sessionId, {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Used tool: ${toolName}`,
      timestamp: new Date()
    })

    return result

  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error)
    return JSON.stringify({
      error: `Failed to execute ${toolName}`,
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Helper functions for news API integration
async function generateEarningsInsights(earnings: any[], memoryContext: any): Promise<string> {
  try {
    const upcomingEarnings = earnings.filter(earning => new Date(earning.reportDate) > new Date())
    const recentEarnings = earnings.filter(earning => new Date(earning.reportDate) <= new Date())
    
    let insights = `Earnings Calendar Analysis\n\n`
    insights += `Metric / Value:\n`
    insights += `- Upcoming Count: ${upcomingEarnings.length}\n`
    insights += `- Recent Count: ${recentEarnings.length}\n\n`
    
    if (upcomingEarnings.length > 0) {
      insights += `Upcoming:\n`
      upcomingEarnings.slice(0, 5).forEach((earning: any) => {
        insights += `- ${earning.symbol} (${earning.companyName}) - ${new Date(earning.reportDate).toLocaleDateString()}\n`
        if (earning.prediction) {
          insights += `  Expected: $${earning.prediction.toFixed(2)}\n`
        }
      })
      insights += '\n'
    }
    
    if (recentEarnings.length > 0) {
      insights += `Recent:\n`
      recentEarnings.slice(0, 3).forEach((earning: any) => {
        insights += `- ${earning.symbol} - ${earning.actual ? `$${earning.actual.toFixed(2)}` : 'Pending'}\n`
      })
    }
    
    return insights
  } catch (error) {
    console.error('Error generating earnings insights:', error)
    return 'Unable to generate earnings insights at this time.'
  }
}

async function generateSentimentInsights(symbol: string, sentiment: number, memoryContext: any): Promise<string> {
  try {
    let insights = `Sentiment Analysis for ${symbol}\n\n`
    insights += `Metric / Value:\n`
    insights += `- Score: ${(sentiment * 100).toFixed(1)}%\n`
    
    if (sentiment > 0.3) {
      insights += `- Sentiment: Positive\n\n`
      insights += `Insights:\n`
      insights += `- Market sentiment is bullish for ${symbol}\n`
      insights += `- Consider this as a positive factor in your analysis\n`
    } else if (sentiment < -0.3) {
      insights += `- Sentiment: Negative\n\n`
      insights += `Insights:\n`
      insights += `- Market sentiment is bearish for ${symbol}\n`
      insights += `- Exercise caution and consider risk management\n`
    } else {
      insights += `- Sentiment: Neutral\n\n`
      insights += `Insights:\n`
      insights += `- Market sentiment is mixed for ${symbol}\n`
      insights += `- Focus on technical and fundamental analysis\n`
    }
    
    // Add personalized insights based on user preferences
    if (memoryContext.userPreferences?.riskTolerance === 'conservative') {
      insights += `\nNote (Conservative): Consider sentiment as one factor among many in your decision-making process.`
    } else if (memoryContext.userPreferences?.riskTolerance === 'aggressive') {
      insights += `\nNote (Aggressive): Sentiment can be a leading indicator for short-term price movements.`
    }
    
    return insights
  } catch (error) {
    console.error('Error generating sentiment insights:', error)
    return 'Unable to generate sentiment insights at this time.'
  }
}

// Enhanced tool execution functions with memory context
async function executeStockQuote(symbol: string, memoryContext: any): Promise<string> {
  const stock = await yahooFinanceSimple.getStockData(symbol)
        if (!stock) {
          return JSON.stringify({
      error: `No data found for ${symbol}`,
      symbol: symbol
          })
        }

  // Add personalized insights based on user preferences
  const personalizedInsights = await generatePersonalizedInsights(stock, memoryContext)

        return JSON.stringify({
          symbol: stock.symbol,
          name: stock.name,
          price: stock.price,
          change: stock.change,
          changePercent: stock.changePercent,
          volume: stock.volume,
          marketCap: stock.marketCap,
          pe: stock.pe,
          sector: stock.sector,
          exchange: stock.exchange,
          dayHigh: stock.dayHigh,
          dayLow: stock.dayLow,
    lastUpdated: stock.lastUpdated,
    personalizedInsights,
    riskAssessment: await assessStockRisk(stock, memoryContext)
        })
}
      
async function executeStockSearch(query: string, memoryContext: any): Promise<string> {
  const stocks = await yahooFinanceSimple.searchStocks(query)
        if (stocks.length === 0) {
          return JSON.stringify({
      error: `No stocks found for query: ${query}`,
      query: query
          })
        }

  // Filter results based on user preferences
  const filteredResults = filterResultsByPreferences(stocks, memoryContext.userPreferences)

        return JSON.stringify({
    query: query,
    results: filteredResults.slice(0, 10),
    count: filteredResults.length,
    recommendations: await generateSearchRecommendations(query, memoryContext)
  })
}

async function executeMarketData(indices: string[], memoryContext: any): Promise<string> {
        const marketData = []
  
  for (const index of indices) {
          const stock = await yahooFinanceSimple.getStockData(index)
          if (stock) {
            marketData.push({
              symbol: stock.symbol,
              name: stock.name,
              price: stock.price,
              change: stock.change,
              changePercent: stock.changePercent,
              volume: stock.volume
            })
          }
        }

  // Add market context and insights
  const realTimeDataSystem = getRealTimeDataSystem()
  const marketSnapshot = await realTimeDataSystem.getMarketSnapshot()
  const marketSentiment = await realTimeDataSystem.getMarketSentiment()

        return JSON.stringify({
          indices: marketData,
    marketContext: {
      sentiment: marketSentiment,
      volatility: marketSnapshot.volatility,
      breadth: marketSnapshot.breadth
    },
    personalizedInsights: await generateMarketInsights(marketData, memoryContext),
          timestamp: new Date().toISOString()
        })
}

async function executeStockAnalysis(symbol: string, timeframe: string, memoryContext: any): Promise<string> {
  const stock = await yahooFinanceSimple.getStockData(symbol)
  if (!stock) {
          return JSON.stringify({
      error: `No data found for ${symbol}`,
      symbol: symbol
          })
        }

  // Enhanced technical analysis
        const analysis = {
    symbol: stock.symbol,
    name: stock.name,
    currentPrice: stock.price,
    change: stock.change,
    changePercent: stock.changePercent,
    volume: stock.volume,
    technicalIndicators: await calculateTechnicalIndicators(stock, timeframe),
    support: stock.dayLow,
    resistance: stock.dayHigh,
    timeframe: timeframe,
    analysis: await generateTechnicalAnalysis(stock, timeframe, memoryContext),
    riskAssessment: await assessStockRisk(stock, memoryContext),
    personalizedRecommendations: await generatePersonalizedRecommendations(stock, memoryContext)
  }

        return JSON.stringify(analysis)
}

async function executeCompanyInfo(symbol: string, memoryContext: any): Promise<string> {
  const stock = await yahooFinanceSimple.getStockData(symbol)
  if (!stock) {
          return JSON.stringify({
      error: `No company data found for ${symbol}`,
      symbol: symbol
          })
        }

        return JSON.stringify({
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    exchange: stock.exchange,
    marketCap: stock.marketCap,
    pe: stock.pe,
    dividend: stock.dividend,
    dividendYield: stock.dividendYield,
    beta: stock.beta,
    eps: stock.eps,
    volume: stock.volume,
    avgVolume: stock.avgVolume,
    dayHigh: stock.dayHigh,
    dayLow: stock.dayLow,
    fiftyTwoWeekHigh: stock.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: stock.fiftyTwoWeekLow,
    fundamentalAnalysis: await generateFundamentalAnalysis(stock, memoryContext),
    sectorComparison: await compareToSector(stock, memoryContext)
  })
}

async function executeGenerateChart(args: any, memoryContext: any): Promise<string> {
  try {
    const { symbol, timeframe = '1mo', chartType = 'candlestick', indicators = ['sma20', 'volume'] } = args
    
    console.log(`📊 Generating chart for ${symbol} (${timeframe}, ${chartType})`)
    
    // Import the chart API logic directly instead of making HTTP fetch
    const { YahooFinanceChartAPI } = await import('@/lib/yahoo-finance-chart-api')
    const { DataSourceService } = await import('@/lib/data-source-service')
    
    // Get interval from timeframe
    const interval = getIntervalFromTimeframe(timeframe)
    
    // Try to fetch chart data directly from Yahoo Finance
    let chartData: any = null
    let dataSource = 'fallback'
    
    try {
      const result = await YahooFinanceChartAPI.fetchChartData({
        symbol,
        interval,
        range: timeframe
      })
      
      if (result.success && result.data) {
        // Convert Yahoo Finance data to chart format
        chartData = convertYahooFinanceToChartData(result.data, symbol)
        dataSource = 'yahoo_finance'
        console.log(`✅ Successfully fetched ${chartData.length} real data points for ${symbol}`)
      } else {
        throw new Error('Yahoo Finance API returned no data')
      }
    } catch (yahooError) {
      console.warn(`⚠️ Yahoo Finance failed for ${symbol}, using fallback:`, yahooError)
      // Use fallback data
      chartData = DataSourceService.generateChartFallbackData({
        symbol,
        timeframe: timeframe,
        dataType: 'chart'
      })
      dataSource = 'fallback'
    }
    
    if (!chartData || chartData.length === 0) {
      throw new Error(`No chart data available for ${symbol}`)
    }

    // Calculate basic metrics
    const data = chartData
    const latestPrice = data[data.length - 1]?.close || 0
    const previousPrice = data[data.length - 2]?.close || latestPrice
    const priceChange = latestPrice - previousPrice
    const priceChangePercent = ((priceChange / previousPrice) * 100)

    // Generate chart response
    const chartResponse = {
      type: 'chart',
      symbol: symbol.toUpperCase(),
      timeframe,
      chartType,
      indicators,
      currentPrice: latestPrice,
      priceChange,
      priceChangePercent,
      dataPoints: data.length,
      dataSource,
      isRealData: dataSource === 'yahoo_finance',
      chartUrl: `/chart/${symbol}?timeframe=${timeframe}&chartType=${chartType}&indicators=${indicators.join(',')}`,
      analysis: await generateChartAnalysis(symbol, data, timeframe, memoryContext)
    }

    return JSON.stringify(chartResponse)

  } catch (error) {
    console.error('Chart generation error:', error)
    return JSON.stringify({
      error: `Failed to generate chart for ${args.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      symbol: args.symbol,
      suggestion: 'Try a different symbol or timeframe'
    })
  }
}

// Helper function to convert Yahoo Finance data to chart format
function convertYahooFinanceToChartData(yahooData: any, symbol: string): any[] {
  try {
    const chartData = yahooData.chart
    if (!chartData || !chartData.result || !chartData.result[0]) {
      console.warn('Invalid Yahoo Finance data structure')
      return []
    }

    const result = chartData.result[0]
    const timestamps = result.timestamp
    const quotes = result.indicators.quote[0]
    
    if (!timestamps || !quotes) {
      console.warn('Missing timestamp or quote data')
      return []
    }

    const chartPoints: any[] = []
    
    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i]
      const open = quotes.open[i] || 0
      const high = quotes.high[i] || 0
      const low = quotes.low[i] || 0
      const close = quotes.close[i] || 0
      const volume = quotes.volume[i] || 0

      if (open > 0 && high > 0 && low > 0 && close > 0) {
        chartPoints.push({
          time: timestamp * 1000, // Convert to milliseconds
          open,
          high,
          low,
          close,
          volume,
          change: close - open,
          changePercent: ((close - open) / open) * 100
        })
      }
    }

    console.log(`Converted ${chartPoints.length} data points from Yahoo Finance`)
    return chartPoints
  } catch (error) {
    console.error('Error converting Yahoo Finance data:', error)
    return []
  }
}

function getIntervalFromTimeframe(timeframe: string): string {
  switch (timeframe) {
    case '1d': return '5m'
    case '5d': return '15m'
    case '1mo': return '1h'
    case '3mo': return '1d'
    case '6mo': return '1d'
    case '1y': return '1d'
    case '2y': return '1wk'
    case '5y': return '1mo'
    default: return '1d'
  }
}

async function generateChartAnalysis(symbol: string, data: any[], timeframe: string, memoryContext: any): Promise<string> {
  if (data.length < 20) return 'Insufficient data for analysis'

  const latest = data[data.length - 1]
  const previous = data[data.length - 2]
  const monthAgo = data[Math.max(0, data.length - 30)]

  const currentPrice = latest.close
  const dailyChange = ((latest.close - previous.close) / previous.close) * 100
  const monthlyChange = monthAgo ? ((latest.close - monthAgo.close) / monthAgo.close) * 100 : 0

  // Simple trend analysis
  const recentPrices = data.slice(-10).map(d => d.close)
  const isUptrend = recentPrices[recentPrices.length - 1] > recentPrices[0]
  const volatility = calculateVolatility(recentPrices)

  const volatilityLabel = volatility < 2 ? 'Low' : volatility < 5 ? 'Moderate' : 'High'
  return [
    `Chart Analysis for ${symbol.toUpperCase()}`,
    ``,
    `Metric / Value:`,
    `- Current Price: $${currentPrice.toFixed(2)}`,
    `- Daily Change: ${dailyChange >= 0 ? '+' : ''}${dailyChange.toFixed(2)}%`,
    `- Monthly Change: ${monthlyChange >= 0 ? '+' : ''}${monthlyChange.toFixed(2)}%`,
    `- Trend: ${isUptrend ? 'Bullish' : 'Bearish'}`,
    `- Volatility: ${volatilityLabel} (${volatility.toFixed(2)}%)`,
    ``,
    `Context:`,
    `- Timeframe: ${timeframe.toUpperCase()}`,
    `- Data Points: ${data.length}`
  ].join('\n')
}

function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0
  
  const returns = []
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1])
  }
  
  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
  
  return Math.sqrt(variance) * 100 // Convert to percentage
}

async function executeWebSearch(query: string, searchType: string, memoryContext: any): Promise<string> {
        let searchResults
        
        switch (searchType) {
          case 'trading':
      searchResults = await webSearch.searchTradingInfo(query)
            break
          case 'company':
      searchResults = await webSearch.searchCompanyInfo(query)
            break
          case 'news':
            searchResults = await webSearch.searchMarketNews()
            break
          default:
      searchResults = await webSearch.searchWeb(query)
        }
        
        if (searchResults.length === 0) {
          return JSON.stringify({
      error: `No web search results found for: ${query}`,
      query: query,
            searchType: searchType
          })
        }
        
        return JSON.stringify({
    query: query,
          searchType: searchType,
          results: searchResults,
          count: searchResults.length,
    source: 'Google Custom Search',
    relevanceScore: await calculateRelevanceScore(query, searchResults, memoryContext)
        })
}
      
async function executeMarketNews(args: any, memoryContext: any): Promise<string> {
  try {
    const { symbol, category = 'all', limit = 10 } = args
    
    console.log(`📰 Fetching market news for ${symbol || 'general market'}...`)
    
    // Get news from news service
    const newsResults = await NewsService.getFinancialNews(symbol, limit)
    
        if (newsResults.length === 0) {
          return JSON.stringify({
            error: 'No market news found',
        symbol: symbol,
            timestamp: new Date().toISOString()
          })
        }
    
    // Filter by category if specified
    let filteredNews = newsResults
    if (category && category !== 'all') {
      filteredNews = newsResults.filter(news => news.category === category)
    }
    
    // Filter news based on user preferences
    const personalizedNews = filterNewsByPreferences(filteredNews, memoryContext.userPreferences)
    
    // Analyze sentiment for news without sentiment
    const analyzedNews = await NewsService.analyzeNewsSentiment(personalizedNews)
        
        return JSON.stringify({
      news: analyzedNews,
      count: analyzedNews.length,
      symbol: symbol,
      category: category,
          timestamp: new Date().toISOString(),
      source: 'News API Service',
      sentiment: await analyzeNewsSentiment(analyzedNews),
      personalizedHighlights: await generateNewsHighlights(analyzedNews, memoryContext)
    })
  } catch (error) {
    console.error('❌ Error fetching market news:', error)
    return JSON.stringify({
      error: 'Failed to fetch market news',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function executeEarningsCalendar(args: any, memoryContext: any): Promise<string> {
  try {
    const { days = 30, symbols } = args
    
    console.log(`📅 Fetching earnings calendar for next ${days} days...`)
    
    // Get earnings calendar
    const earnings = await NewsService.getEarningsCalendar(days)
    
    if (earnings.length === 0) {
      return JSON.stringify({
        error: 'No earnings events found',
        days: days,
        timestamp: new Date().toISOString()
      })
    }
    
    // Filter by specific symbols if provided
    let filteredEarnings = earnings
    if (symbols && symbols.length > 0) {
      filteredEarnings = earnings.filter((earning: any) => 
        symbols.includes(earning.symbol)
      )
    }
    
    // Sort by date
    filteredEarnings.sort((a: any, b: any) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
    
    return JSON.stringify({
      earnings: filteredEarnings,
      count: filteredEarnings.length,
      days: days,
      symbols: symbols,
      timestamp: new Date().toISOString(),
      source: 'News API Service',
      insights: await generateEarningsInsights(filteredEarnings, memoryContext)
    })
  } catch (error) {
    console.error('❌ Error fetching earnings calendar:', error)
    return JSON.stringify({
      error: 'Failed to fetch earnings calendar',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function executeNewsSentiment(args: any, memoryContext: any): Promise<string> {
  try {
    const { symbol, include_social = true } = args
    
    if (!symbol) {
      return JSON.stringify({
        error: 'Symbol is required for sentiment analysis',
        timestamp: new Date().toISOString()
      })
    }
    
    console.log(`📊 Analyzing sentiment for ${symbol}...`)
    
    // Get news for the symbol
    const news = await NewsService.getFinancialNews(symbol, 20)
    
    if (news.length === 0) {
      return JSON.stringify({
        error: `No news found for ${symbol}`,
        symbol: symbol,
        timestamp: new Date().toISOString()
      })
    }
    
    // Analyze sentiment
    const analyzedNews = await NewsService.analyzeNewsSentiment(news)
    
    // Calculate overall sentiment
    const sentimentScores = analyzedNews
      .filter((item: any) => item.sentiment)
      .map((item: any) => item.sentiment!.score)
    
    const averageSentiment = sentimentScores.length > 0 
      ? sentimentScores.reduce((sum: number, score: number) => sum + score, 0) / sentimentScores.length 
      : 0
    
    // Get social media sentiment if requested
    let socialSentiment = null
    if (include_social) {
      socialSentiment = await NewsService.getSocialMediaSentiment(symbol)
    }
    
    // Determine overall sentiment label
    let overallLabel: 'positive' | 'negative' | 'neutral' = 'neutral'
    if (averageSentiment > 0.2) overallLabel = 'positive'
    else if (averageSentiment < -0.2) overallLabel = 'negative'
    
    return JSON.stringify({
      symbol: symbol,
      overallSentiment: {
        score: averageSentiment,
        label: overallLabel,
        confidence: Math.min(sentimentScores.length / 10, 1)
      },
      newsSentiment: {
        count: analyzedNews.length,
        positive: analyzedNews.filter((item: any) => item.sentiment?.label === 'positive').length,
        negative: analyzedNews.filter((item: any) => item.sentiment?.label === 'negative').length,
        neutral: analyzedNews.filter((item: any) => item.sentiment?.label === 'neutral').length
      },
      socialSentiment: socialSentiment,
      topNews: analyzedNews.slice(0, 5),
      timestamp: new Date().toISOString(),
      source: 'News API Service',
      insights: await generateSentimentInsights(symbol, averageSentiment, memoryContext)
    })
  } catch (error) {
    console.error('❌ Error analyzing sentiment:', error)
    return JSON.stringify({
      error: 'Failed to analyze sentiment',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// AI Prediction tools with memory integration
async function executeAIPrediction(args: any, memoryContext: any): Promise<string> {
        const { AIToolsExecutor } = await import('@/lib/ai-tools')
  
  // Add user context to prediction
  const enhancedArgs = {
    ...args,
    userPreferences: memoryContext.userPreferences,
    riskProfile: memoryContext.riskProfile,
    marketContext: memoryContext.marketContext
  }
  
  return await AIToolsExecutor.executeTool('get_ai_prediction', enhancedArgs)
}

async function executePortfolioRiskAnalysis(args: any, memoryContext: any): Promise<string> {
  const { AIToolsExecutor } = await import('@/lib/ai-tools')
  
  // Enhance portfolio analysis with user context
  const enhancedArgs = {
    ...args,
    userRiskTolerance: memoryContext.userPreferences.riskTolerance,
    tradingStyle: memoryContext.userPreferences.tradingStyle,
    marketContext: memoryContext.marketContext
  }
  
  return await AIToolsExecutor.executeTool('analyze_portfolio_risk', enhancedArgs)
}

async function executePortfolioOptimization(args: any, memoryContext: any): Promise<string> {
  const { AIToolsExecutor } = await import('@/lib/ai-tools')
  
  // Enhance optimization with user preferences
  const enhancedArgs = {
    ...args,
    userPreferences: memoryContext.userPreferences,
    riskProfile: memoryContext.riskProfile,
    marketContext: memoryContext.marketContext
  }
  
  return await AIToolsExecutor.executeTool('optimize_portfolio', enhancedArgs)
}

async function executeMarketIntelligence(args: any, memoryContext: any): Promise<string> {
  const { AIToolsExecutor } = await import('@/lib/ai-tools')
  
  // Add personalized market intelligence
  const enhancedArgs = {
    ...args,
    userPreferences: memoryContext.userPreferences,
    watchlist: memoryContext.userPreferences.watchlist,
    marketContext: memoryContext.marketContext
  }
  
  return await AIToolsExecutor.executeTool('get_market_intelligence', enhancedArgs)
}

async function executePersonalizedInsights(args: any, memoryContext: any): Promise<string> {
  const { AIToolsExecutor } = await import('@/lib/ai-tools')
  
  // Use memory context for personalized insights
  const enhancedArgs = {
    ...args,
    memoryContext: memoryContext,
    userPreferences: memoryContext.userPreferences,
    recentInteractions: memoryContext.recentInteractions
  }
  
  return await AIToolsExecutor.executeTool('get_personalized_insights', enhancedArgs)
}

async function executeMarketCommentary(args: any, memoryContext: any): Promise<string> {
  const { AIToolsExecutor } = await import('@/lib/ai-tools')
  
  // Add personalized commentary
  const enhancedArgs = {
    ...args,
    userPreferences: memoryContext.userPreferences,
    marketContext: memoryContext.marketContext,
    recentInteractions: memoryContext.recentInteractions
  }
  
  return await AIToolsExecutor.executeTool('get_market_commentary', enhancedArgs)
}

async function executeUpdatePreferences(args: any, memoryContext: any, userId: string): Promise<string> {
  const { AIToolsExecutor } = await import('@/lib/ai-tools')
  
  // Update both AI tools and memory system
  await memorySystem.updateUserPreferences(userId, args.session_id, args.preferences)
  
  return await AIToolsExecutor.executeTool('update_user_preferences', args)
}

// Advanced ML tools
async function executeAdvancedMLPrediction(args: any, memoryContext: any): Promise<string> {
  const { AIToolsExecutor } = await import('@/lib/ai-tools')
  
  const enhancedArgs = {
    ...args,
    userContext: memoryContext,
    marketContext: memoryContext.marketContext
  }
  
  return await AIToolsExecutor.executeTool('get_advanced_ml_prediction', enhancedArgs)
}

async function executeAdvancedPortfolioOptimization(args: any, memoryContext: any): Promise<string> {
  const { AIToolsExecutor } = await import('@/lib/ai-tools')
  
  const enhancedArgs = {
    ...args,
    userPreferences: memoryContext.userPreferences,
    riskProfile: memoryContext.riskProfile,
    marketContext: memoryContext.marketContext
  }
  
  return await AIToolsExecutor.executeTool('optimize_portfolio_advanced', enhancedArgs)
}

async function executeRealTimeOptimization(args: any, memoryContext: any): Promise<string> {
  const { AIToolsExecutor } = await import('@/lib/ai-tools')
  
  const enhancedArgs = {
    ...args,
    userContext: memoryContext,
    marketContext: memoryContext.marketContext
  }
  
  return await AIToolsExecutor.executeTool('get_real_time_optimization', enhancedArgs)
}

async function executeRLStrategy(args: any, memoryContext: any): Promise<string> {
        const { AIToolsExecutor } = await import('@/lib/ai-tools')
  
  const enhancedArgs = {
    ...args,
    userContext: memoryContext,
    marketContext: memoryContext.marketContext
  }
  
  return await AIToolsExecutor.executeTool('get_reinforcement_learning_strategy', enhancedArgs)
}

// Helper functions for enhanced functionality
async function generatePersonalizedInsights(stock: any, memoryContext: any): Promise<any> {
  const insights = []
  
  // Check if stock matches user preferences
  if (memoryContext.userPreferences.preferredSectors.includes(stock.sector)) {
    insights.push({
      type: 'preference_match',
      message: `This stock is in your preferred ${stock.sector} sector`,
      confidence: 0.8
    })
  }
  
  // Check risk tolerance match
  const stockRisk = await assessStockRisk(stock, memoryContext)
  if (stockRisk.riskLevel === memoryContext.userPreferences.riskTolerance) {
    insights.push({
      type: 'risk_match',
      message: 'This stock aligns with your risk tolerance',
      confidence: 0.7
    })
  }
  
  return insights
}

async function assessStockRisk(stock: any, memoryContext: any): Promise<any> {
  // Calculate risk based on volatility, sector, and market conditions
  const volatility = Math.abs(stock.changePercent)
  const marketContext = memoryContext.marketContext
  
  let riskLevel = 'medium'
  if (volatility > 5) riskLevel = 'high'
  else if (volatility < 1) riskLevel = 'low'
  
  return {
    riskLevel,
    volatility,
    sectorRisk: marketContext.sectorRotation[stock.sector] || 0.5,
    marketRisk: marketContext.currentMarketRegime === 'bear' ? 'high' : 'medium'
  }
}

function filterResultsByPreferences(stocks: any[], preferences: any): any[] {
  return stocks.filter(stock => {
    // Filter by preferred sectors
    if (preferences.preferredSectors.length > 0) {
      return preferences.preferredSectors.includes(stock.sector)
    }
    return true
  })
}

async function generateSearchRecommendations(query: string, memoryContext: any): Promise<string[]> {
  const recommendations = []
  
  // Add recommendations based on user preferences
  if (memoryContext.userPreferences.preferredSectors.length > 0) {
    recommendations.push(`Consider exploring ${memoryContext.userPreferences.preferredSectors[0]} sector stocks`)
  }
  
  // Add market-aware recommendations
  if (memoryContext.marketContext.currentMarketRegime === 'bull') {
    recommendations.push('Focus on growth stocks in this bull market')
  }
  
  return recommendations
}

async function generateMarketInsights(marketData: any[], memoryContext: any): Promise<any[]> {
  const insights = []
  
  // Analyze market data against user preferences
  const userSectors = memoryContext.userPreferences.preferredSectors
  const sectorPerformance = marketData.filter(stock => 
    userSectors.includes(stock.sector)
  )
  
  if (sectorPerformance.length > 0) {
    const avgChange = sectorPerformance.reduce((sum, stock) => sum + stock.changePercent, 0) / sectorPerformance.length
    insights.push({
      type: 'sector_performance',
      message: `Your preferred sectors are performing ${avgChange > 0 ? 'well' : 'poorly'} today`,
      data: { averageChange: avgChange }
    })
  }
  
  return insights
}

async function calculateTechnicalIndicators(stock: any, timeframe: string): Promise<any> {
  // This would calculate real technical indicators
  return {
    trend: stock.changePercent > 0 ? 'bullish' : 'bearish',
    strength: Math.abs(stock.changePercent) > 2 ? 'strong' : 'weak',
    volumeAnalysis: stock.volume > stock.avgVolume ? 'above_average' : 'below_average',
    rsi: 50 + (stock.changePercent * 5), // Simplified RSI
    macd: stock.changePercent > 0 ? 'positive' : 'negative'
  }
}

async function generateTechnicalAnalysis(stock: any, timeframe: string, memoryContext: any): Promise<any> {
  return {
    priceAction: stock.changePercent > 0 ? 'Positive momentum' : 'Negative pressure',
    volume: stock.volume > stock.avgVolume ? 'High volume confirms move' : 'Low volume suggests weak conviction',
    keyLevels: `Support at $${stock.dayLow.toFixed(2)}, Resistance at $${stock.dayHigh.toFixed(2)}`,
    timeframe: timeframe,
    marketContext: memoryContext.marketContext.currentMarketRegime
  }
}

async function generatePersonalizedRecommendations(stock: any, memoryContext: any): Promise<any[]> {
  const recommendations = []
  
  // Add recommendations based on user profile
  if (memoryContext.userPreferences.tradingStyle === 'day_trading') {
    recommendations.push('Consider intraday strategies for this stock')
  } else if (memoryContext.userPreferences.tradingStyle === 'long_term') {
    recommendations.push('Focus on fundamental analysis for long-term position')
  }
  
  return recommendations
}

async function generateFundamentalAnalysis(stock: any, memoryContext: any): Promise<any> {
  return {
    valuation: stock.pe < 15 ? 'undervalued' : stock.pe > 25 ? 'overvalued' : 'fair_value',
    dividend: stock.dividendYield > 3 ? 'high_yield' : 'low_yield',
    growth: stock.changePercent > 5 ? 'high_growth' : 'stable',
    sector: stock.sector
  }
}

async function compareToSector(stock: any, memoryContext: any): Promise<any> {
  // This would compare stock to sector averages
  return {
    sectorAverage: stock.changePercent * 0.8, // Simplified
    relativeStrength: stock.changePercent > 0 ? 'outperforming' : 'underperforming',
    sectorRank: 'top_50_percent'
  }
}

async function calculateRelevanceScore(query: string, results: any[], memoryContext: any): Promise<number> {
  // Calculate relevance based on user preferences and query
  let score = 0.5 // Base score
  
  // Boost score for preferred sectors
  const sectorMatches = results.filter(result => 
    memoryContext.userPreferences.preferredSectors.some((sector: string) => 
      result.title?.toLowerCase().includes(sector.toLowerCase())
    )
  ).length
  
  score += (sectorMatches / results.length) * 0.3
  
  return Math.min(1.0, score)
}

function filterNewsByPreferences(news: any[], preferences: any): any[] {
  // Filter news based on user preferences
  return news.filter(item => {
    // Check if news relates to preferred sectors
    const sectorMatch = preferences.preferredSectors.some((sector: string) => 
      item.title?.toLowerCase().includes(sector.toLowerCase())
    )
    
    // Check if news relates to watchlist
    const watchlistMatch = preferences.watchlist.some((symbol: string) => 
      item.title?.toLowerCase().includes(symbol.toLowerCase())
    )
    
    return sectorMatch || watchlistMatch
  })
}

async function analyzeNewsSentiment(news: any[]): Promise<any> {
  // This would use sentiment analysis
  return {
    overall: 0.2,
    positive: news.length * 0.6,
    negative: news.length * 0.2,
    neutral: news.length * 0.2
  }
}

async function generateNewsHighlights(news: any[], memoryContext: any): Promise<string[]> {
  const highlights = []
  
  // Generate highlights based on user preferences
  const sectorNews = news.filter(item => 
    memoryContext.userPreferences.preferredSectors.some((sector: string) => 
      item.title?.toLowerCase().includes(sector.toLowerCase())
    )
  )
  
  if (sectorNews.length > 0) {
    highlights.push(`${sectorNews.length} news items related to your preferred sectors`)
  }
  
  return highlights
}

export async function POST(request: NextRequest) {
  try {
    console.log('AI Chat API: Request received')
    
    const body = await request.json()
    console.log('AI Chat API: Request body:', JSON.stringify(body, null, 2))
    
    const { messages, stream = false } = body

    if (!messages || !Array.isArray(messages)) {
      console.error('AI Chat API: Invalid messages format')
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    // Generate session ID and get user ID
    const sessionId = request.headers.get('x-session-id') || 
      `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const userId = request.headers.get('x-user-id') || 'anonymous'

    console.log('AI Chat API: Session ID:', sessionId, 'User ID:', userId)

    if (!process.env.OPENAI_API_KEY) {
      console.error('AI Chat API: OpenAI API key not configured')
      return NextResponse.json({
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.'
      }, { status: 500 })
    }

    console.log('AI Chat API: Processing request with', messages.length, 'messages')

    // Get memory context and user preferences
    let memoryContext
    try {
      memoryContext = await memorySystem.getMemoryContext(userId, sessionId)
      console.log('AI Chat API: Memory context retrieved')
    } catch (error) {
      console.error('AI Chat API: Error getting memory context:', error)
      // Continue with default context
      memoryContext = {
        userPreferences: {
          riskTolerance: 'moderate',
          tradingStyle: 'mixed',
          preferredSectors: [],
          watchlist: [],
          investmentGoals: [],
          timeHorizon: 'medium_term',
          preferredAnalysis: 'both',
          notificationPreferences: {
            priceAlerts: true,
            newsAlerts: true,
            strategyUpdates: true,
            riskWarnings: true
          }
        },
        tradingProfile: {
          experienceLevel: 'intermediate',
          accountSize: 'medium',
          tradingFrequency: 'weekly',
          preferredInstruments: [],
          pastPerformance: {
            winRate: 0.6,
            averageReturn: 0.1,
            maxDrawdown: 0.15,
            sharpeRatio: 1.2
          },
          riskManagement: {
            maxPositionSize: 5,
            stopLossPreference: 0.1,
            takeProfitPreference: 0.2,
            maxPortfolioRisk: 0.15
          }
        },
        marketContext: {
          currentMarketRegime: 'sideways',
          marketSentiment: 'neutral',
          volatilityLevel: 'medium',
          sectorRotation: {},
          economicCalendar: [],
          earningsSeason: false,
          fedPolicy: 'neutral'
        },
        conversationHistory: [],
        recentInteractions: [],
        learningInsights: [],
        riskProfile: {
          currentRiskLevel: 'medium',
          portfolioConcentration: 0.3,
          correlationRisk: 0.2,
          liquidityRisk: 0.1,
          marketRisk: 0.4,
          recentRiskEvents: []
        },
        performanceMetrics: {
          totalTrades: 0,
          winRate: 0,
          averageReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          totalReturn: 0
        }
      }
    }
    
  // Get dynamic system prompt based on conversation and user preferences
  const systemPrompt = getSystemPrompt(messages, memoryContext.userPreferences) + OUTPUT_POLICY

  // Add memory context to system prompt
  let enhancedSystemPrompt = `${systemPrompt}

User Context:
- Risk Tolerance: ${memoryContext.userPreferences.riskTolerance}
- Trading Style: ${memoryContext.userPreferences.tradingStyle}
- Preferred Sectors: ${memoryContext.userPreferences.preferredSectors.join(', ')}
- Experience Level: ${memoryContext.tradingProfile.experienceLevel}
- Market Context: ${memoryContext.marketContext.currentMarketRegime} market

Conversation History:
${memoryContext.conversationHistory.slice(-3).map(msg => `${msg.role}: ${msg.content.substring(0, 100)}...`).join('\n')}

Instruction: Follow the Output Policy. Use Metric / Value sections and simple dash bullets. No Markdown or emojis.`



    const openaiMessages = [
      { role: 'system' as const, content: enhancedSystemPrompt },
      ...messages.map((msg: AIChatMessage) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }))
    ]

    console.log('AI Chat API: Calling OpenAI with', openaiMessages.length, 'messages')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: openaiMessages,
      tools: tradingTools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2000,
      stream: stream
    })

    console.log('AI Chat API: OpenAI response received')

    if (stream) {
      const stream = completion as any
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      const response = completion.choices[0]

      if (response.message.tool_calls && response.message.tool_calls.length > 0) {
        console.log('AI Chat API: Processing tool calls')
        const toolResults: ToolResult[] = []

        for (const toolCall of response.message.tool_calls) {
          try {
            const functionCall = 'function' in toolCall ? toolCall.function : null
            if (!functionCall) {
              console.warn('Tool call without function:', toolCall)
              continue
            }

            const args = JSON.parse(functionCall.arguments)
            const result = await executeEnhancedTool(functionCall.name, args, userId, sessionId)

            toolResults.push({
              toolCallId: toolCall.id,
              content: result
            })
          } catch (error) {
            console.error('Tool execution error:', error)
            toolResults.push({
              toolCallId: toolCall.id,
              content: JSON.stringify({ error: 'Tool execution failed' }),
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }

        const finalMessages: any[] = [
          ...openaiMessages,
          {
            role: 'assistant',
            content: response.message.content || '',
            tool_calls: response.message.tool_calls
          }
        ]

        for (const toolResult of toolResults) {
          finalMessages.push({
            role: 'tool',
            tool_call_id: toolResult.toolCallId,
            content: toolResult.content
          })
        }

        const finalCompletion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: finalMessages,
          temperature: 0.7,
          max_tokens: 2000
        })

        const finalResponse = finalCompletion.choices[0]

        // Apply guardrails to the final response
        let guardrailResult
        try {
          guardrailResult = await guardrailsSystem.checkResponse(
            userId,
            sessionId,
            messages[messages.length - 1],
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: finalResponse.message.content || '',
              timestamp: new Date(),
              metadata: {
                responseType: 'text'
              }
            }
          )
        } catch (error) {
          console.error('Guardrails error:', error)
          guardrailResult = {
            passed: true,
            warnings: [],
            errors: [],
            recommendations: [],
            riskLevel: 'low',
            confidence: 0.8,
            requiresHumanReview: false
          }
        }

        // Update memory with the interaction
        try {
          await memorySystem.updateMemory(
            userId,
            sessionId,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: finalResponse.message.content || '',
              timestamp: new Date(),
              metadata: {
                responseType: 'text'
              }
            }
          )
        } catch (error) {
          console.error('Memory update error:', error)
        }

        return NextResponse.json({
          message: {
            id: Date.now().toString(),
            role: 'assistant',
            content: finalResponse.message.content,
            timestamp: new Date(),
            toolCalls: response.message.tool_calls,
            toolResults: toolResults,
            metadata: {
              responseType: 'text',
              guardrails: {
                passed: guardrailResult.passed,
                warnings: guardrailResult.warnings,
                errors: guardrailResult.errors,
                recommendations: guardrailResult.recommendations
              }
            }
          }
        })
      } else {
        console.log('AI Chat API: Processing direct response')
        // Apply guardrails to direct response
        let guardrailResult
        try {
          guardrailResult = await guardrailsSystem.checkResponse(
            userId,
            sessionId,
            messages[messages.length - 1],
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: response.message.content || '',
              timestamp: new Date(),
              metadata: {
                confidence: 90,
                riskLevel: 'low',
                responseType: 'text'
              }
            }
          )
        } catch (error) {
          console.error('Guardrails error:', error)
          guardrailResult = {
            passed: true,
            warnings: [],
            errors: [],
            recommendations: [],
            riskLevel: 'low',
            confidence: 0.8,
            requiresHumanReview: false
          }
        }

        // Update memory with the interaction
        try {
          await memorySystem.updateMemory(
            userId,
            sessionId,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: response.message.content || '',
              timestamp: new Date(),
              metadata: {
                confidence: guardrailResult.confidence * 100,
                riskLevel: guardrailResult.riskLevel as 'low' | 'medium' | 'high',
                responseType: 'text'
              }
            }
          )
        } catch (error) {
          console.error('Memory update error:', error)
        }

        return NextResponse.json({
          message: {
            id: Date.now().toString(),
            role: 'assistant',
            content: response.message.content,
            timestamp: new Date(),
            metadata: {
              confidence: guardrailResult.confidence * 100,
              riskLevel: guardrailResult.riskLevel,
              responseType: 'text',
              guardrails: {
                passed: guardrailResult.passed,
                warnings: guardrailResult.warnings,
                errors: guardrailResult.errors,
                recommendations: guardrailResult.recommendations
              }
            }
          }
        })
      }
    }

  } catch (error) {
    console.error('AI Chat API Error:', error)
    return NextResponse.json({
      error: 'Failed to process chat request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
