'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { 
  Brain, 
  MessageSquare, 
  TrendingUp, 
  Settings, 
  Play, 
  Sparkles, 
  Target, 
  Shield, 
  Clock, 
  Zap,
  Loader2,
  BrainCircuit,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Percent,
  Star,
  Filter,
  Maximize2,
  Minimize2,
  RefreshCw,
  Gauge,
  PieChart,
  LineChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import type { Strategy } from '@/lib/strategy-builder-service'
import type { MLModelType, MLPrediction, MLModelPerformance } from '@/lib/ml-strategy-generator'
import type { GPTStrategyConfig } from '@/lib/gpt-strategy-generator'

interface UnifiedStrategyBuilderProps {
  onStrategyGenerated?: (strategy: Strategy) => void
}

export default function UnifiedStrategyBuilder({ onStrategyGenerated }: UnifiedStrategyBuilderProps) {
  const [activeTab, setActiveTab] = useState('generate')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPredicting, setIsPredicting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [symbol, setSymbol] = useState('AAPL')
  const [description, setDescription] = useState('')
  const [strategyType, setStrategyType] = useState('momentum')
  const [riskLevel, setRiskLevel] = useState('moderate')
  const [timeHorizon, setTimeHorizon] = useState('medium')
  
  // GPT Configuration
  const [gptConfig, setGptConfig] = useState<GPTStrategyConfig>({
    model: 'gpt-4',
    temperature: 0.3,
    maxTokens: 1000,
    strategyType: 'momentum',
    riskLevel: 'moderate',
    timeHorizon: 'medium',
    confidenceThreshold: 0.7
  })

  // ML Configuration
  const [mlConfig, setMlConfig] = useState({
    modelType: 'lstm' as MLModelType,
    lookbackPeriod: 50,
    predictionHorizon: 5,
    confidenceThreshold: 0.7,
    enableMLPredictions: true,
    enableTechnicalAnalysis: true
  })

  // Results state
  const [generatedStrategy, setGeneratedStrategy] = useState<any>(null)
  const [mlPrediction, setMlPrediction] = useState<MLPrediction | null>(null)
  const [modelPerformance, setModelPerformance] = useState<MLModelPerformance | null>(null)
  const [allModelPerformances, setAllModelPerformances] = useState<MLModelPerformance[]>([])

  // Predefined strategy descriptions
  const predefinedDescriptions = [
    'Create a momentum-based strategy for AAPL that uses RSI, MACD, and volume analysis to identify strong upward trends with 5% stop loss and 10% take profit levels',
    'Generate a mean reversion strategy for TSLA that trades between Bollinger Bands with stochastic oscillator confirmation, targeting 3% profit per trade',
    'Design a breakout strategy for SPY that enters on volume-confirmed breakouts above 20-day resistance with ATR-based position sizing and trailing stops',
    'Build an AI-powered multi-factor strategy combining technical indicators, sentiment analysis, and market regime detection for optimal entry/exit timing',
    'Create a conservative dividend strategy for blue-chip stocks with low volatility, focusing on companies with P/E < 20 and dividend yield > 2%',
    'Develop a swing trading strategy using EMA crossovers, RSI divergence, and support/resistance levels for 2-5 day holding periods',
    'Generate a scalping strategy for high-volume stocks using 1-minute charts with tight spreads, quick profit targets, and strict risk management'
  ]

  // Load model performances on mount
  useEffect(() => {
    loadModelPerformances()
  }, [])

  const loadModelPerformances = async () => {
    try {
      const response = await fetch('/api/ml-strategy?action=getAllModelPerformances')
      const result = await response.json()
      if (result.success) {
        setAllModelPerformances(result.data)
      }
    } catch (error) {
      console.error('Error loading model performances:', error)
    }
  }

  const generateUnifiedStrategy = async () => {
    setIsGenerating(true)
    setProgress(0)
    setError(null)
    setSuccess(null)

    try {
      // Validate inputs
      if (!symbol || !description) {
        throw new Error('Please fill in all required fields')
      }

      // Update GPT config with current form values
      const updatedGptConfig = {
        ...gptConfig,
        strategyType: strategyType as any,
        riskLevel: riskLevel as any,
        timeHorizon: timeHorizon as any
      }

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      // Generate GPT strategy
      const gptResponse = await fetch('/api/gpt-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateStrategy',
          symbol,
          description,
          model: updatedGptConfig.model,
          strategyType: updatedGptConfig.strategyType,
          riskLevel: updatedGptConfig.riskLevel,
          timeHorizon: updatedGptConfig.timeHorizon,
          temperature: updatedGptConfig.temperature,
          maxTokens: updatedGptConfig.maxTokens,
          confidenceThreshold: updatedGptConfig.confidenceThreshold
        })
      })

      const gptResult = await gptResponse.json()
      
      if (!gptResult.success) {
        throw new Error(gptResult.error || 'Failed to generate GPT strategy')
      }

      // Generate ML prediction if enabled
      let mlPredictionResult = null
      if (mlConfig.enableMLPredictions) {
        try {
          const mlResponse = await fetch(`/api/ml-strategy?action=makePrediction&modelType=${mlConfig.modelType}&symbol=${symbol}&lookbackPeriod=${mlConfig.lookbackPeriod}`)
          const mlResult = await mlResponse.json()
          if (mlResult.success) {
            mlPredictionResult = mlResult.data
          } else {
            throw new Error(mlResult.error || 'ML prediction failed')
          }
        } catch (mlError) {
          throw new Error(`ML prediction failed: ${mlError instanceof Error ? mlError.message : 'Unknown error'}`)
        }
      }

      // Get model performance
      let modelPerfResult = null
      if (mlConfig.enableMLPredictions) {
        try {
          const perfResponse = await fetch(`/api/ml-strategy?action=getModelPerformance&modelType=${mlConfig.modelType}`)
          const perfResult = await perfResponse.json()
          if (perfResult.success) {
            modelPerfResult = perfResult.data
          }
        } catch (perfError) {
          console.warn('Model performance fetch failed:', perfError)
        }
      }

      clearInterval(progressInterval)
      setProgress(100)

      // Combine results
      const unifiedResult = {
        strategy: gptResult.data.strategy,
        analysis: gptResult.data.analysis,
        confidence: gptResult.data.confidence,
        riskAssessment: gptResult.data.riskAssessment,
        recommendations: gptResult.data.recommendations,
        mlPrediction: mlPredictionResult,
        modelPerformance: modelPerfResult,
        unified: true
      }

      // Debug: Log the ML prediction data
      console.log('🔍 UI Debug - ML Prediction Result:', mlPredictionResult)
      console.log('🔍 UI Debug - Unified Result:', unifiedResult)

      setGeneratedStrategy(unifiedResult)
      setMlPrediction(mlPredictionResult)
      setModelPerformance(modelPerfResult)
      setSuccess(`Unified strategy generated successfully for ${symbol}!`)
      
      // Automatically switch to results tab
      setActiveTab('results')
      
      // Call callback if provided
      if (onStrategyGenerated && unifiedResult.strategy) {
        onStrategyGenerated(unifiedResult.strategy)
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsGenerating(false)
      setProgress(0)
    }
  }



  const makeMLPrediction = async () => {
    if (!symbol) return

    setIsPredicting(true)
    setError(null)

    try {
      const response = await fetch(`/api/ml-strategy?action=makePrediction&modelType=${mlConfig.modelType}&symbol=${symbol}&lookbackPeriod=${mlConfig.lookbackPeriod}`)
      const result = await response.json()
      if (result.success) {
        setMlPrediction(result.data)
        setSuccess(`ML prediction generated successfully for ${symbol}!`)
      } else {
        throw new Error(result.error || 'Failed to make ML prediction')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsPredicting(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    return 'Low'
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getModelDescription = (type: MLModelType): string => {
    const descriptions = {
      lstm: 'Long Short-Term Memory neural network for time series prediction',
      transformer: 'Transformer model with attention mechanism for sequence modeling',
      random_forest: 'Ensemble of decision trees for robust predictions',
      xgboost: 'Gradient boosting algorithm optimized for performance',
      neural_network: 'Multi-layer perceptron for pattern recognition',
      ensemble: 'Combination of multiple models for improved accuracy'
    }
    return descriptions[type] || 'Advanced machine learning model'
  }

  const getModelIcon = (type: MLModelType) => {
    switch (type) {
      case 'lstm':
      case 'transformer':
      case 'neural_network':
        return <Brain className="h-4 w-4" />
      case 'random_forest':
      case 'xgboost':
        return <TrendingUp className="h-4 w-4" />
      case 'ensemble':
        return <TrendingUp className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Strategy Builder</h2>
          <p className="text-muted-foreground">
            Create intelligent trading strategies with AI-powered analysis
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4" />
          AI-Powered
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Create Strategy
          </TabsTrigger>
          <TabsTrigger value="ml" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Predictions
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Strategy Configuration
              </CardTitle>
              <CardDescription>
                Configure your trading strategy parameters and requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">


              {/* Basic Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Stock Symbol</Label>
                  <Input
                    id="symbol"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g., AAPL"
                  />

                </div>
                <div className="space-y-2">
                  <Label htmlFor="strategyType">Strategy Type</Label>
                  <Select value={strategyType} onValueChange={setStrategyType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="momentum">Momentum</SelectItem>
                      <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                      <SelectItem value="breakout">Breakout</SelectItem>
                      <SelectItem value="ai_ml">AI/ML</SelectItem>
                      <SelectItem value="multi_factor">Multi-Factor</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="riskLevel">Risk Level</Label>
                  <Select value={riskLevel} onValueChange={setRiskLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeHorizon">Time Horizon</Label>
                  <Select value={timeHorizon} onValueChange={setTimeHorizon}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short Term</SelectItem>
                      <SelectItem value="medium">Medium Term</SelectItem>
                      <SelectItem value="long">Long Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Strategy Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Strategy Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter your trading strategy requirements..."
                  rows={4}
                />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Quick Templates:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {predefinedDescriptions.slice(0, 3).map((desc, index) => (
                      <button
                        key={index}
                        onClick={() => setDescription(desc)}
                        className="text-left p-2 rounded border hover:bg-muted transition-colors text-xs"
                      >
                        {desc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ML Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="h-4 w-4" />
                    AI Settings
                  </CardTitle>

                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableML"
                      checked={mlConfig.enableMLPredictions}
                      onCheckedChange={(checked) => setMlConfig(prev => ({ ...prev, enableMLPredictions: checked }))}
                    />
                    <Label htmlFor="enableML">Enable AI Predictions</Label>
                  </div>
                  
                  {mlConfig.enableMLPredictions && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="modelType">AI Model</Label>
                        <Select 
                          value={mlConfig.modelType} 
                          onValueChange={(value) => setMlConfig(prev => ({ ...prev, modelType: value as MLModelType }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lstm">LSTM Neural Network</SelectItem>
                            <SelectItem value="transformer">Transformer</SelectItem>
                            <SelectItem value="random_forest">Random Forest</SelectItem>
                            <SelectItem value="xgboost">XGBoost</SelectItem>
                            <SelectItem value="neural_network">Neural Network</SelectItem>
                            <SelectItem value="ensemble">Ensemble</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lookbackPeriod">Lookback Period</Label>
                        <Input
                          id="lookbackPeriod"
                          type="number"
                          value={mlConfig.lookbackPeriod}
                          onChange={(e) => setMlConfig(prev => ({ ...prev, lookbackPeriod: parseInt(e.target.value) }))}
                          min="10"
                          max="200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confidenceThreshold">Confidence Threshold</Label>
                        <Input
                          id="confidenceThreshold"
                          type="number"
                          step="0.1"
                          value={mlConfig.confidenceThreshold}
                          onChange={(e) => setMlConfig(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
                          min="0.1"
                          max="1.0"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Generate Button */}
              <Button 
                onClick={generateUnifiedStrategy} 
                disabled={isGenerating || !symbol || !description}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Strategy...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Strategy
                  </>
                )}
              </Button>

              {isGenerating && (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-muted-foreground text-center">
                    Analyzing market data and generating strategy...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="ml" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Market Predictions
              </CardTitle>
              <CardDescription>
                Get real-time market predictions using advanced AI models
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mlSymbol">Stock Symbol</Label>
                  <Input
                    id="mlSymbol"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g., AAPL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mlModelType">AI Model</Label>
                  <Select 
                    value={mlConfig.modelType} 
                    onValueChange={(value) => setMlConfig(prev => ({ ...prev, modelType: value as MLModelType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lstm">LSTM Neural Network</SelectItem>
                      <SelectItem value="transformer">Transformer</SelectItem>
                      <SelectItem value="random_forest">Random Forest</SelectItem>
                      <SelectItem value="xgboost">XGBoost</SelectItem>
                      <SelectItem value="neural_network">Neural Network</SelectItem>
                      <SelectItem value="ensemble">Ensemble</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={makeMLPrediction} 
                    disabled={isPredicting || !symbol}
                    className="w-full"
                  >
                    {isPredicting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Predicting...
                      </>
                    ) : (
                                              <>
                          <Brain className="mr-2 h-4 w-4" />
                          Analyze
                        </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Model Performance Overview */}
              {allModelPerformances.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allModelPerformances.map((perf, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            {getModelIcon(perf.modelType)}
                            <span className="font-semibold capitalize">{perf.modelType}</span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p><strong>Accuracy:</strong> {(perf.accuracy * 100).toFixed(1)}%</p>
                            <p><strong>Precision:</strong> {(perf.precision * 100).toFixed(1)}%</p>
                            <p><strong>Recall:</strong> {(perf.recall * 100).toFixed(1)}%</p>
                            <p><strong>F1-Score:</strong> {(perf.f1Score * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ML Prediction Results */}
              {mlPrediction && (
                <Card>
                  <CardHeader>
                    <CardTitle>Prediction Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Prediction Details</h4>
                           <p><strong>Confidence:</strong> 
                             <span className={`ml-2 ${getConfidenceColor(mlPrediction.confidence)}`}>
                               {(mlPrediction.confidence * 100).toFixed(1)}% ({getConfidenceLabel(mlPrediction.confidence)})
                             </span>
                           </p>
                           <p><strong>Predicted Price:</strong> ${mlPrediction.predictedPrice}</p>
                           <p><strong>Price Change:</strong> ${mlPrediction.priceChange.toFixed(2)}</p>
                        </div>
                                                 <div>
                           <h4 className="font-semibold mb-2">Risk Metrics</h4>
                           <p><strong>Volatility:</strong> {mlPrediction.volatility.toFixed(2)}%</p>
                           <p><strong>Risk Score:</strong> {mlPrediction.riskScore}/10</p>
                           <p><strong>Model Used:</strong> {mlPrediction.modelUsed.toUpperCase()}</p>
                         </div>
                      </div>
                      
                                             {mlPrediction.features && mlPrediction.features.length > 0 && (
                         <div>
                           <h4 className="font-semibold mb-2">Key Features</h4>
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                             {mlPrediction.features.map((feature, index) => (
                               <div key={index} className="text-sm">
                                 <strong>Feature {index + 1}:</strong> {feature}
                               </div>
                             ))}
                           </div>
                         </div>
                       )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {generatedStrategy ? (
            <div className="space-y-6">
              {/* Strategy Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Strategy Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Strategy Details</h4>
                        <p><strong>Symbol:</strong> {generatedStrategy.strategy?.symbol || symbol}</p>
                        <p><strong>Type:</strong> {generatedStrategy.strategy?.type || strategyType}</p>
                        <p><strong>Risk Level:</strong> 
                          <span className={`ml-2 ${getRiskColor(generatedStrategy.strategy?.riskLevel || riskLevel)}`}>
                            {generatedStrategy.strategy?.riskLevel || riskLevel}
                          </span>
                        </p>
                        <p><strong>Time Horizon:</strong> {generatedStrategy.strategy?.timeHorizon || timeHorizon}</p>
                      </div>

                    </div>

                                         {generatedStrategy.strategy?.description && typeof generatedStrategy.strategy.description === 'string' && (
                       <div>
                         <h4 className="font-semibold mb-2">Strategy Description</h4>
                         <p className="text-sm text-muted-foreground">{generatedStrategy.strategy.description}</p>
                       </div>
                     )}

                                         {generatedStrategy.recommendations && Array.isArray(generatedStrategy.recommendations) && generatedStrategy.recommendations.length > 0 && (
                       <div>
                         <h4 className="font-semibold mb-2">AI Recommendations</h4>
                         <ul className="list-disc list-inside space-y-1 text-sm">
                           {generatedStrategy.recommendations.map((rec: string, index: number) => (
                             <li key={index}>{rec}</li>
                           ))}
                         </ul>
                       </div>
                     )}
                  </div>
                </CardContent>
              </Card>

              {/* ML Prediction Integration */}
              {generatedStrategy.mlPrediction && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Market Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Prediction Details</h4>
                        <p><strong>Model:</strong> {mlConfig.modelType.toUpperCase()}</p>
                        <p><strong>Confidence:</strong> 
                          <span className={`ml-2 ${getConfidenceColor(generatedStrategy.mlPrediction.confidence)}`}>
                            {(generatedStrategy.mlPrediction.confidence * 100).toFixed(1)}%
                          </span>
                        </p>
                        <p><strong>Predicted Price:</strong> 
                          <span className="ml-2 font-mono">
                            ${generatedStrategy.mlPrediction.predictedPrice?.toFixed(2) || 'N/A'}
                          </span>
                        </p>
                        <p><strong>Expected Change:</strong> 
                          <span className={`ml-2 ${generatedStrategy.mlPrediction.priceChange > 0 ? 'text-green-600' : generatedStrategy.mlPrediction.priceChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {generatedStrategy.mlPrediction.priceChange > 0 ? '+' : ''}{generatedStrategy.mlPrediction.priceChange?.toFixed(2) || '0.00'}%
                          </span>
                        </p>
                        <p><strong>Volatility:</strong> 
                          <span className="ml-2">
                            {(generatedStrategy.mlPrediction.volatility * 100)?.toFixed(2) || '0.00'}%
                          </span>
                        </p>
                        <p><strong>Risk Score:</strong> 
                          <span className={`ml-2 ${generatedStrategy.mlPrediction.riskScore < 0.3 ? 'text-green-600' : generatedStrategy.mlPrediction.riskScore > 0.7 ? 'text-red-600' : 'text-yellow-600'}`}>
                            {(generatedStrategy.mlPrediction.riskScore * 10)?.toFixed(1) || '0.0'}/10
                          </span>
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Analysis Summary</h4>
                        <p><strong>ML Confidence:</strong> 
                          <span className={`ml-2 ${getConfidenceColor(generatedStrategy.mlPrediction.confidence)}`}>
                            {(generatedStrategy.mlPrediction.confidence * 100).toFixed(1)}%
                          </span>
                        </p>
                        <p><strong>Signal Strength:</strong> 
                          <span className={`ml-2 ${
                            generatedStrategy.mlPrediction.confidence > 0.7 
                              ? 'text-green-600' 
                              : generatedStrategy.mlPrediction.confidence > 0.5
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}>
                            {generatedStrategy.mlPrediction.confidence > 0.7 
                              ? 'Strong Signal' 
                              : generatedStrategy.mlPrediction.confidence > 0.5
                              ? 'Moderate Signal'
                              : 'Weak Signal'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setActiveTab('generate')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Strategy
                </Button>
                <Button variant="outline" onClick={() => setActiveTab('ml')}>
                  <Brain className="mr-2 h-4 w-4" />
                  Get Predictions
                </Button>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Strategy Available</h3>
                <p className="text-muted-foreground mb-4">
                  Create a strategy using the Create Strategy tab to view analysis results.
                </p>
                <Button onClick={() => setActiveTab('generate')}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Strategy
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Real-Time Data Error:</strong> {error}</p>
              <div className="text-sm">
                <p><strong>Possible Solutions:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Check if the stock symbol is valid and actively traded</li>
                  <li>Verify your Polygon.io API key is configured correctly</li>
                  <li>Ensure you have an active internet connection</li>
                  <li>Try again in a few moments if market data is temporarily unavailable</li>
                </ul>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Display */}
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
