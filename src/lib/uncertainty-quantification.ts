// Import types - using any for now to avoid circular dependencies
type FeatureSet = any;
type TransformerPredictionOutput = any;
type CNNLSTMPredictionOutput = any;

// Uncertainty Quantification Configuration
export interface UncertaintyConfig {
  method: 'monte_carlo_dropout' | 'ensemble' | 'bayesian' | 'conformal';
  mcDropoutSamples: number;
  dropoutRate: number;
  ensembleSize: number;
  confidenceLevel: number;
  calibrationMethod: 'platt' | 'isotonic' | 'temperature';
  uncertaintyThreshold: number;
  enableDeepEnsemble: boolean;
  enableVariationalInference: boolean;
}

// Uncertainty Metrics
export interface UncertaintyMetrics {
  epistemic: number; // Model uncertainty (reducible with more data)
  aleatoric: number; // Data uncertainty (irreducible)
  total: number; // Total uncertainty
  confidence: number; // Model confidence (1 - uncertainty)
  entropy: number; // Prediction entropy
  mutualInformation: number; // Information gain
  calibrationError: number; // Calibration quality
  reliability: number; // Prediction reliability score
}

// Prediction Interval
export interface PredictionInterval {
  lower: number;
  upper: number;
  width: number;
  coverage: number;
  level: number; // Confidence level (e.g., 0.95 for 95%)
}

// Uncertainty Quantification Result
export interface UncertaintyResult {
  prediction: {
    mean: number;
    median: number;
    mode: number;
    std: number;
    variance: number;
  };
  intervals: {
    confidence_50: PredictionInterval;
    confidence_80: PredictionInterval;
    confidence_95: PredictionInterval;
    confidence_99: PredictionInterval;
  };
  metrics: UncertaintyMetrics;
  samples: number[];
  distribution: {
    type: 'normal' | 'skewed' | 'multimodal' | 'uniform';
    parameters: Record<string, number>;
    quantiles: Record<string, number>;
  };
  quality: {
    isReliable: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
    warnings: string[];
  };
}

// Monte Carlo Dropout Implementation
export class MonteCarloDropout {
  private config: UncertaintyConfig;
  private calibrationData: { predictions: number[]; targets: number[] };
  private isCalibrated: boolean;

  constructor(config: UncertaintyConfig) {
    this.config = config;
    this.calibrationData = { predictions: [], targets: [] };
    this.isCalibrated = false;
  }

  // Apply Monte Carlo Dropout to get uncertainty estimates
  async estimateUncertainty(
    features: FeatureSet,
    baseModel: any, // Model interface
    numSamples: number = this.config.mcDropoutSamples
  ): Promise<UncertaintyResult> {
    try {
      // Generate multiple predictions with dropout
      const samples = await this.generateMCDropoutSamples(features, baseModel, numSamples);
      
      // Calculate prediction statistics
      const predictionStats = this.calculatePredictionStatistics(samples);
      
      // Calculate uncertainty metrics
      const uncertaintyMetrics = this.calculateUncertaintyMetrics(samples);
      
      // Generate prediction intervals
      const intervals = this.calculatePredictionIntervals(samples);
      
      // Analyze distribution
      const distribution = this.analyzeDistribution(samples);
      
      // Assess prediction quality
      const quality = this.assessPredictionQuality(uncertaintyMetrics, samples);
      
      return {
        prediction: predictionStats,
        intervals,
        metrics: uncertaintyMetrics,
        samples,
        distribution,
        quality
      };
      
    } catch (error) {
      console.error('Uncertainty estimation failed:', error);
      throw new Error(`Failed to estimate uncertainty: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateMCDropoutSamples(
    features: FeatureSet,
    baseModel: any,
    numSamples: number
  ): Promise<number[]> {
    const samples: number[] = [];
    
    for (let i = 0; i < numSamples; i++) {
      try {
        // Apply dropout during inference
        const prediction = await this.forwardPassWithDropout(features, baseModel);
        samples.push(prediction);
      } catch (error) {
        console.warn(`Sample ${i} failed:`, error);
        // Use a fallback prediction
        samples.push(0.5); // Neutral prediction
      }
    }
    
    return samples;
  }

  private async forwardPassWithDropout(features: FeatureSet, baseModel: any): Promise<number> {
    // Simulate dropout by randomly masking features
    const droppedFeatures = this.applyDropout(features, this.config.dropoutRate);
    
    // Get prediction with dropped features
    // This is a simplified simulation - in practice, you'd modify the model's forward pass
    const prediction = await this.simulateModelPrediction(droppedFeatures);
    
    return prediction;
  }

  private applyDropout(features: FeatureSet, dropoutRate: number): FeatureSet {
    const droppedFeatures: FeatureSet = JSON.parse(JSON.stringify(features));
    
    // Apply dropout to technical indicators
    if (Math.random() < dropoutRate) {
      droppedFeatures.technical.rsi *= Math.random();
    }
    if (Math.random() < dropoutRate) {
      droppedFeatures.technical.macd *= Math.random();
    }
    if (Math.random() < dropoutRate) {
      droppedFeatures.technical.bollingerBands.upper *= Math.random();
    }
    
    // Apply dropout to statistical features
    if (Math.random() < dropoutRate) {
      droppedFeatures.statistical.volatility *= Math.random();
    }
    if (Math.random() < dropoutRate) {
      droppedFeatures.statistical.skewness *= Math.random();
    }
    
    // Apply dropout to market features
    if (Math.random() < dropoutRate && droppedFeatures.market.volume) {
      droppedFeatures.market.volume *= Math.random();
    }
    
    return droppedFeatures;
  }

  private async simulateModelPrediction(features: FeatureSet): Promise<number> {
    // Simplified prediction simulation
    // In practice, this would call the actual model
    const technicalScore = (features.technical.rsi - 50) / 50;
    const macdScore = Math.tanh(features.technical.macd);
    const volatilityScore = Math.min(features.statistical.volatility / 0.5, 1);
    
    const combinedScore = (technicalScore + macdScore - volatilityScore) / 3;
    
    // Add some noise to simulate model uncertainty
    const noise = (Math.random() - 0.5) * 0.2;
    
    return Math.max(0, Math.min(1, 0.5 + combinedScore + noise));
  }

  private calculatePredictionStatistics(samples: number[]): {
    mean: number;
    median: number;
    mode: number;
    std: number;
    variance: number;
  } {
    const sortedSamples = [...samples].sort((a, b) => a - b);
    const n = samples.length;
    
    // Mean
    const mean = samples.reduce((sum, val) => sum + val, 0) / n;
    
    // Median
    const median = n % 2 === 0
      ? (sortedSamples[n / 2 - 1] + sortedSamples[n / 2]) / 2
      : sortedSamples[Math.floor(n / 2)];
    
    // Mode (approximate using histogram)
    const mode = this.calculateMode(samples);
    
    // Variance and standard deviation
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const std = Math.sqrt(variance);
    
    return { mean, median, mode, std, variance };
  }

  private calculateMode(samples: number[]): number {
    // Create histogram with 20 bins
    const bins = 20;
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const binWidth = (max - min) / bins;
    
    const histogram = new Array(bins).fill(0);
    
    samples.forEach(sample => {
      const binIndex = Math.min(Math.floor((sample - min) / binWidth), bins - 1);
      histogram[binIndex]++;
    });
    
    // Find bin with maximum count
    const maxCount = Math.max(...histogram);
    const modeIndex = histogram.indexOf(maxCount);
    
    // Return center of mode bin
    return min + (modeIndex + 0.5) * binWidth;
  }

  private calculateUncertaintyMetrics(samples: number[]): UncertaintyMetrics {
    const n = samples.length;
    const mean = samples.reduce((sum, val) => sum + val, 0) / n;
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    
    // Epistemic uncertainty (model uncertainty)
    const epistemic = variance; // Simplified - variance of predictions
    
    // Aleatoric uncertainty (data uncertainty)
    // In practice, this would be estimated from the model's output variance
    const aleatoric = Math.min(0.1, variance * 0.5);
    
    // Total uncertainty
    const total = epistemic + aleatoric;
    
    // Confidence (1 - normalized uncertainty)
    const confidence = Math.max(0, 1 - total / 0.5);
    
    // Entropy calculation
    const entropy = this.calculateEntropy(samples);
    
    // Mutual information (simplified)
    const mutualInformation = Math.max(0, entropy - aleatoric);
    
    // Calibration error (if calibrated)
    const calibrationError = this.isCalibrated ? this.calculateCalibrationError(samples) : 0;
    
    // Reliability score
    const reliability = this.calculateReliability(confidence, entropy, calibrationError);
    
    return {
      epistemic,
      aleatoric,
      total,
      confidence,
      entropy,
      mutualInformation,
      calibrationError,
      reliability
    };
  }

  private calculateEntropy(samples: number[]): number {
    // Create probability distribution from samples
    const bins = 10;
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const binWidth = (max - min) / bins;
    
    const histogram = new Array(bins).fill(0);
    
    samples.forEach(sample => {
      const binIndex = Math.min(Math.floor((sample - min) / binWidth), bins - 1);
      histogram[binIndex]++;
    });
    
    // Convert to probabilities
    const probabilities = histogram.map(count => count / samples.length);
    
    // Calculate entropy
    return -probabilities.reduce((entropy, p) => {
      return p > 0 ? entropy + p * Math.log2(p) : entropy;
    }, 0);
  }

  private calculateCalibrationError(samples: number[]): number {
    // Simplified calibration error calculation
    // In practice, this would compare predicted probabilities with actual outcomes
    if (this.calibrationData.predictions.length === 0) {
      return 0;
    }
    
    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    const expectedAccuracy = mean;
    
    // Calculate actual accuracy from calibration data
    const actualAccuracy = this.calibrationData.predictions.reduce((sum, pred, i) => {
      const target = this.calibrationData.targets[i];
      return sum + (Math.abs(pred - target) < 0.1 ? 1 : 0);
    }, 0) / this.calibrationData.predictions.length;
    
    return Math.abs(expectedAccuracy - actualAccuracy);
  }

  private calculateReliability(confidence: number, entropy: number, calibrationError: number): number {
    // Combine multiple factors to assess reliability
    const confidenceScore = confidence;
    const entropyScore = Math.max(0, 1 - entropy / 4); // Normalize entropy
    const calibrationScore = Math.max(0, 1 - calibrationError);
    
    // Weighted average
    return (confidenceScore * 0.4 + entropyScore * 0.3 + calibrationScore * 0.3);
  }

  private calculatePredictionIntervals(samples: number[]): {
    confidence_50: PredictionInterval;
    confidence_80: PredictionInterval;
    confidence_95: PredictionInterval;
    confidence_99: PredictionInterval;
  } {
    const sortedSamples = [...samples].sort((a, b) => a - b);
    const n = samples.length;
    
    const createInterval = (level: number): PredictionInterval => {
      const alpha = 1 - level;
      const lowerIndex = Math.floor((alpha / 2) * n);
      const upperIndex = Math.floor((1 - alpha / 2) * n) - 1;
      
      const lower = sortedSamples[lowerIndex];
      const upper = sortedSamples[upperIndex];
      const width = upper - lower;
      
      // Calculate empirical coverage
      const coverage = (upperIndex - lowerIndex + 1) / n;
      
      return { lower, upper, width, coverage, level };
    };
    
    return {
      confidence_50: createInterval(0.50),
      confidence_80: createInterval(0.80),
      confidence_95: createInterval(0.95),
      confidence_99: createInterval(0.99)
    };
  }

  private analyzeDistribution(samples: number[]): {
    type: 'normal' | 'skewed' | 'multimodal' | 'uniform';
    parameters: Record<string, number>;
    quantiles: Record<string, number>;
  } {
    const sortedSamples = [...samples].sort((a, b) => a - b);
    const n = samples.length;
    
    // Calculate basic statistics
    const mean = samples.reduce((sum, val) => sum + val, 0) / n;
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const std = Math.sqrt(variance);
    
    // Calculate skewness
    const skewness = samples.reduce((sum, val) => sum + Math.pow((val - mean) / std, 3), 0) / n;
    
    // Calculate kurtosis
    const kurtosis = samples.reduce((sum, val) => sum + Math.pow((val - mean) / std, 4), 0) / n - 3;
    
    // Determine distribution type
    let type: 'normal' | 'skewed' | 'multimodal' | 'uniform';
    
    if (Math.abs(skewness) > 1) {
      type = 'skewed';
    } else if (this.isMultimodal(samples)) {
      type = 'multimodal';
    } else if (this.isUniform(samples)) {
      type = 'uniform';
    } else {
      type = 'normal';
    }
    
    // Calculate quantiles
    const quantiles = {
      q05: sortedSamples[Math.floor(0.05 * n)],
      q10: sortedSamples[Math.floor(0.10 * n)],
      q25: sortedSamples[Math.floor(0.25 * n)],
      q50: sortedSamples[Math.floor(0.50 * n)],
      q75: sortedSamples[Math.floor(0.75 * n)],
      q90: sortedSamples[Math.floor(0.90 * n)],
      q95: sortedSamples[Math.floor(0.95 * n)]
    };
    
    const parameters = {
      mean,
      std,
      variance,
      skewness,
      kurtosis,
      min: Math.min(...samples),
      max: Math.max(...samples)
    };
    
    return { type, parameters, quantiles };
  }

  private isMultimodal(samples: number[]): boolean {
    // Simple multimodality test using histogram
    const bins = 10;
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const binWidth = (max - min) / bins;
    
    const histogram = new Array(bins).fill(0);
    
    samples.forEach(sample => {
      const binIndex = Math.min(Math.floor((sample - min) / binWidth), bins - 1);
      histogram[binIndex]++;
    });
    
    // Count local maxima
    let peaks = 0;
    for (let i = 1; i < histogram.length - 1; i++) {
      if (histogram[i] > histogram[i - 1] && histogram[i] > histogram[i + 1]) {
        peaks++;
      }
    }
    
    return peaks > 1;
  }

  private isUniform(samples: number[]): boolean {
    // Test for uniformity using chi-square test (simplified)
    const bins = 10;
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const binWidth = (max - min) / bins;
    
    const histogram = new Array(bins).fill(0);
    
    samples.forEach(sample => {
      const binIndex = Math.min(Math.floor((sample - min) / binWidth), bins - 1);
      histogram[binIndex]++;
    });
    
    const expected = samples.length / bins;
    const chiSquare = histogram.reduce((sum, observed) => {
      return sum + Math.pow(observed - expected, 2) / expected;
    }, 0);
    
    // Critical value for 9 degrees of freedom at 0.05 significance level
    const criticalValue = 16.919;
    
    return chiSquare < criticalValue;
  }

  private assessPredictionQuality(
    metrics: UncertaintyMetrics,
    samples: number[]
  ): {
    isReliable: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
    warnings: string[];
  } {
    const warnings: string[] = [];
    
    // Check reliability
    const isReliable = metrics.reliability > 0.7 && metrics.confidence > 0.6;
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    
    if (metrics.total > 0.4) {
      riskLevel = 'critical';
      warnings.push('Very high uncertainty detected');
    } else if (metrics.total > 0.3) {
      riskLevel = 'high';
      warnings.push('High uncertainty detected');
    } else if (metrics.total > 0.2) {
      riskLevel = 'medium';
      warnings.push('Moderate uncertainty detected');
    } else {
      riskLevel = 'low';
    }
    
    // Additional warnings
    if (metrics.confidence < 0.5) {
      warnings.push('Low model confidence');
    }
    
    if (metrics.calibrationError > 0.1) {
      warnings.push('Poor calibration detected');
    }
    
    if (samples.length < 50) {
      warnings.push('Insufficient samples for reliable uncertainty estimation');
    }
    
    // Generate recommendation
    let recommendation: string;
    
    if (riskLevel === 'critical') {
      recommendation = 'Do not use this prediction for critical decisions. Consider retraining the model or gathering more data.';
    } else if (riskLevel === 'high') {
      recommendation = 'Use with extreme caution. Consider additional validation or ensemble methods.';
    } else if (riskLevel === 'medium') {
      recommendation = 'Acceptable for most use cases, but monitor performance closely.';
    } else {
      recommendation = 'Prediction appears reliable for decision making.';
    }
    
    return {
      isReliable,
      riskLevel,
      recommendation,
      warnings
    };
  }

  // Calibrate the uncertainty estimates
  calibrate(predictions: number[], targets: number[]): void {
    this.calibrationData.predictions = [...predictions];
    this.calibrationData.targets = [...targets];
    this.isCalibrated = true;
    
    console.log(`Calibrated uncertainty estimator with ${predictions.length} samples`);
  }

  // Update configuration
  updateConfig(newConfig: Partial<UncertaintyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): UncertaintyConfig {
    return { ...this.config };
  }

  // Reset calibration
  resetCalibration(): void {
    this.calibrationData = { predictions: [], targets: [] };
    this.isCalibrated = false;
  }
}

// Ensemble Uncertainty Estimator
export class EnsembleUncertaintyEstimator {
  private models: any[];
  private weights: number[];
  private config: UncertaintyConfig;

  constructor(models: any[], config: UncertaintyConfig, weights?: number[]) {
    this.models = models;
    this.config = config;
    this.weights = weights || new Array(models.length).fill(1 / models.length);
  }

  // Estimate uncertainty using ensemble disagreement
  async estimateEnsembleUncertainty(features: FeatureSet): Promise<UncertaintyResult> {
    try {
      // Get predictions from all models
      const predictions = await Promise.all(
        this.models.map(async (model, index) => {
          try {
            const prediction = await this.simulateModelPrediction(features, index);
            return prediction;
          } catch (error) {
            console.warn(`Model ${index} prediction failed:`, error);
            return 0.5; // Fallback prediction
          }
        })
      );
      
      // Calculate weighted ensemble prediction
      const weightedPredictions = predictions.map((pred, i) => pred * this.weights[i]);
      const ensemblePrediction = weightedPredictions.reduce((sum, pred) => sum + pred, 0);
      
      // Calculate ensemble disagreement as uncertainty
      const disagreement = this.calculateDisagreement(predictions, ensemblePrediction);
      
      // Create samples for uncertainty analysis
      const samples = this.generateEnsembleSamples(predictions, disagreement);
      
      // Use Monte Carlo Dropout for detailed analysis
      const mcDropout = new MonteCarloDropout(this.config);
      const result = await mcDropout.estimateUncertainty(features, null, samples.length);
      
      // Override samples with ensemble samples
      result.samples = samples;
      
      // Recalculate statistics with ensemble samples
      result.prediction = this.calculatePredictionStatistics(samples);
      result.intervals = this.calculatePredictionIntervals(samples);
      
      return result;
      
    } catch (error) {
      console.error('Ensemble uncertainty estimation failed:', error);
      throw new Error(`Failed to estimate ensemble uncertainty: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async simulateModelPrediction(features: FeatureSet, modelIndex: number): Promise<number> {
    // Simulate different model behaviors
    const baseScore = (features.technical.rsi - 50) / 50;
    const modelVariation = (modelIndex - this.models.length / 2) * 0.1;
    const noise = (Math.random() - 0.5) * 0.1;
    
    return Math.max(0, Math.min(1, 0.5 + baseScore + modelVariation + noise));
  }

  private calculateDisagreement(predictions: number[], ensemblePrediction: number): number {
    const variance = predictions.reduce((sum, pred) => {
      return sum + Math.pow(pred - ensemblePrediction, 2);
    }, 0) / predictions.length;
    
    return Math.sqrt(variance);
  }

  private generateEnsembleSamples(predictions: number[], disagreement: number): number[] {
    const samples: number[] = [];
    const numSamples = this.config.mcDropoutSamples;
    
    // Generate samples around each model's prediction
    for (let i = 0; i < numSamples; i++) {
      const modelIndex = Math.floor(Math.random() * predictions.length);
      const basePrediction = predictions[modelIndex];
      const noise = (Math.random() - 0.5) * disagreement * 2;
      
      samples.push(Math.max(0, Math.min(1, basePrediction + noise)));
    }
    
    return samples;
  }

  private calculatePredictionStatistics(samples: number[]): {
    mean: number;
    median: number;
    mode: number;
    std: number;
    variance: number;
  } {
    const sortedSamples = [...samples].sort((a, b) => a - b);
    const n = samples.length;
    
    const mean = samples.reduce((sum, val) => sum + val, 0) / n;
    const median = n % 2 === 0
      ? (sortedSamples[n / 2 - 1] + sortedSamples[n / 2]) / 2
      : sortedSamples[Math.floor(n / 2)];
    
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const std = Math.sqrt(variance);
    
    // Simple mode calculation
    const mode = median; // Simplified
    
    return { mean, median, mode, std, variance };
  }

  private calculatePredictionIntervals(samples: number[]): {
    confidence_50: PredictionInterval;
    confidence_80: PredictionInterval;
    confidence_95: PredictionInterval;
    confidence_99: PredictionInterval;
  } {
    const sortedSamples = [...samples].sort((a, b) => a - b);
    const n = samples.length;
    
    const createInterval = (level: number): PredictionInterval => {
      const alpha = 1 - level;
      const lowerIndex = Math.floor((alpha / 2) * n);
      const upperIndex = Math.floor((1 - alpha / 2) * n) - 1;
      
      const lower = sortedSamples[lowerIndex];
      const upper = sortedSamples[upperIndex];
      const width = upper - lower;
      const coverage = (upperIndex - lowerIndex + 1) / n;
      
      return { lower, upper, width, coverage, level };
    };
    
    return {
      confidence_50: createInterval(0.50),
      confidence_80: createInterval(0.80),
      confidence_95: createInterval(0.95),
      confidence_99: createInterval(0.99)
    };
  }

  // Update model weights
  updateWeights(newWeights: number[]): void {
    if (newWeights.length !== this.models.length) {
      throw new Error('Number of weights must match number of models');
    }
    
    // Normalize weights
    const sum = newWeights.reduce((s, w) => s + w, 0);
    this.weights = newWeights.map(w => w / sum);
  }

  // Get current weights
  getWeights(): number[] {
    return [...this.weights];
  }
}

// Factory function to create uncertainty quantification system
export function createUncertaintyQuantifier(customConfig?: Partial<UncertaintyConfig>): MonteCarloDropout {
  const defaultConfig: UncertaintyConfig = {
    method: 'monte_carlo_dropout',
    mcDropoutSamples: 100,
    dropoutRate: 0.1,
    ensembleSize: 5,
    confidenceLevel: 0.95,
    calibrationMethod: 'platt',
    uncertaintyThreshold: 0.3,
    enableDeepEnsemble: false,
    enableVariationalInference: false
  };

  const config = { ...defaultConfig, ...customConfig };
  return new MonteCarloDropout(config);
}

// Factory function to create ensemble uncertainty estimator
export function createEnsembleUncertaintyEstimator(
  models: any[],
  customConfig?: Partial<UncertaintyConfig>,
  weights?: number[]
): EnsembleUncertaintyEstimator {
  const defaultConfig: UncertaintyConfig = {
    method: 'ensemble',
    mcDropoutSamples: 100,
    dropoutRate: 0.1,
    ensembleSize: models.length,
    confidenceLevel: 0.95,
    calibrationMethod: 'platt',
    uncertaintyThreshold: 0.3,
    enableDeepEnsemble: true,
    enableVariationalInference: false
  };

  const config = { ...defaultConfig, ...customConfig };
  return new EnsembleUncertaintyEstimator(models, config, weights);
}