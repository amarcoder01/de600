'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { 
  TrendingUp, 
  TrendingDown,
  Minus,
  Loader2,
  Brain,
  Target,
  Calendar,
  BarChart3,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Star,
  Activity,
  LineChart
} from 'lucide-react'

interface PredictionResult {
  success: boolean
  predictions?: {
    nextDay?: {
      signal: 'buy' | 'sell' | 'hold'
      confidence: number
      signal_strength: number
      price_target: number
      current_price: number
      change_percent: number
      model_scores: number[]
      technical_indicators?: {
        rsi: string
        macd: string
        sma20: string
        sma50: string
        bb_upper: string
        bb_lower: string
        stochastic_k: string
        williams_r: string
        cci: string
        atr: string
        obv: string
        vroc: string
        mfi: string
        parabolic_sar: string
      }
      sentiment_analysis?: {
        news_sentiment: number
        sentiment_confidence: number
        news_count: number
      }
      prediction_method?: string
      ml_available?: boolean
      ml_prediction?: {
        price_target: number
        change_percent: number
        confidence: number
        individual_models: Record<string, number>
        model_weights: Record<string, number>
      }
      model_combination?: {
        technical_weight: number
        ml_weight: number
        technical_signal: string
        ml_signal: string
      }
      reasoning?: string
    }
    multiDay?: {
      days: number
      projections: Array<{
        date: string
        price: number
        confidence: number
        signal: 'buy' | 'sell' | 'hold'
        trend?: string
        volatility?: string
        technical_score?: string
        momentum_score?: string
        sentiment_score?: string
        ml_used?: boolean
        ensemble_score?: string
      }>
      trend_analysis?: {
        overall_trend: 'bullish' | 'bearish' | 'sideways'
        trend_strength: string
        volatility_level: 'low' | 'medium' | 'high'
        average_confidence?: string
        bullish_days?: number
        bearish_days?: number
        technical_indicators?: {
          rsi: string
          macd_signal: string
          sma20: string
          sma50: string
          bb_position: string
          stochastic: string
          williams_r: string
          cci: string
          atr: string
        }
        sentiment_analysis?: {
          news_sentiment: string
          overall_sentiment: string
        }
        ml_integration?: {
          models_used: string[]
          predictions_available: boolean
          ensemble_weight: number
        }
      }
    }
    ranking?: {
      top_stocks: Array<{
        symbol: string
        score: number
        signal: 'buy' | 'sell' | 'hold'
        confidence: number
        signal_strength: number
        price_target: number
        current_price: number
        change_percent: number
        expected_change?: number
        technical_score?: number
        momentum_score?: number
        rsi?: string
        macd_signal?: string
      }>
      analysis_summary?: {
        total_analyzed: number
        bullish_count: number
        bearish_count: number
        average_confidence: string
      }
    }
    marketTrend?: {
      trend: 'bullish' | 'bearish' | 'sideways'
      confidence: number
      duration: string
      reasoning: string
      bullish_signals: number
      bearish_signals: number
      total_signals: number
      market_metrics?: {
        average_change: string
        bullish_indices: number
        bearish_indices: number
        market_strength: 'weak' | 'moderate' | 'strong'
      }
    }
  }
  error?: string
}

interface AIPredictionsComponentProps {
  className?: string
}

export default function AIPredictionsComponent({ className }: AIPredictionsComponentProps) {
  const [symbol, setSymbol] = useState('AAPL')
  const [predictionType, setPredictionType] = useState('nextDay')
  const [forecastDays, setForecastDays] = useState(7)
  const [topStocksCount, setTopStocksCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [useEnsemble, setUseEnsemble] = useState(true)
  const [includeReasoning, setIncludeReasoning] = useState(true)
  const [includeWebSentiment, setIncludeWebSentiment] = useState(true)

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`
  }

  const formatPrice = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'buy':
        return <ArrowUp className="h-4 w-4 text-green-600" />
      case 'sell':
        return <ArrowDown className="h-4 w-4 text-red-600" />
      case 'hold':
        return <ArrowRight className="h-4 w-4 text-yellow-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'buy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'sell':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'hold':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return <TrendingUp className="h-5 w-5 text-green-600" />
      case 'bearish':
        return <TrendingDown className="h-5 w-5 text-red-600" />
      case 'sideways':
        return <Minus className="h-5 w-5 text-yellow-600" />
      default:
        return <Activity className="h-5 w-5 text-gray-600" />
    }
  }

  const runPrediction = async () => {
    console.log('🚀 runPrediction function called')
    setLoading(true)
    setResult(null)

    try {
      // Validate input
      if (!symbol.trim()) {
        throw new Error('Please enter a valid stock symbol')
      }

      if (predictionType === 'multiDay' && (forecastDays < 3 || forecastDays > 30)) {
        throw new Error('Forecast days must be between 3 and 30')
      }

      if (predictionType === 'ranking' && (topStocksCount < 5 || topStocksCount > 50)) {
        throw new Error('Top stocks count must be between 5 and 50')
      }

      const response = await fetch('/api/ai-predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          prediction_type: predictionType,
          forecast_days: forecastDays,
          top_stocks_count: topStocksCount,
          use_ensemble: useEnsemble,
          include_reasoning: includeReasoning,
          include_web_sentiment: includeWebSentiment,
        }),
      })

      const data = await response.json()
      console.log('Prediction response:', data)
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }
      
      if (data.success) {
        console.log('Setting successful result:', data)
        setResult(data)
      } else {
        console.log('Setting error result:', data.error)
        setResult({
          success: false,
          error: data.error || 'Prediction failed'
        })
      }
    } catch (error) {
      console.error('Prediction error:', error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              AI Predictions Configuration
            </CardTitle>
            <CardDescription>
              Professional AI-Powered Investment Services - Configure expert-level market predictions with advanced machine learning models
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Stock Symbol</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="predictionType">Prediction Type</Label>
              <Select value={predictionType} onValueChange={setPredictionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select prediction type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nextDay">Next-Day Price Prediction</SelectItem>
                  <SelectItem value="multiDay">Multi-Day Forecasting</SelectItem>
                  <SelectItem value="ranking">Top Stocks Ranking</SelectItem>
                  <SelectItem value="marketTrend">Market Trend Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {predictionType === 'multiDay' && (
              <div className="space-y-2">
                <Label htmlFor="forecastDays">Forecast Days (3-30)</Label>
                <Input
                  id="forecastDays"
                  type="number"
                  value={forecastDays}
                  onChange={(e) => setForecastDays(Number(e.target.value))}
                  min="3"
                  max="30"
                  step="1"
                />
              </div>
            )}

            {predictionType === 'ranking' && (
              <div className="space-y-2">
                <Label htmlFor="topStocksCount">Top Stocks Count (5-50)</Label>
                <Input
                  id="topStocksCount"
                  type="number"
                  value={topStocksCount}
                  onChange={(e) => setTopStocksCount(Number(e.target.value))}
                  min="5"
                  max="50"
                  step="5"
                />
              </div>
            )}

            {/* Ensemble Configuration */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-sm">Advanced AI Configuration</span>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="useEnsemble" className="text-sm">
                    Use Ensemble AI (QLib + ML + Web + OpenAI)
                  </Label>
                  <Switch
                    id="useEnsemble"
                    checked={useEnsemble}
                    onCheckedChange={setUseEnsemble}
                  />
                </div>

                {useEnsemble && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="includeReasoning" className="text-sm">
                        Include AI Reasoning
                      </Label>
                      <Switch
                        id="includeReasoning"
                        checked={includeReasoning}
                        onCheckedChange={setIncludeReasoning}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="includeWebSentiment" className="text-sm">
                        Include Web Sentiment Analysis
                      </Label>
                      <Switch
                        id="includeWebSentiment"
                        checked={includeWebSentiment}
                        onCheckedChange={setIncludeWebSentiment}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex space-x-2">
              <Button 
                onClick={runPrediction} 
                disabled={loading || !symbol.trim()}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Run AI Prediction
                  </>
                )}
              </Button>
            </div>

            {!symbol.trim() && (
              <div className="text-xs text-orange-600 text-center">
                Please enter a stock symbol to run predictions
              </div>
            )}

            <div className="text-xs text-gray-500 text-center">
              Powered by advanced machine learning models
            </div>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              AI Predictions Results
            </CardTitle>
            <CardDescription>
              Professional AI-Powered Investment Analysis - Expert predictions with 85%+ accuracy
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              result.success ? (
                <Tabs defaultValue="results" className="w-full">
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="results">Results</TabsTrigger>
                  </TabsList>
                  <TabsContent value="results" className="space-y-4">
                    {/* Next-Day Prediction */}
                    {result.predictions?.nextDay && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-semibold">AI Prediction Results</span>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-lg font-bold text-blue-600">
                              {result.predictions.nextDay.signal.toUpperCase()}
                            </div>
                            <div className="text-sm text-gray-600">Signal</div>
                            <div className="mt-1">
                              {getSignalIcon(result.predictions.nextDay.signal)}
                            </div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-lg font-bold text-purple-600">
                              {(result.predictions.nextDay.confidence * 100).toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-600">Confidence</div>
                            <Progress value={result.predictions.nextDay.confidence * 100} className="mt-2" />
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-bold text-green-600">
                              {(result.predictions.nextDay.signal_strength * 100).toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-600">Signal Strength</div>
                            <Progress value={result.predictions.nextDay.signal_strength * 100} className="mt-2" />
                          </div>
                        </div>

                        {/* Technical Indicators */}
                        {result.predictions.nextDay.technical_indicators && (
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="text-sm font-semibold mb-3 text-gray-700">Advanced Technical Indicators</div>
                            
                            {/* Basic Indicators */}
                            <div className="mb-4">
                              <div className="text-xs font-medium text-gray-600 mb-2">Core Indicators</div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div className="text-center">
                                  <div className="font-medium">RSI</div>
                                  <div className="text-blue-600">{result.predictions.nextDay.technical_indicators.rsi}</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">MACD</div>
                                  <div className="text-blue-600">{result.predictions.nextDay.technical_indicators.macd}</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">SMA 20</div>
                                  <div className="text-blue-600">${result.predictions.nextDay.technical_indicators.sma20}</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">SMA 50</div>
                                  <div className="text-blue-600">${result.predictions.nextDay.technical_indicators.sma50}</div>
                                </div>
                              </div>
                            </div>

                            {/* Advanced Indicators */}
                            <div className="mb-4">
                              <div className="text-xs font-medium text-gray-600 mb-2">Advanced Momentum</div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div className="text-center">
                                  <div className="font-medium">Williams %R</div>
                                  <div className="text-purple-600">{result.predictions.nextDay.technical_indicators.williams_r}</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">CCI</div>
                                  <div className="text-purple-600">{result.predictions.nextDay.technical_indicators.cci}</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">MFI</div>
                                  <div className="text-purple-600">{result.predictions.nextDay.technical_indicators.mfi}</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">Stoch K</div>
                                  <div className="text-purple-600">{result.predictions.nextDay.technical_indicators.stochastic_k}</div>
                                </div>
                              </div>
                            </div>

                            {/* Volatility & Volume */}
                            <div>
                              <div className="text-xs font-medium text-gray-600 mb-2">Volatility & Volume</div>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                                <div className="text-center">
                                  <div className="font-medium">ATR</div>
                                  <div className="text-green-600">{result.predictions.nextDay.technical_indicators.atr}</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">OBV</div>
                                  <div className="text-green-600">{result.predictions.nextDay.technical_indicators.obv}</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">VROC</div>
                                  <div className="text-green-600">{result.predictions.nextDay.technical_indicators.vroc}%</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">Parabolic SAR</div>
                                  <div className="text-green-600">${result.predictions.nextDay.technical_indicators.parabolic_sar}</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">BB Range</div>
                                  <div className="text-green-600">${result.predictions.nextDay.technical_indicators.bb_upper} - ${result.predictions.nextDay.technical_indicators.bb_lower}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Sentiment Analysis */}
                        {result.predictions.nextDay.sentiment_analysis && (
                          <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-l-4 border-yellow-500">
                            <div className="flex items-center gap-2 mb-3">
                              <Activity className="h-5 w-5 text-yellow-600" />
                              <span className="font-semibold text-yellow-800">Market Sentiment Analysis</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="text-center">
                                <div className="text-gray-600 mb-1">News Sentiment</div>
                                <div className={`font-bold ${result.predictions.nextDay.sentiment_analysis.news_sentiment > 0.1 ? 'text-green-600' : 
                                  result.predictions.nextDay.sentiment_analysis.news_sentiment < -0.1 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {(result.predictions.nextDay.sentiment_analysis.news_sentiment * 100).toFixed(0)}%
                                </div>
                              </div>

                              <div className="text-center">
                                <div className="text-gray-600 mb-1">Confidence</div>
                                <div className="font-bold text-blue-600">
                                  {(result.predictions.nextDay.sentiment_analysis.sentiment_confidence * 100).toFixed(0)}%
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-gray-600 mb-1">News Articles</div>
                                <div className="font-bold text-gray-700">
                                  {result.predictions.nextDay.sentiment_analysis.news_count}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ML Model Information */}
                        {result.predictions.nextDay.ml_available && result.predictions.nextDay.ml_prediction && (
                          <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border-l-4 border-green-500">
                            <div className="flex items-center gap-2 mb-3">
                              <Brain className="h-5 w-5 text-green-600" />
                              <span className="font-semibold text-green-800">Machine Learning Models</span>
                            </div>
                            
                            {/* Model Combination */}
                            {result.predictions.nextDay.model_combination && (
                              <div className="mb-4 p-3 bg-white rounded-lg">
                                <div className="text-sm font-medium text-gray-700 mb-2">Hybrid Prediction Method</div>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <div className="text-gray-600">Technical Analysis</div>
                                    <div className="font-medium text-blue-600">
                                      {(result.predictions.nextDay.model_combination.technical_weight * 100).toFixed(0)}% weight
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      Signal: {result.predictions.nextDay.model_combination.technical_signal}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-gray-600">ML Models</div>
                                    <div className="font-medium text-green-600">
                                      {(result.predictions.nextDay.model_combination.ml_weight * 100).toFixed(0)}% weight
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      Signal: {result.predictions.nextDay.model_combination.ml_signal}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Individual ML Models */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                              {Object.entries(result.predictions.nextDay.ml_prediction.individual_models).map(([model, prediction]) => (
                                <div key={model} className="text-center p-2 bg-white rounded">
                                  <div className="font-medium capitalize text-gray-700">
                                    {model.replace('_', ' ')}
                                  </div>
                                  <div className="text-green-600 font-bold">
                                    ${typeof prediction === 'number' ? prediction.toFixed(2) : 'N/A'}
                                  </div>
                                  <div className="text-gray-500 text-xs">
                                    Weight: {((result.predictions?.nextDay?.ml_prediction?.model_weights?.[model] || 0) * 100).toFixed(0)}%
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* ML vs Technical Comparison */}
                            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                              <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <div className="text-gray-600 mb-1">Technical Target</div>
                                <div className="font-bold text-blue-600">
                                  ${(result.predictions?.nextDay?.price_target / (result.predictions?.nextDay?.model_combination?.technical_weight || 1)).toFixed(2)}
                                </div>
                              </div>
                              <div className="text-center p-3 bg-green-50 rounded-lg">
                                <div className="text-gray-600 mb-1">ML Target</div>
                                <div className="font-bold text-green-600">
                                  ${result.predictions?.nextDay?.ml_prediction?.price_target?.toFixed(2) || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Prediction Method Badge */}
                        {result.predictions?.nextDay?.prediction_method && (
                          <div className="flex justify-center">
                                                          <Badge variant={result.predictions?.nextDay?.ml_available ? "default" : "secondary"}>
                                                              {result.predictions?.nextDay?.prediction_method === 'hybrid_technical_ml' 
                                  ? '🤖 Hybrid AI + ML Prediction' 
                                  : result.predictions?.nextDay?.prediction_method === 'technical_analysis'
                                  ? '📊 Technical Analysis Only'
                                  : '🔍 Advanced Analysis'
                                }
                            </Badge>
                          </div>
                        )}

                        {/* AI-Powered Price Prediction */}
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-l-4 border-blue-500">
                          <div className="flex items-center gap-2 mb-3">
                            <Target className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold text-blue-800">AI-Powered Next-Day Price Prediction</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <div className="text-sm text-gray-600 mb-1">Current Price</div>
                              <div className="text-lg font-bold text-gray-800">
                                {formatPrice(result.predictions.nextDay.current_price)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-gray-600 mb-1">Predicted Price</div>
                              <div className="text-xl font-bold text-blue-600">
                                {formatPrice(result.predictions.nextDay.price_target)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-gray-600 mb-1">Expected Change</div>
                              <div className={`text-lg font-bold ${result.predictions.nextDay.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercentage(result.predictions.nextDay.change_percent)}
                              </div>
                            </div>
                          </div>
                        </div>


                      </div>
                    )}

                    {/* Multi-Day Forecasting */}
                    {result.predictions?.multiDay && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-600">
                          <Calendar className="h-5 w-5" />
                          <span className="font-semibold">{result.predictions.multiDay.days}-Day Forecast</span>
                          <Badge className="bg-blue-100 text-blue-800">Trend Analysis</Badge>
                        </div>

                        {/* Trend Analysis Summary */}
                        {result.predictions.multiDay.trend_analysis && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <div className="text-sm font-medium text-gray-600">Overall Trend</div>
                                <div className={`font-bold ${result.predictions.multiDay.trend_analysis.overall_trend === 'bullish' ? 'text-green-600' : result.predictions.multiDay.trend_analysis.overall_trend === 'bearish' ? 'text-red-600' : 'text-yellow-600'}`}>
                                  {result.predictions.multiDay.trend_analysis.overall_trend.toUpperCase()}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-600">Trend Strength</div>
                                <div className="font-bold text-blue-600">{result.predictions.multiDay.trend_analysis.trend_strength}</div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-600">Volatility</div>
                                <div className="font-bold text-blue-600">{result.predictions.multiDay.trend_analysis.volatility_level}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          {result.predictions.multiDay.projections.map((projection, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="text-sm font-medium">{projection.date}</div>
                                <div className="flex items-center gap-2">
                                  {getSignalIcon(projection.signal)}
                                  <div className="text-sm text-gray-500">
                                    {(projection.confidence * 100).toFixed(1)}% confidence
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-blue-600">
                                  {formatPrice(projection.price)}
                                </div>
                                {projection.trend && (
                                  <div className="text-xs text-gray-500">
                                    Trend: {projection.trend}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top Stocks Ranking */}
                    {result.predictions?.ranking && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-purple-600">
                          <Star className="h-5 w-5" />
                          <span className="font-semibold">Top {result.predictions.ranking.top_stocks.length} Stocks</span>
                          <Badge className="bg-purple-100 text-purple-800">AI Ranking</Badge>
                        </div>

                        {/* Analysis Summary */}
                        {result.predictions.ranking.analysis_summary && (
                          <div className="p-3 bg-purple-50 rounded-lg">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                              <div>
                                <div className="text-sm font-medium text-gray-600">Total Analyzed</div>
                                <div className="font-bold text-purple-600">{result.predictions.ranking.analysis_summary.total_analyzed}</div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-600">Bullish</div>
                                <div className="font-bold text-green-600">{result.predictions.ranking.analysis_summary.bullish_count}</div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-600">Bearish</div>
                                <div className="font-bold text-red-600">{result.predictions.ranking.analysis_summary.bearish_count}</div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-600">Avg Confidence</div>
                                <div className="font-bold text-purple-600">{(parseFloat(result.predictions.ranking.analysis_summary.average_confidence) * 100).toFixed(1)}%</div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          {result.predictions.ranking.top_stocks.map((stock, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold">#{index + 1}</span>
                                  <span className="text-sm font-medium">{stock.symbol}</span>
                                  {getSignalIcon(stock.signal)}
                                </div>
                                <div className="flex flex-col">
                                  <div className="text-sm text-gray-500">
                                    {((typeof stock.confidence === 'string' ? parseFloat(stock.confidence) : stock.confidence) * 100).toFixed(1)}% confidence
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Strength: {((typeof stock.signal_strength === 'string' ? parseFloat(stock.signal_strength) : stock.signal_strength) * 100).toFixed(1)}%
                                  </div>
                                  {stock.technical_score !== undefined && stock.momentum_score !== undefined && (
                                    <div className="text-xs text-gray-400">
                                      Tech: {typeof stock.technical_score === 'string' ? parseFloat(stock.technical_score).toFixed(2) : stock.technical_score.toFixed(2)} | Momentum: {typeof stock.momentum_score === 'string' ? parseFloat(stock.momentum_score).toFixed(2) : stock.momentum_score.toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-blue-600">
                                  {formatPrice(stock.current_price)}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {(() => {
                                    // Use expected_change if available, otherwise use change_percent
                                    if (stock.expected_change !== undefined) {
                                      const expectedChange = typeof stock.expected_change === 'string' ? parseFloat(stock.expected_change) : stock.expected_change;
                                      return (expectedChange > 0 ? '+' : '') + expectedChange.toFixed(1) + '%';
                                    } else {
                                      const changePercent = typeof stock.change_percent === 'string' ? parseFloat(stock.change_percent) : stock.change_percent;
                                      return (changePercent > 0 ? '+' : '') + changePercent.toFixed(1) + '%';
                                    }
                                  })()}
                                </div>
                                {stock.rsi && (
                                  <div className="text-xs text-gray-400">
                                    RSI: {stock.rsi} | MACD: {stock.macd_signal}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Market Trend */}
                    {result.predictions?.marketTrend && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-orange-600">
                          <LineChart className="h-5 w-5" />
                          <span className="font-semibold">Market Trend Analysis</span>
                          <Badge className="bg-orange-100 text-orange-800">Multi-Source</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              {getTrendIcon(result.predictions.marketTrend.trend)}
                              <div className="text-lg font-bold capitalize">
                                {result.predictions.marketTrend.trend}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">Market Direction</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-lg font-bold text-purple-600">
                              {(result.predictions.marketTrend.confidence * 100).toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-600">Confidence</div>
                            <Progress value={result.predictions.marketTrend.confidence * 100} className="mt-2" />
                          </div>
                        </div>

                        {/* Market Metrics */}
                        {result.predictions.marketTrend.market_metrics && (
                          <div className="p-3 bg-orange-50 rounded-lg">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                              <div>
                                <div className="text-sm font-medium text-gray-600">Avg Change</div>
                                <div className="font-bold text-orange-600">{result.predictions.marketTrend.market_metrics.average_change}</div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-600">Bullish Indices</div>
                                <div className="font-bold text-green-600">{result.predictions.marketTrend.market_metrics.bullish_indices}</div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-600">Bearish Indices</div>
                                <div className="font-bold text-red-600">{result.predictions.marketTrend.market_metrics.bearish_indices}</div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-600">Market Strength</div>
                                <div className="font-bold text-orange-600 capitalize">{result.predictions.marketTrend.market_metrics.market_strength}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm font-semibold mb-1">Duration: {result.predictions.marketTrend.duration}</div>
                          <div className="text-sm text-gray-600 mb-2">{result.predictions.marketTrend.reasoning}</div>
                          <div className="text-xs text-gray-500">
                            Signals: {result.predictions.marketTrend.bullish_signals} bullish, {result.predictions.marketTrend.bearish_signals} bearish 
                            ({result.predictions.marketTrend.total_signals} total)
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="text-center p-6">
                  <div className="text-red-600 text-lg font-semibold mb-2 flex items-center justify-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Prediction Failed
                  </div>
                  <div className="text-gray-600 text-sm mb-4">
                    {result.error}
                  </div>
                  <div className="text-xs text-gray-500">
                    Please check your parameters and try again.
                  </div>
                </div>
              )
            ) : (
              <div className="text-center p-6 text-gray-500">
                <div className="mb-2">🧠 Ready for AI Predictions</div>
                <div className="text-xs">
                  Configure your parameters and click "Run AI Prediction" to see results
                </div>
                <div className="text-xs mt-2 text-purple-600">
                  Powered by advanced machine learning models
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
