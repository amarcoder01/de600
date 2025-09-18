import { PolygonDataService, type EnhancedMarketData, type HistoricalDataPoint, type TechnicalIndicators } from './polygon-data-service'
import type { Strategy, StrategyParameters } from './strategy-builder-service'
import MLService from './ml-service'

// ML Model Types
export type MLModelType = 'lstm' | 'transformer' | 'random_forest' | 'xgboost' | 'neural_network' | 'ensemble'

// Feature Engineering
export interface MLFeatures {
  technical: {
    rsi: number[]
    macd: number[]
    macdSignal: number[]
    macdHistogram: number[]
    sma20: number[]
    sma50: number[]
    sma200: number[]
    ema12: number[]
    ema26: number[]
    bollingerUpper: number[]
    bollingerLower: number[]
    bollingerMiddle: number[]
    stochasticK: number[]
    stochasticD: number[]
    atr: number[]
    adx: number[]
    williamsR: number[]
  }
  price: {
    open: number[]
    high: number[]
    low: number[]
    close: number[]
    volume: number[]
    returns: number[]
    volatility: number[]
  }
  market: {
    marketCap: number[]
    peRatio: number[]
    dividendYield: number[]
    beta: number[]
    sector: string[]
  }
  sentiment: {
    newsSentiment: number[]
    socialSentiment: number[]
    analystRating: number[]
  }
}

// ML Strategy Configuration
export interface MLStrategyConfig {
  modelType: MLModelType
  lookbackPeriod: number
  predictionHorizon: number
  confidenceThreshold: number
  featureSelection: string[]
  hyperparameters: Record<string, any>
  ensembleWeights?: Record<string, number>
}

// ML Prediction Result
export interface MLPrediction {
  timestamp: string
  predictedDirection: 'buy' | 'sell' | 'hold'
  confidence: number
  predictedPrice: number
  priceChange: number
  volatility: number
  riskScore: number
  modelUsed: MLModelType
  features: string[]
}

// ML Model Performance
export interface MLModelPerformance {
  modelType: MLModelType
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  sharpeRatio: number
  totalReturn: number
  maxDrawdown: number
  winRate: number
  profitFactor: number
  trainingTime: number
  predictionTime: number
}

export class MLStrategyGenerator {
  private polygonService: PolygonDataService
  private mlService: MLService
  private models: Map<MLModelType, any> = new Map()
  private modelPerformance: Map<MLModelType, MLModelPerformance> = new Map()
  private isTraining: boolean = false

  constructor() {
    this.polygonService = new PolygonDataService()
    this.mlService = new MLService()
  }

  // Generate ML-based trading strategy
  async generateMLStrategy(
    symbol: string,
    config: MLStrategyConfig,
    trainingPeriod: { start: string; end: string }
  ): Promise<Strategy> {
    try {
      console.log(`🤖 Generating ML strategy for ${symbol} using ${config.modelType} model...`)

      // Fetch historical data for training
      const historicalData = await this.polygonService.getHistoricalData(
        symbol,
        'day',
        1,
        trainingPeriod.start,
        trainingPeriod.end
      )

      if (historicalData.length < 100) {
        throw new Error('Insufficient historical data for ML training (minimum 100 days required)')
      }

      // Extract features
      const features = await this.extractFeatures(historicalData, symbol)
      
      // Train ML model
      const model = await this.trainModel(config.modelType, features, config)
      
      // Generate strategy parameters
      const strategyParams = this.generateStrategyParameters(config, model)
      
      // Create strategy
      const strategy: Strategy = {
        id: Date.now().toString(),
        name: `${symbol} ML Strategy (${config.modelType.toUpperCase()})`,
        type: 'ai_ml',
        description: `AI-powered trading strategy using ${config.modelType} model with ${config.lookbackPeriod} day lookback`,
        symbol: symbol.toUpperCase(),
        timeframe: '1d',
        parameters: strategyParams,
        performance: {
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
        },
        status: 'paused',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }

      console.log(`✅ ML strategy generated successfully for ${symbol}`)
      return strategy

    } catch (error) {
      console.error('Error generating ML strategy:', error)
      throw error
    }
  }

  // Extract features from historical data
  private async extractFeatures(data: HistoricalDataPoint[], symbol: string): Promise<MLFeatures> {
    // Fetch current market data once (more efficient)
    let currentMarketData = null
    let currentSentiment = null
    
    try {
      currentMarketData = await this.polygonService.getEnhancedMarketData(symbol)
      console.log(`✅ Fetched current market data for ${symbol}`)
    } catch (error) {
      console.warn(`⚠️ Could not fetch current market data for ${symbol}, using defaults:`, error)
      currentMarketData = {
        marketCap: 0,
        peRatio: 0,
        dividendYield: 0,
        beta: 1,
        sector: 'Technology'
      }
    }

    // Initialize sentiment data (placeholder for now)
    currentSentiment = {
      newsSentiment: 0,
      socialSentiment: 0,
      analystRating: 3
    }

    const features: MLFeatures = {
      technical: {
        rsi: [],
        macd: [],
        macdSignal: [],
        macdHistogram: [],
        sma20: [],
        sma50: [],
        sma200: [],
        ema12: [],
        ema26: [],
        bollingerUpper: [],
        bollingerLower: [],
        bollingerMiddle: [],
        stochasticK: [],
        stochasticD: [],
        atr: [],
        adx: [],
        williamsR: []
      },
      price: {
        open: [],
        high: [],
        low: [],
        close: [],
        volume: [],
        returns: [],
        volatility: []
      },
      market: {
        marketCap: [],
        peRatio: [],
        dividendYield: [],
        beta: [],
        sector: []
      },
      sentiment: {
        newsSentiment: [],
        socialSentiment: [],
        analystRating: []
      }
    }

    const prices = data.map(d => d.close)
    const highs = data.map(d => d.high)
    const lows = data.map(d => d.low)
    const volumes = data.map(d => d.volume)

    // Calculate technical indicators
    for (let i = 0; i < data.length; i++) {
      if (i < 50) {
        // Use default values for early data points
        features.technical.rsi.push(50)
        features.technical.macd.push(0)
        features.technical.macdSignal.push(0)
        features.technical.macdHistogram.push(0)
        features.technical.sma20.push(prices[i])
        features.technical.sma50.push(prices[i])
        features.technical.sma200.push(prices[i])
        features.technical.ema12.push(prices[i])
        features.technical.ema26.push(prices[i])
        features.technical.bollingerUpper.push(prices[i] * 1.02)
        features.technical.bollingerLower.push(prices[i] * 0.98)
        features.technical.bollingerMiddle.push(prices[i])
        features.technical.stochasticK.push(50)
        features.technical.stochasticD.push(50)
        features.technical.atr.push(0)
        features.technical.adx.push(0)
        features.technical.williamsR.push(-50)
      } else {
        const recentPrices = prices.slice(0, i + 1)
        const recentHighs = highs.slice(0, i + 1)
        const recentLows = lows.slice(0, i + 1)

        // Calculate technical indicators
        features.technical.rsi.push(this.calculateRSI(recentPrices, 14))
        const macd = this.calculateMACD(recentPrices, 12, 26, 9)
        features.technical.macd.push(macd.macd)
        features.technical.macdSignal.push(macd.signal)
        features.technical.macdHistogram.push(macd.histogram)
        features.technical.sma20.push(this.calculateSMA(recentPrices, 20))
        features.technical.sma50.push(this.calculateSMA(recentPrices, 50))
        features.technical.sma200.push(this.calculateSMA(recentPrices, 200))
        features.technical.ema12.push(this.calculateEMA(recentPrices, 12))
        features.technical.ema26.push(this.calculateEMA(recentPrices, 26))
        
        const bb = this.calculateBollingerBands(recentPrices, 20, 2)
        features.technical.bollingerUpper.push(bb.upper)
        features.technical.bollingerLower.push(bb.lower)
        features.technical.bollingerMiddle.push(bb.middle)
        
        const stoch = this.calculateStochastic(recentHighs, recentLows, recentPrices, 14)
        features.technical.stochasticK.push(stoch.k)
        features.technical.stochasticD.push(stoch.d)
        
        features.technical.atr.push(this.calculateATR(recentHighs, recentLows, recentPrices, 14))
        features.technical.adx.push(this.calculateADX(recentHighs, recentLows, recentPrices, 14))
        features.technical.williamsR.push(this.calculateWilliamsR(recentHighs, recentLows, recentPrices, 14))
      }

      // Price features
      features.price.open.push(data[i].open)
      features.price.high.push(data[i].high)
      features.price.low.push(data[i].low)
      features.price.close.push(data[i].close)
      features.price.volume.push(data[i].volume)
      
      // Calculate returns
      if (i > 0) {
        const returns = (data[i].close - data[i - 1].close) / data[i - 1].close
        features.price.returns.push(returns)
      } else {
        features.price.returns.push(0)
      }

      // Calculate volatility (20-day rolling)
      if (i >= 20) {
        const recentReturns = features.price.returns.slice(i - 19, i + 1)
        const volatility = Math.sqrt(recentReturns.reduce((sum, r) => sum + r * r, 0) / recentReturns.length)
        features.price.volatility.push(volatility)
      } else {
        features.price.volatility.push(0)
      }

      // Market features - use current market data for all historical points (more efficient)
      features.market.marketCap.push(currentMarketData?.marketCap || 0)
      features.market.peRatio.push(currentMarketData?.peRatio || 0)
      features.market.dividendYield.push(currentMarketData?.dividendYield || 0)
      features.market.beta.push(currentMarketData?.beta || 1)
      features.market.sector.push(currentMarketData?.sector || 'Technology')

      // Sentiment features - use current sentiment for all historical points
      features.sentiment.newsSentiment.push(currentSentiment?.newsSentiment || 0)
      features.sentiment.socialSentiment.push(currentSentiment?.socialSentiment || 0)
      features.sentiment.analystRating.push(currentSentiment?.analystRating || 3)
    }

    // Debug: Log the latest technical indicator values
    const latestIndex = features.technical.rsi.length - 1
    console.log('🔍 Extracted features - Latest values:', {
      rsi: features.technical.rsi[latestIndex],
      macd: features.technical.macd[latestIndex],
      sma20: features.technical.sma20[latestIndex],
      sma50: features.technical.sma50[latestIndex],
      bollingerUpper: features.technical.bollingerUpper[latestIndex],
      bollingerLower: features.technical.bollingerLower[latestIndex],
      currentPrice: features.price.close[latestIndex],
      dataLength: data.length
    })

    return features
  }

  // Train ML model
  private async trainModel(modelType: MLModelType, features: MLFeatures, config: MLStrategyConfig): Promise<any> {
    console.log(`🧠 Training ${modelType} model...`)
    
    // Simulate training time
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Create model based on type
    const model = this.createModel(modelType, config)
    
    // Simulate training process
    const trainingData = this.prepareTrainingData(features, config.lookbackPeriod)
    await this.trainModelWithData(model, trainingData, config)

    // Store model
    this.models.set(modelType, model)

    // Calculate and store performance metrics
    const performance = await this.calculateModelPerformance(model, trainingData)
    this.modelPerformance.set(modelType, performance)

    console.log(`✅ ${modelType} model trained successfully`)
    return model
  }

  // Create model based on type
  private createModel(modelType: MLModelType, config: MLStrategyConfig): any {
    switch (modelType) {
      case 'lstm':
        return this.createLSTMModel(config)
      case 'transformer':
        return this.createTransformerModel(config)
      case 'random_forest':
        return this.createRandomForestModel(config)
      case 'xgboost':
        return this.createXGBoostModel(config)
      case 'neural_network':
        return this.createNeuralNetworkModel(config)
      case 'ensemble':
        return this.createEnsembleModel(config)
      default:
        throw new Error(`Unsupported model type: ${modelType}`)
    }
  }

  // Create LSTM model
  private createLSTMModel(config: MLStrategyConfig): any {
    return {
      type: 'lstm',
      layers: [
        { type: 'lstm', units: 50, returnSequences: true },
        { type: 'dropout', rate: 0.2 },
        { type: 'lstm', units: 30, returnSequences: false },
        { type: 'dropout', rate: 0.2 },
        { type: 'dense', units: 1, activation: 'sigmoid' }
      ],
      hyperparameters: {
        learningRate: 0.001,
        batchSize: 32,
        epochs: 100,
        ...config.hyperparameters
      }
    }
  }

  // Create Transformer model
  private createTransformerModel(config: MLStrategyConfig): any {
    return {
      type: 'transformer',
      layers: [
        { type: 'embedding', inputDim: 100, outputDim: 64 },
        { type: 'transformer', heads: 8, dModel: 64 },
        { type: 'globalAveragePooling' },
        { type: 'dense', units: 32, activation: 'relu' },
        { type: 'dense', units: 1, activation: 'sigmoid' }
      ],
      hyperparameters: {
        learningRate: 0.0001,
        batchSize: 16,
        epochs: 50,
        ...config.hyperparameters
      }
    }
  }

  // Create Random Forest model
  private createRandomForestModel(config: MLStrategyConfig): any {
    return {
      type: 'random_forest',
      hyperparameters: {
        nEstimators: 100,
        maxDepth: 10,
        minSamplesSplit: 2,
        minSamplesLeaf: 1,
        ...config.hyperparameters
      }
    }
  }

  // Create XGBoost model
  private createXGBoostModel(config: MLStrategyConfig): any {
    return {
      type: 'xgboost',
      hyperparameters: {
        nEstimators: 100,
        maxDepth: 6,
        learningRate: 0.1,
        subsample: 0.8,
        colsampleBytree: 0.8,
        ...config.hyperparameters
      }
    }
  }

  // Create Neural Network model
  private createNeuralNetworkModel(config: MLStrategyConfig): any {
    return {
      type: 'neural_network',
      layers: [
        { type: 'dense', units: 64, activation: 'relu' },
        { type: 'dropout', rate: 0.3 },
        { type: 'dense', units: 32, activation: 'relu' },
        { type: 'dropout', rate: 0.3 },
        { type: 'dense', units: 16, activation: 'relu' },
        { type: 'dense', units: 1, activation: 'sigmoid' }
      ],
      hyperparameters: {
        learningRate: 0.001,
        batchSize: 32,
        epochs: 100,
        ...config.hyperparameters
      }
    }
  }

  // Create Ensemble model
  private createEnsembleModel(config: MLStrategyConfig): any {
    return {
      type: 'ensemble',
      models: [
        this.createLSTMModel(config),
        this.createRandomForestModel(config),
        this.createXGBoostModel(config)
      ],
      weights: config.ensembleWeights || { lstm: 0.4, random_forest: 0.3, xgboost: 0.3 }
    }
  }

  // Prepare training data
  private prepareTrainingData(features: MLFeatures, lookbackPeriod: number): any {
    const sequences = []
    const labels = []

    // Create sequences for time series prediction
    for (let i = lookbackPeriod; i < features.price.close.length - 1; i++) {
      const sequence = {
        technical: {
          rsi: features.technical.rsi.slice(i - lookbackPeriod, i),
          macd: features.technical.macd.slice(i - lookbackPeriod, i),
          macdSignal: features.technical.macdSignal.slice(i - lookbackPeriod, i),
          sma20: features.technical.sma20.slice(i - lookbackPeriod, i),
          sma50: features.technical.sma50.slice(i - lookbackPeriod, i),
          bollingerUpper: features.technical.bollingerUpper.slice(i - lookbackPeriod, i),
          bollingerLower: features.technical.bollingerLower.slice(i - lookbackPeriod, i)
        },
        price: {
          close: features.price.close.slice(i - lookbackPeriod, i),
          volume: features.price.volume.slice(i - lookbackPeriod, i),
          returns: features.price.returns.slice(i - lookbackPeriod, i),
          volatility: features.price.volatility.slice(i - lookbackPeriod, i)
        }
      }

      // Create label (1 for price increase, 0 for decrease)
      const currentPrice = features.price.close[i]
      const nextPrice = features.price.close[i + 1]
      const label = nextPrice > currentPrice ? 1 : 0

      sequences.push(sequence)
      labels.push(label)
    }

    return { sequences, labels }
  }

  // Train model with data
  private async trainModelWithData(model: any, trainingData: any, config: MLStrategyConfig): Promise<void> {
    const { sequences, labels } = trainingData
    
    console.log(`Training ${model.type} model with ${sequences.length} samples...`)
    
    // Use the ML service to train the model
    const trainedModel = await this.mlService.trainModel(model.type, trainingData, config)
    this.models.set(model.type, trainedModel)
    
    console.log(`Training completed for ${model.type} model`)
  }

  // Generate strategy parameters from trained model
  private generateStrategyParameters(config: MLStrategyConfig, model: any): StrategyParameters {
    // Analyze model predictions to determine optimal parameters
    const modelPerformance = this.modelPerformance.get(config.modelType)
    
    // Base parameters on model performance
    const baseConfidence = modelPerformance?.accuracy || 0.6
    const volatilityAdjustment = modelPerformance?.maxDrawdown ? Math.min(modelPerformance.maxDrawdown / 10, 1) : 0.5
    
    return {
      // RSI Parameters (adjusted based on ML insights)
      rsiPeriod: 14,
      rsiOverbought: 70 + (baseConfidence - 0.5) * 20, // Adjust based on model confidence
      rsiOversold: 30 - (baseConfidence - 0.5) * 20,
      
      // MACD Parameters
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      
      // Bollinger Bands
      bollingerPeriod: 20,
      bollingerStdDev: 2 + volatilityAdjustment,
      
      // Moving Averages
      smaShort: 20,
      smaLong: 50,
      emaShort: 12,
      emaLong: 26,
      
      // Risk Management (adjusted based on model performance)
      stopLoss: 5 + volatilityAdjustment * 5,
      takeProfit: 10 + baseConfidence * 10,
      positionSize: 10 + baseConfidence * 10,
      maxPositions: 5,
      
      // ML-specific parameters
      momentumPeriod: config.lookbackPeriod,
      momentumThreshold: 0.02 + (baseConfidence - 0.5) * 0.02,
      breakoutPeriod: 20,
      volumeThreshold: 1.5
    }
  }

  // Calculate model performance
  private async calculateModelPerformance(model: any, trainingData: any): Promise<MLModelPerformance> {
    const { sequences, labels } = trainingData
    
    // Use the ML service to evaluate model performance
    const performance = await this.mlService.evaluateModel(model, trainingData)
    
    return {
      modelType: model.type,
      accuracy: performance.accuracy,
      precision: performance.precision,
      recall: performance.recall,
      f1Score: performance.f1Score,
      sharpeRatio: performance.sharpeRatio,
      totalReturn: performance.totalReturn,
      maxDrawdown: performance.maxDrawdown,
      winRate: performance.winRate,
      profitFactor: performance.profitFactor,
      trainingTime: performance.trainingTime,
      predictionTime: performance.predictionTime
    }
  }

  // Make prediction using trained model
  async makePrediction(
    symbol: string,
    modelType: MLModelType,
    lookbackPeriod: number = 50
  ): Promise<MLPrediction> {
    try {
      let model = this.models.get(modelType)
      
      // If model doesn't exist, train it automatically
      if (!model) {
        console.log(`🤖 Model ${modelType} not found. Training automatically...`)
        await this.autoTrainModel(symbol, modelType, lookbackPeriod)
        model = this.models.get(modelType)
        
        if (!model) {
          throw new Error(`Failed to train ${modelType} model for ${symbol}`)
        }
      }

      // Fetch recent data
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - lookbackPeriod * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const historicalData = await this.polygonService.getHistoricalData(
        symbol,
        'day',
        1,
        startDate,
        endDate
      )

      if (historicalData.length === 0) {
        throw new Error(`No historical data available for ${symbol}`)
      }

      // Extract features
      const features = await this.extractFeatures(historicalData, symbol)
      
      // Prepare input data
      const inputData = this.preparePredictionInput(features, lookbackPeriod)
      
      // Make prediction
      const prediction = await this.predictWithModel(model, inputData)
      
      // Calculate confidence and risk metrics
      const confidence = this.calculatePredictionConfidence(prediction, features)
      const riskScore = this.calculateRiskScore(prediction, features)
      
      // Calculate meaningful price change
      const currentPrice = features.price.close[features.price.close.length - 1]
      const priceChangeAmount = prediction.price - currentPrice
      const priceChangePercent = (priceChangeAmount / currentPrice) * 100
      
      const result = {
        timestamp: new Date().toISOString(),
        predictedDirection: prediction.direction,
        confidence: confidence,
        predictedPrice: prediction.price,
        priceChange: priceChangePercent, // Use percentage instead of absolute value
        volatility: features.price.volatility[features.price.volatility.length - 1],
        riskScore: riskScore,
        modelUsed: modelType,
        features: ['rsi', 'macd', 'sma20', 'sma50', 'bollingerBands', 'volume', 'price'] // Include key features
      }
      
      console.log('🔍 makePrediction - Final result:', result)
      
      return result

    } catch (error) {
      console.error('❌ ML Prediction Error:', error)
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Missing real-time technical indicators')) {
          throw new Error('ML prediction failed: Insufficient technical data. Please ensure the stock has enough historical data.')
        } else if (error.message.includes('Invalid market data')) {
          throw new Error('ML prediction failed: Market data unavailable. Please check if the stock symbol is valid.')
        } else if (error.message.includes('Polygon API')) {
          throw new Error('ML prediction failed: Data service error. Please check your internet connection and API configuration.')
        } else {
          throw new Error(`ML prediction failed: ${error.message}`)
        }
      } else {
        throw new Error('ML prediction failed: Unknown error occurred')
      }
    }
  }

  // Auto-train model when needed
  private async autoTrainModel(symbol: string, modelType: MLModelType, lookbackPeriod: number = 50): Promise<void> {
    try {
      console.log(`🚀 Auto-training ${modelType} model for ${symbol}...`)
      
      // Fetch training data (5 years of historical data for $29 plan)
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const historicalData = await this.polygonService.getHistoricalData(
        symbol,
        'day',
        1,
        startDate,
        endDate
      )

      if (historicalData.length < 100) {
        throw new Error(`Insufficient historical data for training (${historicalData.length} days, minimum 100 required)`)
      }

      // Create training configuration
      const config: MLStrategyConfig = {
        modelType,
        lookbackPeriod,
        predictionHorizon: 5,
        confidenceThreshold: 0.6,
        featureSelection: ['rsi', 'macd', 'sma20', 'sma50', 'bollingerBands'],
        hyperparameters: {
          learningRate: 0.001,
          batchSize: 32,
          epochs: 100
        }
      }

      // Extract features
      const features = await this.extractFeatures(historicalData, symbol)
      
      // Train the model
      const model = await this.trainModel(modelType, features, config)
      
      console.log(`✅ Auto-training completed for ${modelType} model`)
      
    } catch (error) {
      console.error(`❌ Auto-training failed for ${modelType} model:`, error)
      
      // Provide more specific error messages for training failures
      if (error instanceof Error) {
        if (error.message.includes('Insufficient historical data')) {
          throw new Error(`Auto-training failed: Not enough historical data for ${symbol}. Minimum 100 days required.`)
        } else if (error.message.includes('Polygon API')) {
          throw new Error(`Auto-training failed: Data service error for ${symbol}. Please check your API configuration.`)
        } else if (error.message.includes('Invalid market data')) {
          throw new Error(`Auto-training failed: Market data unavailable for ${symbol}. Please verify the stock symbol.`)
        } else {
          throw new Error(`Auto-training failed for ${modelType}: ${error.message}`)
        }
      } else {
        throw new Error(`Auto-training failed for ${modelType}: Unknown error occurred`)
      }
    }
  }

  // Prepare input data for prediction
  private preparePredictionInput(features: MLFeatures, lookbackPeriod: number): any {
    const latestIndex = features.price.close.length - 1
    
    return {
      technical: {
        rsi: features.technical.rsi.slice(-lookbackPeriod),
        macd: features.technical.macd.slice(-lookbackPeriod),
        macdSignal: features.technical.macdSignal.slice(-lookbackPeriod),
        sma20: features.technical.sma20.slice(-lookbackPeriod),
        sma50: features.technical.sma50.slice(-lookbackPeriod),
        bollingerUpper: features.technical.bollingerUpper.slice(-lookbackPeriod),
        bollingerLower: features.technical.bollingerLower.slice(-lookbackPeriod)
      },
      price: {
        close: features.price.close.slice(-lookbackPeriod),
        volume: features.price.volume.slice(-lookbackPeriod),
        returns: features.price.returns.slice(-lookbackPeriod),
        volatility: features.price.volatility.slice(-lookbackPeriod)
      },
      currentPrice: features.price.close[latestIndex]
    }
  }

  // Make prediction with trained model
  private async predictWithModel(model: any, inputData: any): Promise<any> {
    const currentPrice = inputData.currentPrice
    
    // Validate that we have a real trained model
    if (!model || !model.type) {
      throw new Error('No valid trained model available for prediction')
    }
    
    // Use the ML service to make predictions
    const prediction = await this.mlService.predict(model, inputData)
    
    console.log('🔍 predictWithModel - ML Service prediction:', prediction)
    
    return {
      direction: prediction.direction,
      price: prediction.price,
      priceChange: prediction.priceChange,
      score: prediction.confidence,
      confidence: prediction.confidence // Ensure confidence is available
    }
  }

  // Calculate prediction confidence
  private calculatePredictionConfidence(prediction: any, features: MLFeatures): number {
    const rsi = features.technical.rsi[features.technical.rsi.length - 1]
    const macd = features.technical.macd[features.technical.macd.length - 1]
    const volatility = features.price.volatility[features.price.volatility.length - 1]
    
    // Higher confidence for extreme RSI values
    const rsiConfidence = Math.abs(rsi - 50) / 50
    
    // Higher confidence for strong MACD signals
    const macdConfidence = Math.abs(macd) / 10
    
    // Lower confidence for high volatility (reduced penalty)
    const volatilityPenalty = Math.min(volatility * 5, 0.15) // Reduced from 10 to 5, max from 0.3 to 0.15
    
    // Use the confidence from the ML service prediction
    const baseConfidence = prediction.confidence || prediction.score || 0.5
    
    // Improved confidence calculation with better weighting
    const technicalBoost = (rsiConfidence + macdConfidence) / 2
    const adjustedConfidence = baseConfidence * (0.7 + technicalBoost * 0.3) - volatilityPenalty
    
    console.log('🔍 Confidence calculation:', {
      baseConfidence,
      rsiConfidence,
      macdConfidence,
      volatilityPenalty,
      technicalBoost,
      adjustedConfidence,
      finalConfidence: Math.max(0, Math.min(1, adjustedConfidence))
    })
    
    return Math.max(0, Math.min(1, adjustedConfidence))
  }

  // Calculate risk score
  private calculateRiskScore(prediction: any, features: MLFeatures): number {
    const volatility = features.price.volatility[features.price.volatility.length - 1]
    const atr = features.technical.atr[features.technical.atr.length - 1]
    const currentPrice = features.price.close[features.price.close.length - 1]
    
    // Normalize risk factors
    const volatilityRisk = Math.min(volatility * 100, 1)
    const atrRisk = Math.min(atr / currentPrice, 1)
    const predictionRisk = 1 - prediction.score
    
    // Weighted risk score
    const riskScore = volatilityRisk * 0.4 + atrRisk * 0.3 + predictionRisk * 0.3
    
    return Math.max(0, Math.min(1, riskScore))
  }

  // Get model performance
  getModelPerformance(modelType: MLModelType): MLModelPerformance | undefined {
    return this.modelPerformance.get(modelType)
  }

  // Get all model performances
  getAllModelPerformances(): MLModelPerformance[] {
    return Array.from(this.modelPerformance.values())
  }

  // Compare model performances
  compareModels(): { bestModel: MLModelType; comparison: any } {
    const performances = this.getAllModelPerformances()
    
    if (performances.length === 0) {
      throw new Error('No trained models available for comparison')
    }
    
    // Find best model based on Sharpe ratio
    const bestModel = performances.reduce((best, current) => 
      current.sharpeRatio > best.sharpeRatio ? current : best
    )
    
    const comparison = {
      byAccuracy: performances.sort((a, b) => b.accuracy - a.accuracy),
      bySharpeRatio: performances.sort((a, b) => b.sharpeRatio - a.sharpeRatio),
      byTotalReturn: performances.sort((a, b) => b.totalReturn - a.totalReturn),
      byWinRate: performances.sort((a, b) => b.winRate - a.winRate)
    }
    
    return {
      bestModel: bestModel.modelType,
      comparison
    }
  }

  // Technical indicator calculations (reused from strategy builder)
  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50
    
    let gains = 0
    let losses = 0
    
    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1]
      if (change > 0) gains += change
      else losses -= change
    }
    
    const avgGain = gains / period
    const avgLoss = losses / period
    
    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  private calculateMACD(prices: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number): { macd: number; signal: number; histogram: number } {
    if (prices.length < slowPeriod) return { macd: 0, signal: 0, histogram: 0 }
    
    const ema12 = this.calculateEMA(prices, fastPeriod)
    const ema26 = this.calculateEMA(prices, slowPeriod)
    const macd = ema12 - ema26
    
    const signal = macd * 0.9
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
    const d = k
    
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

export default MLStrategyGenerator
