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
import { Loader2, Brain, MessageSquare, TrendingUp, BarChart3, Settings, Play, Sparkles, Target, Shield, Clock, Zap } from 'lucide-react'
import type { GPTStrategyConfig, GPTStrategyRequest } from '@/lib/gpt-strategy-generator'
import type { Strategy } from '@/lib/strategy-builder-service'

interface GPTStrategyBuilderProps {
  onStrategyGenerated?: (strategy: Strategy) => void
}

export default function GPTStrategyBuilder({ onStrategyGenerated }: GPTStrategyBuilderProps) {
  const [activeTab, setActiveTab] = useState('generate')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  // Form state
  const [symbol, setSymbol] = useState('AAPL')
  const [description, setDescription] = useState('')
  const [gptConfig, setGptConfig] = useState<GPTStrategyConfig>({
    model: 'gpt-4',
    temperature: 0.3,
    maxTokens: 1000,
    strategyType: 'momentum',
    riskLevel: 'moderate',
    timeHorizon: 'medium',
    confidenceThreshold: 0.7
  })

  // Results state
  const [generatedStrategy, setGeneratedStrategy] = useState<any>(null)
  const [marketAnalysis, setMarketAnalysis] = useState<any>(null)

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

  const generateGPTStrategy = async () => {
    setIsGenerating(true)
    setProgress(0)
    setError(null)
    setSuccess(null)
    setSaveSuccess(null)

    try {
      // Validate inputs
      if (!symbol || !description) {
        throw new Error('Please fill in all required fields')
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

      const response = await fetch('/api/gpt-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateStrategy',
          symbol,
          description,
          model: gptConfig.model,
          strategyType: gptConfig.strategyType,
          riskLevel: gptConfig.riskLevel,
          timeHorizon: gptConfig.timeHorizon,
          temperature: gptConfig.temperature,
          maxTokens: gptConfig.maxTokens,
          confidenceThreshold: gptConfig.confidenceThreshold
        })
      })

      clearInterval(progressInterval)
      setProgress(100)

      const result = await response.json()
      if (result.success) {
        setGeneratedStrategy(result.data)
        setSuccess(`GPT strategy generated successfully for ${symbol}!`)
        
        // Automatically switch to results tab to show the generated strategy
        setActiveTab('results')
        
        // Only call callback if explicitly requested (not automatic)
        // if (onStrategyGenerated && result.data.strategy) {
        //   onStrategyGenerated(result.data.strategy)
        // }
      } else {
        throw new Error(result.error || 'Failed to generate strategy')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsGenerating(false)
      setProgress(0)
    }
  }

  const generateMarketAnalysis = async () => {
    setIsAnalyzing(true)
    setError(null)
    setSuccess(null)

    try {
      if (!symbol) {
        throw new Error('Please enter a symbol')
      }

      const response = await fetch('/api/gpt-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateMarketAnalysis',
          symbol
        })
      })

      const result = await response.json()
      if (result.success) {
        setMarketAnalysis(result.data)
        setSuccess(`Market analysis generated successfully for ${symbol}!`)
      } else {
        throw new Error(result.error || 'Failed to generate market analysis')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsAnalyzing(false)
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

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Strategy
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Market Analysis
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                GPT Strategy Generator
              </CardTitle>
              <CardDescription>
                Generate AI-powered trading strategies using advanced language models
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Symbol Input */}
              <div className="space-y-2">
                <Label htmlFor="symbol">Trading Symbol</Label>
                <Input
                  id="symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL, TSLA, SPY"
                />
              </div>

              {/* Strategy Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Strategy Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the type of strategy you want to generate..."
                  rows={3}
                />
              </div>

              {/* GPT Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">GPT Model</Label>
                  <Select value={gptConfig.model} onValueChange={(value) => setGptConfig(prev => ({ ...prev, model: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">GPT-4 (Most Capable)</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo (Fast)</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Cost-effective)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strategyType">Strategy Type</Label>
                  <Select value={gptConfig.strategyType} onValueChange={(value) => setGptConfig(prev => ({ ...prev, strategyType: value as any }))}>
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
                  <Select value={gptConfig.riskLevel} onValueChange={(value) => setGptConfig(prev => ({ ...prev, riskLevel: value as any }))}>
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
                  <Select value={gptConfig.timeHorizon} onValueChange={(value) => setGptConfig(prev => ({ ...prev, timeHorizon: value as any }))}>
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

              {/* Advanced Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={gptConfig.temperature}
                    onChange={(e) => setGptConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">Creativity level (0-1)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    min="100"
                    max="4000"
                    step="100"
                    value={gptConfig.maxTokens}
                    onChange={(e) => setGptConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">Response length</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confidenceThreshold">Confidence Threshold</Label>
                  <Input
                    id="confidenceThreshold"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={gptConfig.confidenceThreshold}
                    onChange={(e) => setGptConfig(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">Minimum confidence (0-1)</p>
                </div>
              </div>

              {/* Prompt Templates */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <h3 className="font-medium text-sm">Prompt Templates</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Click any template below to quickly populate the strategy description with proven patterns:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {predefinedDescriptions.map((desc, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setDescription(desc)}
                      className="block text-left p-2 rounded border border-transparent hover:border-blue-200 hover:bg-blue-50 text-xs transition-colors"
                    >
                      {desc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateGPTStrategy}
                disabled={isGenerating || !symbol || !description}
                className="w-full"
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

              {/* Progress Bar */}
              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Generating strategy...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {/* Error/Success Messages */}
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
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Market Analysis
              </CardTitle>
              <CardDescription>
                Generate comprehensive market analysis for any symbol
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="analysisSymbol">Symbol</Label>
                <div className="flex gap-2">
                  <Input
                    id="analysisSymbol"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g., AAPL"
                  />
                  <Button
                    onClick={generateMarketAnalysis}
                    disabled={isAnalyzing || !symbol}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Analyze
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {marketAnalysis && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Analysis Results for {symbol}</h3>
                  
                  {/* Technical Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Technical Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Trend:</span>
                          <Badge variant={marketAnalysis.technical.trend === 'bullish' ? 'default' : 'secondary'} className="ml-2">
                            {marketAnalysis.technical.trend}
                          </Badge>
                        </div>
                        <div>
                          <span className="font-medium">Momentum:</span>
                          <Badge variant="outline" className="ml-2">
                            {marketAnalysis.technical.momentum}
                          </Badge>
                        </div>
                        <div>
                          <span className="font-medium">Support:</span>
                          <span className="ml-2">${marketAnalysis.technical.support?.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="font-medium">Resistance:</span>
                          <span className="ml-2">${marketAnalysis.technical.resistance?.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sentiment Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Sentiment Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Overall:</span>
                          <Badge variant={marketAnalysis.sentiment.overall === 'bullish' ? 'default' : 'secondary'} className="ml-2">
                            {marketAnalysis.sentiment.overall}
                          </Badge>
                        </div>
                        <div>
                          <span className="font-medium">Analyst Rating:</span>
                          <Badge variant="outline" className="ml-2">
                            {marketAnalysis.sentiment.analystRating}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Risk Assessment */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Risk Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Risk Level:</span>
                          <Badge variant={getRiskColor(marketAnalysis.risk.riskLevel) === 'text-green-600' ? 'default' : 'destructive'} className="ml-2">
                            {marketAnalysis.risk.riskLevel}
                          </Badge>
                        </div>
                        <div>
                          <span className="font-medium">Max Drawdown:</span>
                          <span className="ml-2">{marketAnalysis.risk.maxDrawdown?.toFixed(1)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Action:</span>
                          <Badge variant={marketAnalysis.recommendations.action === 'buy' ? 'default' : 'secondary'} className="ml-2">
                            {marketAnalysis.recommendations.action.toUpperCase()}
                          </Badge>
                        </div>
                        <div>
                          <span className="font-medium">Confidence:</span>
                          <span className={`ml-2 ${getConfidenceColor(marketAnalysis.recommendations.confidence)}`}>
                            {(marketAnalysis.recommendations.confidence * 100).toFixed(0)}% ({getConfidenceLabel(marketAnalysis.recommendations.confidence)})
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Reasoning:</span>
                          <p className="mt-1 text-muted-foreground">{marketAnalysis.recommendations.reasoning}</p>
                        </div>
                        {marketAnalysis.recommendations.priceTarget && (
                          <div>
                            <span className="font-medium">Price Target:</span>
                            <span className="ml-2">${marketAnalysis.recommendations.priceTarget.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
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
                    Generated Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">{generatedStrategy.strategy?.name}</h3>
                      <p className="text-muted-foreground">{generatedStrategy.strategy?.description}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{generatedStrategy.confidence ? (generatedStrategy.confidence * 100).toFixed(0) : 'N/A'}%</div>
                        <div className="text-sm text-muted-foreground">Confidence</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{generatedStrategy.strategy?.type?.replace('_', ' ').toUpperCase()}</div>
                        <div className="text-sm text-muted-foreground">Type</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{generatedStrategy.riskAssessment?.riskLevel?.toUpperCase()}</div>
                        <div className="text-sm text-muted-foreground">Risk Level</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{generatedStrategy.riskAssessment?.maxDrawdown?.toFixed(1) || 'N/A'}%</div>
                        <div className="text-sm text-muted-foreground">Max Drawdown</div>
                      </div>
                    </div>

                    {/* Strategy Parameters */}
                    {generatedStrategy.strategy?.parameters && (
                      <div>
                        <h4 className="font-semibold mb-2">Strategy Parameters</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div><span className="font-medium">RSI Period:</span> {generatedStrategy.strategy.parameters.rsiPeriod}</div>
                          <div><span className="font-medium">Stop Loss:</span> {generatedStrategy.strategy.parameters.stopLoss}%</div>
                          <div><span className="font-medium">Take Profit:</span> {generatedStrategy.strategy.parameters.takeProfit}%</div>
                          <div><span className="font-medium">Position Size:</span> {generatedStrategy.strategy.parameters.positionSize}%</div>
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {generatedStrategy.recommendations && (
                      <div>
                        <h4 className="font-semibold mb-2">GPT Recommendations</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium">Action:</span>
                            <Badge variant={generatedStrategy.recommendations.action === 'buy' ? 'default' : 'secondary'} className="ml-2">
                              {generatedStrategy.recommendations.action.toUpperCase()}
                            </Badge>
                          </div>
                          <div>
                            <span className="font-medium">Confidence:</span>
                            <span className={`ml-2 ${getConfidenceColor(generatedStrategy.recommendations.confidence)}`}>
                              {(generatedStrategy.recommendations.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Reasoning:</span>
                            <p className="mt-1 text-muted-foreground">{generatedStrategy.recommendations.reasoning}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4 border-t">
                      <Button
                        onClick={() => {
                          if (onStrategyGenerated && generatedStrategy.strategy) {
                            onStrategyGenerated(generatedStrategy.strategy)
                            setSaveSuccess(`Strategy "${generatedStrategy.strategy.name}" saved to your strategy list!`)
                            setTimeout(() => setSaveSuccess(null), 3000)
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <Target className="h-4 w-4" />
                        Save to Strategy List
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab('generate')}
                        className="flex items-center gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate Another Strategy
                      </Button>
                    </div>

                    {/* Save Success Message */}
                    {saveSuccess && (
                      <Alert className="mt-4">
                        <AlertDescription>{saveSuccess}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No strategy generated yet. Go to the Generate Strategy tab to create one.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
