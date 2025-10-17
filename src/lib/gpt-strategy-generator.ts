import { Strategy, StrategyParameters } from './strategy-builder-service'
import { PolygonDataService } from './polygon-data-service'

export interface GPTStrategyConfig {
  model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo'
  strategyType: 'momentum' | 'mean_reversion' | 'breakout' | 'ai_ml' | 'multi_factor' | 'custom'
  riskLevel: 'conservative' | 'moderate' | 'aggressive'
  timeHorizon: 'short' | 'medium' | 'long'
  temperature: number
  maxTokens: number
  confidenceThreshold: number
}

export interface GPTStrategyRequest {
  symbol: string
  description: string
  config: GPTStrategyConfig
  marketConditions?: string
}

export interface GPTStrategyResponse {
  success: boolean
  strategy?: Strategy
  analysis?: GPTMarketAnalysis
  error?: string
  confidence?: number
  riskAssessment?: {
    riskLevel: string
    maxDrawdown: number
    volatility: number
    correlation: number
  }
  recommendations?: {
    action: string
    confidence: number
    reasoning: string
    timeHorizon: string
    priceTarget?: number
  }
}

export interface GPTMarketAnalysis {
  technical: {
    trend: string
    momentum: string
    volatility: string
    support: number
    resistance: number
    keyLevels: number[]
  }
  fundamental: {
    sector: string
    marketCap: string
    peRatio: number
    dividendYield: number
    growthOutlook: string
  }
  sentiment: {
    overall: string
    newsSentiment: string
    analystRating: string
    socialSentiment: string
  }
  risk: {
    riskLevel: string
    maxDrawdown: number
    volatility: number
    correlation: number
  }
  recommendations: {
    action: string
    confidence: number
    reasoning: string
    timeHorizon: string
    priceTarget: number
  }
}

export class GPTStrategyGenerator {
  private openaiApiKey: string | undefined
  private polygonDataService: PolygonDataService

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY
    this.polygonDataService = new PolygonDataService()
  }

  async generateGPTStrategy(request: GPTStrategyRequest): Promise<GPTStrategyResponse> {
    try {
      console.log(`🤖 Generating GPT strategy for ${request.symbol}...`)

      // Get market context
      const marketContext = await this.getRealTimeMarketContext(request.symbol)
      
      // Generate enhanced strategy prompt
      const strategyPrompt = this.generateEnhancedStrategyPrompt(request, marketContext)
      
      // Call OpenAI with improved parameters
      const response = await this.callOpenAI(strategyPrompt, request.config)
      
      if (!response) {
        throw new Error('Failed to generate strategy with OpenAI API')
      }

      // Parse the response
      const parsedResponse = await this.parseGPTResponse(response, request)
      
      // Calculate confidence and risk assessment
      const confidence = await this.calculateConfidence(parsedResponse, request.symbol)
      const riskAssessment = this.assessEnhancedRisk(parsedResponse, marketContext)
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(parsedResponse, marketContext, confidence)

      return {
        success: true,
        strategy: parsedResponse,
        analysis: undefined, // Will be generated separately if needed
        confidence,
        riskAssessment,
        recommendations
      }
    } catch (error) {
      console.error('Error generating GPT strategy:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate strategy'
      }
    }
  }

  async generateMarketAnalysis(symbol: string, marketData?: any): Promise<GPTMarketAnalysis | null> {
    try {
      // Always get market data
      if (!marketData) {
        console.log(`🔍 Fetching market data for ${symbol}...`)
        marketData = await this.getRealTimeMarketContext(symbol)
      }

      // Validate data
      if (!this.validateRealTimeData(marketData)) {
        throw new Error(`Invalid market data for ${symbol}`)
      }

      console.log(`✅ Using market data for ${symbol}: $${marketData.price}`)

      const analysisPrompt = this.generateAnalysisPrompt(symbol, marketData)
      const analysisResponse = await this.callOpenAI(analysisPrompt, {
        model: 'gpt-4',
        strategyType: 'momentum',
        riskLevel: 'moderate',
        timeHorizon: 'medium',
        temperature: 0.3,
        maxTokens: 1000,
        confidenceThreshold: 0.7
      })

      if (analysisResponse) {
        return this.parseAnalysisResponse(analysisResponse)
      } else {
        throw new Error('Failed to generate market analysis with OpenAI API')
      }

    } catch (error) {
      console.error(`❌ Error generating market analysis for ${symbol}:`, error)
      throw error // Re-throw instead of falling back to simulated data
    }
  }

  private async getRealTimeMarketContext(symbol: string): Promise<any> {
    try {
      console.log(`🔍 Fetching comprehensive market data for ${symbol}...`)
      
      const marketData = await this.polygonDataService.getEnhancedMarketData(symbol)
      
      if (!this.validateRealTimeData(marketData)) {
        throw new Error(`No valid market data available for ${symbol}`)
      }

      // Extract comprehensive market data with proper validation
      const currentPrice = marketData.price || 100
      const volume = marketData.volume || 1000000
      const marketCap = marketData.marketCap || 1000000000
      const peRatio = marketData.peRatio || 20
      const beta = marketData.beta || 1.0
      
      // Technical indicators with validation
      const rsi = marketData.technicalIndicators?.rsi || 50
      const macd = marketData.technicalIndicators?.macd?.macd || 0
      const volatility = marketData.marketMetrics?.volatility || 0.02
      const trendStrength = marketData.marketMetrics?.trend || 0.5
      
      // Additional market metrics
      const momentum = marketData.marketMetrics?.momentum || 0
      const strength = marketData.marketMetrics?.strength || 0.5
      const support = marketData.marketMetrics?.support || currentPrice * 0.95
      const resistance = marketData.marketMetrics?.resistance || currentPrice * 1.05
      
      // Calculate stock-specific characteristics
      const isLargeCap = marketCap > 10000000000 // > $10B
      const isMidCap = marketCap > 2000000000 && marketCap <= 10000000000 // $2B-$10B
      const isSmallCap = marketCap <= 2000000000 // < $2B
      const isHighVolume = volume > 5000000 // > 5M volume
      const isLowVolume = volume < 1000000 // < 1M volume
      const isHighPriced = currentPrice > 200
      const isLowPriced = currentPrice < 50
      const isHighPE = peRatio > 30
      const isLowPE = peRatio < 15
      const isHighBeta = beta > 1.5
      const isLowBeta = beta < 0.8
      const isHighVolatility = volatility > 0.03
      const isLowVolatility = volatility < 0.015
      
      // Market regime classification
      const isBullMarket = trendStrength > 0.7 && rsi > 50
      const isBearMarket = trendStrength < 0.3 && rsi < 50
      const isSidewaysMarket = Math.abs(trendStrength - 0.5) < 0.2
      
      const enhancedMarketData = {
        currentPrice,
        volume,
        marketCap,
        peRatio,
        beta,
        rsi,
        macd,
        volatility,
        trendStrength,
        momentum,
        strength,
        support,
        resistance,
        isLargeCap,
        isMidCap,
        isSmallCap,
        isHighVolume,
        isLowVolume,
        isHighPriced,
        isLowPriced,
        isHighPE,
        isLowPE,
        isHighBeta,
        isLowBeta,
        isHighVolatility,
        isLowVolatility,
        isBullMarket,
        isBearMarket,
        isSidewaysMarket,
        lastUpdated: marketData.lastUpdated,
        symbol: marketData.symbol
      }
      
      console.log(`✅ Enhanced market data for ${symbol}:`, {
        currentPrice,
        volume: volume.toLocaleString(),
        marketCap: marketCap.toLocaleString(),
        peRatio: peRatio.toFixed(1),
        beta: beta.toFixed(2),
        rsi: rsi.toFixed(1),
        macd: macd.toFixed(3),
        volatility: volatility.toFixed(4),
        trendStrength: trendStrength.toFixed(3),
        stockCharacteristics: {
          isLargeCap,
          isHighVolume,
          isHighPriced,
          isHighBeta,
          isHighVolatility
        },
        marketRegime: {
          isBullMarket,
          isBearMarket,
          isSidewaysMarket
        }
      })
      
      return enhancedMarketData

    } catch (error) {
      console.error(`❌ Error fetching market data for ${symbol}:`, error)
      throw new Error(`Failed to fetch market data for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private validateRealTimeData(marketData: any): boolean {
    if (!marketData) return false
    
    // Check for essential market data fields
    const requiredFields = ['price', 'symbol', 'lastUpdated']
    const hasRequiredFields = requiredFields.every(field => 
      marketData[field] !== undefined && marketData[field] !== null
    )
    
    if (!hasRequiredFields) return false
    
    // Check if data is recent (within last 30 minutes for delayed data plans)
    const lastUpdated = new Date(marketData.lastUpdated)
    const now = new Date()
    const timeDiff = now.getTime() - lastUpdated.getTime()
    const isRecent = timeDiff < 30 * 60 * 1000 // 30 minutes for delayed data
    
    if (!isRecent) {
      console.warn(`⚠️ Market data for ${marketData.symbol} is too old (${Math.round(timeDiff / 1000)}s old)`)
      return false
    }
    
    // Validate price is a positive number
    if (typeof marketData.price !== 'number' || marketData.price <= 0) {
      return false
    }
    
    return true
  }

  private generateStrategyPrompt(request: GPTStrategyRequest, marketData: any): string {
    const marketContext = marketData ? `
CURRENT MARKET CONTEXT:
- Symbol: ${request.symbol}
- Current Price: $${marketData.price?.toFixed(2) || 'N/A'}
- Price Change: ${marketData.changePercent?.toFixed(2) || 'N/A'}%
- Trend: ${marketData.marketMetrics?.trend > 0 ? 'bullish' : marketData.marketMetrics?.trend < 0 ? 'bearish' : 'neutral'}
- Volatility: ${marketData.marketMetrics?.volatility ? (marketData.marketMetrics.volatility * 100).toFixed(2) : 'N/A'}%
- RSI: ${marketData.technicalIndicators?.rsi?.toFixed(2) || 'N/A'}
- MACD: ${marketData.technicalIndicators?.macd?.macd?.toFixed(3) || 'N/A'}
` : ''

    return `You are an expert quantitative trader and AI strategist. Create a comprehensive trading strategy based on the following requirements:

STRATEGY REQUIREMENTS:
- Symbol: ${request.symbol}
- Strategy Type: ${request.config.strategyType}
- Risk Level: ${request.config.riskLevel}
- Time Horizon: ${request.config.timeHorizon}
- Description: ${request.description}
${marketContext}

Please create a complete trading strategy with the following components:

1. Generate a complete trading strategy with specific parameters
2. Provide clear entry and exit rules
3. Include risk management guidelines
4. Explain the reasoning behind the strategy
5. Assess the risk level and expected performance
6. Provide realistic performance metrics including expected return, max drawdown, Sharpe ratio, win rate, and profit factor

Please respond in the following JSON format:
{
  "strategy": {
    "name": "Strategy name",
    "type": "strategy_type",
    "description": "Strategy description",
    "parameters": {
      "rsiPeriod": 14,
      "rsiOverbought": 70,
      "rsiOversold": 30,
      "macdFast": 12,
      "macdSlow": 26,
      "macdSignal": 9,
      "stopLoss": 5,
      "takeProfit": 10,
      "positionSize": 10
    }
  },
  "performanceMetrics": {
    "expectedReturn": "15-25% annually based on current market conditions",
    "maxDrawdown": "8-12% during adverse market conditions",
    "sharpeRatio": "1.2-1.8",
    "winRate": "65-75%",
    "profitFactor": "1.5-2.0"
  },
  "reasoning": "Detailed explanation of the strategy logic",
  "recommendations": {
    "entryPoints": ["Entry condition 1", "Entry condition 2"],
    "exitPoints": ["Exit condition 1", "Exit condition 2"],
    "riskManagement": ["Risk rule 1", "Risk rule 2"]
  }
}`
  }

  private generateEnhancedStrategyPrompt(request: GPTStrategyRequest, marketData: any): string {
    // Get current date for context
    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' })

    const marketContext = marketData ? `
CURRENT MARKET CONTEXT:
- Symbol: ${request.symbol}
- Current Price: $${marketData.price?.toFixed(2) || 'N/A'}
- Price Change: ${marketData.changePercent?.toFixed(2) || 'N/A'}%
- Trend: ${marketData.marketMetrics?.trend > 0 ? 'bullish' : marketData.marketMetrics?.trend < 0 ? 'bearish' : 'neutral'}
- Volatility: ${marketData.marketMetrics?.volatility ? (marketData.marketMetrics.volatility * 100).toFixed(2) : 'N/A'}%
- RSI: ${marketData.technicalIndicators?.rsi?.toFixed(2) || 'N/A'}
- MACD: ${marketData.technicalIndicators?.macd?.macd?.toFixed(3) || 'N/A'}
` : ''

    return `You are an expert quantitative trader and AI strategist. Create a comprehensive trading strategy based on the following requirements:

CURRENT DATE CONTEXT:
- Today is: ${currentDate}
- Current Year: ${currentYear}
- Current Month: ${currentMonth}
- IMPORTANT: All date references in your strategy should be relative to today (${currentDate}). Never use outdated dates like "March 2024" or past years unless specifically discussing historical data.

STRATEGY REQUIREMENTS:
- Symbol: ${request.symbol}
- Strategy Type: ${request.config.strategyType}
- Risk Level: ${request.config.riskLevel}
- Time Horizon: ${request.config.timeHorizon}
- Description: ${request.description}
${marketContext}

Please create a complete trading strategy with the following components:

1. Generate a complete trading strategy with specific parameters
2. Provide clear entry and exit rules
3. Include risk management guidelines
4. Explain the reasoning behind the strategy
5. Assess the risk level and expected performance

Please respond in the following JSON format:
{
  "strategy": {
    "name": "Strategy name",
    "type": "strategy_type",
    "description": "Strategy description",
    "parameters": {
      "rsiPeriod": 14,
      "rsiOverbought": 70,
      "rsiOversold": 30,
      "macdFast": 12,
      "macdSlow": 26,
      "macdSignal": 9,
      "stopLoss": 5,
      "takeProfit": 10,
      "positionSize": 10
    }
  },
  "reasoning": "Detailed explanation of the strategy logic",
  "recommendations": {
    "entryPoints": ["Entry condition 1", "Entry condition 2"],
    "exitPoints": ["Exit condition 1", "Exit condition 2"],
    "riskManagement": ["Risk rule 1", "Risk rule 2"]
  }
}`
  }

  private generateAnalysisPrompt(symbol: string, marketData: any): string {
    const currentPrice = marketData?.price?.toFixed(2) || 'N/A'
    const priceChange = marketData?.changePercent?.toFixed(2) || 'N/A'
    const volume = marketData?.volume?.toLocaleString() || 'N/A'
    const trend = marketData?.marketMetrics?.trend > 0 ? 'bullish' : marketData?.marketMetrics?.trend < 0 ? 'bearish' : 'neutral'
    const volatility = marketData?.marketMetrics?.volatility ? (marketData.marketMetrics.volatility * 100).toFixed(2) : 'N/A'
    const sma20 = marketData?.technicalIndicators?.sma20?.toFixed(2) || 'N/A'
    const sma50 = marketData?.technicalIndicators?.sma50?.toFixed(2) || 'N/A'
    const rsi = marketData?.technicalIndicators?.rsi?.toFixed(2) || 'N/A'
    const macd = marketData?.technicalIndicators?.macd?.macd?.toFixed(3) || 'N/A'
    const bollingerUpper = marketData?.technicalIndicators?.bollingerBands?.upper?.toFixed(2) || 'N/A'
    const bollingerLower = marketData?.technicalIndicators?.bollingerBands?.lower?.toFixed(2) || 'N/A'
    const stochastic = marketData?.technicalIndicators?.stochastic?.k?.toFixed(2) || 'N/A'
    const atr = marketData?.technicalIndicators?.atr?.toFixed(2) || 'N/A'

    // Calculate support and resistance levels based on real data
    const support = marketData?.price ? (marketData.price * 0.95).toFixed(2) : 'N/A'
    const resistance = marketData?.price ? (marketData.price * 1.05).toFixed(2) : 'N/A'

    const technicalIndicators = marketData?.technicalIndicators ? 
      `- RSI: ${rsi}
- MACD: ${macd}
- Bollinger Bands: Upper $${bollingerUpper}, Lower $${bollingerLower}
- Stochastic: ${stochastic}
- ATR: $${atr}` : 'No technical indicators available'

    return `You are a senior market analyst with expertise in technical analysis, fundamental analysis, and market psychology. Provide a comprehensive analysis of ${symbol} based on the following REAL-TIME market data:

CURRENT MARKET DATA:
- Symbol: ${symbol}
- Current Price: $${currentPrice}
- Price Change: ${priceChange}%
- Volume: ${volume}
- Trend: ${trend}
- Volatility: ${volatility}%
- SMA20: $${sma20}
- SMA50: $${sma50}

TECHNICAL INDICATORS:
${technicalIndicators}

SUPPORT & RESISTANCE:
- Support Level: $${support}
- Resistance Level: $${resistance}

Please provide a comprehensive market analysis in the following JSON format, using the actual market data provided:

{
  "technical": {
    "trend": "bullish/bearish/neutral",
    "momentum": "strong/weak/neutral",
    "volatility": "high/medium/low",
    "support": ${support !== 'N/A' ? support : 0},
    "resistance": ${resistance !== 'N/A' ? resistance : 0},
    "keyLevels": [${support !== 'N/A' ? support : 0}, ${currentPrice !== 'N/A' ? currentPrice : 0}, ${resistance !== 'N/A' ? resistance : 0}]
  },
  "fundamental": {
    "sector": "Technology/Healthcare/Financials/etc",
    "marketCap": "Large Cap/Mid Cap/Small Cap",
    "peRatio": 25.5,
    "dividendYield": 0.5,
    "growthOutlook": "positive/negative/neutral"
  },
  "sentiment": {
    "overall": "bullish/bearish/neutral",
    "newsSentiment": "positive/negative/neutral",
    "analystRating": "buy/hold/sell",
    "socialSentiment": "positive/negative/neutral"
  },
  "risk": {
    "riskLevel": "low/medium/high",
    "maxDrawdown": 15.0,
    "volatility": ${volatility !== 'N/A' ? volatility : 25.0},
    "correlation": 0.7
  },
  "recommendations": {
    "action": "buy/sell/hold",
    "confidence": 0.75,
    "reasoning": "Detailed reasoning based on the market data provided",
    "timeHorizon": "short/medium/long term",
    "priceTarget": ${resistance !== 'N/A' ? resistance : 0}
  }
}

IMPORTANT: Base your analysis on the actual market data provided above. Use realistic values and provide actionable insights.

CRITICAL JSON REQUIREMENTS:
- NEVER use "N/A" in any JSON field - use null for missing values or provide realistic estimates
- All arrays must contain valid JSON values (numbers, strings, or null) - never "N/A"
- If you don't have specific data, use null or provide reasonable estimates based on the market data provided`
  }

  private async callOpenAI(prompt: string, config: GPTStrategyConfig): Promise<any> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not found - real-time strategy generation requires valid API key')
    }

    try {
      console.log(`🤖 Calling OpenAI API with model: ${config.model}`)
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: `You are an elite quantitative trading strategist and AI financial analyst with 20+ years of experience in institutional trading, algorithmic development, and risk management. You have deep expertise in:

CORE EXPERTISE:
- Advanced technical analysis (Elliott Wave, Fibonacci, Harmonic patterns)
- Quantitative finance and statistical arbitrage
- Machine learning in financial markets
- Options strategies and derivatives
- Portfolio optimization and asset allocation
- Behavioral finance and market psychology
- Risk management and position sizing
- Market microstructure and liquidity analysis

TRADING PHILOSOPHY:
You operate with institutional-grade precision, combining multiple analytical frameworks:
1. TECHNICAL ANALYSIS: Price action, volume analysis, momentum indicators
2. FUNDAMENTAL ANALYSIS: Earnings, growth metrics, sector analysis
3. QUANTITATIVE ANALYSIS: Statistical models, volatility forecasting
4. BEHAVIORAL ANALYSIS: Market sentiment, crowd psychology
5. RISK MANAGEMENT: Kelly criterion, position sizing, correlation analysis

STRATEGY DEVELOPMENT METHODOLOGY:
1. MARKET CONTEXT ANALYSIS: Assess current market regime (trending/ranging/volatile)
2. MULTI-TIMEFRAME ANALYSIS: Align short, medium, and long-term trends
3. RISK-REWARD OPTIMIZATION: Calculate optimal position sizes and stop levels
4. CORRELATION ANALYSIS: Consider sector and market correlations
5. VOLATILITY ADAPTATION: Adjust strategy parameters based on current volatility
6. LIQUIDITY ASSESSMENT: Ensure strategy works with current market liquidity

ADVANCED INDICATORS TO CONSIDER:
- RSI with divergence analysis
- MACD with signal line crossovers and histogram patterns
- Bollinger Bands with squeeze detection
- Stochastic oscillator with overbought/oversold levels
- ATR for volatility-based position sizing
- Volume-weighted average price (VWAP)
- Ichimoku cloud analysis
- Williams %R for momentum confirmation
- ADX for trend strength measurement
- Parabolic SAR for trailing stops

RISK MANAGEMENT FRAMEWORK:
1. POSITION SIZING: Use Kelly criterion or fixed percentage of capital
2. STOP LOSSES: ATR-based, support/resistance-based, or percentage-based
3. TAKE PROFITS: Risk-reward ratios of 1:2, 1:3, or higher
4. CORRELATION LIMITS: Maximum portfolio correlation exposure
5. DRAWDOWN LIMITS: Maximum acceptable drawdown per strategy
6. VOLATILITY ADJUSTMENTS: Scale positions based on market volatility

PERFORMANCE METRICS CALCULATION:
- Expected Return: Based on historical backtesting and current market conditions
- Max Drawdown: Calculated using Monte Carlo simulation or historical analysis
- Sharpe Ratio: Risk-adjusted return measure (target > 1.0)
- Sortino Ratio: Downside deviation-adjusted return (target > 1.5)
- Calmar Ratio: Annual return / max drawdown (target > 2.0)
- Win Rate: Percentage of profitable trades (target > 55%)
- Profit Factor: Gross profit / gross loss (target > 1.5)
- Recovery Factor: Net profit / max drawdown (target > 2.0)

MARKET REGIME ADAPTATION:
- TRENDING MARKETS: Momentum strategies, trend-following indicators
- RANGING MARKETS: Mean reversion, oscillators, support/resistance
- VOLATILE MARKETS: Volatility breakout, straddle strategies
- LOW VOLATILITY: Iron condors, credit spreads
- HIGH VOLATILITY: Directional strategies, momentum breakouts

ENTRY CRITERIA FRAMEWORK:
1. PRIMARY SIGNAL: Main technical indicator confirmation
2. SECONDARY CONFIRMATION: Supporting indicator alignment
3. VOLUME CONFIRMATION: Above-average volume on breakout
4. TREND ALIGNMENT: Multiple timeframe trend agreement
5. RISK-REWARD RATIO: Minimum 1:2 risk-reward ratio
6. MARKET CONTEXT: Overall market environment support

EXIT CRITERIA FRAMEWORK:
1. TECHNICAL EXIT: Indicator reversal or signal change
2. TIME-BASED EXIT: Maximum holding period
3. PROFIT TARGET: Predefined profit levels
4. STOP LOSS: Predefined loss levels
5. TRAILING STOP: Dynamic stop adjustment
6. CORRELATION EXIT: Market correlation breakdown

POSITION SIZING ALGORITHM:
- Base Position Size = Account Size × Risk Per Trade (1-2%)
- Volatility Adjustment = Base Size × (1 / Current ATR)
- Correlation Adjustment = Position Size × (1 - Portfolio Correlation)
- Final Position Size = Base Size × Volatility Adj × Correlation Adj

YOUR TASK:
Create a comprehensive, institutional-grade trading strategy that incorporates all the above frameworks. Your response must be:

1. DATA-DRIVEN: Base all decisions on provided market data
2. RISK-AWARE: Include comprehensive risk management
3. ADAPTABLE: Consider current market conditions
4. MEASURABLE: Include specific performance metrics
5. ACTIONABLE: Provide clear entry/exit rules
6. REALISTIC: Use proven trading principles

RESPONSE FORMAT:
{
  "strategy": {
    "name": "Descriptive strategy name",
    "type": "momentum/mean_reversion/breakout/ai_ml/multi_factor/custom",
    "description": "Comprehensive strategy description with rationale",
    "parameters": {
      "rsiPeriod": 14,
      "rsiOverbought": 70,
      "rsiOversold": 30,
      "macdFast": 12,
      "macdSlow": 26,
      "macdSignal": 9,
      "bollingerPeriod": 20,
      "bollingerStdDev": 2,
      "atrPeriod": 14,
      "stopLoss": 5,
      "takeProfit": 10,
      "positionSize": 10,
      "maxHoldingPeriod": 30,
      "minVolume": 1000000
    }
  },
  "performanceMetrics": {
    "expectedReturn": "15-25% annually based on current market conditions",
    "maxDrawdown": "8-12% during adverse market conditions",
    "sharpeRatio": "1.2-1.8",
    "sortinoRatio": "1.5-2.2",
    "calmarRatio": "2.0-3.5",
    "winRate": "65-75%",
    "profitFactor": "1.5-2.0",
    "recoveryFactor": "2.5-4.0",
    "avgTradeDuration": "5-15 days",
    "maxCorrelation": "0.3"
  },
  "marketAnalysis": {
    "currentRegime": "trending/ranging/volatile",
    "trendStrength": "strong/medium/weak",
    "volatilityRegime": "high/medium/low",
    "supportLevels": [230.50, 225.00, 220.00],
    "resistanceLevels": [235.00, 240.00, 245.00],
    "keyLevels": ["Support at 230.50", "Resistance at 235.00"],
    "volumeProfile": "above_average/below_average/normal"
  },
  "riskManagement": {
    "positionSizing": "Kelly criterion with 2% risk per trade",
    "stopLossStrategy": "ATR-based with 2x ATR",
    "takeProfitStrategy": "Risk-reward ratio of 1:3",
    "correlationLimit": "Maximum 30% correlation with market",
    "maxDrawdownLimit": "15% maximum portfolio drawdown",
    "volatilityAdjustment": "Scale positions based on current ATR"
  },
  "entryCriteria": {
    "primarySignal": "RSI oversold (< 30) with MACD bullish crossover",
    "secondaryConfirmation": "Price above 20-day SMA with increasing volume",
    "volumeRequirement": "Volume > 1.5x average daily volume",
    "trendAlignment": "All timeframes (1D, 1W, 1M) showing bullish alignment",
    "riskRewardRatio": "Minimum 1:3 risk-reward ratio",
    "marketContext": "Overall market trend supportive"
  },
  "exitCriteria": {
    "technicalExit": "RSI overbought (> 70) or MACD bearish crossover",
    "timeBasedExit": "Maximum 30-day holding period",
    "profitTarget": "Take profit at 10% gain or 3x risk",
    "stopLoss": "Stop loss at 3.33% loss or 1x risk",
    "trailingStop": "Trail stop at 2x ATR below current price",
    "correlationExit": "Exit if correlation with market exceeds 0.5"
  },
  "reasoning": "Detailed explanation of strategy logic, market analysis, and risk considerations",
  "recommendations": {
    "entryPoints": ["Specific entry conditions with price levels"],
    "exitPoints": ["Specific exit conditions with price levels"],
    "riskManagement": ["Detailed risk management rules"],
    "positionSizing": ["Specific position sizing calculations"],
    "marketConditions": ["Optimal market conditions for this strategy"]
  }
}

CRITICAL REQUIREMENTS:
1. All metrics must be realistic and based on current market data
2. Risk management must be comprehensive and specific
3. Entry/exit criteria must be precise and actionable
4. Performance metrics must be achievable given current market conditions
5. Strategy must adapt to provided market context
6. All calculations must consider current volatility and trend strength
7. NEVER use "N/A" in JSON responses - use null for missing values or provide realistic estimates
8. All arrays must contain valid JSON values (numbers, strings, or null) - never "N/A"`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: Math.min(config.temperature, 0.3), // Lower temperature for more consistent responses
          max_tokens: Math.min(config.maxTokens, 2000), // Reasonable token limit
          top_p: 0.9, // Add top_p for better response quality
          frequency_penalty: 0.1, // Reduce repetition
          presence_penalty: 0.1 // Encourage more diverse responses
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`OpenAI API error: ${response.status} - ${errorText}`)
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('No response content from OpenAI')
      }

      console.log('Raw OpenAI response:', content)

      // Parse JSON response with enhanced error handling
      try {
        // Clean the content to handle N/A values and other JSON issues
        let cleanedContent = content
        
        // Replace N/A values in arrays with null
        cleanedContent = cleanedContent.replace(/\[N\/A\]/g, '[null]')
        cleanedContent = cleanedContent.replace(/\["N\/A"\]/g, '[null]')
        cleanedContent = cleanedContent.replace(/\[N\/A,/g, '[null,')
        cleanedContent = cleanedContent.replace(/,N\/A\]/g, ',null]')
        cleanedContent = cleanedContent.replace(/,N\/A,/g, ',null,')
        
        // Replace standalone N/A values with null
        cleanedContent = cleanedContent.replace(/:\s*N\/A\s*([,}])/g, ': null$1')
        cleanedContent = cleanedContent.replace(/:\s*"N\/A"\s*([,}])/g, ': null$1')
        
        // Replace N/A in string arrays
        cleanedContent = cleanedContent.replace(/\["N\/A"\]/g, '[null]')
        cleanedContent = cleanedContent.replace(/\["N\/A",/g, '[null,')
        cleanedContent = cleanedContent.replace(/,"N\/A"\]/g, ',null]')
        cleanedContent = cleanedContent.replace(/,"N\/A",/g, ',null,')
        
        const parsed = JSON.parse(cleanedContent)
        
        // Validate the response structure
        if (!parsed.strategy || !parsed.strategy.parameters) {
          throw new Error('Invalid response structure')
        }
        
        return parsed
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError)
        console.log('Raw response:', content)
        
        // Try to extract JSON from the response if it's wrapped in markdown
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            let extractedJson = jsonMatch[1] || jsonMatch[0]
            
            // Clean the extracted JSON as well
            extractedJson = extractedJson.replace(/\[N\/A\]/g, '[null]')
            extractedJson = extractedJson.replace(/\["N\/A"\]/g, '[null]')
            extractedJson = extractedJson.replace(/\[N\/A,/g, '[null,')
            extractedJson = extractedJson.replace(/,N\/A\]/g, ',null]')
            extractedJson = extractedJson.replace(/,N\/A,/g, ',null,')
            extractedJson = extractedJson.replace(/:\s*N\/A\s*([,}])/g, ': null$1')
            extractedJson = extractedJson.replace(/:\s*"N\/A"\s*([,}])/g, ': null$1')
            extractedJson = extractedJson.replace(/\["N\/A"\]/g, '[null]')
            extractedJson = extractedJson.replace(/\["N\/A",/g, '[null,')
            extractedJson = extractedJson.replace(/,"N\/A"\]/g, ',null]')
            extractedJson = extractedJson.replace(/,"N\/A",/g, ',null,')
            
            return JSON.parse(extractedJson)
          } catch (secondParseError) {
            console.error('Failed to parse extracted JSON:', secondParseError)
          }
        }
        
        return null
      }

    } catch (error) {
      console.error('Error calling OpenAI API:', error)
      return null
    }
  }

  // REMOVED: All simulated data generation methods

  private parseAnalysisResponse(response: any): GPTMarketAnalysis | null {
    try {
      if (!response || typeof response !== 'object') {
        return null
      }

      return {
        technical: {
          trend: response.technical?.trend || 'neutral',
          momentum: response.technical?.momentum || 'neutral',
          volatility: response.technical?.volatility || 'medium',
          support: response.technical?.support || 0,
          resistance: response.technical?.resistance || 0,
          keyLevels: response.technical?.keyLevels || []
        },
        fundamental: {
          sector: response.fundamental?.sector || 'Unknown',
          marketCap: response.fundamental?.marketCap || 'Unknown',
          peRatio: response.fundamental?.peRatio || 0,
          dividendYield: response.fundamental?.dividendYield || 0,
          growthOutlook: response.fundamental?.growthOutlook || 'neutral'
        },
        sentiment: {
          overall: response.sentiment?.overall || 'neutral',
          newsSentiment: response.sentiment?.newsSentiment || 'neutral',
          analystRating: response.sentiment?.analystRating || 'hold',
          socialSentiment: response.sentiment?.socialSentiment || 'neutral'
        },
        risk: {
          riskLevel: response.risk?.riskLevel || 'medium',
          maxDrawdown: response.risk?.maxDrawdown || 15,
          volatility: response.risk?.volatility || 25,
          correlation: response.risk?.correlation || 0.7
        },
        recommendations: {
          action: response.recommendations?.action || 'hold',
          confidence: response.recommendations?.confidence || 0.5,
          reasoning: response.recommendations?.reasoning || 'No specific reasoning provided',
          timeHorizon: response.recommendations?.timeHorizon || 'medium term',
          priceTarget: response.recommendations?.priceTarget || 0
        }
      }
    } catch (error) {
      console.error('Error parsing analysis response:', error)
      return null
    }
  }

  // Generate strategy parameters by type
  private generateStrategyByType(type: string, riskLevel: string): StrategyParameters {
    const baseParams = {
      rsiPeriod: 14,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      bollingerPeriod: 20,
      bollingerStdDev: 2,
      smaShort: 20,
      smaLong: 50,
      emaShort: 12,
      emaLong: 26,
      momentumPeriod: 20,
      breakoutPeriod: 20,
      volumeThreshold: 1.5
    }

    // Adjust parameters based on risk level
    const riskMultiplier = riskLevel === 'conservative' ? 0.7 : riskLevel === 'aggressive' ? 1.3 : 1.0

    switch (type) {
      case 'momentum':
        return {
          ...baseParams,
          rsiOverbought: 70 + (riskMultiplier - 1) * 10,
          rsiOversold: 30 - (riskMultiplier - 1) * 10,
          stopLoss: 5 * riskMultiplier,
          takeProfit: 10 * riskMultiplier,
          positionSize: 10 * riskMultiplier,
          maxPositions: 5,
          momentumThreshold: 0.02 * riskMultiplier
        }

      case 'mean_reversion':
        return {
          ...baseParams,
          rsiOverbought: 75 + (riskMultiplier - 1) * 5,
          rsiOversold: 25 - (riskMultiplier - 1) * 5,
          stopLoss: 3 * riskMultiplier,
          takeProfit: 8 * riskMultiplier,
          positionSize: 8 * riskMultiplier,
          maxPositions: 3,
          momentumThreshold: 0.015 * riskMultiplier
        }

      case 'breakout':
        return {
          ...baseParams,
          rsiOverbought: 65 + (riskMultiplier - 1) * 5,
          rsiOversold: 35 - (riskMultiplier - 1) * 5,
          stopLoss: 4 * riskMultiplier,
          takeProfit: 12 * riskMultiplier,
          positionSize: 12 * riskMultiplier,
          maxPositions: 4,
          momentumThreshold: 0.025 * riskMultiplier
        }

      case 'ai_ml':
        return {
          ...baseParams,
          rsiOverbought: 68 + (riskMultiplier - 1) * 7,
          rsiOversold: 32 - (riskMultiplier - 1) * 7,
          stopLoss: 6 * riskMultiplier,
          takeProfit: 15 * riskMultiplier,
          positionSize: 15 * riskMultiplier,
          maxPositions: 6,
          momentumThreshold: 0.03 * riskMultiplier
        }

      default:
        return {
          ...baseParams,
          rsiOverbought: 70,
          rsiOversold: 30,
          stopLoss: 5,
          takeProfit: 10,
          positionSize: 10,
          maxPositions: 5,
          momentumThreshold: 0.02
        }
    }
  }

  // Parse GPT response into Strategy object
  private async parseGPTResponse(gptResponse: any, request: GPTStrategyRequest): Promise<Strategy> {
    const strategy = gptResponse?.strategy || {}
    const performanceMetrics = gptResponse?.performanceMetrics || {}
    const marketAnalysis = gptResponse?.marketAnalysis || {}
    const riskManagement = gptResponse?.riskManagement || {}
    const entryCriteria = gptResponse?.entryCriteria || {}
    const exitCriteria = gptResponse?.exitCriteria || {}
    
    // Extract performance metrics from GPT response with dynamic calculation
    const extractMetric = (metric: string, defaultValue: number = 0): number => {
      const value = performanceMetrics[metric]
      if (typeof value === 'string') {
        // Handle ranges like "15-25%"
        const match = value.match(/(\d+(?:\.\d+)?)/)
        return match ? parseFloat(match[1]) : defaultValue
      }
      return typeof value === 'number' ? value : defaultValue
    }
    
    // Calculate dynamic performance metrics based on market data
    const calculateDynamicMetrics = async () => {
      // Get comprehensive market data for dynamic calculations
      const marketData = await this.getRealTimeMarketContext(request.symbol)
      
      if (!marketData) {
        throw new Error(`Failed to fetch market data for ${request.symbol}`)
      }

      // Validate market data quality for accurate calculations
      this.validateMarketDataForMetrics(marketData, request.symbol)
      
      // Extract all available market data from enhanced market context
      const currentPrice = marketData.currentPrice
      const volatility = marketData.volatility
      const trendStrength = marketData.trendStrength
      const rsi = marketData.rsi
      const macd = marketData.macd
      const volume = marketData.volume
      const marketCap = marketData.marketCap
      const peRatio = marketData.peRatio
      const beta = marketData.beta
      
      // Use the pre-calculated stock characteristics from enhanced market data
      const isLargeCap = marketData.isLargeCap
      const isHighVolume = marketData.isHighVolume
      const isHighPriced = marketData.isHighPriced
      const isLowPriced = marketData.isLowPriced
      const isHighBeta = marketData.isHighBeta
      const isLowBeta = marketData.isLowBeta
      const isHighVolatility = marketData.isHighVolatility
      const isLowVolatility = marketData.isLowVolatility
      const isBullMarket = marketData.isBullMarket
      const isBearMarket = marketData.isBearMarket
      const isSidewaysMarket = marketData.isSidewaysMarket
      
      // Additional stock-specific characteristics
      const isHighPE = peRatio > 30
      const isLowPE = peRatio < 15
      const isVolatileMarket = volatility > 0.03
      const isStableMarket = volatility < 0.015
      
      // Advanced win rate calculation based on comprehensive market analysis
      let baseWinRate = 50 // Conservative base for realistic expectations
      
      // Market regime adjustments (primary factor)
      if (isBullMarket) {
        baseWinRate += 12 // Strong bullish markets favor long strategies
        if (trendStrength > 0.8) baseWinRate += 3 // Very strong trend
      } else if (isBearMarket) {
        baseWinRate -= 8 // Bear markets are harder to trade
        if (trendStrength < 0.2) baseWinRate -= 2 // Very weak trend
      } else if (isSidewaysMarket) {
        baseWinRate += 6 // Sideways markets are predictable
        if (Math.abs(trendStrength - 0.5) < 0.1) baseWinRate += 2 // Very stable sideways
      }
      
      // Volatility regime adjustments
      if (isVolatileMarket) {
        baseWinRate -= 6 // High volatility reduces predictability
        if (volatility > 0.05) baseWinRate -= 3 // Extreme volatility
      } else if (isStableMarket) {
        baseWinRate += 8 // Low volatility increases predictability
        if (volatility < 0.01) baseWinRate += 2 // Very stable
      }
      
      // Technical indicator adjustments (secondary factor)
      if (rsi < 20 || rsi > 80) {
        baseWinRate += 8 // Extreme oversold/overbought conditions
      } else if (rsi < 30 || rsi > 70) {
        baseWinRate += 5 // Strong oversold/overbought conditions
      } else if (rsi < 40 || rsi > 60) {
        baseWinRate += 2 // Moderate conditions
      } else {
        baseWinRate -= 2 // Neutral conditions are less predictable
      }
      
      // MACD signal strength
      if (Math.abs(macd) > 1.5) {
        baseWinRate += 6 // Very strong MACD signals
      } else if (Math.abs(macd) > 1.0) {
        baseWinRate += 4 // Strong MACD signals
      } else if (Math.abs(macd) > 0.5) {
        baseWinRate += 2 // Moderate MACD signals
      } else {
        baseWinRate -= 1 // Weak MACD signals
      }
      
      // Stock-specific adjustments (tertiary factor)
      if (isLargeCap) {
        baseWinRate += 6 // Large caps are more predictable and liquid
        if (marketCap > 100000000000) baseWinRate += 2 // Mega cap bonus
      } else if (marketCap > 2000000000 && marketCap <= 10000000000) {
        baseWinRate += 2 // Mid caps are moderately predictable
      } else {
        baseWinRate -= 4 // Small caps are less predictable
      }
      
      if (isHighVolume) {
        baseWinRate += 4 // High volume = better liquidity and signals
        if (volume > 20000000) baseWinRate += 2 // Very high volume
      } else if (volume < 1000000) {
        baseWinRate -= 3 // Low volume = poor liquidity
      }
      
      if (isHighPriced) {
        baseWinRate += 3 // High-priced stocks tend to be more stable
      } else if (isLowPriced) {
        baseWinRate -= 4 // Low-priced stocks are more volatile
      }
      
      if (isLowBeta) {
        baseWinRate += 4 // Low beta = less volatile, more predictable
      } else if (isHighBeta) {
        baseWinRate -= 5 // High beta = more volatile, less predictable
      }
      
      // P/E ratio adjustments
      if (isLowPE && peRatio > 0) {
        baseWinRate += 2 // Value stocks can be more predictable
      } else if (isHighPE) {
        baseWinRate -= 2 // Growth stocks can be less predictable
      }
      
      // Clamp win rate to realistic range with validation
      const dynamicWinRate = Math.min(75, Math.max(40, baseWinRate))
      
      // Validate win rate calculation
      if (dynamicWinRate < 40 || dynamicWinRate > 75) {
        console.warn(`⚠️ Unusual win rate calculated for ${request.symbol}: ${dynamicWinRate.toFixed(1)}%`)
      }
      
      // Advanced expected return calculation based on risk/reward profile
      let baseReturn = 8 // Conservative base return for realistic expectations
      
      // Market regime adjustments (primary factor)
      if (isBullMarket) {
        baseReturn += 18 // Bull markets provide strong upside
        if (trendStrength > 0.8) baseReturn += 4 // Very strong trend
      } else if (isBearMarket) {
        baseReturn -= 5 // Bear markets limit upside
        if (trendStrength < 0.2) baseReturn -= 3 // Very weak trend
      } else if (isSidewaysMarket) {
        baseReturn += 8 // Sideways markets offer moderate opportunities
      }
      
      // Volatility regime adjustments
      if (isVolatileMarket) {
        baseReturn += 12 // High volatility = higher potential returns
        if (volatility > 0.05) baseReturn += 6 // Extreme volatility
      } else if (isStableMarket) {
        baseReturn -= 2 // Low volatility = lower potential returns
        if (volatility < 0.01) baseReturn -= 2 // Very stable
      }
      
      // Technical indicator adjustments
      if (rsi < 25) {
        baseReturn += 8 // Very oversold = strong bounce potential
      } else if (rsi < 35) {
        baseReturn += 5 // Oversold = good entry opportunity
      } else if (rsi > 75) {
        baseReturn -= 4 // Very overbought = correction risk
      } else if (rsi > 65) {
        baseReturn -= 2 // Overbought = limited upside
      }
      
      // MACD momentum adjustments
      if (Math.abs(macd) > 1.5) {
        baseReturn += 10 // Very strong momentum
      } else if (Math.abs(macd) > 1.0) {
        baseReturn += 7 // Strong momentum
      } else if (Math.abs(macd) > 0.5) {
        baseReturn += 4 // Moderate momentum
      }
      
      // Stock-specific adjustments
      if (isLargeCap) {
        baseReturn += 2 // Large caps offer steady returns
        if (marketCap > 100000000000) baseReturn += 1 // Mega cap stability
      } else if (marketCap > 2000000000 && marketCap <= 10000000000) {
        baseReturn += 4 // Mid caps offer growth potential
      } else {
        baseReturn += 8 // Small caps offer higher growth potential
      }
      
      if (isHighVolume) {
        baseReturn += 3 // High volume = better execution
        if (volume > 20000000) baseReturn += 2 // Very high volume
      } else if (volume < 1000000) {
        baseReturn -= 2 // Low volume = poor execution
      }
      
      if (isHighBeta) {
        baseReturn += 10 // High beta = higher risk/reward
      } else if (isLowBeta) {
        baseReturn -= 1 // Low beta = lower risk/reward
      }
      
      // P/E ratio adjustments
      if (isLowPE && peRatio > 0) {
        baseReturn += 3 // Value stocks can offer good returns
      } else if (isHighPE) {
        baseReturn += 6 // Growth stocks offer higher potential
      }
      
      // Volatility-based return adjustment
      baseReturn += (volatility * 150) // Higher volatility = higher potential return
      
      // Clamp return to realistic range with validation
      const dynamicReturn = Math.min(40, Math.max(3, baseReturn))
      
      // Validate return calculation
      if (dynamicReturn < 3 || dynamicReturn > 40) {
        console.warn(`⚠️ Unusual return calculated for ${request.symbol}: ${dynamicReturn.toFixed(1)}%`)
      }
      
      // Advanced max drawdown calculation based on risk factors
      let baseDrawdown = 8 // Conservative base drawdown
      
      // Market regime adjustments (primary factor)
      if (isBearMarket) {
        baseDrawdown += 10 // Bear markets increase drawdown risk
        if (trendStrength < 0.2) baseDrawdown += 3 // Very weak trend
      } else if (isBullMarket) {
        baseDrawdown -= 2 // Bull markets reduce drawdown risk
        if (trendStrength > 0.8) baseDrawdown -= 2 // Very strong trend
      } else if (isSidewaysMarket) {
        baseDrawdown += 2 // Sideways markets have moderate risk
      }
      
      // Volatility regime adjustments
      if (isVolatileMarket) {
        baseDrawdown += 8 // High volatility increases drawdown risk
        if (volatility > 0.05) baseDrawdown += 4 // Extreme volatility
      } else if (isStableMarket) {
        baseDrawdown -= 3 // Low volatility reduces drawdown risk
        if (volatility < 0.01) baseDrawdown -= 2 // Very stable
      }
      
      // Technical indicator adjustments
      if (rsi > 75) {
        baseDrawdown += 4 // Overbought conditions increase correction risk
      } else if (rsi < 25) {
        baseDrawdown -= 2 // Oversold conditions reduce downside risk
      }
      
      if (Math.abs(macd) > 1.5) {
        baseDrawdown += 3 // Strong momentum can lead to sharp reversals
      }
      
      // Stock-specific adjustments
      if (isLargeCap) {
        baseDrawdown -= 3 // Large caps are more stable
        if (marketCap > 100000000000) baseDrawdown -= 1 // Mega cap stability
      } else if (marketCap > 2000000000 && marketCap <= 10000000000) {
        baseDrawdown += 1 // Mid caps have moderate risk
      } else {
        baseDrawdown += 5 // Small caps have higher risk
      }
      
      if (isHighVolume) {
        baseDrawdown -= 2 // High volume = better liquidity, lower risk
        if (volume > 20000000) baseDrawdown -= 1 // Very high volume
      } else if (volume < 1000000) {
        baseDrawdown += 3 // Low volume = poor liquidity, higher risk
      }
      
      if (isHighBeta) {
        baseDrawdown += 6 // High beta = higher volatility risk
      } else if (isLowBeta) {
        baseDrawdown -= 4 // Low beta = lower volatility risk
      }
      
      if (isHighPriced) {
        baseDrawdown -= 2 // High-priced stocks tend to be more stable
      } else if (isLowPriced) {
        baseDrawdown += 4 // Low-priced stocks are more volatile
      }
      
      // P/E ratio adjustments
      if (isHighPE) {
        baseDrawdown += 3 // High P/E stocks can have sharp corrections
      } else if (isLowPE && peRatio > 0) {
        baseDrawdown -= 1 // Value stocks tend to be more stable
      }
      
      // Volatility-based drawdown adjustment
      baseDrawdown += (volatility * 250) // Higher volatility = higher drawdown risk
      
      // Clamp drawdown to realistic range with validation
      const dynamicDrawdown = Math.min(30, Math.max(3, baseDrawdown))
      
      // Validate drawdown calculation
      if (dynamicDrawdown < 3 || dynamicDrawdown > 30) {
        console.warn(`⚠️ Unusual drawdown calculated for ${request.symbol}: ${dynamicDrawdown.toFixed(1)}%`)
      }
      
      // Advanced Sharpe ratio calculation based on risk-adjusted returns
      const riskFreeRate = 0.025 // 2.5% risk-free rate (current market)
      const excessReturn = (dynamicReturn / 100) - riskFreeRate
      const returnVolatility = dynamicDrawdown / 100
      
      // Calculate base Sharpe ratio
      let dynamicSharpe = returnVolatility > 0 ? excessReturn / returnVolatility : 0.5
      
      // Market regime adjustments
      if (isBullMarket) {
        dynamicSharpe += 0.4 // Bull markets favor long strategies
        if (trendStrength > 0.8) dynamicSharpe += 0.2 // Very strong trend
      } else if (isBearMarket) {
        dynamicSharpe -= 0.3 // Bear markets are harder to trade
        if (trendStrength < 0.2) dynamicSharpe -= 0.2 // Very weak trend
      } else if (isSidewaysMarket) {
        dynamicSharpe += 0.2 // Sideways markets can be predictable
      }
      
      // Volatility regime adjustments
      if (isStableMarket) {
        dynamicSharpe += 0.3 // Low volatility improves risk-adjusted returns
        if (volatility < 0.01) dynamicSharpe += 0.1 // Very stable
      } else if (isVolatileMarket) {
        dynamicSharpe -= 0.2 // High volatility reduces risk-adjusted returns
        if (volatility > 0.05) dynamicSharpe -= 0.1 // Extreme volatility
      }
      
      // Stock-specific adjustments
      if (isLargeCap) {
        dynamicSharpe += 0.2 // Large caps offer better risk-adjusted returns
        if (marketCap > 100000000000) dynamicSharpe += 0.1 // Mega cap stability
      } else if (marketCap > 2000000000 && marketCap <= 10000000000) {
        dynamicSharpe += 0.1 // Mid caps offer moderate risk-adjusted returns
      } else {
        dynamicSharpe -= 0.1 // Small caps have lower risk-adjusted returns
      }
      
      if (isHighVolume) {
        dynamicSharpe += 0.15 // High volume improves execution quality
        if (volume > 20000000) dynamicSharpe += 0.05 // Very high volume
      } else if (volume < 1000000) {
        dynamicSharpe -= 0.15 // Low volume reduces execution quality
      }
      
      if (isLowBeta) {
        dynamicSharpe += 0.2 // Low beta stocks offer better risk-adjusted returns
      } else if (isHighBeta) {
        dynamicSharpe -= 0.2 // High beta stocks have lower risk-adjusted returns
      }
      
      // Technical indicator adjustments
      if (rsi < 25 || rsi > 75) {
        dynamicSharpe += 0.1 // Extreme conditions can offer good risk/reward
      } else if (rsi < 35 || rsi > 65) {
        dynamicSharpe += 0.05 // Strong conditions offer moderate risk/reward
      }
      
      if (Math.abs(macd) > 1.0) {
        dynamicSharpe += 0.1 // Strong momentum improves risk-adjusted returns
      }
      
      // Clamp Sharpe ratio to realistic range with validation
      dynamicSharpe = Math.min(2.8, Math.max(0.1, dynamicSharpe))
      
      // Validate Sharpe ratio calculation
      if (dynamicSharpe < 0.1 || dynamicSharpe > 2.8) {
        console.warn(`⚠️ Unusual Sharpe ratio calculated for ${request.symbol}: ${dynamicSharpe.toFixed(2)}`)
      }
      
      // Calculate additional risk metrics with validation
      const profitFactor = Math.min(2.5, Math.max(0.8, 1.2 + (dynamicWinRate / 100) * 1.0))
      const recoveryFactor = Math.min(3.0, Math.max(0.5, 1.8 + (dynamicSharpe * 0.6)))
      const calmarRatio = Math.min(2.8, Math.max(0.3, 1.5 + (dynamicSharpe * 0.5)))
      const sortinoRatio = Math.min(2.5, Math.max(0.4, 1.3 + (dynamicSharpe * 0.4)))
      
      // Validate additional metrics
      if (profitFactor < 0.8 || profitFactor > 2.5) {
        console.warn(`⚠️ Unusual profit factor for ${request.symbol}: ${profitFactor.toFixed(2)}`)
      }
      if (recoveryFactor < 0.5 || recoveryFactor > 3.0) {
        console.warn(`⚠️ Unusual recovery factor for ${request.symbol}: ${recoveryFactor.toFixed(2)}`)
      }
      
      console.log(`🔍 Dynamic Metrics for ${request.symbol}:`, {
        // Market Data
        currentPrice: `$${currentPrice.toFixed(2)}`,
        volatility: `${(volatility * 100).toFixed(2)}%`,
        trendStrength: trendStrength.toFixed(3),
        rsi: rsi.toFixed(1),
        macd: macd.toFixed(3),
        volume: volume.toLocaleString(),
        marketCap: marketCap ? `$${(marketCap / 1000000000).toFixed(1)}B` : 'N/A',
        peRatio: peRatio ? peRatio.toFixed(1) : 'N/A',
        beta: beta.toFixed(2),
        
        // Stock Characteristics
        stockCharacteristics: {
          isLargeCap,
          isHighVolume,
          isHighPriced,
          isLowPriced,
          isHighBeta,
          isLowBeta
        },
        
        // Market Regime
        marketRegime: {
          isBullMarket,
          isBearMarket,
          isSidewaysMarket,
          isVolatileMarket,
          isStableMarket
        },
        
        // Performance Metrics
        performanceMetrics: {
          winRate: `${dynamicWinRate.toFixed(1)}%`,
          expectedReturn: `${dynamicReturn.toFixed(1)}%`,
          maxDrawdown: `${dynamicDrawdown.toFixed(1)}%`,
          sharpeRatio: dynamicSharpe.toFixed(2),
          profitFactor: profitFactor.toFixed(2),
          recoveryFactor: recoveryFactor.toFixed(2),
          calmarRatio: calmarRatio.toFixed(2),
          sortinoRatio: sortinoRatio.toFixed(2)
        },
        
        // Calculation Factors
        calculationFactors: {
          marketRegimeImpact: isBullMarket ? '+12%' : isBearMarket ? '-8%' : isSidewaysMarket ? '+6%' : '0%',
          volatilityImpact: isVolatileMarket ? '-6%' : isStableMarket ? '+8%' : '0%',
          technicalImpact: rsi < 30 || rsi > 70 ? '+5%' : rsi < 40 || rsi > 60 ? '+2%' : '-2%',
          stockImpact: isLargeCap ? '+6%' : isHighVolume ? '+4%' : isHighBeta ? '-5%' : '0%'
        }
      })
      
      return {
        winRate: dynamicWinRate,
        expectedReturn: dynamicReturn,
        maxDrawdown: dynamicDrawdown,
        sharpeRatio: dynamicSharpe,
        profitFactor: profitFactor,
        recoveryFactor: recoveryFactor,
        calmarRatio: calmarRatio,
        sortinoRatio: sortinoRatio
      }
    }
    
    const dynamicMetrics = await calculateDynamicMetrics()
    
    // Enhanced strategy description with market analysis
    const enhancedDescription = strategy.description || 'AI-generated strategy using GPT analysis'
    const marketContext = marketAnalysis.currentRegime ? 
      `\n\nMarket Context: ${marketAnalysis.currentRegime} market with ${marketAnalysis.trendStrength} trend strength. ` +
      `Volatility regime: ${marketAnalysis.volatilityRegime}. ` +
      `Key levels: ${marketAnalysis.keyLevels?.join(', ') || 'None identified'}.` : ''
    
    return {
      id: Date.now().toString(),
      name: strategy.name || `${request.symbol} Advanced GPT Strategy`,
      type: strategy.type || request.config.strategyType,
      description: enhancedDescription + marketContext,
      symbol: request.symbol.toUpperCase(),
      timeframe: '1d',
      parameters: strategy.parameters || this.generateStrategyByType(request.config.strategyType, request.config.riskLevel),
      performance: {
        winRate: extractMetric('winRate', dynamicMetrics.winRate),
        totalTrades: 0,
        profitableTrades: 0,
        losingTrades: 0,
        profitFactor: extractMetric('profitFactor', dynamicMetrics.profitFactor),
        sharpeRatio: extractMetric('sharpeRatio', dynamicMetrics.sharpeRatio),
        maxDrawdown: extractMetric('maxDrawdown', dynamicMetrics.maxDrawdown),
        totalReturn: extractMetric('expectedReturn', dynamicMetrics.expectedReturn),
        avgTrade: extractMetric('avgTradeDuration', 10),
        avgWin: 0,
        avgLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        recoveryFactor: extractMetric('recoveryFactor', dynamicMetrics.recoveryFactor),
        calmarRatio: extractMetric('calmarRatio', dynamicMetrics.calmarRatio),
        sortinoRatio: extractMetric('sortinoRatio', dynamicMetrics.sortinoRatio)
      },
      status: 'paused',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }
  }

  private async calculateConfidence(strategy: Strategy, symbol: string): Promise<number> {
    // Get real-time market data for dynamic confidence calculation
    const marketData = await this.getRealTimeMarketContext(symbol)
    
    let confidence = 0.3 // Lower base confidence for more realistic values

    // Factor 1: Real-time market conditions (40%)
    if (marketData) {
      const volatility = marketData.volatility
      const trendStrength = marketData.trendStrength
      const rsi = marketData.rsi
      const macd = marketData.macd
      
      // Volatility-based confidence (lower volatility = higher confidence)
      const volatilityConfidence = Math.max(0.2, 1 - (volatility * 10))
      
      // Trend strength confidence
      const trendConfidence = Math.min(0.8, trendStrength * 1.2)
      
      // Technical indicator confidence
      let technicalConfidence = 0.5
      if (rsi < 30 || rsi > 70) technicalConfidence += 0.2 // Extreme conditions
      if (Math.abs(macd) > 0.5) technicalConfidence += 0.15 // Strong MACD
      if (trendStrength > 0.7) technicalConfidence += 0.15 // Strong trend
      
      confidence += (volatilityConfidence + trendConfidence + technicalConfidence) / 3 * 0.4
    }

    // Factor 2: Strategy type confidence (25%)
    const strategyTypeConfidence = {
      'momentum': 0.75,
      'mean_reversion': 0.65,
      'breakout': 0.7,
      'ai_ml': 0.8,
      'multi_factor': 0.85,
      'custom': 0.55
    }
    confidence += (strategyTypeConfidence[strategy.type as keyof typeof strategyTypeConfidence] || 0.6) * 0.25

    // Factor 3: Parameter optimization (25%)
    const paramConfidence = this.assessParameterQuality(strategy.parameters)
    confidence += paramConfidence * 0.25

    // Factor 4: Market-specific adjustments (10%)
    if (marketData) {
      // Use pre-calculated stock characteristics for more accurate adjustments
      if (marketData.isLargeCap) confidence += 0.05 // Large caps more predictable
      if (marketData.isHighVolume) confidence += 0.04 // High volume = better liquidity
      if (marketData.isHighPriced) confidence += 0.03 // High-priced stocks more stable
      if (marketData.isLowPriced) confidence -= 0.03 // Low-priced stocks more volatile
      if (marketData.isLowBeta) confidence += 0.03 // Low beta = less volatile
      if (marketData.isHighBeta) confidence -= 0.02 // High beta = more volatile
      if (marketData.isLowVolatility) confidence += 0.02 // Low volatility = more predictable
      if (marketData.isHighVolatility) confidence -= 0.02 // High volatility = less predictable
    }

    return Math.min(confidence, 0.9) // Cap at 90% for realism
  }



  private assessParameterQuality(parameters: StrategyParameters): number {
    let quality = 0.5

    // Check RSI parameters
    if (parameters.rsiOverbought > parameters.rsiOversold && 
        parameters.rsiOverbought <= 80 && parameters.rsiOversold >= 20) {
      quality += 0.1
    }

    // Check MACD parameters
    if (parameters.macdFast < parameters.macdSlow && parameters.macdSignal > 0) {
      quality += 0.1
    }

    // Check risk management
    if (parameters.stopLoss > 0 && parameters.takeProfit > parameters.stopLoss) {
      quality += 0.1
    }

    // Check position sizing
    if (parameters.positionSize > 0 && parameters.positionSize <= 20) {
      quality += 0.1
    }

    return Math.min(quality, 0.9)
  }

  private validateMarketDataForMetrics(marketData: any, symbol: string): void {
    const errors: string[] = []
    
    // Validate essential data points
    if (!marketData.currentPrice || marketData.currentPrice <= 0) {
      errors.push('Invalid current price')
    }
    
    if (!marketData.volume || marketData.volume < 0) {
      errors.push('Invalid volume')
    }
    
    if (!marketData.volatility || marketData.volatility < 0) {
      errors.push('Invalid volatility')
    }
    
    if (!marketData.rsi || marketData.rsi < 0 || marketData.rsi > 100) {
      errors.push('Invalid RSI value')
    }
    
    if (!marketData.macd || typeof marketData.macd !== 'number') {
      errors.push('Invalid MACD value')
    }
    
    if (!marketData.trendStrength || typeof marketData.trendStrength !== 'number') {
      errors.push('Invalid trend strength')
    }
    
    // Validate stock characteristics
    if (typeof marketData.isLargeCap !== 'boolean') {
      errors.push('Invalid large cap classification')
    }
    
    if (typeof marketData.isHighVolume !== 'boolean') {
      errors.push('Invalid volume classification')
    }
    
    if (typeof marketData.isHighBeta !== 'boolean') {
      errors.push('Invalid beta classification')
    }
    
    // Validate market regime
    if (typeof marketData.isBullMarket !== 'boolean') {
      errors.push('Invalid market regime classification')
    }
    
    if (errors.length > 0) {
      throw new Error(`Market data validation failed for ${symbol}: ${errors.join(', ')}`)
    }
    
    console.log(`✅ Market data validation passed for ${symbol}`)
  }

  private assessRisk(strategy: Strategy, analysis?: GPTMarketAnalysis | null): any {
    const baseRisk = {
      riskLevel: 'medium',
      maxDrawdown: 15.0,
      volatility: 25.0,
      correlation: 0.7
    }

    if (!analysis) {
      return baseRisk
    }

    // Adjust risk based on strategy type
    const strategyRiskMultiplier = {
      'momentum': 1.0,
      'mean_reversion': 0.8,
      'breakout': 1.2,
      'ai_ml': 1.1,
      'multi_factor': 0.9,
      'custom': 1.0
    }

    const multiplier = strategyRiskMultiplier[strategy.type as keyof typeof strategyRiskMultiplier] || 1.0

    return {
      riskLevel: analysis.risk.riskLevel,
      maxDrawdown: analysis.risk.maxDrawdown * multiplier,
      volatility: analysis.risk.volatility * multiplier,
      correlation: analysis.risk.correlation
    }
  }

  private assessEnhancedRisk(parsedResponse: any, marketData: any): any {
    const baseRisk = {
      riskLevel: 'medium',
      maxDrawdown: 15.0,
      volatility: 25.0,
      correlation: 0.7
    }

    // Since Strategy object doesn't have analysis, return base risk
      return baseRisk
  }

  private generateRecommendations(parsedResponse: any, marketData: any, confidence: number): any {
    const recommendations = parsedResponse.recommendations || {}
    const strategyType = parsedResponse.strategy?.type || 'momentum'
    const riskLevel = parsedResponse.strategy?.parameters?.riskLevel || 'moderate'

    // Generate specific recommendations based on strategy type and risk level
    const strategyRecommendations = {
      momentum: {
        conservative: {
          action: 'buy',
          entry: 'Enter when RSI crosses above 30 (oversold) and MACD line crosses above signal line. Use stop-loss at 5% below entry.',
          exit: 'Exit when RSI reaches 70 (overbought) or MACD line crosses below signal line. Take profit at resistance levels.',
          riskManagement: 'Position size: 2-5% of portfolio per trade. Maximum 3 concurrent positions.'
        },
        moderate: {
          action: 'buy',
          entry: 'Enter when RSI crosses above 30 (oversold) and MACD line crosses above signal line. Use stop-loss at 5% below entry.',
          exit: 'Exit when RSI reaches 70 (overbought) or MACD line crosses below signal line. Take profit at resistance levels.',
          riskManagement: 'Position size: 2-5% of portfolio per trade. Maximum 3 concurrent positions.'
        },
        aggressive: {
          action: 'buy',
          entry: 'Enter when RSI crosses above 30 (oversold) and MACD line crosses above signal line. Use stop-loss at 5% below entry.',
          exit: 'Exit when RSI reaches 70 (overbought) or MACD line crosses below signal line. Take profit at resistance levels.',
          riskManagement: 'Position size: 2-5% of portfolio per trade. Maximum 3 concurrent positions.'
        }
      },
      mean_reversion: {
        conservative: {
          action: 'hold',
          entry: 'Enter when RSI crosses above 30 (oversold) and MACD line crosses above signal line. Use stop-loss at 5% below entry.',
          exit: 'Exit when RSI reaches 70 (overbought) or MACD line crosses below signal line. Take profit at resistance levels.',
          riskManagement: 'Position size: 2-5% of portfolio per trade. Maximum 3 concurrent positions.'
        },
        moderate: {
          action: 'hold',
          entry: 'Enter when RSI crosses above 30 (oversold) and MACD line crosses above signal line. Use stop-loss at 5% below entry.',
          exit: 'Exit when RSI reaches 70 (overbought) or MACD line crosses below signal line. Take profit at resistance levels.',
          riskManagement: 'Position size: 2-5% of portfolio per trade. Maximum 3 concurrent positions.'
        },
        aggressive: {
          action: 'hold',
          entry: 'Enter when RSI crosses above 30 (oversold) and MACD line crosses above signal line. Use stop-loss at 5% below entry.',
          exit: 'Exit when RSI reaches 70 (overbought) or MACD line crosses below signal line. Take profit at resistance levels.',
          riskManagement: 'Position size: 2-5% of portfolio per trade. Maximum 3 concurrent positions.'
        }
      },
      breakout: {
        conservative: {
          action: 'buy',
          entry: 'Enter when RSI crosses above 30 (oversold) and MACD line crosses above signal line. Use stop-loss at 5% below entry.',
          exit: 'Exit when RSI reaches 70 (overbought) or MACD line crosses below signal line. Take profit at resistance levels.',
          riskManagement: 'Position size: 2-5% of portfolio per trade. Maximum 3 concurrent positions.'
        },
        moderate: {
          action: 'buy',
          entry: 'Enter when RSI crosses above 30 (oversold) and MACD line crosses above signal line. Use stop-loss at 5% below entry.',
          exit: 'Exit when RSI reaches 70 (overbought) or MACD line crosses below signal line. Take profit at resistance levels.',
          riskManagement: 'Position size: 2-5% of portfolio per trade. Maximum 3 concurrent positions.'
        },
        aggressive: {
          action: 'buy',
          entry: 'Enter when RSI crosses above 30 (oversold) and MACD line crosses above signal line. Use stop-loss at 5% below entry.',
          exit: 'Exit when RSI reaches 70 (overbought) or MACD line crosses below signal line. Take profit at resistance levels.',
          riskManagement: 'Position size: 2-5% of portfolio per trade. Maximum 3 concurrent positions.'
        }
      },
      ai_ml: {
        conservative: {
          action: 'buy',
          entry: 'Enter when RSI crosses above 30 (oversold) and MACD line crosses above signal line. Use stop-loss at 5% below entry.',
          exit: 'Exit when RSI reaches 70 (overbought) or MACD line crosses below signal line. Take profit at resistance levels.',
          riskManagement: 'Position size: 2-5% of portfolio per trade. Maximum 3 concurrent positions.'
        },
        moderate: {
          action: 'buy',
          entry: 'Enter when RSI crosses above 30 (oversold) and MACD line crosses above signal line. Use stop-loss at 5% below entry.',
          exit: 'Exit when RSI reaches 70 (overbought) or MACD line crosses below signal line. Take profit at resistance levels.',
          riskManagement: 'Position size: 2-5% of portfolio per trade. Maximum 3 concurrent positions.'
        },
        aggressive: {
          action: 'buy',
          entry: 'Enter when RSI crosses above 30 (oversold) and MACD line crosses above signal line. Use stop-loss at 5% below entry.',
          exit: 'Exit when RSI reaches 70 (overbought) or MACD line crosses below signal line. Take profit at resistance levels.',
          riskManagement: 'Position size: 2-5% of portfolio per trade. Maximum 3 concurrent positions.'
        }
      }
    }

    // Get strategy recommendations with fallback
    const strategyRecs = strategyRecommendations[strategyType as keyof typeof strategyRecommendations] || strategyRecommendations.momentum
    const riskRecs = strategyRecs[riskLevel as keyof typeof strategyRecs] || strategyRecs.moderate

    return {
      action: riskRecs.action,
      confidence: confidence,
      reasoning: `Based on ${riskLevel} risk tolerance and ${strategyType} strategy, the recommended action is ${riskRecs.action}.`,
      timeHorizon: 'medium term', // Default time horizon
      priceTarget: marketData?.currentPrice ? marketData.currentPrice * (1 + (Math.random() - 0.5) * 0.1) : undefined
    }
  }
}
