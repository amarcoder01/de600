import OpenAI from "openai";
import { z } from "zod";

// Proper Zod schema for StockAnalysis validation
const StockAnalysisSchema = z.object({
  symbol: z.string().default(""),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']).default('neutral'),
  confidence: z.number().min(0).max(1).default(0.5),
  keyPoints: z.array(z.string()).min(1).default(["Analysis pending"]),
  riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  recommendation: z.enum(['buy', 'hold', 'sell']).default('hold'),
  tradingStrategy: z.string().default("Strategy analysis pending"),
  entryPoints: z.object({
    bullish: z.string().default("Bullish entry analysis pending"),
    bearish: z.string().default("Bearish entry analysis pending")
  }).default({}),
  priceTargets: z.object({
    conservative: z.number().default(0),
    optimistic: z.number().default(0),
    stopLoss: z.number().default(0)
  }).default({}),
  technicalAnalysis: z.object({
    support: z.number().default(0),
    resistance: z.number().default(0),
    trend: z.enum(['uptrend', 'downtrend', 'sideways']).default('sideways'),
    momentum: z.string().default("Momentum analysis pending")
  }).default({}),
  fundamentalInsights: z.array(z.string()).min(1).default(["Fundamental analysis pending"]),
  riskFactors: z.array(z.string()).min(1).default(["Risk analysis pending"]),
  marketContext: z.string().default("Market context analysis pending"),
  timeHorizon: z.object({
    shortTerm: z.string().default("Short-term analysis pending"),
    mediumTerm: z.string().default("Medium-term analysis pending"),
    longTerm: z.string().default("Long-term analysis pending")
  }).default({}),
  competitorComparison: z.string().default("Competitor analysis pending"),
  newsImpact: z.string().default("News impact analysis pending"),
  volumeAnalysis: z.string().default("Volume analysis pending"),
  reasoning: z.string().default("Analysis reasoning pending")
});

// OpenAI client will be created lazily in the service constructor

// Helper function to safely convert to number
const toNumber = (value: any): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
};

// Simplified validation function for OpenAI response
const validateAnalysisResponse = (rawResult: any) => {
  const result = rawResult || {};
  
  return {
    symbol: typeof result.symbol === 'string' ? result.symbol : undefined,
    sentiment: ['bullish', 'bearish', 'neutral'].includes(result.sentiment) ? result.sentiment : 'neutral',
    confidence: Math.min(1, Math.max(0, toNumber(result.confidence) || 0.5)),
    keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints.filter((p: any) => typeof p === 'string') : [],
    riskLevel: ['low', 'medium', 'high'].includes(result.riskLevel) ? result.riskLevel : 'medium',
    recommendation: ['buy', 'hold', 'sell'].includes(result.recommendation) ? result.recommendation : 'hold',
    tradingStrategy: typeof result.tradingStrategy === 'string' ? result.tradingStrategy : '',
    entryPoints: {
      bullish: typeof result.entryPoints?.bullish === 'string' ? result.entryPoints.bullish : '',
      bearish: typeof result.entryPoints?.bearish === 'string' ? result.entryPoints.bearish : ''
    },
    priceTargets: {
      conservative: toNumber(result.priceTargets?.conservative) ?? 0,
      optimistic: toNumber(result.priceTargets?.optimistic) ?? 0,
      stopLoss: toNumber(result.priceTargets?.stopLoss) ?? 0
    },
    technicalAnalysis: {
      support: toNumber(result.technicalAnalysis?.support) ?? 0,
      resistance: toNumber(result.technicalAnalysis?.resistance) ?? 0,
      trend: ['uptrend', 'downtrend', 'sideways'].includes(result.technicalAnalysis?.trend) ? result.technicalAnalysis.trend : 'sideways',
      momentum: typeof result.technicalAnalysis?.momentum === 'string' ? result.technicalAnalysis.momentum : ''
    },
    fundamentalInsights: Array.isArray(result.fundamentalInsights) ? result.fundamentalInsights.filter((i: any) => typeof i === 'string') : [],
    riskFactors: Array.isArray(result.riskFactors) ? result.riskFactors.filter((r: any) => typeof r === 'string') : [],
    marketContext: typeof result.marketContext === 'string' ? result.marketContext : '',
    timeHorizon: {
      shortTerm: typeof result.timeHorizon?.shortTerm === 'string' ? result.timeHorizon.shortTerm : '',
      mediumTerm: typeof result.timeHorizon?.mediumTerm === 'string' ? result.timeHorizon.mediumTerm : '',
      longTerm: typeof result.timeHorizon?.longTerm === 'string' ? result.timeHorizon.longTerm : ''
    },
    competitorComparison: typeof result.competitorComparison === 'string' ? result.competitorComparison : '',
    newsImpact: typeof result.newsImpact === 'string' ? result.newsImpact : '',
    volumeAnalysis: typeof result.volumeAnalysis === 'string' ? result.volumeAnalysis : '',
    reasoning: typeof result.reasoning === 'string' ? result.reasoning : ''
  };
};

export interface StockAnalysis {
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  keyPoints: string[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: 'buy' | 'hold' | 'sell';
  analysisTimestamp: string; // ISO timestamp when analysis was generated
  // Enhanced trader-focused fields
  tradingStrategy: string;
  entryPoints: {
    bullish: string;
    bearish: string;
  };
  priceTargets: {
    conservative: number;
    optimistic: number;
    stopLoss: number;
  };
  technicalAnalysis: {
    support: number;
    resistance: number;
    trend: 'uptrend' | 'downtrend' | 'sideways';
    momentum: string;
  };
  fundamentalInsights: string[];
  riskFactors: string[];
  marketContext: string;
  timeHorizon: {
    shortTerm: string; // 1-7 days
    mediumTerm: string; // 1-3 months
    longTerm: string; // 6+ months
  };
  competitorComparison: string;
  newsImpact: string;
  volumeAnalysis: string;
  reasoning: string;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  relevanceScore: number;
  matchReason: string;
}

export class OpenAIStockService {
  private openai: OpenAI;

  constructor() {
    // Initialize the OpenAI client at runtime (after dotenv has loaded)
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeStock(stockData: any): Promise<StockAnalysis> {
    try {
      // Calculate basic technical indicators
      const currentPrice = stockData.price || stockData.currentPrice || 0;
      const change = stockData.change || 0;
      const changePercent = stockData.changePercent || 0;
      const volume = stockData.volume || 0;
      const marketCap = stockData.marketCap;
      
      // Calculate some basic technical levels
      const dayHigh = stockData.dayHigh || currentPrice * 1.02;
      const dayLow = stockData.dayLow || currentPrice * 0.98;
      const fiftyTwoWeekHigh = stockData.fiftyTwoWeekHigh || currentPrice * 1.25;
      const fiftyTwoWeekLow = stockData.fiftyTwoWeekLow || currentPrice * 0.75;
      
      // Enhanced technical analysis
      const volatility = Math.abs(changePercent) > 3 ? 'High' : Math.abs(changePercent) > 1 ? 'Medium' : 'Low';
      const volumeAnalysis = volume > 1000000 ? 'Above Average' : volume > 500000 ? 'Average' : 'Below Average';
      const nearHighs = currentPrice > (fiftyTwoWeekHigh * 0.9) ? 'Near 52W highs' : 'Mid-range';
      const nearLows = currentPrice < (fiftyTwoWeekLow * 1.1) ? 'Near 52W lows' : 'Above lows';
      
      // Current market context timestamp
      const analysisDate = new Date().toISOString().split('T')[0];
      const analysisTime = new Date().toLocaleTimeString();

      const prompt = `
        As an expert trader and financial analyst, provide comprehensive trading analysis for:
        
        ENHANCED STOCK DATA (Analysis Date: ${analysisDate} ${analysisTime}):
        Symbol: ${stockData.symbol}
        Company: ${stockData.name}
        Current Price: $${currentPrice.toFixed(2)}
        Daily Change: ${change >= 0 ? '+' : ''}$${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)
        Volume: ${volume.toLocaleString()} (${volumeAnalysis})
        Sector: ${stockData.sector || 'Unknown'}
        Market Cap: ${marketCap ? '$' + (marketCap / 1e9).toFixed(1) + 'B' : 'N/A'}
        
        TECHNICAL DATA:
        Day High: $${dayHigh.toFixed(2)}
        Day Low: $${dayLow.toFixed(2)}
        52-Week High: $${fiftyTwoWeekHigh.toFixed(2)} (${nearHighs})
        52-Week Low: $${fiftyTwoWeekLow.toFixed(2)} (${nearLows})
        Price Volatility: ${volatility}
        Volume Analysis: ${volumeAnalysis}
        
        VALUATION CONTEXT:
        P/E Ratio: ${stockData.peRatio ? stockData.peRatio.toFixed(2) : 'N/A'}
        Employee Count: ${stockData.employees ? stockData.employees.toLocaleString() : 'N/A'}
        Shares Outstanding: ${stockData.sharesOutstanding ? (stockData.sharesOutstanding / 1e9).toFixed(2) + 'B' : 'N/A'}
        Exchange: ${stockData.exchange || 'N/A'}
        
        COMPANY PROFILE:
        ${stockData.description ? stockData.description.substring(0, 300) + '...' : 'Company description not available'}
        
        Provide comprehensive trading analysis in JSON format with ALL fields filled with detailed, actionable content:
        {
          "symbol": "${stockData.symbol}",
          "sentiment": "bullish|bearish|neutral",
          "confidence": number (0-1),
          "keyPoints": ["5-7 specific, actionable trading insights with price levels and catalysts - be very detailed and specific"],
          "riskLevel": "low|medium|high",
          "recommendation": "buy|hold|sell",
          "tradingStrategy": "Format as clear sections with bullet points:\n\n**CORE STRATEGY:**\n• [Main approach and reasoning]\n\n**ENTRY TACTICS:**\n• [Entry conditions and levels]\n\n**POSITION MANAGEMENT:**\n• [Position sizing and risk management]\n\n**PROFIT TAKING:**\n• [Exit strategies and targets]\n\n**KEY LEVELS:**\n• [Important technical levels]",
          "entryPoints": {
            "bullish": "**BULLISH ENTRY:** Clear price level and specific conditions\n• Entry price: [specific level]\n• Conditions: [what needs to happen]\n• Volume requirements: [if any]",
            "bearish": "**BEARISH ENTRY:** Clear price level and specific conditions\n• Short price: [specific level]\n• Conditions: [what needs to happen]\n• Stop loss: [specific level]"
          },
          "priceTargets": {
            "conservative": ${(currentPrice * 1.05).toFixed(2)}, 
            "optimistic": ${(currentPrice * 1.15).toFixed(2)},
            "stopLoss": ${(currentPrice * 0.95).toFixed(2)}
          },
          "technicalAnalysis": {
            "support": ${(currentPrice * 0.92).toFixed(2)},
            "resistance": ${(currentPrice * 1.08).toFixed(2)},
            "trend": "uptrend|downtrend|sideways",
            "momentum": "Technical momentum analysis"
          },
          "fundamentalInsights": ["5-8 detailed fundamental insights covering: earnings trends, revenue growth, competitive position, market share, financial health, cash flow, debt levels, and growth prospects - be specific with numbers and percentages"],
          "riskFactors": ["5-7 specific risk scenarios with impact levels: regulatory risks, competition threats, market risks, operational risks, financial risks, and industry-specific risks - include probability assessments"],
          "marketContext": "Detailed analysis of current market environment, sector performance, economic conditions, interest rate impact, institutional sentiment, and how these specifically affect this stock's outlook",
          "timeHorizon": {
            "shortTerm": "**SHORT-TERM (1-7 days):**\n• Specific price targets and key levels to watch\n• Immediate catalysts (earnings releases, product launches, economic data)\n• Intraday trading ranges and volume patterns\n• Technical indicator signals (RSI, MACD, moving averages)\n• Options activity and institutional flows\n• News events and sector rotation patterns",
            "mediumTerm": "**MEDIUM-TERM (1-3 months):**\n• Detailed swing trading setup with entry/exit points\n• Earnings season expectations and historical patterns\n• Quarterly guidance impact and revision cycles\n• Technical pattern completion targets\n• Seasonal trends and sector performance cycles\n• Key business metrics and KPI expectations\n• Competitive landscape changes and market share shifts",
            "longTerm": "**LONG-TERM (6+ months):**\n• Comprehensive investment thesis with multiple scenarios\n• Fundamental valuation using DCF, P/E expansion, and sector multiples\n• Industry disruption trends and technological shifts\n• Regulatory environment changes and policy impacts\n• Market expansion opportunities and geographic growth\n• Management strategy execution and capital allocation\n• ESG considerations and sustainability trends"
          },
          "competitorComparison": "Detailed comparison with 3-4 main competitors covering: market cap, revenue growth, profit margins, P/E ratios, market share, competitive advantages, and relative valuation metrics - include specific company names and percentages",
          "newsImpact": "Comprehensive analysis of recent news impact including: earnings reports, analyst upgrades/downgrades, product announcements, regulatory changes, industry trends, and management guidance - assess both short and long-term price implications",
          "volumeAnalysis": "In-depth volume analysis covering: current volume vs 30-day average, institutional vs retail activity, options flow analysis, after-hours trading patterns, and volume-price relationship signals - include specific volume numbers and percentages",
          "reasoning": "**COMPREHENSIVE RECOMMENDATION RATIONALE:**\n\n• **Technical Analysis (40% weight):**\n  - Price action patterns and trend analysis\n  - Support/resistance levels with historical significance\n  - Technical indicator convergence/divergence\n  - Volume profile and institutional interest\n  - Chart patterns and breakout potential\n\n• **Fundamental Analysis (35% weight):**\n  - Earnings growth trajectory and quality\n  - Revenue diversification and margin expansion\n  - Balance sheet strength and cash generation\n  - Competitive moat and market position\n  - Management execution and capital allocation\n\n• **Risk Assessment (15% weight):**\n  - Downside protection and stop-loss levels\n  - Scenario analysis (bull/base/bear cases)\n  - Correlation with market and sector risks\n  - Liquidity and execution considerations\n  - Black swan events and tail risks\n\n• **Market Environment (10% weight):**\n  - Macro economic conditions and Fed policy\n  - Sector rotation and style preferences\n  - Sentiment indicators and positioning\n  - Seasonal patterns and calendar effects\n  - Geopolitical and regulatory considerations\n\n**CONVICTION LEVEL:** [High/Medium/Low] based on confluence of factors\n**POSITION SIZING:** Recommended allocation as percentage of portfolio\n**MONITORING TRIGGERS:** Key metrics and events that would change the thesis"
        }
        
        FORMATTING REQUIREMENTS:
        - Use clear section headers with **bold text**
        - Use bullet points (•) for lists
        - Include specific price levels and percentages
        - Make all text readable and well-structured
        - No dense paragraphs - break up information clearly
        
        Think like a professional day trader and swing trader. Provide specific, actionable insights.
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Switched to GPT-4o mini for better reliability
        messages: [
          {
            role: "system",
            content: "You are an elite Wall Street trader and quantitative analyst with 20+ years experience at Goldman Sachs and Renaissance Technologies. You combine deep technical analysis, fundamental valuation, and market psychology. Always provide specific, actionable insights with precise price levels and risk management. Your analysis must be data-driven and include confidence calibration based on market conditions and data quality. Respond only with valid JSON containing ALL required fields."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // GPT-4o mini supports temperature for consistent analysis
        top_p: 0.9, // GPT-4o mini supports top_p parameter
        max_completion_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "4500"),

      });

      const content = response.choices[0].message.content || '{}';
      let rawResult;
      let result;
      
      try {
        rawResult = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response as JSON:', parseError);
        console.error('Response content:', content);
        rawResult = {};
      }

      // Use Zod schema for proper validation with safe defaults
      const zodResult = StockAnalysisSchema.safeParse(rawResult);
      if (!zodResult.success) {
        console.warn('OpenAI response validation failed, using fallback:', zodResult.error);
        result = StockAnalysisSchema.parse({}); // Use all defaults
      } else {
        result = zodResult.data;
      }

      // Add analysis metadata
      const analysisTimestamp = new Date().toISOString();
      
      return {
        symbol: stockData.symbol,
        analysisTimestamp,
        sentiment: result.sentiment || 'neutral',
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
        keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
        riskLevel: result.riskLevel || 'medium',
        recommendation: result.recommendation || 'hold',
        // Enhanced trader-focused fields with fallbacks
        tradingStrategy: result.tradingStrategy || 'Hold position and monitor price action for clear trend signals.',
        entryPoints: {
          bullish: result.entryPoints?.bullish || `Consider entry above $${(currentPrice * 1.02).toFixed(2)} with confirmation`,
          bearish: result.entryPoints?.bearish || `Consider short entry below $${(currentPrice * 0.98).toFixed(2)} with confirmation`
        },
        priceTargets: {
          conservative: result.priceTargets?.conservative || currentPrice * 1.05,
          optimistic: result.priceTargets?.optimistic || currentPrice * 1.15,
          stopLoss: result.priceTargets?.stopLoss || currentPrice * 0.95
        },
        technicalAnalysis: {
          support: result.technicalAnalysis?.support || currentPrice * 0.92,
          resistance: result.technicalAnalysis?.resistance || currentPrice * 1.08,
          trend: result.technicalAnalysis?.trend || 'sideways',
          momentum: result.technicalAnalysis?.momentum || 'Neutral momentum, awaiting catalyst'
        },
        fundamentalInsights: Array.isArray(result.fundamentalInsights) ? result.fundamentalInsights : ['Fundamental analysis pending additional data'],
        riskFactors: Array.isArray(result.riskFactors) ? result.riskFactors : ['General market volatility risk'],
        marketContext: result.marketContext || 'Current market conditions require careful position management',
        timeHorizon: {
          shortTerm: result.timeHorizon?.shortTerm || 'Monitor daily price action and volume patterns',
          mediumTerm: result.timeHorizon?.mediumTerm || 'Watch for sector trends and earnings announcements',
          longTerm: result.timeHorizon?.longTerm || 'Long-term outlook depends on fundamental developments'
        },
        competitorComparison: result.competitorComparison || 'Competitor analysis requires additional sector data',
        newsImpact: result.newsImpact || 'No significant recent news affecting price action',
        volumeAnalysis: result.volumeAnalysis || `Current volume of ${volume.toLocaleString()} indicates ${volumeAnalysis.toLowerCase()} trading activity`,
        reasoning: result.reasoning || `Analysis based on current price action and technical indicators. Generated at ${analysisTimestamp}`
      };
    } catch (error) {
      console.error('Error analyzing stock with OpenAI:', error);
      throw new Error('Failed to analyze stock: ' + (error as Error).message);
    }
  }

  async searchStocks(query: string, availableStocks: any[]): Promise<StockSearchResult[]> {
    try {
      const stockList = availableStocks.map(stock => 
        `${stock.symbol}: ${stock.name} (${stock.sector || 'Unknown sector'})`
      ).join('\n');

      const prompt = `
        Given this search query: "${query}"
        
        Find the most relevant stocks from this list:
        ${stockList}
        
        Return up to 10 most relevant results in JSON format:
        {
          "results": [
            {
              "symbol": "string",
              "name": "string", 
              "relevanceScore": number (0-1),
              "matchReason": "string explaining why this stock matches"
            }
          ]
        }
        
        Consider matches based on:
        - Company name similarity
        - Sector relevance
        - Business description keywords
        - Stock symbol similarity
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Switched to GPT-4o mini for better reliability
        messages: [
          {
            role: "system",
            content: "You are a stock search expert. Analyze the query and return the most relevant stock matches with clear reasoning."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "2000"),

      });

      const result = JSON.parse(response.choices[0].message.content || '{"results": []}');
      return result.results || [];
    } catch (error) {
      console.error('Error searching stocks with OpenAI:', error);
      throw new Error('Failed to search stocks: ' + (error as Error).message);
    }
  }

  async chatWithExpert(messages: Array<{role: 'user' | 'assistant'; content: string}>, context?: {symbol?: string; marketData?: any}): Promise<string> {
    try {
      const systemPrompt = `You are TradeGPT, a friendly and enthusiastic AI trading companion with deep expertise in financial markets. You're like ChatGPT but specialized for trading and investing. 

Your personality:
- Conversational, helpful, and encouraging like a knowledgeable friend
- Use emojis occasionally to keep things friendly 😊📈
- Adapt your communication style to match the user's level (beginner to expert)
- Ask engaging follow-up questions to keep the conversation flowing
- Give clear, actionable advice with real examples
- Remember context from our conversation to build on previous topics

Your expertise covers:
- Day trading, swing trading, and long-term investing strategies
- Technical analysis (RSI, MACD, support/resistance, chart patterns)
- Fundamental analysis (P/E ratios, earnings, financial health)
- Risk management and position sizing
- Market psychology and sentiment analysis
- Options, futures, and derivatives
- Current market trends and news impact

${context?.symbol ? `🎯 We're currently discussing ${context.symbol}. Keep this stock in focus and provide specific insights about it.` : ''}
${context?.marketData ? `📊 Current market context: ${JSON.stringify(context.marketData)}` : ''}

Keep responses conversational (2-4 paragraphs max), practical, and engaging. Think like you're chatting with a friend who trusts your financial expertise!`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Using GPT-4o mini for faster, efficient responses
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          ...messages
        ],
        max_completion_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "1200"), // Reduced for faster responses
        temperature: 0.8, // More conversational and friendly
      });

      return response.choices[0]?.message?.content || 'Hey! Something went wrong on my end 😅 Could you try asking that again? I\'m here to help!';
    } catch (error) {
      console.error('Error in chat with TradeGPT:', error);
      throw new Error('TradeGPT encountered an issue: ' + (error as Error).message);
    }
  }

  async getMarketInsights(marketData: any[]): Promise<{ summary: string; trends: string[]; outlook: string }> {
    try {
      const marketSummary = marketData.map(index => 
        `${index.name}: ${index.value} (${index.changePercent > 0 ? '+' : ''}${index.changePercent}%)`
      ).join('\n');

      const prompt = `
        Analyze the current market conditions based on major indices:
        ${marketSummary}
        
        Provide market insights in JSON format:
        {
          "summary": "Brief 2-3 sentence market summary",
          "trends": ["trend1", "trend2", "trend3"],
          "outlook": "Short-term market outlook"
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Switched to GPT-4o mini for better reliability
        messages: [
          {
            role: "system",
            content: "You are a market analyst providing concise, professional market insights based on index performance."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "2000"),

      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        summary: result.summary || 'Market analysis unavailable',
        trends: Array.isArray(result.trends) ? result.trends : [],
        outlook: result.outlook || 'Outlook unavailable'
      };
    } catch (error) {
      console.error('Error getting market insights with OpenAI:', error);
      throw new Error('Failed to get market insights: ' + (error as Error).message);
    }
  }
}

// Note: Do not instantiate a singleton here to avoid creating the OpenAI client
// before environment variables are loaded. Instantiate within request lifecycle
// or inside route registration (see server/routes.ts).
