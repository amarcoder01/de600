'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  Brain,
  Zap,
  Star,
  Crown,
  Activity,
  BarChart3,
  LineChart,
  PieChart,
  RefreshCw
} from 'lucide-react'

interface OHLCVData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface Pattern {
  id: string
  name: string
  type: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  description: string
  signal: 'buy' | 'sell' | 'hold'
  strength: 'strong' | 'medium' | 'weak'
  location: number // index in data array
}

interface MarketSentiment {
  overall: 'bullish' | 'bearish' | 'neutral'
  score: number
  confidence: number
  factors: {
    technical: number
    volume: number
    momentum: number
    trend: number
  }
  signals: Array<{
    indicator: string
    signal: 'buy' | 'sell' | 'hold'
    strength: number
  }>
}

interface PatternRecognitionComponentProps {
  data: OHLCVData[]
  symbol: string
  timeframe: string
}

export function PatternRecognitionComponent({ data, symbol, timeframe }: PatternRecognitionComponentProps) {
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(0)

  // Memoized candlestick patterns to prevent recreation
  const candlestickPatterns = useMemo(() => [
    {
      id: 'doji',
      name: 'Doji',
      type: 'neutral' as const,
      description: 'Open and close prices are nearly equal, indicating indecision'
    },
    {
      id: 'hammer',
      name: 'Hammer',
      type: 'bullish' as const,
      description: 'Long lower shadow with small body, potential reversal signal'
    },
    {
      id: 'shooting_star',
      name: 'Shooting Star',
      type: 'bearish' as const,
      description: 'Long upper shadow with small body, potential reversal signal'
    },
    {
      id: 'engulfing_bullish',
      name: 'Bullish Engulfing',
      type: 'bullish' as const,
      description: 'Current candle completely engulfs previous bearish candle'
    },
    {
      id: 'engulfing_bearish',
      name: 'Bearish Engulfing',
      type: 'bearish' as const,
      description: 'Current candle completely engulfs previous bullish candle'
    },
    {
      id: 'morning_star',
      name: 'Morning Star',
      type: 'bullish' as const,
      description: 'Three-candle pattern indicating potential bullish reversal'
    },
    {
      id: 'evening_star',
      name: 'Evening Star',
      type: 'bearish' as const,
      description: 'Three-candle pattern indicating potential bearish reversal'
    }
  ], [])

  // Memoized chart patterns
  const chartPatterns = useMemo(() => [
    {
      id: 'head_shoulders',
      name: 'Head and Shoulders',
      type: 'bearish' as const,
      description: 'Reversal pattern with three peaks, middle peak highest'
    },
    {
      id: 'inverse_head_shoulders',
      name: 'Inverse Head and Shoulders',
      type: 'bullish' as const,
      description: 'Reversal pattern with three troughs, middle trough lowest'
    },
    {
      id: 'double_top',
      name: 'Double Top',
      type: 'bearish' as const,
      description: 'Two peaks at similar levels, potential resistance'
    },
    {
      id: 'double_bottom',
      name: 'Double Bottom',
      type: 'bullish' as const,
      description: 'Two troughs at similar levels, potential support'
    },
    {
      id: 'triangle_ascending',
      name: 'Ascending Triangle',
      type: 'bullish' as const,
      description: 'Horizontal resistance with rising support line'
    },
    {
      id: 'triangle_descending',
      name: 'Descending Triangle',
      type: 'bearish' as const,
      description: 'Horizontal support with falling resistance line'
    },
    {
      id: 'flag_bullish',
      name: 'Bull Flag',
      type: 'bullish' as const,
      description: 'Consolidation pattern after strong upward move'
    },
    {
      id: 'flag_bearish',
      name: 'Bear Flag',
      type: 'bearish' as const,
      description: 'Consolidation pattern after strong downward move'
    }
  ], [])

  // Calculate market sentiment (memoized) - moved before analyzePatterns
  const calculateSentiment = useCallback((data: OHLCVData[]): MarketSentiment => {
    if (data.length < 10) {
      return {
        overall: 'neutral',
        score: 50,
        confidence: 0,
        factors: { technical: 50, volume: 50, momentum: 50, trend: 50 },
        signals: []
      }
    }

    const recentData = data.slice(-10)
    
    // Technical analysis
    const priceChange = (recentData[recentData.length - 1].close - recentData[0].close) / recentData[0].close
    const technicalScore = priceChange > 0.02 ? 75 : priceChange < -0.02 ? 25 : 50
    
    // Volume analysis
    const avgVolume = recentData.reduce((sum, d) => sum + d.volume, 0) / recentData.length
    const currentVolume = recentData[recentData.length - 1].volume
    const volumeScore = currentVolume > avgVolume * 1.2 ? 75 : currentVolume < avgVolume * 0.8 ? 25 : 50
    
    // Momentum analysis
    const momentum = recentData.slice(-5).reduce((sum, d, i, arr) => {
      if (i === 0) return 0
      return sum + (d.close - arr[i - 1].close)
    }, 0)
    const momentumScore = momentum > 0 ? 70 : momentum < 0 ? 30 : 50
    
    // Trend analysis
    const trendScore = recentData.slice(-5).every((d, i, arr) => i === 0 || d.close >= arr[i - 1].close) ? 80 :
                     recentData.slice(-5).every((d, i, arr) => i === 0 || d.close <= arr[i - 1].close) ? 20 : 50
    
    const overallScore = (technicalScore + volumeScore + momentumScore + trendScore) / 4
    const overall = overallScore > 60 ? 'bullish' : overallScore < 40 ? 'bearish' : 'neutral'
    
    return {
      overall,
      score: overallScore,
      confidence: 75,
      factors: {
        technical: technicalScore,
        volume: volumeScore,
        momentum: momentumScore,
        trend: trendScore
      },
      signals: [
        {
          indicator: 'Price Action',
          signal: technicalScore > 60 ? 'buy' : technicalScore < 40 ? 'sell' : 'hold',
          strength: Math.abs(technicalScore - 50) / 50
        },
        {
          indicator: 'Volume',
          signal: volumeScore > 60 ? 'buy' : volumeScore < 40 ? 'sell' : 'hold',
          strength: Math.abs(volumeScore - 50) / 50
        },
        {
          indicator: 'Momentum',
          signal: momentumScore > 60 ? 'buy' : momentumScore < 40 ? 'sell' : 'hold',
          strength: Math.abs(momentumScore - 50) / 50
        },
        {
          indicator: 'Trend',
          signal: trendScore > 60 ? 'buy' : trendScore < 40 ? 'sell' : 'hold',
          strength: Math.abs(trendScore - 50) / 50
        }
      ]
    }
  }, [])

  // Memoized pattern analysis function
  const analyzePatterns = useCallback(async () => {
    console.log('🔍 Pattern Recognition: Starting analysis...', { 
      dataLength: data?.length, 
      symbol, 
      timeframe,
      isAnalyzing,
      lastAnalysisTime: Date.now() - lastAnalysisTime
    })

    if (!data || data.length < 3) {
      console.log('🔍 Pattern Recognition: Insufficient data, clearing patterns')
      setPatterns([])
      setSentiment(null)
      return
    }

    // Prevent multiple simultaneous analyses
    if (isAnalyzing) {
      console.log('🔍 Pattern Recognition: Analysis already in progress, skipping')
      return
    }

    // Check if we've analyzed recently (within 5 seconds)
    const now = Date.now()
    if (now - lastAnalysisTime < 5000) {
      console.log('🔍 Pattern Recognition: Analysis too recent, skipping')
      return
    }

    console.log('🔍 Pattern Recognition: Starting analysis process...')
    setIsAnalyzing(true)
    setError(null)
    setLastAnalysisTime(now)

    try {
      // Use requestAnimationFrame for better performance with timeout
      await Promise.race([
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            console.log('🔍 Pattern Recognition: Processing data...')
            const detectedPatterns: Pattern[] = []
            
            // Detect candlestick patterns (optimized)
            const maxCandles = Math.min(data.length, 100) // Limit to last 100 candles for performance
            console.log(`🔍 Pattern Recognition: Analyzing ${maxCandles} candles...`)
            
            for (let i = 2; i < maxCandles; i++) {
              const current = data[i]
              const prev = data[i - 1]
              const prev2 = data[i - 2]
              
              // Doji pattern
              if (Math.abs(current.open - current.close) / (current.high - current.low) < 0.1) {
                detectedPatterns.push({
                  id: 'doji',
                  name: 'Doji',
                  type: 'neutral',
                  confidence: 85,
                  description: 'Open and close prices are nearly equal, indicating indecision',
                  signal: 'hold',
                  strength: 'medium',
                  location: i
                })
              }
              
              // Hammer pattern
              const bodySize = Math.abs(current.close - current.open)
              const lowerShadow = Math.min(current.open, current.close) - current.low
              const upperShadow = current.high - Math.max(current.open, current.close)
              
              if (lowerShadow > 2 * bodySize && upperShadow < bodySize * 0.5) {
                detectedPatterns.push({
                  id: 'hammer',
                  name: 'Hammer',
                  type: 'bullish',
                  confidence: 75,
                  description: 'Long lower shadow with small body, potential reversal signal',
                  signal: 'buy',
                  strength: 'medium',
                  location: i
                })
              }
              
              // Shooting star pattern
              if (upperShadow > 2 * bodySize && lowerShadow < bodySize * 0.5) {
                detectedPatterns.push({
                  id: 'shooting_star',
                  name: 'Shooting Star',
                  type: 'bearish',
                  confidence: 75,
                  description: 'Long upper shadow with small body, potential reversal signal',
                  signal: 'sell',
                  strength: 'medium',
                  location: i
                })
              }
              
              // Engulfing patterns
              if (current.close > current.open && prev.close < prev.open && 
                  current.open < prev.close && current.close > prev.open) {
                detectedPatterns.push({
                  id: 'engulfing_bullish',
                  name: 'Bullish Engulfing',
                  type: 'bullish',
                  confidence: 80,
                  description: 'Current candle completely engulfs previous bearish candle',
                  signal: 'buy',
                  strength: 'strong',
                  location: i
                })
              }

              if (current.close < current.open && prev.close > prev.open && 
                  current.open > prev.close && current.close < prev.open) {
                detectedPatterns.push({
                  id: 'engulfing_bearish',
                  name: 'Bearish Engulfing',
                  type: 'bearish',
                  confidence: 80,
                  description: 'Current candle completely engulfs previous bullish candle',
                  signal: 'sell',
                  strength: 'strong',
                  location: i
                })
              }
            }
            
            console.log(`🔍 Pattern Recognition: Found ${detectedPatterns.length} candlestick patterns`)
            
            // Detect chart patterns (simplified and optimized)
            if (data.length > 20) {
              const recentData = data.slice(-20)
              const highs = recentData.map(d => d.high)
              const lows = recentData.map(d => d.low)
              
              // Simple double top/bottom detection
              const maxHigh = Math.max(...highs)
              const maxHighCount = highs.filter(h => h >= maxHigh * 0.98).length
              
              if (maxHighCount >= 2) {
                detectedPatterns.push({
                  id: 'double_top',
                  name: 'Double Top',
                  type: 'bearish',
                  confidence: 70,
                  description: 'Two peaks at similar levels, potential resistance',
                  signal: 'sell',
                  strength: 'medium',
                  location: data.length - 1
                })
              }

              const minLow = Math.min(...lows)
              const minLowCount = lows.filter(l => l <= minLow * 1.02).length
              
              if (minLowCount >= 2) {
                detectedPatterns.push({
                  id: 'double_bottom',
                  name: 'Double Bottom',
                  type: 'bullish',
                  confidence: 70,
                  description: 'Two troughs at similar levels, potential support',
                  signal: 'buy',
                  strength: 'medium',
                  location: data.length - 1
                })
              }
            }
            
            console.log(`🔍 Pattern Recognition: Total patterns found: ${detectedPatterns.length}`)
            setPatterns(detectedPatterns)
            
            // Calculate market sentiment
            console.log('🔍 Pattern Recognition: Calculating sentiment...')
            const sentimentScore = calculateSentiment(data)
            setSentiment(sentimentScore)
            
            console.log('🔍 Pattern Recognition: Analysis complete!')
            resolve()
          })
        }),
        new Promise<void>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Pattern analysis timeout - taking too long'))
          }, 10000) // 10 second timeout
        })
      ])
    } catch (err) {
      console.error('🔍 Pattern Recognition: Error during analysis:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze patterns. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [data, isAnalyzing, lastAnalysisTime])

  // Debounced effect to prevent excessive analysis
  useEffect(() => {
    if (data.length > 0) {
      const timeoutId = setTimeout(() => {
        analyzePatterns()
      }, 500) // 500ms debounce

      return () => clearTimeout(timeoutId)
    }
  }, [data, analyzePatterns])

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'buy': return 'text-green-600 bg-green-100'
      case 'sell': return 'text-red-600 bg-red-100'
      default: return 'text-yellow-600 bg-yellow-100'
    }
  }

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'weak': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const handleManualRefresh = () => {
    setLastAnalysisTime(0) // Reset last analysis time to force refresh
    analyzePatterns()
  }

  return (
    <div className="space-y-6">
      {/* Pattern Recognition */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Pattern Recognition
              </CardTitle>
              <CardDescription>
                AI-powered pattern detection and analysis
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isAnalyzing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}
          
          {isAnalyzing ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground mb-2">Analyzing patterns...</p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span>Processing {data?.length || 0} data points</span>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              </div>
            </div>
          ) : patterns.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patterns.slice(0, 6).map((pattern, index) => (
                  <Card key={`${pattern.id}-${index}`} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={pattern.type === 'bullish' ? 'default' : pattern.type === 'bearish' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {pattern.type}
                        </Badge>
                        <span className="font-semibold text-sm">{pattern.name}</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded ${getSignalColor(pattern.signal)}`}>
                          {pattern.signal.toUpperCase()}
                        </div>
                        <div className={`text-xs mt-1 ${getStrengthColor(pattern.strength)}`}>
                          {pattern.strength}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{pattern.description}</p>
                    <div className="flex items-center gap-2">
                      <Progress value={pattern.confidence} className="flex-1 h-2" />
                      <span className="text-xs font-medium">{pattern.confidence}%</span>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="text-center">
                <Badge variant="outline" className="text-xs">
                  {patterns.length} patterns detected
                </Badge>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-2" />
              <p>No patterns detected in current timeframe</p>
              <p className="text-xs mt-1">Try changing the timeframe or symbol</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Market Sentiment */}
      {sentiment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Market Sentiment Analysis
            </CardTitle>
            <CardDescription>
              AI-powered sentiment analysis and trading signals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Overall Sentiment */}
              <div className="text-center">
                <div className="text-2xl font-bold mb-2">
                  {sentiment.overall.charAt(0).toUpperCase() + sentiment.overall.slice(1)}
                </div>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Progress value={sentiment.score} className="w-32 h-3" />
                  <span className="text-sm font-medium">{sentiment.score.toFixed(0)}%</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {sentiment.confidence}% confidence
                </Badge>
              </div>

              {/* Sentiment Factors */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(sentiment.factors).map(([factor, score]) => (
                  <div key={factor} className="text-center">
                    <div className="text-sm font-medium capitalize mb-2">{factor}</div>
                    <Progress value={score} className="h-2 mb-1" />
                    <div className="text-xs text-muted-foreground">{score.toFixed(0)}%</div>
                  </div>
                ))}
              </div>

              {/* Trading Signals */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Trading Signals</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sentiment.signals.map((signal, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">{signal.indicator}</span>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={signal.signal === 'buy' ? 'default' : signal.signal === 'sell' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {signal.signal.toUpperCase()}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {(signal.strength * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pattern Library */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Pattern Library
          </CardTitle>
          <CardDescription>
            Available patterns for detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-3">Candlestick Patterns</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {candlestickPatterns.map((pattern) => (
                  <div key={pattern.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                    <span>{pattern.name}</span>
                    <Badge 
                      variant={pattern.type === 'bullish' ? 'default' : pattern.type === 'bearish' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {pattern.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm mb-3">Chart Patterns</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {chartPatterns.map((pattern) => (
                  <div key={pattern.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                    <span>{pattern.name}</span>
                    <Badge 
                      variant={pattern.type === 'bullish' ? 'default' : pattern.type === 'bearish' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {pattern.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
