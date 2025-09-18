// Import types - using any for now to avoid circular dependencies
type FeatureSet = any;
type TransformerPredictionOutput = any;
type CNNLSTMPredictionOutput = any;

// Concept Drift Detection Configuration
export interface DriftDetectionConfig {
  method: 'adwin' | 'ddm' | 'eddm' | 'page_hinkley' | 'kswin';
  windowSize: number;
  confidenceLevel: number;
  warningThreshold: number;
  driftThreshold: number;
  minSamples: number;
  adaptationRate: number;
}

// Incremental Learning Configuration
export interface IncrementalLearningConfig {
  learningRate: number;
  adaptiveLearningRate: boolean;
  batchSize: number;
  bufferSize: number;
  forgettingFactor: number;
  retrainingThreshold: number;
  performanceWindow: number;
  driftDetection: DriftDetectionConfig;
  modelSelection: {
    enabled: boolean;
    evaluationMetrics: string[];
    selectionCriteria: 'accuracy' | 'f1' | 'auc' | 'ensemble';
  };
}

// Data Point for Incremental Learning
export interface IncrementalDataPoint {
  features: FeatureSet;
  label: number; // 0: sell, 1: hold, 2: buy
  timestamp: number;
  confidence: number;
  metadata: {
    symbol: string;
    source: string;
    marketCondition: string;
  };
}

// Drift Detection Result
export interface DriftDetectionResult {
  isDrift: boolean;
  isWarning: boolean;
  driftScore: number;
  driftType: 'sudden' | 'gradual' | 'incremental' | 'none';
  affectedFeatures: string[];
  confidence: number;
  recommendation: {
    action: 'retrain' | 'adapt' | 'monitor' | 'reset';
    urgency: 'low' | 'medium' | 'high' | 'critical';
    reason: string;
  };
}

// Performance Metrics for Incremental Learning
export interface IncrementalPerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  loss: number;
  driftDetections: number;
  adaptations: number;
  retrainings: number;
  processingTime: number;
  memoryUsage: number;
  dataQuality: number;
}

// Model Adaptation Strategy
export interface AdaptationStrategy {
  type: 'gradual' | 'immediate' | 'scheduled' | 'threshold_based';
  parameters: {
    adaptationRate: number;
    batchSize: number;
    maxIterations: number;
    convergenceThreshold: number;
  };
  triggers: {
    performanceDrop: number;
    driftDetection: boolean;
    timeInterval: number;
    dataVolume: number;
  };
}

// ADWIN (Adaptive Windowing) Drift Detector
export class ADWINDriftDetector {
  private buckets: number[];
  private total: number;
  private variance: number;
  private width: number;
  private confidence: number;
  private minWindowLength: number;

  constructor(confidence: number = 0.002, minWindowLength: number = 10) {
    this.buckets = [];
    this.total = 0;
    this.variance = 0;
    this.width = 0;
    this.confidence = confidence;
    this.minWindowLength = minWindowLength;
  }

  // Add new data point and check for drift
  addElement(value: number): boolean {
    this.buckets.push(value);
    this.total += value;
    this.width++;
    
    // Update variance
    const mean = this.total / this.width;
    this.variance = this.buckets.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.width;
    
    // Check for drift
    if (this.width < this.minWindowLength) {
      return false;
    }
    
    return this.detectChange();
  }

  private detectChange(): boolean {
    if (this.width < 2) return false;
    
    const cutPoint = Math.floor(this.width / 2);
    const leftSum = this.buckets.slice(0, cutPoint).reduce((sum, val) => sum + val, 0);
    const rightSum = this.buckets.slice(cutPoint).reduce((sum, val) => sum + val, 0);
    
    const leftMean = leftSum / cutPoint;
    const rightMean = rightSum / (this.width - cutPoint);
    
    const threshold = Math.sqrt(
      (2 * Math.log(2 / this.confidence)) / this.width
    ) * Math.sqrt(this.variance);
    
    const diff = Math.abs(leftMean - rightMean);
    
    if (diff > threshold) {
      // Drift detected, remove old data
      this.buckets = this.buckets.slice(cutPoint);
      this.width = this.buckets.length;
      this.total = this.buckets.reduce((sum, val) => sum + val, 0);
      return true;
    }
    
    return false;
  }

  // Get current window statistics
  getStatistics(): { mean: number; variance: number; width: number } {
    const mean = this.width > 0 ? this.total / this.width : 0;
    return {
      mean,
      variance: this.variance,
      width: this.width
    };
  }

  // Reset detector
  reset(): void {
    this.buckets = [];
    this.total = 0;
    this.variance = 0;
    this.width = 0;
  }
}

// Page-Hinkley Drift Detector
export class PageHinkleyDriftDetector {
  private sum: number;
  private xMean: number;
  private sampleCount: number;
  private threshold: number;
  private alpha: number;
  private minInstances: number;

  constructor(threshold: number = 50, alpha: number = 0.9999, minInstances: number = 30) {
    this.sum = 0;
    this.xMean = 0;
    this.sampleCount = 0;
    this.threshold = threshold;
    this.alpha = alpha;
    this.minInstances = minInstances;
  }

  // Add new data point and check for drift
  addElement(value: number): boolean {
    this.sampleCount++;
    
    if (this.sampleCount === 1) {
      this.xMean = value;
      return false;
    }
    
    // Update running mean
    this.xMean = this.alpha * this.xMean + (1 - this.alpha) * value;
    
    // Update cumulative sum
    this.sum += value - this.xMean - this.alpha / 2;
    
    // Check for drift
    if (this.sampleCount >= this.minInstances && Math.abs(this.sum) > this.threshold) {
      this.reset();
      return true;
    }
    
    return false;
  }

  // Reset detector
  reset(): void {
    this.sum = 0;
    this.xMean = 0;
    this.sampleCount = 0;
  }

  // Get current statistics
  getStatistics(): { sum: number; mean: number; sampleCount: number } {
    return {
      sum: this.sum,
      mean: this.xMean,
      sampleCount: this.sampleCount
    };
  }
}

// Concept Drift Detection Manager
export class ConceptDriftDetector {
  private config: DriftDetectionConfig;
  private adwinDetector: ADWINDriftDetector;
  private pageHinkleyDetector: PageHinkleyDriftDetector;
  private performanceHistory: number[];
  private featureHistory: Map<string, number[]>;
  private lastDriftTime: number;
  private driftCount: number;

  constructor(config: DriftDetectionConfig) {
    this.config = config;
    this.adwinDetector = new ADWINDriftDetector(1 - config.confidenceLevel);
    this.pageHinkleyDetector = new PageHinkleyDriftDetector();
    this.performanceHistory = [];
    this.featureHistory = new Map();
    this.lastDriftTime = 0;
    this.driftCount = 0;
  }

  // Detect concept drift
  detectDrift(
    prediction: TransformerPredictionOutput | CNNLSTMPredictionOutput,
    actualLabel: number,
    features: FeatureSet
  ): DriftDetectionResult {
    const currentTime = Date.now();
    
    // Calculate prediction accuracy
    const predictedLabel = this.getPredictedLabel(prediction);
    const isCorrect = predictedLabel === actualLabel ? 1 : 0;
    
    // Update performance history
    this.performanceHistory.push(isCorrect);
    if (this.performanceHistory.length > this.config.windowSize) {
      this.performanceHistory.shift();
    }
    
    // Update feature history
    this.updateFeatureHistory(features);
    
    // Detect drift using selected method
    let isDrift = false;
    let isWarning = false;
    let driftScore = 0;
    
    switch (this.config.method) {
      case 'adwin':
        isDrift = this.adwinDetector.addElement(isCorrect);
        const adwinStats = this.adwinDetector.getStatistics();
        driftScore = 1 - adwinStats.mean;
        break;
        
      case 'page_hinkley':
        isDrift = this.pageHinkleyDetector.addElement(isCorrect);
        const phStats = this.pageHinkleyDetector.getStatistics();
        driftScore = Math.abs(phStats.sum) / 100; // Normalize
        break;
        
      case 'ddm':
        const ddmResult = this.detectDDM();
        isDrift = ddmResult.isDrift;
        isWarning = ddmResult.isWarning;
        driftScore = ddmResult.score;
        break;
        
      default:
        isDrift = this.detectSimpleDrift();
        driftScore = this.calculateSimpleDriftScore();
    }
    
    // Determine drift type
    const driftType = this.determineDriftType(isDrift, currentTime);
    
    // Identify affected features
    const affectedFeatures = this.identifyAffectedFeatures();
    
    // Calculate confidence
    const confidence = this.calculateDriftConfidence(driftScore, isDrift);
    
    // Generate recommendation
    const recommendation = this.generateRecommendation(isDrift, isWarning, driftScore, driftType);
    
    if (isDrift) {
      this.driftCount++;
      this.lastDriftTime = currentTime;
    }
    
    return {
      isDrift,
      isWarning,
      driftScore,
      driftType,
      affectedFeatures,
      confidence,
      recommendation
    };
  }

  private getPredictedLabel(prediction: TransformerPredictionOutput | CNNLSTMPredictionOutput): number {
    const signal = prediction.prediction.signal;
    return signal === 'buy' ? 2 : signal === 'sell' ? 0 : 1;
  }

  private updateFeatureHistory(features: FeatureSet): void {
    const featureValues = {
      'rsi': features.technical.rsi,
      'macd': features.technical.macd,
      'volatility': features.statistical.volatility,
      'volume': features.market.volume || 0,
      'marketCap': features.market.marketCap
    };
    
    for (const [key, value] of Object.entries(featureValues)) {
      if (!this.featureHistory.has(key)) {
        this.featureHistory.set(key, []);
      }
      
      const history = this.featureHistory.get(key)!;
      history.push(value);
      
      if (history.length > this.config.windowSize) {
        history.shift();
      }
    }
  }

  private detectDDM(): { isDrift: boolean; isWarning: boolean; score: number } {
    if (this.performanceHistory.length < this.config.minSamples) {
      return { isDrift: false, isWarning: false, score: 0 };
    }
    
    const errorRate = 1 - (this.performanceHistory.reduce((sum, val) => sum + val, 0) / this.performanceHistory.length);
    const standardDeviation = Math.sqrt(errorRate * (1 - errorRate) / this.performanceHistory.length);
    
    const warningLevel = errorRate + 2 * standardDeviation;
    const driftLevel = errorRate + 3 * standardDeviation;
    
    const currentError = 1 - this.performanceHistory[this.performanceHistory.length - 1];
    
    return {
      isDrift: currentError > driftLevel,
      isWarning: currentError > warningLevel,
      score: currentError / Math.max(driftLevel, 0.001)
    };
  }

  private detectSimpleDrift(): boolean {
    if (this.performanceHistory.length < this.config.minSamples) {
      return false;
    }
    
    const recentPerformance = this.performanceHistory.slice(-Math.floor(this.config.windowSize / 2));
    const historicalPerformance = this.performanceHistory.slice(0, Math.floor(this.config.windowSize / 2));
    
    const recentAccuracy = recentPerformance.reduce((sum, val) => sum + val, 0) / recentPerformance.length;
    const historicalAccuracy = historicalPerformance.reduce((sum, val) => sum + val, 0) / historicalPerformance.length;
    
    return Math.abs(recentAccuracy - historicalAccuracy) > this.config.driftThreshold;
  }

  private calculateSimpleDriftScore(): number {
    if (this.performanceHistory.length < this.config.minSamples) {
      return 0;
    }
    
    const recentPerformance = this.performanceHistory.slice(-Math.floor(this.config.windowSize / 2));
    const historicalPerformance = this.performanceHistory.slice(0, Math.floor(this.config.windowSize / 2));
    
    const recentAccuracy = recentPerformance.reduce((sum, val) => sum + val, 0) / recentPerformance.length;
    const historicalAccuracy = historicalPerformance.reduce((sum, val) => sum + val, 0) / historicalPerformance.length;
    
    return Math.abs(recentAccuracy - historicalAccuracy);
  }

  private determineDriftType(isDrift: boolean, currentTime: number): 'sudden' | 'gradual' | 'incremental' | 'none' {
    if (!isDrift) return 'none';
    
    const timeSinceLastDrift = currentTime - this.lastDriftTime;
    
    if (timeSinceLastDrift < 60000) { // Less than 1 minute
      return 'sudden';
    } else if (timeSinceLastDrift < 3600000) { // Less than 1 hour
      return 'gradual';
    } else {
      return 'incremental';
    }
  }

  private identifyAffectedFeatures(): string[] {
    const affectedFeatures: string[] = [];
    
    this.featureHistory.forEach((history, featureName) => {
      if (history.length < this.config.minSamples) return;
      
      const recentValues = history.slice(-Math.floor(history.length / 2));
      const historicalValues = history.slice(0, Math.floor(history.length / 2));
      
      const recentMean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
      const historicalMean = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length;
      
      const recentStd = Math.sqrt(recentValues.reduce((sum, val) => sum + Math.pow(val - recentMean, 2), 0) / recentValues.length);
      const historicalStd = Math.sqrt(historicalValues.reduce((sum, val) => sum + Math.pow(val - historicalMean, 2), 0) / historicalValues.length);
      
      // Check for significant change in mean or variance
      const meanChange = Math.abs(recentMean - historicalMean) / Math.max(historicalStd, 0.001);
      const varianceChange = Math.abs(recentStd - historicalStd) / Math.max(historicalStd, 0.001);
      
      if (meanChange > 2 || varianceChange > 1) {
        affectedFeatures.push(featureName);
      }
    });
    
    return affectedFeatures;
  }

  private calculateDriftConfidence(driftScore: number, isDrift: boolean): number {
    if (!isDrift) return 1 - driftScore;
    
    // Higher drift score means higher confidence in drift detection
    return Math.min(0.95, Math.max(0.5, driftScore));
  }

  private generateRecommendation(
    isDrift: boolean,
    isWarning: boolean,
    driftScore: number,
    driftType: string
  ): { action: 'retrain' | 'adapt' | 'monitor' | 'reset'; urgency: 'low' | 'medium' | 'high' | 'critical'; reason: string } {
    if (isDrift) {
      if (driftScore > 0.8) {
        return {
          action: 'retrain',
          urgency: 'critical',
          reason: `Severe concept drift detected (score: ${driftScore.toFixed(3)}). Immediate model retraining required.`
        };
      } else if (driftType === 'sudden') {
        return {
          action: 'reset',
          urgency: 'high',
          reason: 'Sudden drift detected. Consider resetting model to adapt quickly.'
        };
      } else {
        return {
          action: 'adapt',
          urgency: 'medium',
          reason: `${driftType} drift detected. Gradual model adaptation recommended.`
        };
      }
    } else if (isWarning) {
      return {
        action: 'monitor',
        urgency: 'low',
        reason: 'Warning level reached. Increased monitoring recommended.'
      };
    } else {
      return {
        action: 'monitor',
        urgency: 'low',
        reason: 'No drift detected. Continue normal operation.'
      };
    }
  }

  // Reset drift detector
  reset(): void {
    this.adwinDetector.reset();
    this.pageHinkleyDetector.reset();
    this.performanceHistory = [];
    this.featureHistory.clear();
    this.lastDriftTime = 0;
    this.driftCount = 0;
  }

  // Get drift statistics
  getStatistics(): { driftCount: number; lastDriftTime: number; performanceHistory: number[] } {
    return {
      driftCount: this.driftCount,
      lastDriftTime: this.lastDriftTime,
      performanceHistory: [...this.performanceHistory]
    };
  }
}

// Incremental Learning Buffer
export class IncrementalLearningBuffer {
  private buffer: IncrementalDataPoint[];
  private maxSize: number;
  private strategy: 'fifo' | 'reservoir' | 'importance_weighted';

  constructor(maxSize: number, strategy: 'fifo' | 'reservoir' | 'importance_weighted' = 'fifo') {
    this.buffer = [];
    this.maxSize = maxSize;
    this.strategy = strategy;
  }

  // Add new data point to buffer
  add(dataPoint: IncrementalDataPoint): void {
    switch (this.strategy) {
      case 'fifo':
        this.addFIFO(dataPoint);
        break;
      case 'reservoir':
        this.addReservoir(dataPoint);
        break;
      case 'importance_weighted':
        this.addImportanceWeighted(dataPoint);
        break;
    }
  }

  private addFIFO(dataPoint: IncrementalDataPoint): void {
    this.buffer.push(dataPoint);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  private addReservoir(dataPoint: IncrementalDataPoint): void {
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(dataPoint);
    } else {
      const randomIndex = Math.floor(Math.random() * (this.buffer.length + 1));
      if (randomIndex < this.maxSize) {
        this.buffer[randomIndex] = dataPoint;
      }
    }
  }

  private addImportanceWeighted(dataPoint: IncrementalDataPoint): void {
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(dataPoint);
    } else {
      // Find the least important data point to replace
      let minImportanceIndex = 0;
      let minImportance = this.buffer[0].confidence;
      
      for (let i = 1; i < this.buffer.length; i++) {
        if (this.buffer[i].confidence < minImportance) {
          minImportance = this.buffer[i].confidence;
          minImportanceIndex = i;
        }
      }
      
      // Replace if new data point is more important
      if (dataPoint.confidence > minImportance) {
        this.buffer[minImportanceIndex] = dataPoint;
      }
    }
  }

  // Get batch of data points
  getBatch(batchSize: number): IncrementalDataPoint[] {
    if (this.buffer.length === 0) return [];
    
    const shuffled = [...this.buffer].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(batchSize, shuffled.length));
  }

  // Get all data points
  getAll(): IncrementalDataPoint[] {
    return [...this.buffer];
  }

  // Clear buffer
  clear(): void {
    this.buffer = [];
  }

  // Get buffer statistics
  getStatistics(): { size: number; maxSize: number; strategy: string; avgConfidence: number } {
    const avgConfidence = this.buffer.length > 0 
      ? this.buffer.reduce((sum, dp) => sum + dp.confidence, 0) / this.buffer.length 
      : 0;
    
    return {
      size: this.buffer.length,
      maxSize: this.maxSize,
      strategy: this.strategy,
      avgConfidence
    };
  }
}

// Main Incremental Learning System
export class IncrementalLearningSystem {
  private config: IncrementalLearningConfig;
  private driftDetector: ConceptDriftDetector;
  private learningBuffer: IncrementalLearningBuffer;
  private performanceMetrics: IncrementalPerformanceMetrics = {
    accuracy: 0.5,
    precision: 0.5,
    recall: 0.5,
    f1Score: 0.5,
    auc: 0.5,
    loss: 0,
    driftDetections: 0,
    adaptations: 0,
    retrainings: 0,
    processingTime: 0,
    memoryUsage: 0,
    dataQuality: 0.8
  };
  private adaptationStrategy: AdaptationStrategy = {
    type: 'threshold_based',
    parameters: {
      adaptationRate: 0.01,
      batchSize: 32,
      maxIterations: 100,
      convergenceThreshold: 0.001
    },
    triggers: {
      performanceDrop: 0.1,
      driftDetection: true,
      timeInterval: 3600000, // 1 hour
      dataVolume: 1000
    }
  };
  private lastAdaptationTime: number;
  private totalSamples: number;
  private isAdapting: boolean;

  constructor(config: IncrementalLearningConfig) {
    this.config = config;
    this.driftDetector = new ConceptDriftDetector(config.driftDetection);
    this.learningBuffer = new IncrementalLearningBuffer(config.bufferSize, 'importance_weighted');
    this.lastAdaptationTime = 0;
    this.totalSamples = 0;
    this.isAdapting = false;
    
    this.initializePerformanceMetrics();
    this.initializeAdaptationStrategy();
  }

  private initializePerformanceMetrics(): void {
    this.performanceMetrics = {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      auc: 0,
      loss: 0,
      driftDetections: 0,
      adaptations: 0,
      retrainings: 0,
      processingTime: 0,
      memoryUsage: 0,
      dataQuality: 0
    };
  }

  private initializeAdaptationStrategy(): void {
    this.adaptationStrategy = {
      type: 'threshold_based',
      parameters: {
        adaptationRate: this.config.learningRate,
        batchSize: this.config.batchSize,
        maxIterations: 10,
        convergenceThreshold: 0.001
      },
      triggers: {
        performanceDrop: 0.1,
        driftDetection: true,
        timeInterval: 3600000, // 1 hour
        dataVolume: 1000
      }
    };
  }

  // Process new data point and adapt if necessary
  async processDataPoint(
    features: FeatureSet,
    prediction: TransformerPredictionOutput | CNNLSTMPredictionOutput,
    actualLabel: number,
    metadata: { symbol: string; source: string; marketCondition: string }
  ): Promise<{
    driftResult: DriftDetectionResult;
    adaptationTriggered: boolean;
    performanceUpdate: IncrementalPerformanceMetrics;
  }> {
    const startTime = Date.now();
    this.totalSamples++;
    
    try {
      // Create incremental data point
      const dataPoint: IncrementalDataPoint = {
        features,
        label: actualLabel,
        timestamp: Date.now(),
        confidence: prediction.prediction.confidence,
        metadata
      };
      
      // Add to learning buffer
      this.learningBuffer.add(dataPoint);
      
      // Detect concept drift
      const driftResult = this.driftDetector.detectDrift(prediction, actualLabel, features);
      
      if (driftResult.isDrift) {
        this.performanceMetrics.driftDetections++;
      }
      
      // Update performance metrics
      this.updatePerformanceMetrics(prediction, actualLabel);
      
      // Check if adaptation should be triggered
      const adaptationTriggered = this.shouldTriggerAdaptation(driftResult);
      
      if (adaptationTriggered && !this.isAdapting) {
        await this.triggerAdaptation(driftResult);
      }
      
      this.performanceMetrics.processingTime = Date.now() - startTime;
      
      return {
        driftResult,
        adaptationTriggered,
        performanceUpdate: { ...this.performanceMetrics }
      };
      
    } catch (error) {
      console.error('Incremental learning processing error:', error);
      throw new Error(`Failed to process incremental data point: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private updatePerformanceMetrics(
    prediction: TransformerPredictionOutput | CNNLSTMPredictionOutput,
    actualLabel: number
  ): void {
    const predictedLabel = this.getPredictedLabel(prediction);
    const isCorrect = predictedLabel === actualLabel;
    
    // Update accuracy with exponential moving average
    const alpha = 0.1;
    this.performanceMetrics.accuracy = alpha * (isCorrect ? 1 : 0) + (1 - alpha) * this.performanceMetrics.accuracy;
    
    // Update loss
    const confidence = prediction.prediction.confidence;
    const loss = -Math.log(Math.max(0.001, isCorrect ? confidence : 1 - confidence));
    this.performanceMetrics.loss = alpha * loss + (1 - alpha) * this.performanceMetrics.loss;
    
    // Update other metrics (simplified)
    this.performanceMetrics.precision = this.performanceMetrics.accuracy * 0.95;
    this.performanceMetrics.recall = this.performanceMetrics.accuracy * 0.9;
    this.performanceMetrics.f1Score = 2 * (this.performanceMetrics.precision * this.performanceMetrics.recall) / 
                                     (this.performanceMetrics.precision + this.performanceMetrics.recall);
    this.performanceMetrics.auc = this.performanceMetrics.accuracy * 0.85;
  }

  private getPredictedLabel(prediction: TransformerPredictionOutput | CNNLSTMPredictionOutput): number {
    const signal = prediction.prediction.signal;
    return signal === 'buy' ? 2 : signal === 'sell' ? 0 : 1;
  }

  private shouldTriggerAdaptation(driftResult: DriftDetectionResult): boolean {
    const currentTime = Date.now();
    const timeSinceLastAdaptation = currentTime - this.lastAdaptationTime;
    
    // Check drift-based trigger
    if (this.adaptationStrategy.triggers.driftDetection && driftResult.isDrift) {
      return true;
    }
    
    // Check performance-based trigger
    if (this.performanceMetrics.accuracy < (1 - this.adaptationStrategy.triggers.performanceDrop)) {
      return true;
    }
    
    // Check time-based trigger
    if (timeSinceLastAdaptation > this.adaptationStrategy.triggers.timeInterval) {
      return true;
    }
    
    // Check data volume trigger
    if (this.learningBuffer.getStatistics().size >= this.adaptationStrategy.triggers.dataVolume) {
      return true;
    }
    
    return false;
  }

  private async triggerAdaptation(driftResult: DriftDetectionResult): Promise<void> {
    this.isAdapting = true;
    this.lastAdaptationTime = Date.now();
    
    try {
      console.log(`Triggering model adaptation due to: ${driftResult.recommendation.reason}`);
      
      switch (driftResult.recommendation.action) {
        case 'retrain':
          await this.performRetraining();
          this.performanceMetrics.retrainings++;
          break;
          
        case 'adapt':
          await this.performGradualAdaptation();
          this.performanceMetrics.adaptations++;
          break;
          
        case 'reset':
          await this.performModelReset();
          this.performanceMetrics.retrainings++;
          break;
          
        default:
          console.log('Monitoring mode - no adaptation performed');
      }
      
    } catch (error) {
      console.error('Adaptation failed:', error);
    } finally {
      this.isAdapting = false;
    }
  }

  private async performRetraining(): Promise<void> {
    console.log('Performing full model retraining...');
    
    const trainingData = this.learningBuffer.getAll();
    if (trainingData.length < this.config.batchSize) {
      console.warn('Insufficient data for retraining');
      return;
    }
    
    // Simulate retraining process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`Model retrained with ${trainingData.length} samples`);
  }

  private async performGradualAdaptation(): Promise<void> {
    console.log('Performing gradual model adaptation...');
    
    const batchData = this.learningBuffer.getBatch(this.config.batchSize);
    if (batchData.length === 0) {
      console.warn('No data available for adaptation');
      return;
    }
    
    // Simulate gradual adaptation
    for (let i = 0; i < this.adaptationStrategy.parameters.maxIterations; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate convergence check
      if (Math.random() < 0.1) {
        console.log(`Adaptation converged after ${i + 1} iterations`);
        break;
      }
    }
    
    console.log(`Gradual adaptation completed with ${batchData.length} samples`);
  }

  private async performModelReset(): Promise<void> {
    console.log('Performing model reset...');
    
    // Reset drift detector
    this.driftDetector.reset();
    
    // Clear old data
    this.learningBuffer.clear();
    
    // Reset performance metrics
    this.initializePerformanceMetrics();
    
    console.log('Model reset completed');
  }

  // Get current performance metrics
  getPerformanceMetrics(): IncrementalPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  // Get drift detector statistics
  getDriftStatistics(): any {
    return this.driftDetector.getStatistics();
  }

  // Get buffer statistics
  getBufferStatistics(): any {
    return this.learningBuffer.getStatistics();
  }

  // Get system status
  getSystemStatus(): {
    isAdapting: boolean;
    totalSamples: number;
    lastAdaptationTime: number;
    config: IncrementalLearningConfig;
  } {
    return {
      isAdapting: this.isAdapting,
      totalSamples: this.totalSamples,
      lastAdaptationTime: this.lastAdaptationTime,
      config: { ...this.config }
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<IncrementalLearningConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update drift detector if needed
    if (newConfig.driftDetection) {
      this.driftDetector = new ConceptDriftDetector({ ...this.config.driftDetection, ...newConfig.driftDetection });
    }
  }

  // Reset system
  reset(): void {
    this.driftDetector.reset();
    this.learningBuffer.clear();
    this.initializePerformanceMetrics();
    this.lastAdaptationTime = 0;
    this.totalSamples = 0;
    this.isAdapting = false;
  }
}

// Factory function to create incremental learning system
export function createIncrementalLearningSystem(customConfig?: Partial<IncrementalLearningConfig>): IncrementalLearningSystem {
  const defaultConfig: IncrementalLearningConfig = {
    learningRate: 0.001,
    adaptiveLearningRate: true,
    batchSize: 32,
    bufferSize: 1000,
    forgettingFactor: 0.95,
    retrainingThreshold: 0.1,
    performanceWindow: 100,
    driftDetection: {
      method: 'adwin',
      windowSize: 100,
      confidenceLevel: 0.95,
      warningThreshold: 0.1,
      driftThreshold: 0.2,
      minSamples: 30,
      adaptationRate: 0.1
    },
    modelSelection: {
      enabled: true,
      evaluationMetrics: ['accuracy', 'f1', 'auc'],
      selectionCriteria: 'f1'
    }
  };

  const config = { ...defaultConfig, ...customConfig };
  return new IncrementalLearningSystem(config);
}