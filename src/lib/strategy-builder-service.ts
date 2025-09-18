import { PolygonDataService, type EnhancedMarketData, type HistoricalDataPoint, type TechnicalIndicators } from './polygon-data-service'

// Strategy types and interfaces
export interface Strategy {
  id: string
  name: string
  type: 'momentum' | 'mean_reversion' | 'breakout' | 'ai_ml' | 'multi_factor' | 'custom'
  description: string
  symbol: string
  timeframe: string
  parameters: StrategyParameters
  performance: StrategyPerformance
  status: 'active' | 'paused' | 'backtesting' | 'optimizing'
  createdAt: string
  lastUpdated: string
  realTimeData?: EnhancedMarketData
}

export interface StrategyParameters {
  // RSI Parameters
  rsiPeriod: number
  rsiOverbought: number
  rsiOversold: number
  
  // MACD Parameters
  macdFast: number
  macdSlow: number
  macdSignal: number
  
  // Bollinger Bands Parameters
  bollingerPeriod: number
  bollingerStdDev: number
  
  // Moving Averages
  smaShort: number
  smaLong: number
  emaShort: number
  emaLong: number
  
  // Risk Management
  stopLoss: number
  takeProfit: number
  positionSize: number
  maxPositions: number
  
  // Custom Parameters
  momentumPeriod: number
  momentumThreshold: number
  breakoutPeriod: number
  volumeThreshold: number
}

export interface StrategyPerformance {
  winRate: number
  totalTrades: number
  profitableTrades: number
  losingTrades: number
  profitFactor: number
  sharpeRatio: number
  maxDrawdown: number
  totalReturn: number
  avgTrade: number
  avgWin: number
  avgLoss: number
  largestWin: number
  largestLoss: number
  consecutiveWins: number
  consecutiveLosses: number
  recoveryFactor: number
  calmarRatio: number
  sortinoRatio: number
}

export interface BacktestResult {
  id: string
  strategyId: string
  symbol: string
  startDate: string
  endDate: string
  initialCapital: number
  finalCapital: number
  totalReturn: number
  performance: StrategyPerformance
  trades: Trade[]
  equity: EquityPoint[]
  metrics: BacktestMetrics
}

export interface Trade {
  id: string
  date: string
  type: 'buy' | 'sell'
  price: number
  quantity: number
  pnl: number
  signal: string
  stopLoss?: number
  takeProfit?: number
  exitReason?: 'stop_loss' | 'take_profit' | 'signal' | 'manual'
}

export interface EquityPoint {
  date: string
  value: number
  drawdown: number
  positions: number
}

export interface BacktestMetrics {
  totalTrades: number
  winRate: number
  profitFactor: number
  sharpeRatio: number
  maxDrawdown: number
  totalReturn: number
  avgTrade: number
  avgWin: number
  avgLoss: number
  largestWin: number
  largestLoss: number
  consecutiveWins: number
  consecutiveLosses: number
  recoveryFactor: number
  calmarRatio: number
  sortinoRatio: number
  volatility: number
  beta: number
  alpha: number
  informationRatio: number
}

export class StrategyBuilderService {
  private polygonService: PolygonDataService
  private strategies: Map<string, Strategy> = new Map()
  private backtestResults: Map<string, BacktestResult> = new Map()

  constructor() {
    this.polygonService = new PolygonDataService()
  }

  // Create a new strategy
  async createStrategy(strategyData: Omit<Strategy, 'id' | 'performance' | 'status' | 'createdAt' | 'lastUpdated'>): Promise<Strategy> {
    const id = Date.now().toString()
    const now = new Date().toISOString()
    
    const strategy: Strategy = {
      ...strategyData,
      id,
      performance: this.getDefaultPerformance(),
      status: 'paused',
      createdAt: now,
      lastUpdated: now
    }

    // Fetch market data for the symbol
    try {
      const realTimeData = await this.polygonService.getEnhancedMarketData(strategy.symbol)
      if (!this.validateRealTimeData(realTimeData)) {
        throw new Error(`Invalid market data for ${strategy.symbol}`)
      }
      strategy.realTimeData = realTimeData
    } catch (error) {
      throw new Error(`Failed to fetch market data for ${strategy.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    this.strategies.set(id, strategy)
    return strategy
  }

  // Get all strategies
  getStrategies(): Strategy[] {
    return Array.from(this.strategies.values())
  }

  // Get strategy by ID
  getStrategy(id: string): Strategy | undefined {
    return this.strategies.get(id)
  }

  // Update strategy
  async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy | null> {
    const strategy = this.strategies.get(id)
    if (!strategy) return null

    const updatedStrategy: Strategy = {
      ...strategy,
      ...updates,
      lastUpdated: new Date().toISOString()
    }

    // Update market data if symbol changed
    if (updates.symbol && updates.symbol !== strategy.symbol) {
      try {
        const realTimeData = await this.polygonService.getEnhancedMarketData(updates.symbol)
        if (!this.validateRealTimeData(realTimeData)) {
          throw new Error(`Invalid market data for ${updates.symbol}`)
        }
        updatedStrategy.realTimeData = realTimeData
      } catch (error) {
        throw new Error(`Failed to fetch market data for ${updates.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    this.strategies.set(id, updatedStrategy)
    return updatedStrategy
  }

  // Delete strategy
  deleteStrategy(id: string): boolean {
    return this.strategies.delete(id)
  }

  // Get default performance
  private getDefaultPerformance(): StrategyPerformance {
    return {
      winRate: 0,
      totalTrades: 0,
      profitableTrades: 0,
      losingTrades: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      totalReturn: 0,
      avgTrade: 0,
      avgWin: 0,
      avgLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      recoveryFactor: 0,
      calmarRatio: 0,
      sortinoRatio: 0
    }
  }

  // Get backtest results
  getBacktestResults(): BacktestResult[] {
    return Array.from(this.backtestResults.values())
  }

  // Get backtest result by ID
  getBacktestResult(id: string): BacktestResult | undefined {
    return this.backtestResults.get(id)
  }

  // Update strategy status
  async updateStrategyStatus(strategyId: string, status: Strategy['status']): Promise<Strategy | null> {
    return this.updateStrategy(strategyId, { status })
  }

  // Get market data for strategy
  async getStrategyRealTimeData(strategyId: string): Promise<EnhancedMarketData | null> {
    const strategy = this.strategies.get(strategyId)
    if (!strategy) return null

    try {
      const realTimeData = await this.polygonService.getEnhancedMarketData(strategy.symbol)
      
      if (!this.validateRealTimeData(realTimeData)) {
        throw new Error(`Invalid market data for ${strategy.symbol}`)
      }
      
      // Update strategy with latest data
      strategy.realTimeData = realTimeData
      strategy.lastUpdated = new Date().toISOString()
      this.strategies.set(strategyId, strategy)
      
      return realTimeData
    } catch (error) {
      throw new Error(`Failed to fetch market data for ${strategy.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Validate market data
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

  // Run backtest with real historical data
  async runBacktest(strategyId: string, startDate: string, endDate: string, initialCapital: number = 100000): Promise<BacktestResult> {
    const strategy = this.strategies.get(strategyId)
    if (!strategy) {
      throw new Error('Strategy not found')
    }

    try {
      // Fetch real historical data from Polygon
      const historicalData = await this.polygonService.getHistoricalData(
        strategy.symbol,
        'day',
        1,
        startDate,
        endDate
      )

      if (historicalData.length === 0) {
        throw new Error('No historical data available for the specified period')
      }

      // Run the backtest with real data
      const backtestResult = await this.executeBacktest(strategy, historicalData, initialCapital)
      
      // Update strategy performance
      strategy.performance = backtestResult.performance
      strategy.lastUpdated = new Date().toISOString()
      this.strategies.set(strategyId, strategy)

      // Store backtest result
      this.backtestResults.set(backtestResult.id, backtestResult)

      return backtestResult
    } catch (error) {
      console.error('Backtest error:', error)
      throw error
    }
  }

  // Execute backtest with real data
  private async executeBacktest(strategy: Strategy, historicalData: HistoricalDataPoint[], initialCapital: number): Promise<BacktestResult> {
    const trades: Trade[] = []
    const equity: EquityPoint[] = []
    let currentCapital = initialCapital
    let currentPosition = 0
    let entryPrice = 0
    let maxCapital = initialCapital
    let maxDrawdown = 0

    // Calculate technical indicators for each data point
    const indicators = this.calculateIndicators(historicalData, strategy.parameters)

    for (let i = 50; i < historicalData.length; i++) {
      const data = historicalData[i]
      const currentIndicators = indicators[i]
      const signal = this.generateSignal(currentIndicators, strategy)

      // Check for exit signals if we have a position
      if (currentPosition > 0) {
        const exitSignal = this.checkExitSignal(data, entryPrice, currentIndicators, strategy)
        if (exitSignal) {
          const pnl = (data.close - entryPrice) * currentPosition
          currentCapital += pnl
          
          trades.push({
            id: `${trades.length + 1}`,
            date: data.date,
            type: 'sell',
            price: data.close,
            quantity: currentPosition,
            pnl,
            signal: exitSignal,
            exitReason: this.getExitReason(data.close, entryPrice, strategy)
          })

          currentPosition = 0
          entryPrice = 0
        }
      }

      // Check for entry signals if we don't have a position
      if (currentPosition === 0 && signal === 'buy') {
        const positionSize = Math.floor((currentCapital * strategy.parameters.positionSize / 100) / data.close)
        if (positionSize > 0) {
          currentPosition = positionSize
          entryPrice = data.close
          
          trades.push({
            id: `${trades.length + 1}`,
            date: data.date,
            type: 'buy',
            price: data.close,
            quantity: positionSize,
            pnl: 0,
            signal: 'buy',
            stopLoss: entryPrice * (1 - strategy.parameters.stopLoss / 100),
            takeProfit: entryPrice * (1 + strategy.parameters.takeProfit / 100)
          })
        }
      }

      // Calculate current equity
      const positionValue = currentPosition > 0 ? currentPosition * data.close : 0
      const totalValue = currentCapital + positionValue
      
      if (totalValue > maxCapital) {
        maxCapital = totalValue
      }
      
      const drawdown = (maxCapital - totalValue) / maxCapital * 100
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }

      equity.push({
        date: data.date,
        value: totalValue,
        drawdown,
        positions: currentPosition > 0 ? 1 : 0
      })
    }

    // Close any remaining position
    if (currentPosition > 0) {
      const lastData = historicalData[historicalData.length - 1]
      const pnl = (lastData.close - entryPrice) * currentPosition
      currentCapital += pnl
      
      trades.push({
        id: `${trades.length + 1}`,
        date: lastData.date,
        type: 'sell',
        price: lastData.close,
        quantity: currentPosition,
        pnl,
        signal: 'close_position',
        exitReason: 'signal'
      })
    }

    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(trades, initialCapital, currentCapital, maxDrawdown)
    const metrics = this.calculateBacktestMetrics(trades, equity, initialCapital, currentCapital)

    return {
      id: Date.now().toString(),
      strategyId: strategy.id,
      symbol: strategy.symbol,
      startDate: historicalData[0].date,
      endDate: historicalData[historicalData.length - 1].date,
      initialCapital,
      finalCapital: currentCapital,
      totalReturn: ((currentCapital - initialCapital) / initialCapital) * 100,
      performance,
      trades,
      equity,
      metrics
    }
  }

  // Calculate technical indicators
  private calculateIndicators(data: HistoricalDataPoint[], params: StrategyParameters): TechnicalIndicators[] {
    const indicators: TechnicalIndicators[] = []
    const prices = data.map(d => d.close)
    const highs = data.map(d => d.high)
    const lows = data.map(d => d.low)
    const volumes = data.map(d => d.volume)

    for (let i = 0; i < data.length; i++) {
      if (i < 50) {
        // Use default values for early data points
        indicators.push({
          rsi: 50,
          macd: { macd: 0, signal: 0, histogram: 0 },
          sma20: prices[i],
          sma50: prices[i],
          sma200: prices[i],
          ema12: prices[i],
          ema26: prices[i],
          bollingerBands: { upper: prices[i] * 1.02, middle: prices[i], lower: prices[i] * 0.98 },
          stochastic: { k: 50, d: 50 },
          atr: 0,
          adx: 0,
          williamsR: -50
        })
        continue
      }

      const recentPrices = prices.slice(0, i + 1)
      const recentHighs = highs.slice(0, i + 1)
      const recentLows = lows.slice(0, i + 1)
      const recentVolumes = volumes.slice(0, i + 1)

      indicators.push({
        rsi: this.calculateRSI(recentPrices, params.rsiPeriod),
        macd: this.calculateMACD(recentPrices, params.macdFast, params.macdSlow, params.macdSignal),
        sma20: this.calculateSMA(recentPrices, params.smaShort),
        sma50: this.calculateSMA(recentPrices, params.smaLong),
        sma200: this.calculateSMA(recentPrices, 200),
        ema12: this.calculateEMA(recentPrices, params.emaShort),
        ema26: this.calculateEMA(recentPrices, params.emaLong),
        bollingerBands: this.calculateBollingerBands(recentPrices, params.bollingerPeriod, params.bollingerStdDev),
        stochastic: this.calculateStochastic(recentHighs, recentLows, recentPrices, 14),
        atr: this.calculateATR(recentHighs, recentLows, recentPrices, 14),
        adx: this.calculateADX(recentHighs, recentLows, recentPrices, 14),
        williamsR: this.calculateWilliamsR(recentHighs, recentLows, recentPrices, 14)
      })
    }

    return indicators
  }

  // Generate trading signals based on strategy type
  private generateSignal(indicators: TechnicalIndicators, strategy: Strategy): 'buy' | 'sell' | 'hold' {
    switch (strategy.type) {
      case 'momentum':
        return this.generateMomentumSignal(indicators, strategy.parameters)
      case 'mean_reversion':
        return this.generateMeanReversionSignal(indicators, strategy.parameters)
      case 'breakout':
        return this.generateBreakoutSignal(indicators, strategy.parameters)
      case 'ai_ml':
        return this.generateAIMLSignal(indicators, strategy.parameters)
      case 'multi_factor':
        return this.generateMultiFactorSignal(indicators, strategy.parameters)
      default:
        return 'hold'
    }
  }

  // Momentum strategy signals
  private generateMomentumSignal(indicators: TechnicalIndicators, params: StrategyParameters): 'buy' | 'sell' | 'hold' {
    const { rsi, macd, sma20, sma50, ema12, ema26, bollingerBands, stochastic } = indicators
    
    // RSI momentum with trend confirmation
    const rsiMomentum = rsi > 50 && rsi < params.rsiOverbought
    const rsiTrend = rsi > 60 && rsi < 80 // Strong momentum zone
    
    // MACD momentum with histogram confirmation
    const macdMomentum = macd.macd > macd.signal && macd.histogram > 0
    const macdStrong = macd.histogram > 0 && macd.macd > 0 // Strong positive momentum
    
    // Moving average momentum with trend strength
    const smaMomentum = sma20 > sma50
    const emaMomentum = ema12 > ema26
    const maTrendStrength = (sma20 - sma50) / sma50 > 0.02 // 2% trend strength
    
    // Bollinger Bands momentum
    const bbMomentum = true // Price above middle band indicates momentum
    
    // Stochastic momentum
    const stochMomentum = stochastic.k > 50 && stochastic.k < 80
    
    // Volume confirmation (if available)
    const volumeMomentum = true
    
    // Weighted signal calculation
    const signals = [
      { signal: rsiMomentum, weight: 0.25 },
      { signal: macdMomentum, weight: 0.20 },
      { signal: smaMomentum && emaMomentum, weight: 0.20 },
      { signal: maTrendStrength, weight: 0.15 },
      { signal: stochMomentum, weight: 0.10 },
      { signal: volumeMomentum, weight: 0.10 }
    ]
    
    const weightedScore = signals.reduce((score, s) => 
      score + (s.signal ? s.weight : 0), 0
    )
    
    // Enhanced signal thresholds
    if (weightedScore >= 0.7) return 'buy'
    if (weightedScore <= 0.3) return 'sell'
    return 'hold'
  }

  // Mean reversion strategy signals
  private generateMeanReversionSignal(indicators: TechnicalIndicators, params: StrategyParameters): 'buy' | 'sell' | 'hold' {
    const { rsi, bollingerBands, stochastic, williamsR, sma20, sma50 } = indicators
    
    // RSI oversold/overbought with confirmation
    const rsiOversold = rsi < params.rsiOversold
    const rsiOverbought = rsi > params.rsiOverbought
    const rsiExtremeOversold = rsi < 20
    const rsiExtremeOverbought = rsi > 80
    
    // Bollinger Bands mean reversion
    const bbLower = bollingerBands.lower
    const bbUpper = bollingerBands.upper
    const bbMiddle = bollingerBands.middle
    
    // Stochastic with confirmation
    const stochOversold = stochastic.k < 20
    const stochOverbought = stochastic.k > 80
    const stochExtremeOversold = stochastic.k < 10
    const stochExtremeOverbought = stochastic.k > 90
    
    // Williams %R with confirmation
    const williamsOversold = williamsR < -80
    const williamsOverbought = williamsR > -20
    const williamsExtremeOversold = williamsR < -90
    const williamsExtremeOverbought = williamsR > -10
    
    // Moving average mean reversion
    const maReversion = Math.abs(sma20 - sma50) / sma50 < 0.01 // Less than 1% difference
    
    // Weighted signal calculation for mean reversion
    const buySignals = [
      { signal: rsiExtremeOversold, weight: 0.30 },
      { signal: stochExtremeOversold, weight: 0.25 },
      { signal: williamsExtremeOversold, weight: 0.25 },
      { signal: maReversion, weight: 0.20 }
    ]
    
    const sellSignals = [
      { signal: rsiExtremeOverbought, weight: 0.30 },
      { signal: stochExtremeOverbought, weight: 0.25 },
      { signal: williamsExtremeOverbought, weight: 0.25 },
      { signal: maReversion, weight: 0.20 }
    ]
    
    const buyScore = buySignals.reduce((score, s) => 
      score + (s.signal ? s.weight : 0), 0
    )
    
    const sellScore = sellSignals.reduce((score, s) => 
      score + (s.signal ? s.weight : 0), 0
    )
    
    // Enhanced thresholds for mean reversion
    if (buyScore >= 0.6) return 'buy'
    if (sellScore >= 0.6) return 'sell'
    return 'hold'
  }

  // Breakout strategy signals
  private generateBreakoutSignal(indicators: TechnicalIndicators, params: StrategyParameters): 'buy' | 'sell' | 'hold' {
    const { bollingerBands, sma20, sma50, ema12, ema26, rsi, macd, stochastic } = indicators
    
    // Bollinger Bands breakout with volume confirmation
    const bbUpper = bollingerBands.upper
    const bbMiddle = bollingerBands.middle
    const bbLower = bollingerBands.lower
    
    // Moving average breakout patterns
    const smaBreakout = sma20 > sma50 * 1.02 // 2% above
    const emaBreakout = ema12 > ema26 * 1.015 // 1.5% above
    
    // RSI breakout confirmation
    const rsiBreakout = rsi > 60 && rsi < 80 // Strong but not overbought
    
    // MACD breakout confirmation
    const macdBreakout = macd.macd > macd.signal && macd.histogram > 0
    
    // Stochastic breakout confirmation
    const stochBreakout = stochastic.k > 50 && stochastic.k < 80
    
    // Volume breakout (placeholder - would need actual volume data)
    const volumeBreakout = true
    
    // Weighted breakout signal calculation
    const breakoutSignals = [
      { signal: smaBreakout, weight: 0.25 },
      { signal: emaBreakout, weight: 0.20 },
      { signal: rsiBreakout, weight: 0.20 },
      { signal: macdBreakout, weight: 0.20 },
      { signal: stochBreakout, weight: 0.10 },
      { signal: volumeBreakout, weight: 0.05 }
    ]
    
    const breakoutScore = breakoutSignals.reduce((score, s) => 
      score + (s.signal ? s.weight : 0), 0
    )
    
    // Enhanced breakout thresholds
    if (breakoutScore >= 0.7) return 'buy'
    return 'hold'
  }

  // AI/ML strategy signals (simplified)
  private generateAIMLSignal(indicators: TechnicalIndicators, params: StrategyParameters): 'buy' | 'sell' | 'hold' {
    // Combine multiple indicators with weights
    const signals = [
      { indicator: indicators.rsi > 50, weight: 0.3 },
      { indicator: indicators.macd.macd > indicators.macd.signal, weight: 0.3 },
      { indicator: indicators.sma20 > indicators.sma50, weight: 0.2 },
      { indicator: indicators.stochastic.k > 50, weight: 0.2 }
    ]
    
    const weightedScore = signals.reduce((score, signal) => 
      score + (signal.indicator ? signal.weight : 0), 0
    )
    
    if (weightedScore > 0.7) return 'buy'
    if (weightedScore < 0.3) return 'sell'
    return 'hold'
  }

  // Multi-factor strategy signals
  private generateMultiFactorSignal(indicators: TechnicalIndicators, params: StrategyParameters): 'buy' | 'sell' | 'hold' {
    // Combine momentum and mean reversion
    const momentumSignal = this.generateMomentumSignal(indicators, params)
    const meanReversionSignal = this.generateMeanReversionSignal(indicators, params)
    
    if (momentumSignal === 'buy' && meanReversionSignal === 'buy') return 'buy'
    if (momentumSignal === 'sell' && meanReversionSignal === 'sell') return 'sell'
    return 'hold'
  }

  // Check exit signals
  private checkExitSignal(data: HistoricalDataPoint, entryPrice: number, indicators: TechnicalIndicators, strategy: Strategy): string | null {
    const currentPrice = data.close
    
    // Stop loss
    const stopLoss = entryPrice * (1 - strategy.parameters.stopLoss / 100)
    if (currentPrice <= stopLoss) return 'stop_loss'
    
    // Take profit
    const takeProfit = entryPrice * (1 + strategy.parameters.takeProfit / 100)
    if (currentPrice >= takeProfit) return 'take_profit'
    
    // Technical exit signals
    const exitSignal = this.generateSignal(indicators, strategy)
    if (exitSignal === 'sell') return 'technical_exit'
    
    return null
  }

  // Get exit reason
  private getExitReason(currentPrice: number, entryPrice: number, strategy: Strategy): 'stop_loss' | 'take_profit' | 'signal' | 'manual' {
    const stopLoss = entryPrice * (1 - strategy.parameters.stopLoss / 100)
    const takeProfit = entryPrice * (1 + strategy.parameters.takeProfit / 100)
    
    if (currentPrice <= stopLoss) return 'stop_loss'
    if (currentPrice >= takeProfit) return 'take_profit'
    return 'signal'
  }

  // Calculate performance metrics
  private calculatePerformanceMetrics(trades: Trade[], initialCapital: number, finalCapital: number, maxDrawdown: number): StrategyPerformance {
    const buyTrades = trades.filter(t => t.type === 'buy')
    const sellTrades = trades.filter(t => t.type === 'sell')
    
    const totalTrades = sellTrades.length
    const profitableTrades = sellTrades.filter(t => t.pnl > 0).length
    const losingTrades = sellTrades.filter(t => t.pnl < 0).length
    
    const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0
    
    const totalProfit = sellTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0)
    const totalLoss = Math.abs(sellTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0))
    
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0
    const avgWin = profitableTrades > 0 ? totalProfit / profitableTrades : 0
    const avgLoss = losingTrades > 0 ? totalLoss / losingTrades : 0
    const avgTrade = totalTrades > 0 ? (totalProfit - totalLoss) / totalTrades : 0
    
    const largestWin = Math.max(...sellTrades.map(t => t.pnl), 0)
    const largestLoss = Math.min(...sellTrades.map(t => t.pnl), 0)
    
    const totalReturn = ((finalCapital - initialCapital) / initialCapital) * 100
    
    // Calculate Sharpe ratio with proper annualization
    const returns = sellTrades.map(t => t.pnl / initialCapital)
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0
    const stdDev = returns.length > 0 ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length) : 0
    
    // Annualize returns and volatility (assuming daily data)
    const annualizedReturn = avgReturn * 252
    const annualizedVolatility = stdDev * Math.sqrt(252)
    const sharpeRatio = annualizedVolatility > 0 ? annualizedReturn / annualizedVolatility : 0
    
    // Calculate consecutive wins/losses
    let consecutiveWins = 0
    let consecutiveLosses = 0
    let currentWins = 0
    let currentLosses = 0
    
    for (const trade of sellTrades) {
      if (trade.pnl > 0) {
        currentWins++
        currentLosses = 0
        consecutiveWins = Math.max(consecutiveWins, currentWins)
      } else {
        currentLosses++
        currentWins = 0
        consecutiveLosses = Math.max(consecutiveLosses, currentLosses)
      }
    }
    
    const recoveryFactor = maxDrawdown > 0 ? totalReturn / maxDrawdown : 0
    const calmarRatio = maxDrawdown > 0 ? (totalReturn / 100) / (maxDrawdown / 100) : 0
    const sortinoRatio = sharpeRatio // Simplified - would need downside deviation
    
    return {
      winRate,
      totalTrades,
      profitableTrades,
      losingTrades,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      totalReturn,
      avgTrade,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      consecutiveWins,
      consecutiveLosses,
      recoveryFactor,
      calmarRatio,
      sortinoRatio
    }
  }

  // Calculate backtest metrics
  private calculateBacktestMetrics(trades: Trade[], equity: EquityPoint[], initialCapital: number, finalCapital: number): BacktestMetrics {
    const performance = this.calculatePerformanceMetrics(trades, initialCapital, finalCapital, 0)
    
    // Calculate volatility
    const returns = equity.slice(1).map((point, i) => 
      (point.value - equity[i].value) / equity[i].value
    )
    const volatility = returns.length > 0 ? 
      Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / returns.length) * Math.sqrt(252) : 0
    
    // Simplified beta and alpha (would need market data for accurate calculation)
    const beta = 1.0 // Placeholder
    const alpha = performance.totalReturn - (beta * 10) // Assuming 10% market return
    
    const informationRatio = performance.sharpeRatio // Simplified
    
    return {
      ...performance,
      volatility,
      beta,
      alpha,
      informationRatio
    }
  }

  // Technical indicator calculations
  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50
    
    let gains = 0
    let losses = 0
    
    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1]
      if (change > 0) gains += change
      else losses -= change
    }
    
    let avgGain = gains / period
    let avgLoss = losses / period
    
    // Use Wilder's smoothing method for more accurate RSI
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period
        avgLoss = (avgLoss * (period - 1)) / period
      } else {
        avgGain = (avgGain * (period - 1)) / period
        avgLoss = (avgLoss * (period - 1) - change) / period
      }
    }
    
    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  private calculateMACD(prices: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number): { macd: number; signal: number; histogram: number } {
    if (prices.length < slowPeriod) return { macd: 0, signal: 0, histogram: 0 }
    
    // Calculate EMAs
    const ema12 = this.calculateEMA(prices, fastPeriod)
    const ema26 = this.calculateEMA(prices, slowPeriod)
    const macd = ema12 - ema26
    
    // Calculate MACD line values for signal calculation
    const macdValues = []
    for (let i = slowPeriod; i < prices.length; i++) {
      const fastEMA = this.calculateEMA(prices.slice(0, i + 1), fastPeriod)
      const slowEMA = this.calculateEMA(prices.slice(0, i + 1), slowPeriod)
      macdValues.push(fastEMA - slowEMA)
    }
    
    // Calculate signal line (EMA of MACD)
    const signal = macdValues.length > 0 ? this.calculateEMA(macdValues, signalPeriod) : macd * 0.9
    const histogram = macd - signal
    
    return { macd, signal, histogram }
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0
    
    const multiplier = 2 / (period + 1)
    let ema = prices[0]
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
    }
    
    return ema
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0
    
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0)
    return sum / period
  }

  private calculateBollingerBands(prices: number[], period: number, stdDev: number): { upper: number; middle: number; lower: number } {
    if (prices.length < period) {
      const price = prices[prices.length - 1] || 0
      return { upper: price * 1.02, middle: price, lower: price * 0.98 }
    }
    
    const sma = this.calculateSMA(prices, period)
    const variance = prices.slice(-period).reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period
    const standardDeviation = Math.sqrt(variance)
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    }
  }

  private calculateStochastic(highs: number[], lows: number[], closes: number[], period: number): { k: number; d: number } {
    if (closes.length < period) return { k: 50, d: 50 }
    
    const recentHighs = highs.slice(-period)
    const recentLows = lows.slice(-period)
    const currentClose = closes[closes.length - 1]
    
    const highest = Math.max(...recentHighs)
    const lowest = Math.min(...recentLows)
    
    const k = ((currentClose - lowest) / (highest - lowest)) * 100
    const d = k // Simplified D calculation
    
    return { k, d }
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
    if (closes.length < period + 1) return 0
    
    const trueRanges = []
    
    for (let i = 1; i < closes.length; i++) {
      const high = highs[i]
      const low = lows[i]
      const prevClose = closes[i - 1]
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      )
      
      trueRanges.push(tr)
    }
    
    return this.calculateSMA(trueRanges, period)
  }

  private calculateADX(highs: number[], lows: number[], closes: number[], period: number): number {
    if (closes.length < period + 1) return 0
    
    let dmPlus = 0
    let dmMinus = 0
    
    for (let i = 1; i < Math.min(period + 1, closes.length); i++) {
      const highDiff = highs[i] - highs[i - 1]
      const lowDiff = lows[i - 1] - lows[i]
      
      if (highDiff > lowDiff && highDiff > 0) dmPlus += highDiff
      if (lowDiff > highDiff && lowDiff > 0) dmMinus += lowDiff
    }
    
    return Math.abs(dmPlus - dmMinus) / (dmPlus + dmMinus) * 100
  }

  private calculateWilliamsR(highs: number[], lows: number[], closes: number[], period: number): number {
    if (closes.length < period) return -50
    
    const recentHighs = highs.slice(-period)
    const recentLows = lows.slice(-period)
    const currentClose = closes[closes.length - 1]
    
    const highest = Math.max(...recentHighs)
    const lowest = Math.min(...recentLows)
    
    return ((highest - currentClose) / (highest - lowest)) * -100
  }
}

export default StrategyBuilderService
