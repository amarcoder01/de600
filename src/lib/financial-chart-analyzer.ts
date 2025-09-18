export interface AdvancedChartAnalysis {
  chartIdentification: ChartIdentification
  technicalAnalysis: TechnicalAnalysis
  patternRecognition: PatternRecognition
  marketSentiment: MarketSentiment
  tradingSignals: TradingSignal[]
  riskAnalysis: RiskAnalysis
  priceTargets: PriceTarget[]
  recommendations: TradingRecommendation[]
}

export interface ChartIdentification {
  chartType: 'candlestick' | 'line' | 'bar' | 'area' | 'volume' | 'unknown'
  timeframe: string
  asset: string
  exchange?: string
  period: 'intraday' | 'daily' | 'weekly' | 'monthly' | 'unknown'
  confidence: number
}

export interface TechnicalAnalysis {
  trend: {
    primary: 'bullish' | 'bearish' | 'sideways'
    secondary: 'bullish' | 'bearish' | 'sideways'
    strength: number // 1-10
  }
  supportLevels: number[]
  resistanceLevels: number[]
  indicators: {
    rsi?: { value: number; signal: 'overbought' | 'oversold' | 'neutral' }
    macd?: { signal: 'bullish' | 'bearish' | 'neutral'; divergence?: boolean }
    movingAverages?: Array<{ period: number; position: 'above' | 'below' | 'at' }>
    bollingerBands?: { position: 'upper' | 'lower' | 'middle'; squeeze?: boolean }
    volume?: { trend: 'increasing' | 'decreasing' | 'normal'; anomalies: boolean }
  }
}

export interface PatternRecognition {
  patterns: ChartPattern[]
  formations: ChartFormation[]
  candlestickPatterns?: CandlestickPattern[]
}

export interface ChartPattern {
  name: string
  type: 'continuation' | 'reversal' | 'consolidation'
  confidence: number
  target?: number
  timeframe: string
  description: string
}

export interface ChartFormation {
  name: string
  breakoutDirection: 'upward' | 'downward' | 'pending'
  target: number
  probability: number
  description: string
}

export interface CandlestickPattern {
  name: string
  signal: 'bullish' | 'bearish' | 'neutral'
  reliability: number
  timeframe: 'single' | 'multiple'
  description: string
}

export interface MarketSentiment {
  overall: 'bullish' | 'bearish' | 'neutral'
  strength: number // 1-10
  indicators: {
    momentum: 'strong' | 'weak' | 'neutral'
    volume: 'high' | 'normal' | 'low'
    volatility: 'high' | 'normal' | 'low'
  }
  fearGreedIndex?: number
}

export interface TradingSignal {
  type: 'buy' | 'sell' | 'hold'
  strength: number // 1-10
  entry: number
  stopLoss: number
  targets: number[]
  timeframe: string
  reasoning: string
  confidence: number
}

export interface RiskAnalysis {
  level: 'low' | 'medium' | 'high'
  volatility: number
  factors: string[]
  maxDrawdown?: number
  sharpeRatio?: number
  riskRewardRatio?: number
  recommendations: string[]
}

export interface PriceTarget {
  target: number
  timeframe: string
  probability: number
  rationale: string
  type: 'conservative' | 'moderate' | 'aggressive'
}

export interface TradingRecommendation {
  action: 'buy' | 'sell' | 'hold' | 'avoid'
  reasoning: string
  positionSize: 'small' | 'medium' | 'large'
  priority: 'high' | 'medium' | 'low'
  timeHorizon: 'short' | 'medium' | 'long'
}

export class FinancialChartAnalyzer {
  static generateFinancialPrompt(userPrompt?: string): string {
    const basePrompt = userPrompt || 'Perform a comprehensive financial chart analysis.'
    
    return `${basePrompt}

As an expert financial chart analyst, please provide a comprehensive analysis of this chart including:

**CHART IDENTIFICATION:**
- Chart type (candlestick, line, bar, etc.)
- Asset name and symbol
- Timeframe and period
- Exchange if visible

**TECHNICAL ANALYSIS:**
- Primary and secondary trends
- Key support and resistance levels
- Technical indicators visible (RSI, MACD, Moving Averages, etc.)
- Volume analysis
- Price action patterns

**PATTERN RECOGNITION:**
- Chart patterns (triangles, head & shoulders, channels, etc.)
- Candlestick patterns if applicable
- Formation breakouts or pending breakouts
- Pattern targets and probabilities

**MARKET SENTIMENT:**
- Overall sentiment (bullish/bearish/neutral)
- Momentum indicators
- Volume characteristics
- Volatility assessment

**TRADING SIGNALS:**
- Entry and exit points
- Stop-loss levels
- Price targets with rationale
- Risk-reward analysis
- Position sizing recommendations

**RISK ASSESSMENT:**
- Risk level (low/medium/high)
- Key risk factors
- Volatility analysis
- Maximum drawdown potential

**PRICE TARGETS:**
- Short-term targets (1-30 days)
- Medium-term targets (1-6 months)
- Long-term targets (6+ months)
- Probability assessments

**RECOMMENDATIONS:**
- Specific trading recommendations
- Position sizing guidance
- Time horizon considerations
- Alternative scenarios

Please provide specific numbers where possible and explain your reasoning for each analysis point. Focus on actionable insights that traders and investors can use.`
  }

  static parseChartAnalysisResponse(analysisText: string): AdvancedChartAnalysis {
    try {
      return {
        chartIdentification: this.parseChartIdentification(analysisText),
        technicalAnalysis: this.parseTechnicalAnalysis(analysisText),
        patternRecognition: this.parsePatternRecognition(analysisText),
        marketSentiment: this.parseMarketSentiment(analysisText),
        tradingSignals: this.parseTradingSignals(analysisText),
        riskAnalysis: this.parseRiskAnalysis(analysisText),
        priceTargets: this.parsePriceTargets(analysisText),
        recommendations: this.parseRecommendations(analysisText)
      }
    } catch (error) {
      console.error('Error parsing chart analysis:', error)
      throw new Error('Failed to parse chart analysis response')
    }
  }

  private static parseChartIdentification(text: string): ChartIdentification {
    const lowerText = text.toLowerCase()
    
    // Determine chart type
    let chartType: ChartIdentification['chartType'] = 'unknown'
    if (lowerText.includes('candlestick')) chartType = 'candlestick'
    else if (lowerText.includes('line chart')) chartType = 'line'
    else if (lowerText.includes('bar chart')) chartType = 'bar'
    else if (lowerText.includes('area chart')) chartType = 'area'
    else if (lowerText.includes('volume')) chartType = 'volume'
    
    // Extract asset name
    const assetMatch = text.match(/(?:asset|symbol|stock)[:\s]*([A-Z]{1,5})/i)
    const asset = assetMatch ? assetMatch[1] : 'Unknown'
    
    // Extract timeframe
    const timeframeMatch = text.match(/(?:timeframe|period)[:\s]*([^.\n]+)/i)
    const timeframe = timeframeMatch ? timeframeMatch[1].trim() : 'Unknown'
    
    // Determine period
    let period: ChartIdentification['period'] = 'unknown'
    if (lowerText.includes('intraday') || lowerText.includes('minute') || lowerText.includes('hour')) {
      period = 'intraday'
    } else if (lowerText.includes('daily')) {
      period = 'daily'
    } else if (lowerText.includes('weekly')) {
      period = 'weekly'
    } else if (lowerText.includes('monthly')) {
      period = 'monthly'
    }
    
    return {
      chartType,
      timeframe,
      asset,
      period,
      confidence: 7 // Default confidence
    }
  }

  private static parseTechnicalAnalysis(text: string): TechnicalAnalysis {
    const lowerText = text.toLowerCase()
    
    // Parse trend
    let primaryTrend: 'bullish' | 'bearish' | 'sideways' = 'sideways'
    if (lowerText.includes('bullish') || lowerText.includes('uptrend')) {
      primaryTrend = 'bullish'
    } else if (lowerText.includes('bearish') || lowerText.includes('downtrend')) {
      primaryTrend = 'bearish'
    }
    
    // Extract support and resistance levels
    const supportLevels = this.extractPriceLevels(text, 'support')
    const resistanceLevels = this.extractPriceLevels(text, 'resistance')
    
    // Parse indicators
    const indicators: TechnicalAnalysis['indicators'] = {}
    
    // RSI
    const rsiMatch = text.match(/rsi[:\s]*(\d+)/i)
    if (rsiMatch) {
      const rsiValue = parseInt(rsiMatch[1])
      indicators.rsi = {
        value: rsiValue,
        signal: rsiValue > 70 ? 'overbought' : rsiValue < 30 ? 'oversold' : 'neutral'
      }
    }
    
    // MACD
    if (lowerText.includes('macd')) {
      let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral'
      if (lowerText.includes('bullish divergence') || lowerText.includes('macd bullish')) {
        signal = 'bullish'
      } else if (lowerText.includes('bearish divergence') || lowerText.includes('macd bearish')) {
        signal = 'bearish'
      }
      indicators.macd = { signal }
    }
    
    return {
      trend: {
        primary: primaryTrend,
        secondary: primaryTrend, // Simplified
        strength: 6 // Default
      },
      supportLevels,
      resistanceLevels,
      indicators
    }
  }

  private static parsePatternRecognition(text: string): PatternRecognition {
    const patterns: ChartPattern[] = []
    const formations: ChartFormation[] = []
    
    // Common patterns to look for
    const patternKeywords = [
      'head and shoulders',
      'triangle',
      'channel',
      'flag',
      'pennant',
      'wedge',
      'cup and handle',
      'double top',
      'double bottom',
      'ascending triangle',
      'descending triangle'
    ]
    
    const lowerText = text.toLowerCase()
    for (const pattern of patternKeywords) {
      if (lowerText.includes(pattern)) {
        patterns.push({
          name: pattern,
          type: this.getPatternType(pattern),
          confidence: 7,
          timeframe: 'medium-term',
          description: `${pattern} pattern identified in the chart`
        })
      }
    }
    
    return { patterns, formations }
  }

  private static parseMarketSentiment(text: string): MarketSentiment {
    const lowerText = text.toLowerCase()
    
    let overall: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (lowerText.includes('bullish sentiment') || lowerText.includes('positive sentiment')) {
      overall = 'bullish'
    } else if (lowerText.includes('bearish sentiment') || lowerText.includes('negative sentiment')) {
      overall = 'bearish'
    }
    
    return {
      overall,
      strength: 6, // Default
      indicators: {
        momentum: 'neutral',
        volume: 'normal',
        volatility: 'normal'
      }
    }
  }

  private static parseTradingSignals(text: string): TradingSignal[] {
    const signals: TradingSignal[] = []
    
    // Look for entry points
    const entryMatches = text.match(/entry[:\s]*\$?(\d+(?:\.\d+)?)/gi)
    const stopLossMatches = text.match(/stop[:\s]*loss[:\s]*\$?(\d+(?:\.\d+)?)/gi)
    const targetMatches = text.match(/target[:\s]*\$?(\d+(?:\.\d+)?)/gi)
    
    if (entryMatches && entryMatches.length > 0) {
      const entry = parseFloat(entryMatches[0].replace(/[^\d.]/g, ''))
      const stopLoss = stopLossMatches ? parseFloat(stopLossMatches[0].replace(/[^\d.]/g, '')) : entry * 0.95
      const target = targetMatches ? parseFloat(targetMatches[0].replace(/[^\d.]/g, '')) : entry * 1.1
      
      signals.push({
        type: 'buy', // Simplified
        strength: 7,
        entry,
        stopLoss,
        targets: [target],
        timeframe: 'short-term',
        reasoning: 'Technical analysis indicates potential upward movement',
        confidence: 7
      })
    }
    
    return signals
  }

  private static parseRiskAnalysis(text: string): RiskAnalysis {
    const lowerText = text.toLowerCase()
    
    let level: 'low' | 'medium' | 'high' = 'medium'
    if (lowerText.includes('high risk') || lowerText.includes('volatile')) {
      level = 'high'
    } else if (lowerText.includes('low risk') || lowerText.includes('stable')) {
      level = 'low'
    }
    
    const factors: string[] = []
    if (lowerText.includes('volatility')) factors.push('High volatility')
    if (lowerText.includes('volume')) factors.push('Volume concerns')
    if (lowerText.includes('technical')) factors.push('Technical indicators')
    
    return {
      level,
      volatility: 6, // Default
      factors,
      recommendations: ['Use appropriate position sizing', 'Set stop-loss orders', 'Monitor market conditions']
    }
  }

  private static parsePriceTargets(text: string): PriceTarget[] {
    const targets: PriceTarget[] = []
    
    // Extract price targets
    const targetMatches = text.match(/target[:\s]*\$?(\d+(?:\.\d+)?)/gi)
    
    if (targetMatches) {
      targetMatches.forEach((match, index) => {
        const target = parseFloat(match.replace(/[^\d.]/g, ''))
        targets.push({
          target,
          timeframe: index === 0 ? 'short-term' : index === 1 ? 'medium-term' : 'long-term',
          probability: 70 - (index * 10), // Decreasing probability for higher targets
          rationale: `Technical analysis suggests price target of $${target}`,
          type: index === 0 ? 'conservative' : index === 1 ? 'moderate' : 'aggressive'
        })
      })
    }
    
    return targets
  }

  private static parseRecommendations(text: string): TradingRecommendation[] {
    const recommendations: TradingRecommendation[] = []
    const lowerText = text.toLowerCase()
    
    // Determine action
    let action: 'buy' | 'sell' | 'hold' | 'avoid' = 'hold'
    if (lowerText.includes('buy') || lowerText.includes('long')) {
      action = 'buy'
    } else if (lowerText.includes('sell') || lowerText.includes('short')) {
      action = 'sell'
    } else if (lowerText.includes('avoid')) {
      action = 'avoid'
    }
    
    recommendations.push({
      action,
      reasoning: 'Based on technical analysis and market conditions',
      positionSize: 'medium',
      priority: 'medium',
      timeHorizon: 'medium'
    })
    
    return recommendations
  }

  private static extractPriceLevels(text: string, type: 'support' | 'resistance'): number[] {
    const levels: number[] = []
    const pattern = new RegExp(`${type}[:\\s]*\\$?(\\d+(?:\\.\\d+)?)`, 'gi')
    
    let match
    while ((match = pattern.exec(text)) !== null) {
      levels.push(parseFloat(match[1]))
    }
    
    return levels
  }

  private static getPatternType(pattern: string): 'continuation' | 'reversal' | 'consolidation' {
    const reversalPatterns = ['head and shoulders', 'double top', 'double bottom']
    const continuationPatterns = ['flag', 'pennant', 'triangle']
    
    if (reversalPatterns.some(p => pattern.includes(p))) {
      return 'reversal'
    } else if (continuationPatterns.some(p => pattern.includes(p))) {
      return 'continuation'
    } else {
      return 'consolidation'
    }
  }
}
