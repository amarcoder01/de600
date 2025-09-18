/**
 * Performance Monitoring and Evaluation Framework
 * Provides comprehensive tracking of model performance, accuracy metrics, and system health
 */

export interface PerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mse: number;
  mae: number;
  rmse: number;
  mape: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  volatility: number;
  beta: number;
  alpha: number;
  informationRatio: number;
}

export interface PredictionAccuracy {
  symbol: string;
  predictionType: string;
  timestamp: number;
  predicted: number;
  actual: number;
  error: number;
  percentError: number;
  direction: 'up' | 'down' | 'neutral';
  directionCorrect: boolean;
  confidence: number;
  timeframe: string;
}

export interface ModelPerformance {
  modelId: string;
  modelType: string;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  avgError: number;
  avgConfidence: number;
  lastUpdated: number;
  performanceHistory: PerformanceMetrics[];
  recentAccuracy: PredictionAccuracy[];
}

export interface SystemHealth {
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  apiLatency: number;
  errorRate: number;
  requestCount: number;
  cacheHitRate: number;
  dataFreshness: number;
  modelLoadTime: number;
  predictionLatency: number;
}

export interface AlertConfig {
  accuracyThreshold: number;
  errorRateThreshold: number;
  latencyThreshold: number;
  memoryThreshold: number;
  enableEmailAlerts: boolean;
  enableSlackAlerts: boolean;
  alertCooldown: number;
}

export interface MonitoringConfig {
  metricsRetentionDays: number;
  performanceWindowSize: number;
  alertConfig: AlertConfig;
  enableRealTimeMonitoring: boolean;
  monitoringInterval: number;
  enableDetailedLogging: boolean;
}

export interface Alert {
  id: string;
  type: 'accuracy' | 'error_rate' | 'latency' | 'memory' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  metadata: Record<string, any>;
}

export interface PerformanceReport {
  reportId: string;
  generatedAt: number;
  timeRange: { start: number; end: number };
  overallMetrics: PerformanceMetrics;
  modelPerformances: ModelPerformance[];
  systemHealth: SystemHealth;
  alerts: Alert[];
  recommendations: string[];
  trends: {
    accuracy: 'improving' | 'declining' | 'stable';
    latency: 'improving' | 'declining' | 'stable';
    errorRate: 'improving' | 'declining' | 'stable';
  };
}

/**
 * Metrics Calculator for various performance indicators
 */
export class MetricsCalculator {
  static calculateAccuracy(predictions: PredictionAccuracy[]): number {
    if (predictions.length === 0) return 0;
    const correct = predictions.filter(p => p.directionCorrect).length;
    return correct / predictions.length;
  }

  static calculateMSE(predictions: PredictionAccuracy[]): number {
    if (predictions.length === 0) return 0;
    const sumSquaredErrors = predictions.reduce((sum, p) => sum + Math.pow(p.error, 2), 0);
    return sumSquaredErrors / predictions.length;
  }

  static calculateMAE(predictions: PredictionAccuracy[]): number {
    if (predictions.length === 0) return 0;
    const sumAbsErrors = predictions.reduce((sum, p) => sum + Math.abs(p.error), 0);
    return sumAbsErrors / predictions.length;
  }

  static calculateMAPE(predictions: PredictionAccuracy[]): number {
    if (predictions.length === 0) return 0;
    const sumPercentErrors = predictions.reduce((sum, p) => sum + Math.abs(p.percentError), 0);
    return sumPercentErrors / predictions.length;
  }

  static calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
    if (returns.length === 0) return 0;
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    return volatility === 0 ? 0 : (avgReturn - riskFreeRate) / volatility;
  }

  static calculateMaxDrawdown(prices: number[]): number {
    if (prices.length === 0) return 0;
    let maxDrawdown = 0;
    let peak = prices[0];
    
    for (const price of prices) {
      if (price > peak) {
        peak = price;
      }
      const drawdown = (peak - price) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown;
  }

  static calculateWinRate(predictions: PredictionAccuracy[]): number {
    if (predictions.length === 0) return 0;
    const profitable = predictions.filter(p => p.error < 0).length;
    return profitable / predictions.length;
  }

  static calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }
}

/**
 * Alert Manager for handling system alerts and notifications
 */
export class AlertManager {
  private alerts: Alert[] = [];
  private config: AlertConfig;
  private lastAlertTime: Map<string, number> = new Map();

  constructor(config: AlertConfig) {
    this.config = config;
  }

  checkPerformanceAlerts(metrics: PerformanceMetrics, modelId: string): Alert[] {
    const newAlerts: Alert[] = [];

    // Accuracy alert
    if (metrics.accuracy < this.config.accuracyThreshold) {
      const alert = this.createAlert(
        'accuracy',
        'high',
        `Model ${modelId} accuracy (${(metrics.accuracy * 100).toFixed(2)}%) below threshold (${(this.config.accuracyThreshold * 100).toFixed(2)}%)`,
        { modelId, accuracy: metrics.accuracy }
      );
      if (alert) newAlerts.push(alert);
    }

    // Error rate alert
    if (metrics.mape > this.config.errorRateThreshold) {
      const alert = this.createAlert(
        'error_rate',
        'medium',
        `Model ${modelId} error rate (${metrics.mape.toFixed(2)}%) above threshold (${this.config.errorRateThreshold.toFixed(2)}%)`,
        { modelId, errorRate: metrics.mape }
      );
      if (alert) newAlerts.push(alert);
    }

    return newAlerts;
  }

  checkSystemAlerts(health: SystemHealth): Alert[] {
    const newAlerts: Alert[] = [];

    // Latency alert
    if (health.apiLatency > this.config.latencyThreshold) {
      const alert = this.createAlert(
        'latency',
        'medium',
        `API latency (${health.apiLatency}ms) above threshold (${this.config.latencyThreshold}ms)`,
        { latency: health.apiLatency }
      );
      if (alert) newAlerts.push(alert);
    }

    // Memory alert
    if (health.memoryUsage > this.config.memoryThreshold) {
      const alert = this.createAlert(
        'memory',
        'high',
        `Memory usage (${(health.memoryUsage * 100).toFixed(2)}%) above threshold (${(this.config.memoryThreshold * 100).toFixed(2)}%)`,
        { memoryUsage: health.memoryUsage }
      );
      if (alert) newAlerts.push(alert);
    }

    return newAlerts;
  }

  private createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    message: string,
    metadata: Record<string, any>
  ): Alert | null {
    const alertKey = `${type}_${severity}`;
    const now = Date.now();
    const lastAlert = this.lastAlertTime.get(alertKey);

    // Check cooldown
    if (lastAlert && (now - lastAlert) < this.config.alertCooldown) {
      return null;
    }

    const alert: Alert = {
      id: `alert_${now}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      timestamp: now,
      resolved: false,
      metadata
    };

    this.alerts.push(alert);
    this.lastAlertTime.set(alertKey, now);

    return alert;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      return true;
    }
    return false;
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  getAlertHistory(hours: number = 24): Alert[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.alerts.filter(a => a.timestamp > cutoff);
  }
}

/**
 * Main Performance Monitor class
 */
export class PerformanceMonitor {
  private config: MonitoringConfig;
  private alertManager: AlertManager;
  private predictionHistory: PredictionAccuracy[] = [];
  private modelPerformances: Map<string, ModelPerformance> = new Map();
  private systemMetrics: SystemHealth[] = [];
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.alertManager = new AlertManager(config.alertConfig);
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    if (this.config.enableRealTimeMonitoring) {
      this.monitoringInterval = setInterval(() => {
        this.collectSystemMetrics();
        this.checkAlerts();
      }, this.config.monitoringInterval);
    }
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  recordPrediction(prediction: PredictionAccuracy): void {
    this.predictionHistory.push(prediction);
    
    // Update model performance
    const modelKey = `${prediction.symbol}_${prediction.predictionType}`;
    let modelPerf = this.modelPerformances.get(modelKey);
    
    if (!modelPerf) {
      modelPerf = {
        modelId: modelKey,
        modelType: prediction.predictionType,
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0,
        avgError: 0,
        avgConfidence: 0,
        lastUpdated: Date.now(),
        performanceHistory: [],
        recentAccuracy: []
      };
    }
    
    modelPerf.totalPredictions++;
    if (prediction.directionCorrect) {
      modelPerf.correctPredictions++;
    }
    
    modelPerf.accuracy = modelPerf.correctPredictions / modelPerf.totalPredictions;
    modelPerf.recentAccuracy.push(prediction);
    
    // Keep only recent predictions
    if (modelPerf.recentAccuracy.length > this.config.performanceWindowSize) {
      modelPerf.recentAccuracy = modelPerf.recentAccuracy.slice(-this.config.performanceWindowSize);
    }
    
    modelPerf.avgError = MetricsCalculator.calculateMAE(modelPerf.recentAccuracy);
    modelPerf.avgConfidence = modelPerf.recentAccuracy.reduce((sum, p) => sum + p.confidence, 0) / modelPerf.recentAccuracy.length;
    modelPerf.lastUpdated = Date.now();
    
    this.modelPerformances.set(modelKey, modelPerf);
    
    // Cleanup old predictions
    this.cleanupOldData();
  }

  calculateOverallMetrics(): PerformanceMetrics {
    const recentPredictions = this.getRecentPredictions(24); // Last 24 hours
    
    return {
      accuracy: MetricsCalculator.calculateAccuracy(recentPredictions),
      precision: this.calculatePrecision(recentPredictions),
      recall: this.calculateRecall(recentPredictions),
      f1Score: this.calculateF1Score(recentPredictions),
      mse: MetricsCalculator.calculateMSE(recentPredictions),
      mae: MetricsCalculator.calculateMAE(recentPredictions),
      rmse: Math.sqrt(MetricsCalculator.calculateMSE(recentPredictions)),
      mape: MetricsCalculator.calculateMAPE(recentPredictions),
      sharpeRatio: this.calculateSharpeRatio(recentPredictions),
      maxDrawdown: this.calculateMaxDrawdown(recentPredictions),
      winRate: MetricsCalculator.calculateWinRate(recentPredictions),
      profitFactor: this.calculateProfitFactor(recentPredictions),
      volatility: this.calculateVolatility(recentPredictions),
      beta: this.calculateBeta(recentPredictions),
      alpha: this.calculateAlpha(recentPredictions),
      informationRatio: this.calculateInformationRatio(recentPredictions)
    };
  }

  generateReport(timeRangeHours: number = 24): PerformanceReport {
    const now = Date.now();
    const startTime = now - (timeRangeHours * 60 * 60 * 1000);
    
    const overallMetrics = this.calculateOverallMetrics();
    const modelPerformances = Array.from(this.modelPerformances.values());
    const systemHealth = this.getCurrentSystemHealth();
    const alerts = this.alertManager.getAlertHistory(timeRangeHours);
    
    return {
      reportId: `report_${now}_${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: now,
      timeRange: { start: startTime, end: now },
      overallMetrics,
      modelPerformances,
      systemHealth,
      alerts,
      recommendations: this.generateRecommendations(overallMetrics, modelPerformances),
      trends: this.analyzeTrends(timeRangeHours)
    };
  }

  private collectSystemMetrics(): void {
    const health: SystemHealth = {
      uptime: process.uptime() * 1000,
      memoryUsage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
      cpuUsage: 0, // Would need additional monitoring
      apiLatency: this.calculateAverageLatency(),
      errorRate: this.calculateErrorRate(),
      requestCount: this.predictionHistory.length,
      cacheHitRate: 0.85, // Placeholder
      dataFreshness: Date.now() - this.getLastDataUpdate(),
      modelLoadTime: 150, // Placeholder
      predictionLatency: this.calculatePredictionLatency()
    };
    
    this.systemMetrics.push(health);
    
    // Keep only recent metrics
    if (this.systemMetrics.length > 1000) {
      this.systemMetrics = this.systemMetrics.slice(-1000);
    }
  }

  private checkAlerts(): void {
    const overallMetrics = this.calculateOverallMetrics();
    const systemHealth = this.getCurrentSystemHealth();
    
    // Check performance alerts for each model
    this.modelPerformances.forEach((performance, modelId) => {
      const modelMetrics = this.calculateModelMetrics(performance.recentAccuracy);
      this.alertManager.checkPerformanceAlerts(modelMetrics, modelId);
    });
    
    // Check system alerts
    this.alertManager.checkSystemAlerts(systemHealth);
  }

  private calculateModelMetrics(predictions: PredictionAccuracy[]): PerformanceMetrics {
    return {
      accuracy: MetricsCalculator.calculateAccuracy(predictions),
      precision: this.calculatePrecision(predictions),
      recall: this.calculateRecall(predictions),
      f1Score: this.calculateF1Score(predictions),
      mse: MetricsCalculator.calculateMSE(predictions),
      mae: MetricsCalculator.calculateMAE(predictions),
      rmse: Math.sqrt(MetricsCalculator.calculateMSE(predictions)),
      mape: MetricsCalculator.calculateMAPE(predictions),
      sharpeRatio: MetricsCalculator.calculateSharpeRatio(predictions.map(p => p.error)),
      maxDrawdown: MetricsCalculator.calculateMaxDrawdown(predictions.map(p => p.actual)),
      winRate: MetricsCalculator.calculateWinRate(predictions),
      profitFactor: this.calculateProfitFactor(predictions),
      volatility: MetricsCalculator.calculateVolatility(predictions.map(p => p.error)),
      beta: 1.0, // Placeholder
      alpha: 0.0, // Placeholder
      informationRatio: 0.0 // Placeholder
    };
  }

  private getRecentPredictions(hours: number): PredictionAccuracy[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.predictionHistory.filter(p => p.timestamp > cutoff);
  }

  private calculatePrecision(predictions: PredictionAccuracy[]): number {
    const truePositives = predictions.filter(p => p.directionCorrect && p.direction !== 'neutral').length;
    const falsePositives = predictions.filter(p => !p.directionCorrect && p.direction !== 'neutral').length;
    return truePositives + falsePositives === 0 ? 0 : truePositives / (truePositives + falsePositives);
  }

  private calculateRecall(predictions: PredictionAccuracy[]): number {
    const truePositives = predictions.filter(p => p.directionCorrect && p.direction !== 'neutral').length;
    const falseNegatives = predictions.filter(p => !p.directionCorrect && p.direction === 'neutral').length;
    return truePositives + falseNegatives === 0 ? 0 : truePositives / (truePositives + falseNegatives);
  }

  private calculateF1Score(predictions: PredictionAccuracy[]): number {
    const precision = this.calculatePrecision(predictions);
    const recall = this.calculateRecall(predictions);
    return precision + recall === 0 ? 0 : 2 * (precision * recall) / (precision + recall);
  }

  private calculateSharpeRatio(predictions: PredictionAccuracy[]): number {
    const returns = predictions.map(p => -p.percentError / 100);
    return MetricsCalculator.calculateSharpeRatio(returns);
  }

  private calculateMaxDrawdown(predictions: PredictionAccuracy[]): number {
    const prices = predictions.map(p => p.actual);
    return MetricsCalculator.calculateMaxDrawdown(prices);
  }

  private calculateProfitFactor(predictions: PredictionAccuracy[]): number {
    const profits = predictions.filter(p => p.error < 0).reduce((sum, p) => sum + Math.abs(p.error), 0);
    const losses = predictions.filter(p => p.error > 0).reduce((sum, p) => sum + p.error, 0);
    return losses === 0 ? profits : profits / losses;
  }

  private calculateVolatility(predictions: PredictionAccuracy[]): number {
    const returns = predictions.map(p => p.percentError / 100);
    return MetricsCalculator.calculateVolatility(returns);
  }

  private calculateBeta(predictions: PredictionAccuracy[]): number {
    // Simplified beta calculation - would need market data for proper calculation
    return 1.0;
  }

  private calculateAlpha(predictions: PredictionAccuracy[]): number {
    // Simplified alpha calculation
    const avgReturn = predictions.reduce((sum, p) => sum + (-p.percentError / 100), 0) / predictions.length;
    return avgReturn - 0.02; // Assuming 2% risk-free rate
  }

  private calculateInformationRatio(predictions: PredictionAccuracy[]): number {
    const alpha = this.calculateAlpha(predictions);
    const trackingError = this.calculateVolatility(predictions);
    return trackingError === 0 ? 0 : alpha / trackingError;
  }

  private getCurrentSystemHealth(): SystemHealth {
    return this.systemMetrics.length > 0 ? this.systemMetrics[this.systemMetrics.length - 1] : {
      uptime: process.uptime() * 1000,
      memoryUsage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
      cpuUsage: 0,
      apiLatency: 100,
      errorRate: 0.01,
      requestCount: this.predictionHistory.length,
      cacheHitRate: 0.85,
      dataFreshness: 0,
      modelLoadTime: 150,
      predictionLatency: 50
    };
  }

  private calculateAverageLatency(): number {
    // Placeholder - would track actual API response times
    return 100;
  }

  private calculateErrorRate(): number {
    const recentPredictions = this.getRecentPredictions(1);
    if (recentPredictions.length === 0) return 0;
    const errors = recentPredictions.filter(p => !p.directionCorrect).length;
    return errors / recentPredictions.length;
  }

  private getLastDataUpdate(): number {
    return this.predictionHistory.length > 0 ? 
      Math.max(...this.predictionHistory.map(p => p.timestamp)) : Date.now();
  }

  private calculatePredictionLatency(): number {
    // Placeholder - would track actual prediction generation times
    return 50;
  }

  private generateRecommendations(metrics: PerformanceMetrics, models: ModelPerformance[]): string[] {
    const recommendations: string[] = [];
    
    if (metrics.accuracy < 0.6) {
      recommendations.push('Consider retraining models with more recent data');
    }
    
    if (metrics.mape > 0.1) {
      recommendations.push('High prediction error detected - review feature engineering');
    }
    
    if (metrics.volatility > 0.3) {
      recommendations.push('High volatility in predictions - consider ensemble methods');
    }
    
    const lowPerformingModels = models.filter(m => m.accuracy < 0.5);
    if (lowPerformingModels.length > 0) {
      recommendations.push(`${lowPerformingModels.length} models performing below 50% accuracy`);
    }
    
    return recommendations;
  }

  private analyzeTrends(hours: number): PerformanceReport['trends'] {
    const recentMetrics = this.getRecentPredictions(hours);
    const olderMetrics = this.getRecentPredictions(hours * 2).slice(0, -recentMetrics.length);
    
    const recentAccuracy = MetricsCalculator.calculateAccuracy(recentMetrics);
    const olderAccuracy = MetricsCalculator.calculateAccuracy(olderMetrics);
    
    return {
      accuracy: this.getTrend(recentAccuracy, olderAccuracy),
      latency: 'stable', // Placeholder
      errorRate: this.getTrend(olderAccuracy, recentAccuracy) // Inverted for error rate
    };
  }

  private getTrend(current: number, previous: number): 'improving' | 'declining' | 'stable' {
    const threshold = 0.05;
    if (current > previous + threshold) return 'improving';
    if (current < previous - threshold) return 'declining';
    return 'stable';
  }

  private cleanupOldData(): void {
    const cutoff = Date.now() - (this.config.metricsRetentionDays * 24 * 60 * 60 * 1000);
    this.predictionHistory = this.predictionHistory.filter(p => p.timestamp > cutoff);
  }

  // Public getters
  getModelPerformances(): ModelPerformance[] {
    return Array.from(this.modelPerformances.values());
  }

  getActiveAlerts(): Alert[] {
    return this.alertManager.getActiveAlerts();
  }

  getSystemHealth(): SystemHealth {
    return this.getCurrentSystemHealth();
  }

  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }
}

/**
 * Factory function to create a performance monitor with default configuration
 */
export function createPerformanceMonitor(customConfig?: Partial<MonitoringConfig>): PerformanceMonitor {
  const defaultConfig: MonitoringConfig = {
    metricsRetentionDays: 30,
    performanceWindowSize: 100,
    alertConfig: {
      accuracyThreshold: 0.6,
      errorRateThreshold: 0.15,
      latencyThreshold: 1000,
      memoryThreshold: 0.8,
      enableEmailAlerts: false,
      enableSlackAlerts: false,
      alertCooldown: 300000 // 5 minutes
    },
    enableRealTimeMonitoring: true,
    monitoringInterval: 60000, // 1 minute
    enableDetailedLogging: true
  };

  const config = { ...defaultConfig, ...customConfig };
  return new PerformanceMonitor(config);
}