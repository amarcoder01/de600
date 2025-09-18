'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Brain, TrendingUp, BarChart3, Settings, Play, Pause, RotateCcw } from 'lucide-react'
import type { MLStrategyConfig, MLModelType, MLPrediction, MLModelPerformance } from '@/lib/ml-strategy-generator'
import type { Strategy } from '@/lib/strategy-builder-service'

interface MLStrategyBuilderProps {
  onStrategyGenerated?: (strategy: Strategy) => void
}

export default function MLStrategyBuilder({ onStrategyGenerated }: MLStrategyBuilderProps) {
  const [activeTab, setActiveTab] = useState('generate')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [symbol, setSymbol] = useState('AAPL')
  const [modelType, setModelType] = useState<MLModelType>('lstm')
  const [lookbackPeriod, setLookbackPeriod] = useState(50)
  const [predictionHorizon, setPredictionHorizon] = useState(5)
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7)
  const [trainingStartDate, setTrainingStartDate] = useState('2023-01-01')
  const [trainingEndDate, setTrainingEndDate] = useState('2024-01-01')

  // Results state
  const [generatedStrategy, setGeneratedStrategy] = useState<Strategy | null>(null)
  const [modelPerformance, setModelPerformance] = useState<MLModelPerformance | null>(null)
  const [prediction, setPrediction] = useState<MLPrediction | null>(null)
  const [allModelPerformances, setAllModelPerformances] = useState<MLModelPerformance[]>([])

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

  const generateMLStrategy = async () => {
    setIsGenerating(true)
    setProgress(0)
    setError(null)
    setSuccess(null)

    try {
      // Validate inputs
      if (!symbol || !modelType) {
        throw new Error('Please fill in all required fields')
      }

      const config: MLStrategyConfig = {
        modelType,
        lookbackPeriod,
        predictionHorizon,
        confidenceThreshold,
        featureSelection: ['rsi', 'macd', 'sma20', 'sma50', 'bollinger_bands', 'volume'],
        hyperparameters: {
          learningRate: 0.001,
          batchSize: 32,
          epochs: 100
        }
      }

      const trainingPeriod = {
        start: trainingStartDate,
        end: trainingEndDate
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

      const response = await fetch('/api/ml-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateMLStrategy',
          symbol,
          config,
          trainingPeriod
        })
      })

      clearInterval(progressInterval)
      setProgress(100)

      const result = await response.json()
      if (result.success) {
        setGeneratedStrategy(result.data)
        setSuccess(`ML strategy generated successfully for ${symbol}!`)
        
        // Load model performance
        const perfResponse = await fetch(`/api/ml-strategy?action=getModelPerformance&modelType=${modelType}`)
        const perfResult = await perfResponse.json()
        if (perfResult.success) {
          setModelPerformance(perfResult.data)
        }

        // Call callback if provided
        if (onStrategyGenerated) {
          onStrategyGenerated(result.data)
        }
      } else {
        throw new Error(result.error || 'Failed to generate ML strategy')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsGenerating(false)
      setProgress(0)
    }
  }

  const makePrediction = async () => {
    if (!generatedStrategy) return

    try {
      const response = await fetch(`/api/ml-strategy?action=makePrediction&modelType=${modelType}&symbol=${symbol}&lookbackPeriod=${lookbackPeriod}`)
      const result = await response.json()
      if (result.success) {
        setPrediction(result.data)
      } else {
        throw new Error(result.error || 'Failed to make prediction')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
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
        return <BarChart3 className="h-4 w-4" />
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
          <h2 className="text-2xl font-bold tracking-tight">🤖 ML Strategy Builder</h2>
          <p className="text-muted-foreground">
            Generate AI-powered trading strategies using advanced machine learning models
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Phase 2 - Advanced ML
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate">Generate Strategy</TabsTrigger>
          <TabsTrigger value="performance">Model Performance</TabsTrigger>
          <TabsTrigger value="prediction">Live Predictions</TabsTrigger>
          <TabsTrigger value="compare">Model Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Generate ML Strategy
              </CardTitle>
              <CardDescription>
                Configure and generate an AI-powered trading strategy using advanced machine learning models
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input
                    id="symbol"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="AAPL"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelType">ML Model Type</Label>
                  <Select value={modelType} onValueChange={(value: MLModelType) => setModelType(value)}>
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
                  <Label htmlFor="lookbackPeriod">Lookback Period (days)</Label>
                  <Input
                    id="lookbackPeriod"
                    type="number"
                    value={lookbackPeriod}
                    onChange={(e) => setLookbackPeriod(parseInt(e.target.value))}
                    min="10"
                    max="200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="predictionHorizon">Prediction Horizon (days)</Label>
                  <Input
                    id="predictionHorizon"
                    type="number"
                    value={predictionHorizon}
                    onChange={(e) => setPredictionHorizon(parseInt(e.target.value))}
                    min="1"
                    max="30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confidenceThreshold">Confidence Threshold</Label>
                  <Input
                    id="confidenceThreshold"
                    type="number"
                    step="0.1"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                    min="0.1"
                    max="1.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trainingStartDate">Training Start Date</Label>
                  <Input
                    id="trainingStartDate"
                    type="date"
                    value={trainingStartDate}
                    onChange={(e) => setTrainingStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trainingEndDate">Training End Date</Label>
                  <Input
                    id="trainingEndDate"
                    type="date"
                    value={trainingEndDate}
                    onChange={(e) => setTrainingEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Model Description</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  {getModelIcon(modelType)}
                  <span className="text-sm">{getModelDescription(modelType)}</span>
                </div>
              </div>

              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Training ML model...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              <Button 
                onClick={generateMLStrategy} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Strategy...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Generate ML Strategy
                  </>
                )}
              </Button>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {generatedStrategy && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Strategy</CardTitle>
                <CardDescription>AI-generated trading strategy details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Strategy Name</Label>
                    <p className="text-sm text-muted-foreground">{generatedStrategy.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Model Type</Label>
                    <p className="text-sm text-muted-foreground">{generatedStrategy.type}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Symbol</Label>
                    <p className="text-sm text-muted-foreground">{generatedStrategy.symbol}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={generatedStrategy.status === 'active' ? 'default' : 'secondary'}>
                      {generatedStrategy.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">{generatedStrategy.description}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Performance</CardTitle>
              <CardDescription>Performance metrics for trained ML models</CardDescription>
            </CardHeader>
            <CardContent>
              {modelPerformance ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {(modelPerformance.accuracy * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Accuracy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {modelPerformance.sharpeRatio.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {modelPerformance.totalReturn.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Total Return</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {modelPerformance.maxDrawdown.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Max Drawdown</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No model performance data available. Generate a strategy first.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prediction" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Predictions</CardTitle>
              <CardDescription>Get real-time predictions from trained ML models</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={makePrediction} disabled={!generatedStrategy}>
                <Play className="mr-2 h-4 w-4" />
                Make Prediction
              </Button>

              {prediction && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {prediction.predictedDirection.toUpperCase()}
                    </div>
                    <div className="text-sm text-muted-foreground">Prediction</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(prediction.confidence * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Confidence</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {prediction.priceChange.toFixed(2)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Expected Change</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {(prediction.riskScore * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Risk Score</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Comparison</CardTitle>
              <CardDescription>Compare performance across different ML models</CardDescription>
            </CardHeader>
            <CardContent>
              {allModelPerformances.length > 0 ? (
                <div className="space-y-4">
                  {allModelPerformances.map((perf) => (
                    <div key={perf.modelType} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getModelIcon(perf.modelType)}
                        <div>
                          <div className="font-medium capitalize">{perf.modelType.replace('_', ' ')}</div>
                          <div className="text-sm text-muted-foreground">
                            Accuracy: {(perf.accuracy * 100).toFixed(1)}% | 
                            Sharpe: {perf.sharpeRatio.toFixed(2)} | 
                            Return: {perf.totalReturn.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {perf.trainingTime.toFixed(0)}s
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No models available for comparison. Train some models first.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
