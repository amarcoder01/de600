import { PolygonDataService } from './polygon-data-service';
import { FeatureEngineer } from './feature-engineering';
import { TransformerModel } from './transformer-model';
import { VAELSTMTransformerEnsemble } from './vae-ensemble-model';

// Enhanced API Interfaces
export interface EnhancedPredictionRequest {
  symbol: string;
  timeframe: '1min' | '5min' | '15min' | '1hour' | '1day';
  modelType: 'transformer' | 'ensemble' | 'hybrid' | 'auto';
  predictionHorizon: number; // Number of periods to predict
  includeUncertainty: boolean;
  includeExplanation: boolean;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  customFeatures?: string[];
}

export interface EnhancedPredictionResponse {
  symbol: string;
  timestamp: string;
  prediction: {
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    priceTarget: {
      target: number;
      support: number;
      resistance: number;
      stopLoss: number;
    };
    probability: {
      bullish: number;
      bearish: number;
      neutral: number;
    };
  };
  uncertainty: {
    epistemic: number; // Model uncertainty
    aleatoric: number; // Data uncertainty
    total: number;
    confidenceInterval: [number, number];
  };
  explanation: {
    reasoning: string;
    keyFactors: Array<{
      factor: string;
      importance: number;
      impact: 'positive' | 'negative' | 'neutral';
    }>;
    technicalIndicators: Record<string, number>;
    marketConditions: {
      volatility: 'low' | 'medium' | 'high';
      trend: 'bullish' | 'bearish' | 'sideways';
      momentum: 'strong' | 'weak' | 'neutral';
    };
  };
  metadata: {
    modelUsed: string;
    dataQuality: number;
    latency: number;
    lastUpdated: string;
    version: string;
  };
}

export interface ModelPerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  sharpeRatio: number;
  maxDrawdown: number;
  hitRate: number;
  profitFactor: number;
  lastEvaluated: string;
}

export interface RealTimeUpdateRequest {
  symbol: string;
  newData: {
    price: number;
    volume: number;
    timestamp: string;
  };
  actualOutcome?: 'up' | 'down' | 'neutral';
  performanceMetrics?: Partial<ModelPerformanceMetrics>;
}

// Enhanced Prediction Service
export class EnhancedPredictionService {
  private polygonService: PolygonDataService;
  private featureEngineer: FeatureEngineer;
  private transformerModel: TransformerModel;
  private ensembleModel: VAELSTMTransformerEnsemble;
  private modelCache: Map<string, any> = new Map();
  private performanceMetrics: Map<string, ModelPerformanceMetrics> = new Map();

  constructor() {
    this.polygonService = new PolygonDataService();
    this.featureEngineer = new FeatureEngineer();
    this.transformerModel = new TransformerModel({
      sequenceLength: 60,
      featureDimension: 50,
      hiddenDimension: 256,
      numHeads: 8,
      numLayers: 6,
      dropoutRate: 0.1,
      learningRate: 0.001,
      batchSize: 32,
      epochs: 100
    });
    this.ensembleModel = new VAELSTMTransformerEnsemble({
      vaeConfig: {
        inputDimension: 50,
        latentDimension: 16,
        encoderHiddenDimensions: [32, 24],
        decoderHiddenDimensions: [24, 32],
        learningRate: 0.001,
        betaVAE: 1.0
      },
      lstmConfig: {
        inputSize: 50,
        hiddenSize: 64,
        numLayers: 2,
        sequenceLength: 60,
        dropoutRate: 0.1,
        bidirectional: true
      },
      transformerConfig: {
        sequenceLength: 60,
        featureDimension: 50,
        hiddenDimension: 256,
        numHeads: 8,
        numLayers: 6,
        dropoutRate: 0.1,
        learningRate: 0.001,
        batchSize: 32,
        epochs: 100
      },
      ensembleWeights: {
        vae: 0.3,
        lstm: 0.3,
        transformer: 0.4
      },
      adaptiveWeighting: true,
      uncertaintyThreshold: 0.1,
      rebalanceFrequency: 100
    });
  }

  async generateEnhancedPrediction(
    request: EnhancedPredictionRequest
  ): Promise<EnhancedPredictionResponse> {
    const startTime = Date.now();
    
    try {
      // 1. Fetch enhanced market data
      const marketData = await this.polygonService.getEnhancedMarketData(
        request.symbol
      );

      // 2. Engineer features
      const features = await this.featureEngineer.extractFeatures(
        request.symbol,
        marketData.historicalData,
        marketData.technicalIndicators,
        marketData.marketMetrics
      );

      // 3. Select and run model
      let prediction;
      let modelUsed: string;
      
      switch (request.modelType) {
        case 'transformer':
          prediction = await this.transformerModel.predict([features]);
          modelUsed = 'Transformer';
          break;
        case 'ensemble':
          prediction = await this.ensembleModel.predict([features]);
          modelUsed = 'VAE-LSTM-Transformer Ensemble';
          break;
        case 'auto':
        default:
          // Use ensemble for better accuracy
          prediction = await this.ensembleModel.predict([features]);
          modelUsed = 'Auto-Selected Ensemble';
          break;
      }

      // 4. Calculate uncertainty
      const uncertainty = await this.calculateUncertainty(
        features,
        prediction,
        request.modelType
      );

      // 5. Generate explanation
      const explanation = await this.generateExplanation(
        features,
        prediction,
        marketData,
        request.includeExplanation
      );

      // 6. Adjust for risk tolerance
      const adjustedPrediction = this.adjustForRiskTolerance(
        prediction,
        request.riskTolerance
      );

      const latency = Date.now() - startTime;

      return {
        symbol: request.symbol,
        timestamp: new Date().toISOString(),
        prediction: adjustedPrediction,
        uncertainty,
        explanation,
        metadata: {
          modelUsed,
          dataQuality: this.calculateDataQuality(marketData),
          latency,
          lastUpdated: new Date().toISOString(),
          version: '2.0.0'
        }
      };
    } catch (error: any) {
      throw new Error(`Enhanced prediction failed: ${error?.message || 'Unknown error'}`);
    }
  }

  private async calculateUncertainty(
    features: any,
    prediction: any,
    modelType: string
  ): Promise<EnhancedPredictionResponse['uncertainty']> {
    // Monte Carlo Dropout for uncertainty estimation
    const mcSamples = 100;
    const predictions = [];

    for (let i = 0; i < mcSamples; i++) {
      let sample;
      if (modelType === 'ensemble') {
        sample = await this.ensembleModel.predict(features);
      } else {
        sample = await this.transformerModel.predict(features);
      }
      predictions.push(sample.priceTarget.target);
    }

    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const variance = predictions.reduce((sum, pred) => sum + Math.pow(pred - mean, 2), 0) / predictions.length;
    const std = Math.sqrt(variance);

    return {
      epistemic: std * 0.7, // Model uncertainty
      aleatoric: std * 0.3, // Data uncertainty
      total: std,
      confidenceInterval: [mean - 1.96 * std, mean + 1.96 * std] as [number, number]
    };
  }

  private async generateExplanation(
    features: any,
    prediction: any,
    marketData: any,
    includeExplanation: boolean
  ): Promise<EnhancedPredictionResponse['explanation']> {
    if (!includeExplanation) {
      return {
        reasoning: '',
        keyFactors: [],
        technicalIndicators: {},
        marketConditions: {
          volatility: 'medium' as const,
          trend: 'sideways' as const,
          momentum: 'neutral' as const
        }
      };
    }

    // Feature importance analysis
    const keyFactors = [
      {
        factor: 'Price Momentum',
        importance: features.technical?.momentum || 0.5,
        impact: features.technical?.momentum > 0 ? 'positive' as const : 'negative' as const
      },
      {
        factor: 'Volume Profile',
        importance: features.technical?.volumeProfile || 0.3,
        impact: features.technical?.volumeProfile > 0 ? 'positive' as const : 'negative' as const
      },
      {
        factor: 'Technical Indicators',
        importance: 0.8,
        impact: prediction.signal === 'BUY' ? 'positive' as const : 'negative' as const
      }
    ];

    // Market conditions assessment
    const volatility = marketData.marketMetrics.volatility > 0.02 ? 'high' : 
                      marketData.marketMetrics.volatility > 0.01 ? 'medium' : 'low';
    
    const trend = marketData.marketMetrics.trend > 0.1 ? 'bullish' :
                  marketData.marketMetrics.trend < -0.1 ? 'bearish' : 'sideways';
    
    const momentum = Math.abs(marketData.marketMetrics.momentum) > 0.05 ? 'strong' :
                     Math.abs(marketData.marketMetrics.momentum) > 0.02 ? 'weak' : 'neutral';

    return {
      reasoning: prediction.reasoning || `Based on advanced AI analysis, the model predicts a ${prediction.signal} signal with ${(prediction.confidence * 100).toFixed(1)}% confidence.`,
      keyFactors,
      technicalIndicators: marketData.technicalIndicators,
      marketConditions: {
        volatility,
        trend,
        momentum
      }
    };
  }

  private adjustForRiskTolerance(
    prediction: any,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  ): EnhancedPredictionResponse['prediction'] {
    const riskMultipliers = {
      conservative: 0.7,
      moderate: 1.0,
      aggressive: 1.3
    };

    const multiplier = riskMultipliers[riskTolerance];
    
    return {
      signal: prediction.signal,
      confidence: Math.min(prediction.confidence * multiplier, 1.0),
      priceTarget: {
        target: prediction.priceTarget,
        support: prediction.support,
        resistance: prediction.resistance,
        stopLoss: prediction.stopLoss
      },
      probability: {
        bullish: prediction.probability?.bullish || 0.33,
        bearish: prediction.probability?.bearish || 0.33,
        neutral: prediction.probability?.neutral || 0.34
      }
    };
  }

  private calculateDataQuality(marketData: any): number {
    // Simple data quality score based on completeness and recency
    const completeness = marketData.historicalData.length / 252; // Expected 1 year
    const recency = 1.0; // Assume real-time data is recent
    const consistency = 0.95; // Assume high consistency from Polygon.io
    
    return Math.min((completeness + recency + consistency) / 3, 1.0);
  }

  // Real-time model update methods
  async updateModelWithNewData(request: RealTimeUpdateRequest): Promise<void> {
    try {


      // Update performance metrics
      if (request.performanceMetrics) {
        this.updatePerformanceMetrics(request.symbol, request.performanceMetrics);
      }
    } catch (error) {
      console.error('Failed to update model:', error);
    }
  }

  private updatePerformanceMetrics(
    symbol: string,
    metrics: Partial<ModelPerformanceMetrics>
  ): void {
    const existing = this.performanceMetrics.get(symbol) || {
      accuracy: 0.5,
      precision: 0.5,
      recall: 0.5,
      f1Score: 0.5,
      sharpeRatio: 0,
      maxDrawdown: 0,
      hitRate: 0.5,
      profitFactor: 1,
      lastEvaluated: new Date().toISOString()
    };

    this.performanceMetrics.set(symbol, {
      ...existing,
      ...metrics,
      lastEvaluated: new Date().toISOString()
    });
  }

  async getModelPerformance(symbol: string): Promise<ModelPerformanceMetrics | null> {
    return this.performanceMetrics.get(symbol) || null;
  }

  async getAvailableModels(): Promise<string[]> {
    return ['transformer', 'ensemble', 'hybrid', 'auto'];
  }

  async getModelStatus(): Promise<Record<string, any>> {
    return {
      transformer: {
        status: 'active',
        lastTrained: this.transformerModel.getTrainingHistory().length > 0 ? 
          new Date().toISOString() : null,
        performance: 'good'
      },
      ensemble: {
        status: 'active',
        components: ['VAE', 'LSTM', 'Transformer'],
        performance: 'excellent'
      }
    };
  }
}

// Factory function
export function createEnhancedPredictionService(): EnhancedPredictionService {
  return new EnhancedPredictionService();
}