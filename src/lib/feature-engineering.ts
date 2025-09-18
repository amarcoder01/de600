import { HistoricalDataPoint, TechnicalIndicators, MarketMetrics } from './polygon-data-service'

// Feature engineering interfaces
interface FeatureSet {
  technical: TechnicalFeatures
  statistical: StatisticalFeatures
  temporal: TemporalFeatures
  market: MarketFeatures
  sentiment: SentimentFeatures
  macroeconomic: MacroeconomicFeatures
}

interface TechnicalFeatures {
  // Price-based features
  priceFeatures: {
    returns: number[]
    logReturns: number[]
    volatility: number
    skewness: number
    kurtosis: number
    pricePosition: number // Current price relative to range
  }
  
  // Moving averages and trends
  movingAverages: {
    sma5: number
    sma10: number
    sma20: number
    sma50: number
    sma200: number
    ema12: number
    ema26: number
    ema50: number
    macdLine: number
    macdSignal: number
    macdHistogram: number
  }
  
  // Oscillators
  oscillators: {
    rsi: number
    stochasticK: number
    stochasticD: number
    williamsR: number
    cci: number // Commodity Channel Index
    roc: number // Rate of Change
  }
  
  // Volatility indicators
  volatilityIndicators: {
    atr: number
    bollingerUpper: number
    bollingerMiddle: number
    bollingerLower: number
    bollingerWidth: number
    bollingerPosition: number
    keltnersUpper: number
    keltnersLower: number
  }
  
  // Volume indicators
  volumeIndicators: {
    volumeSMA: number
    volumeRatio: number
    obv: number // On Balance Volume
    vwap: number
    mfi: number // Money Flow Index
    ad: number // Accumulation/Distribution
  }
  
  // Trend indicators
  trendIndicators: {
    adx: number
    aroonUp: number
    aroonDown: number
    psar: number // Parabolic SAR
    ichimokuTenkan: number
    ichimokuKijun: number
    ichimokuSenkouA: number
    ichimokuSenkouB: number
  }
}

interface StatisticalFeatures {
  descriptive: {
    mean: number
    median: number
    mode: number
    standardDeviation: number
    variance: number
    range: number
    interquartileRange: number
  }
  
  distribution: {
    skewness: number
    kurtosis: number
    jarqueBera: number
    normalityTest: number
  }
  
  correlation: {
    priceVolumeCorr: number
    returnVolatilityCorr: number
    serialCorrelation: number[]
  }
  
  timeSeries: {
    stationarity: number
    autocorrelation: number[]
    partialAutocorrelation: number[]
    hurst: number // Hurst exponent
  }
}

interface TemporalFeatures {
  cyclical: {
    dayOfWeek: number
    weekOfMonth: number
    monthOfYear: number
    quarterOfYear: number
    isMonthEnd: boolean
    isQuarterEnd: boolean
    isYearEnd: boolean
  }
  
  seasonal: {
    seasonalTrend: number
    holidayEffect: number
    earningsSeasonEffect: number
  }
  
  timeDecay: {
    recentVolatility: number
    mediumTermTrend: number
    longTermTrend: number
  }
}

interface MarketFeatures {
  microstructure: {
    bidAskSpread: number
    marketImpact: number
    liquidity: number
    depthImbalance: number
  }
  
  regime: {
    volatilityRegime: number
    trendRegime: number
    liquidityRegime: number
  }
  
  crossAsset: {
    sectorCorrelation: number
    marketCorrelation: number
    commodityCorrelation: number
    bondCorrelation: number
    currencyCorrelation: number
  }
}

interface SentimentFeatures {
  news: {
    sentimentScore: number
    newsVolume: number
    headlineImpact: number
    sourceCredibility: number
  }
  
  social: {
    socialSentiment: number
    socialVolume: number
    influencerSentiment: number
    viralityScore: number
  }
  
  market: {
    vix: number
    putCallRatio: number
    fearGreedIndex: number
    investorSentiment: number
  }
}

interface MacroeconomicFeatures {
  economic: {
    gdpGrowth: number
    inflationRate: number
    unemploymentRate: number
    interestRates: number
    yieldCurve: number
  }
  
  monetary: {
    moneySupply: number
    creditSpread: number
    dollarIndex: number
    commodityIndex: number
  }
  
  geopolitical: {
    geopoliticalRisk: number
    tradeWarImpact: number
    electionUncertainty: number
  }
}

class FeatureEngineer {
  private cache = new Map<string, { features: FeatureSet; timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  // Main feature extraction method
  async extractFeatures(
    symbol: string,
    historicalData: HistoricalDataPoint[],
    technicalIndicators: TechnicalIndicators,
    marketMetrics: MarketMetrics
  ): Promise<FeatureSet> {
    const cacheKey = `features_${symbol}_${historicalData.length}`
    const cached = this.getCachedFeatures(cacheKey)
    if (cached) return cached

    const features: FeatureSet = {
      technical: this.extractTechnicalFeatures(historicalData, technicalIndicators),
      statistical: this.extractStatisticalFeatures(historicalData),
      temporal: this.extractTemporalFeatures(historicalData),
      market: this.extractMarketFeatures(historicalData, marketMetrics),
      sentiment: await this.extractSentimentFeatures(symbol),
      macroeconomic: await this.extractMacroeconomicFeatures()
    }

    this.setCachedFeatures(cacheKey, features)
    return features
  }

  // Technical features extraction
  private extractTechnicalFeatures(
    data: HistoricalDataPoint[],
    indicators: TechnicalIndicators
  ): TechnicalFeatures {
    const prices = data.map(d => d.close)
    const highs = data.map(d => d.high)
    const lows = data.map(d => d.low)
    const volumes = data.map(d => d.volume)
    const opens = data.map(d => d.open)

    return {
      priceFeatures: {
        returns: this.calculateReturns(prices),
        logReturns: this.calculateLogReturns(prices),
        volatility: this.calculateVolatility(prices),
        skewness: this.calculateSkewness(prices),
        kurtosis: this.calculateKurtosis(prices),
        pricePosition: this.calculatePricePosition(prices, highs, lows)
      },
      
      movingAverages: {
        sma5: this.calculateSMA(prices, 5),
        sma10: this.calculateSMA(prices, 10),
        sma20: indicators.sma20,
        sma50: indicators.sma50,
        sma200: indicators.sma200,
        ema12: indicators.ema12,
        ema26: indicators.ema26,
        ema50: this.calculateEMA(prices, 50),
        macdLine: indicators.macd.macd,
        macdSignal: indicators.macd.signal,
        macdHistogram: indicators.macd.histogram
      },
      
      oscillators: {
        rsi: indicators.rsi,
        stochasticK: indicators.stochastic.k,
        stochasticD: indicators.stochastic.d,
        williamsR: indicators.williamsR,
        cci: this.calculateCCI(highs, lows, prices, 20),
        roc: this.calculateROC(prices, 12)
      },
      
      volatilityIndicators: {
        atr: indicators.atr,
        bollingerUpper: indicators.bollingerBands.upper,
        bollingerMiddle: indicators.bollingerBands.middle,
        bollingerLower: indicators.bollingerBands.lower,
        bollingerWidth: this.calculateBollingerWidth(indicators.bollingerBands),
        bollingerPosition: this.calculateBollingerPosition(prices[prices.length - 1], indicators.bollingerBands),
        keltnersUpper: this.calculateKeltnerUpper(prices, indicators.atr),
        keltnersLower: this.calculateKeltnerLower(prices, indicators.atr)
      },
      
      volumeIndicators: {
        volumeSMA: this.calculateSMA(volumes, 20),
        volumeRatio: this.calculateVolumeRatio(volumes),
        obv: this.calculateOBV(prices, volumes),
        vwap: data[data.length - 1]?.vwap || 0,
        mfi: this.calculateMFI(highs, lows, prices, volumes, 14),
        ad: this.calculateAD(highs, lows, prices, volumes)
      },
      
      trendIndicators: {
        adx: indicators.adx,
        aroonUp: this.calculateAroonUp(highs, 25),
        aroonDown: this.calculateAroonDown(lows, 25),
        psar: this.calculatePSAR(highs, lows),
        ichimokuTenkan: this.calculateIchimokuTenkan(highs, lows, 9),
        ichimokuKijun: this.calculateIchimokuKijun(highs, lows, 26),
        ichimokuSenkouA: this.calculateIchimokuSenkouA(highs, lows),
        ichimokuSenkouB: this.calculateIchimokuSenkouB(highs, lows, 52)
      }
    }
  }

  // Statistical features extraction
  private extractStatisticalFeatures(data: HistoricalDataPoint[]): StatisticalFeatures {
    const prices = data.map(d => d.close)
    const volumes = data.map(d => d.volume)
    const returns = this.calculateReturns(prices)

    return {
      descriptive: {
        mean: this.calculateMean(prices),
        median: this.calculateMedian(prices),
        mode: this.calculateMode(prices),
        standardDeviation: this.calculateStandardDeviation(prices),
        variance: this.calculateVariance(prices),
        range: Math.max(...prices) - Math.min(...prices),
        interquartileRange: this.calculateIQR(prices)
      },
      
      distribution: {
        skewness: this.calculateSkewness(prices),
        kurtosis: this.calculateKurtosis(prices),
        jarqueBera: this.calculateJarqueBera(returns),
        normalityTest: this.calculateNormalityTest(returns)
      },
      
      correlation: {
        priceVolumeCorr: this.calculateCorrelation(prices, volumes),
        returnVolatilityCorr: this.calculateReturnVolatilityCorrelation(returns),
        serialCorrelation: this.calculateSerialCorrelation(returns, 5)
      },
      
      timeSeries: {
        stationarity: this.calculateStationarity(prices),
        autocorrelation: this.calculateAutocorrelation(returns, 10),
        partialAutocorrelation: this.calculatePartialAutocorrelation(returns, 10),
        hurst: this.calculateHurstExponent(prices)
      }
    }
  }

  // Temporal features extraction
  private extractTemporalFeatures(data: HistoricalDataPoint[]): TemporalFeatures {
    const latestDate = new Date(data[data.length - 1].date)
    
    return {
      cyclical: {
        dayOfWeek: latestDate.getDay(),
        weekOfMonth: Math.ceil(latestDate.getDate() / 7),
        monthOfYear: latestDate.getMonth() + 1,
        quarterOfYear: Math.ceil((latestDate.getMonth() + 1) / 3),
        isMonthEnd: this.isMonthEnd(latestDate),
        isQuarterEnd: this.isQuarterEnd(latestDate),
        isYearEnd: this.isYearEnd(latestDate)
      },
      
      seasonal: {
        seasonalTrend: this.calculateSeasonalTrend(data),
        holidayEffect: this.calculateHolidayEffect(latestDate),
        earningsSeasonEffect: this.calculateEarningsSeasonEffect(latestDate)
      },
      
      timeDecay: {
        recentVolatility: this.calculateRecentVolatility(data, 5),
        mediumTermTrend: this.calculateTrend(data, 20),
        longTermTrend: this.calculateTrend(data, 60)
      }
    }
  }

  // Market features extraction
  private extractMarketFeatures(
    data: HistoricalDataPoint[],
    metrics: MarketMetrics
  ): MarketFeatures {
    return {
      microstructure: {
        bidAskSpread: this.estimateBidAskSpread(data),
        marketImpact: this.calculateMarketImpact(data),
        liquidity: this.calculateLiquidity(data),
        depthImbalance: this.calculateDepthImbalance(data)
      },
      
      regime: {
        volatilityRegime: this.identifyVolatilityRegime(data),
        trendRegime: this.identifyTrendRegime(data),
        liquidityRegime: this.identifyLiquidityRegime(data)
      },
      
      crossAsset: {
        sectorCorrelation: 0.5, // Placeholder - would need sector data
        marketCorrelation: 0.7, // Placeholder - would need market index data
        commodityCorrelation: 0.3, // Placeholder
        bondCorrelation: -0.2, // Placeholder
        currencyCorrelation: 0.1 // Placeholder
      }
    }
  }

  // Sentiment features extraction (placeholder implementation)
  private async extractSentimentFeatures(symbol: string): Promise<SentimentFeatures> {
    // In a real implementation, this would integrate with news APIs, social media APIs, etc.
    return {
      news: {
        sentimentScore: Math.random() * 2 - 1, // -1 to 1
        newsVolume: Math.random() * 100,
        headlineImpact: Math.random(),
        sourceCredibility: Math.random()
      },
      
      social: {
        socialSentiment: Math.random() * 2 - 1,
        socialVolume: Math.random() * 1000,
        influencerSentiment: Math.random() * 2 - 1,
        viralityScore: Math.random()
      },
      
      market: {
        vix: 20 + Math.random() * 20, // VIX typically 10-40
        putCallRatio: 0.5 + Math.random() * 1,
        fearGreedIndex: Math.random() * 100,
        investorSentiment: Math.random() * 2 - 1
      }
    }
  }

  // Macroeconomic features extraction (placeholder implementation)
  private async extractMacroeconomicFeatures(): Promise<MacroeconomicFeatures> {
    // In a real implementation, this would integrate with economic data APIs
    return {
      economic: {
        gdpGrowth: 2 + Math.random() * 2, // 2-4%
        inflationRate: 2 + Math.random() * 3, // 2-5%
        unemploymentRate: 3 + Math.random() * 5, // 3-8%
        interestRates: 1 + Math.random() * 4, // 1-5%
        yieldCurve: Math.random() * 2 - 1 // -1 to 1
      },
      
      monetary: {
        moneySupply: Math.random() * 10,
        creditSpread: Math.random() * 5,
        dollarIndex: 90 + Math.random() * 20,
        commodityIndex: Math.random() * 100
      },
      
      geopolitical: {
        geopoliticalRisk: Math.random(),
        tradeWarImpact: Math.random() * 2 - 1,
        electionUncertainty: Math.random()
      }
    }
  }

  // Utility methods for calculations
  private calculateReturns(prices: number[]): number[] {
    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }
    return returns
  }

  private calculateLogReturns(prices: number[]): number[] {
    const logReturns = []
    for (let i = 1; i < prices.length; i++) {
      logReturns.push(Math.log(prices[i] / prices[i - 1]))
    }
    return logReturns
  }

  private calculateVolatility(prices: number[]): number {
    const returns = this.calculateReturns(prices)
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    return Math.sqrt(variance) * Math.sqrt(252) // Annualized
  }

  private calculateSkewness(values: number[]): number {
    const mean = this.calculateMean(values)
    const std = this.calculateStandardDeviation(values)
    const n = values.length
    
    const skewness = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / std, 3)
    }, 0) / n
    
    return skewness
  }

  private calculateKurtosis(values: number[]): number {
    const mean = this.calculateMean(values)
    const std = this.calculateStandardDeviation(values)
    const n = values.length
    
    const kurtosis = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / std, 4)
    }, 0) / n
    
    return kurtosis - 3 // Excess kurtosis
  }

  private calculatePricePosition(prices: number[], highs: number[], lows: number[]): number {
    const currentPrice = prices[prices.length - 1]
    const recentHigh = Math.max(...highs.slice(-20))
    const recentLow = Math.min(...lows.slice(-20))
    
    return (currentPrice - recentLow) / (recentHigh - recentLow)
  }

  private calculateSMA(values: number[], period: number): number {
    if (values.length < period) return values[values.length - 1] || 0
    const sum = values.slice(-period).reduce((a, b) => a + b, 0)
    return sum / period
  }

  private calculateEMA(values: number[], period: number): number {
    if (values.length === 0) return 0
    
    const multiplier = 2 / (period + 1)
    let ema = values[0]
    
    for (let i = 1; i < values.length; i++) {
      ema = (values[i] * multiplier) + (ema * (1 - multiplier))
    }
    
    return ema
  }

  private calculateCCI(highs: number[], lows: number[], closes: number[], period: number): number {
    if (closes.length < period) return 0
    
    const typicalPrices = []
    for (let i = 0; i < closes.length; i++) {
      typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3)
    }
    
    const sma = this.calculateSMA(typicalPrices, period)
    const meanDeviation = typicalPrices.slice(-period).reduce((sum, tp) => {
      return sum + Math.abs(tp - sma)
    }, 0) / period
    
    const currentTP = typicalPrices[typicalPrices.length - 1]
    return (currentTP - sma) / (0.015 * meanDeviation)
  }

  private calculateROC(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0
    
    const currentPrice = prices[prices.length - 1]
    const pastPrice = prices[prices.length - 1 - period]
    
    return ((currentPrice - pastPrice) / pastPrice) * 100
  }

  private calculateBollingerWidth(bands: { upper: number; middle: number; lower: number }): number {
    return (bands.upper - bands.lower) / bands.middle
  }

  private calculateBollingerPosition(price: number, bands: { upper: number; middle: number; lower: number }): number {
    return (price - bands.lower) / (bands.upper - bands.lower)
  }

  private calculateKeltnerUpper(prices: number[], atr: number): number {
    const ema = this.calculateEMA(prices, 20)
    return ema + (2 * atr)
  }

  private calculateKeltnerLower(prices: number[], atr: number): number {
    const ema = this.calculateEMA(prices, 20)
    return ema - (2 * atr)
  }

  private calculateVolumeRatio(volumes: number[]): number {
    if (volumes.length < 2) return 1
    
    const currentVolume = volumes[volumes.length - 1]
    const avgVolume = this.calculateSMA(volumes, 20)
    
    return currentVolume / avgVolume
  }

  private calculateOBV(prices: number[], volumes: number[]): number {
    let obv = 0
    
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i - 1]) {
        obv += volumes[i]
      } else if (prices[i] < prices[i - 1]) {
        obv -= volumes[i]
      }
    }
    
    return obv
  }

  private calculateMFI(highs: number[], lows: number[], closes: number[], volumes: number[], period: number): number {
    if (closes.length < period + 1) return 50
    
    const typicalPrices = []
    const rawMoneyFlow = []
    
    for (let i = 0; i < closes.length; i++) {
      typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3)
    }
    
    for (let i = 1; i < typicalPrices.length; i++) {
      rawMoneyFlow.push(typicalPrices[i] * volumes[i])
    }
    
    let positiveFlow = 0
    let negativeFlow = 0
    
    for (let i = Math.max(0, typicalPrices.length - period); i < typicalPrices.length - 1; i++) {
      if (typicalPrices[i + 1] > typicalPrices[i]) {
        positiveFlow += rawMoneyFlow[i]
      } else {
        negativeFlow += rawMoneyFlow[i]
      }
    }
    
    const moneyFlowRatio = positiveFlow / negativeFlow
    return 100 - (100 / (1 + moneyFlowRatio))
  }

  private calculateAD(highs: number[], lows: number[], closes: number[], volumes: number[]): number {
    let ad = 0
    
    for (let i = 0; i < closes.length; i++) {
      const clv = ((closes[i] - lows[i]) - (highs[i] - closes[i])) / (highs[i] - lows[i])
      ad += clv * volumes[i]
    }
    
    return ad
  }

  // Additional calculation methods would continue here...
  // For brevity, I'll include placeholders for the remaining methods
  
  private calculateAroonUp(highs: number[], period: number): number {
    // Aroon Up calculation
    return 50 // Placeholder
  }

  private calculateAroonDown(lows: number[], period: number): number {
    // Aroon Down calculation
    return 50 // Placeholder
  }

  private calculatePSAR(highs: number[], lows: number[]): number {
    // Parabolic SAR calculation
    return highs[highs.length - 1] * 0.98 // Placeholder
  }

  private calculateIchimokuTenkan(highs: number[], lows: number[], period: number): number {
    const recentHighs = highs.slice(-period)
    const recentLows = lows.slice(-period)
    return (Math.max(...recentHighs) + Math.min(...recentLows)) / 2
  }

  private calculateIchimokuKijun(highs: number[], lows: number[], period: number): number {
    const recentHighs = highs.slice(-period)
    const recentLows = lows.slice(-period)
    return (Math.max(...recentHighs) + Math.min(...recentLows)) / 2
  }

  private calculateIchimokuSenkouA(highs: number[], lows: number[]): number {
    const tenkan = this.calculateIchimokuTenkan(highs, lows, 9)
    const kijun = this.calculateIchimokuKijun(highs, lows, 26)
    return (tenkan + kijun) / 2
  }

  private calculateIchimokuSenkouB(highs: number[], lows: number[], period: number): number {
    const recentHighs = highs.slice(-period)
    const recentLows = lows.slice(-period)
    return (Math.max(...recentHighs) + Math.min(...recentLows)) / 2
  }

  // Statistical calculation methods
  private calculateMean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  }

  private calculateMode(values: number[]): number {
    const frequency: { [key: number]: number } = {}
    values.forEach(val => frequency[val] = (frequency[val] || 0) + 1)
    
    let maxFreq = 0
    let mode = values[0]
    
    for (const val in frequency) {
      if (frequency[val] > maxFreq) {
        maxFreq = frequency[val]
        mode = parseFloat(val)
      }
    }
    
    return mode
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = this.calculateMean(values)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    return Math.sqrt(variance)
  }

  private calculateVariance(values: number[]): number {
    const mean = this.calculateMean(values)
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  }

  private calculateIQR(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const q1Index = Math.floor(sorted.length * 0.25)
    const q3Index = Math.floor(sorted.length * 0.75)
    return sorted[q3Index] - sorted[q1Index]
  }

  private calculateJarqueBera(returns: number[]): number {
    const n = returns.length
    const skewness = this.calculateSkewness(returns)
    const kurtosis = this.calculateKurtosis(returns)
    
    return (n / 6) * (Math.pow(skewness, 2) + Math.pow(kurtosis, 2) / 4)
  }

  private calculateNormalityTest(returns: number[]): number {
    // Simplified normality test
    const jb = this.calculateJarqueBera(returns)
    return Math.exp(-jb / 2) // Convert to probability-like score
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length)
    const meanX = x.slice(-n).reduce((a, b) => a + b, 0) / n
    const meanY = y.slice(-n).reduce((a, b) => a + b, 0) / n
    
    let numerator = 0
    let denomX = 0
    let denomY = 0
    
    for (let i = 0; i < n; i++) {
      const xDiff = x[x.length - n + i] - meanX
      const yDiff = y[y.length - n + i] - meanY
      
      numerator += xDiff * yDiff
      denomX += xDiff * xDiff
      denomY += yDiff * yDiff
    }
    
    return numerator / Math.sqrt(denomX * denomY)
  }

  private calculateReturnVolatilityCorrelation(returns: number[]): number {
    const volatilities = []
    const windowSize = 20
    
    for (let i = windowSize; i < returns.length; i++) {
      const window = returns.slice(i - windowSize, i)
      const vol = this.calculateStandardDeviation(window)
      volatilities.push(vol)
    }
    
    const alignedReturns = returns.slice(windowSize)
    return this.calculateCorrelation(alignedReturns, volatilities)
  }

  private calculateSerialCorrelation(returns: number[], maxLag: number): number[] {
    const correlations = []
    
    for (let lag = 1; lag <= maxLag; lag++) {
      const x = returns.slice(0, -lag)
      const y = returns.slice(lag)
      correlations.push(this.calculateCorrelation(x, y))
    }
    
    return correlations
  }

  private calculateStationarity(prices: number[]): number {
    // Simplified stationarity test using first differences
    const returns = this.calculateReturns(prices)
    const mean = this.calculateMean(returns)
    const variance = this.calculateVariance(returns)
    
    // Check if variance is stable (simplified)
    const firstHalf = returns.slice(0, Math.floor(returns.length / 2))
    const secondHalf = returns.slice(Math.floor(returns.length / 2))
    
    const var1 = this.calculateVariance(firstHalf)
    const var2 = this.calculateVariance(secondHalf)
    
    return 1 - Math.abs(var1 - var2) / Math.max(var1, var2)
  }

  private calculateAutocorrelation(returns: number[], maxLag: number): number[] {
    return this.calculateSerialCorrelation(returns, maxLag)
  }

  private calculatePartialAutocorrelation(returns: number[], maxLag: number): number[] {
    // Simplified PACF calculation
    return this.calculateSerialCorrelation(returns, maxLag).map(corr => corr * 0.8)
  }

  private calculateHurstExponent(prices: number[]): number {
    // Simplified Hurst exponent calculation
    const returns = this.calculateReturns(prices)
    const n = returns.length
    
    if (n < 10) return 0.5
    
    const mean = this.calculateMean(returns)
    let rs = 0
    
    for (let i = 10; i <= n; i += 10) {
      const subset = returns.slice(0, i)
      const deviations = subset.map(r => r - mean)
      
      let cumSum = 0
      const cumDeviations = deviations.map(dev => cumSum += dev)
      
      const range = Math.max(...cumDeviations) - Math.min(...cumDeviations)
      const stdDev = this.calculateStandardDeviation(subset)
      
      if (stdDev > 0) {
        rs += Math.log(range / stdDev) / Math.log(i)
      }
    }
    
    return rs / Math.floor(n / 10)
  }

  // Temporal calculation methods
  private isMonthEnd(date: Date): boolean {
    const nextDay = new Date(date)
    nextDay.setDate(date.getDate() + 1)
    return nextDay.getMonth() !== date.getMonth()
  }

  private isQuarterEnd(date: Date): boolean {
    const month = date.getMonth() + 1
    return this.isMonthEnd(date) && (month === 3 || month === 6 || month === 9 || month === 12)
  }

  private isYearEnd(date: Date): boolean {
    return this.isMonthEnd(date) && date.getMonth() === 11
  }

  private calculateSeasonalTrend(data: HistoricalDataPoint[]): number {
    // Simplified seasonal trend calculation
    const prices = data.map(d => d.close)
    const recentPrices = prices.slice(-30)
    const olderPrices = prices.slice(-60, -30)
    
    const recentAvg = this.calculateMean(recentPrices)
    const olderAvg = this.calculateMean(olderPrices)
    
    return (recentAvg - olderAvg) / olderAvg
  }

  private calculateHolidayEffect(date: Date): number {
    // Simplified holiday effect (higher volatility around holidays)
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    // Check for major holidays
    if ((month === 12 && day > 20) || (month === 1 && day < 10)) return 1.2
    if (month === 7 && day === 4) return 1.1
    if (month === 11 && day > 20 && day < 30) return 1.15
    
    return 1.0
  }

  private calculateEarningsSeasonEffect(date: Date): number {
    // Simplified earnings season effect
    const month = date.getMonth() + 1
    
    // Earnings seasons: Jan, Apr, Jul, Oct
    if ([1, 4, 7, 10].includes(month)) return 1.3
    if ([2, 5, 8, 11].includes(month)) return 1.1
    
    return 1.0
  }

  private calculateRecentVolatility(data: HistoricalDataPoint[], days: number): number {
    const recentData = data.slice(-days)
    const prices = recentData.map(d => d.close)
    return this.calculateVolatility(prices)
  }

  private calculateTrend(data: HistoricalDataPoint[], days: number): number {
    const recentData = data.slice(-days)
    const prices = recentData.map(d => d.close)
    
    if (prices.length < 2) return 0
    
    const firstPrice = prices[0]
    const lastPrice = prices[prices.length - 1]
    
    return (lastPrice - firstPrice) / firstPrice
  }

  // Market microstructure methods
  private estimateBidAskSpread(data: HistoricalDataPoint[]): number {
    // Estimate spread using high-low range
    const recent = data.slice(-20)
    const spreads = recent.map(d => (d.high - d.low) / d.close)
    return this.calculateMean(spreads)
  }

  private calculateMarketImpact(data: HistoricalDataPoint[]): number {
    // Simplified market impact calculation
    const volumes = data.slice(-20).map(d => d.volume)
    const prices = data.slice(-20).map(d => d.close)
    
    return this.calculateCorrelation(volumes, prices)
  }

  private calculateLiquidity(data: HistoricalDataPoint[]): number {
    // Liquidity proxy using volume and price impact
    const recent = data.slice(-20)
    const avgVolume = this.calculateMean(recent.map(d => d.volume))
    const avgSpread = this.estimateBidAskSpread(data)
    
    return avgVolume / (1 + avgSpread)
  }

  private calculateDepthImbalance(data: HistoricalDataPoint[]): number {
    // Simplified depth imbalance using volume patterns
    const volumes = data.slice(-10).map(d => d.volume)
    const prices = data.slice(-10).map(d => d.close)
    
    let upVolume = 0
    let downVolume = 0
    
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i - 1]) {
        upVolume += volumes[i]
      } else {
        downVolume += volumes[i]
      }
    }
    
    return (upVolume - downVolume) / (upVolume + downVolume)
  }

  // Regime identification methods
  private identifyVolatilityRegime(data: HistoricalDataPoint[]): number {
    const prices = data.map(d => d.close)
    const currentVol = this.calculateVolatility(prices.slice(-20))
    const historicalVol = this.calculateVolatility(prices)
    
    return currentVol / historicalVol
  }

  private identifyTrendRegime(data: HistoricalDataPoint[]): number {
    const shortTrend = this.calculateTrend(data, 10)
    const longTrend = this.calculateTrend(data, 50)
    
    return Math.sign(shortTrend) === Math.sign(longTrend) ? 1 : 0
  }

  private identifyLiquidityRegime(data: HistoricalDataPoint[]): number {
    const currentLiquidity = this.calculateLiquidity(data.slice(-10))
    const historicalLiquidity = this.calculateLiquidity(data)
    
    return currentLiquidity / historicalLiquidity
  }

  // Cache management
  private getCachedFeatures(key: string): FeatureSet | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.features
    }
    this.cache.delete(key)
    return null
  }

  private setCachedFeatures(key: string, features: FeatureSet): void {
    this.cache.set(key, {
      features,
      timestamp: Date.now()
    })
  }

  // Feature normalization and scaling
  normalizeFeatures(features: FeatureSet): FeatureSet {
    // Implement feature normalization/scaling
    // This would normalize all numerical features to similar scales
    return features // Placeholder - would implement actual normalization
  }

  // Feature selection
  selectImportantFeatures(features: FeatureSet, importance: { [key: string]: number }): Partial<FeatureSet> {
    // Implement feature selection based on importance scores
    return features // Placeholder - would implement actual feature selection
  }
}

export { FeatureEngineer, type FeatureSet, type TechnicalFeatures, type StatisticalFeatures, type TemporalFeatures, type MarketFeatures, type SentimentFeatures, type MacroeconomicFeatures }