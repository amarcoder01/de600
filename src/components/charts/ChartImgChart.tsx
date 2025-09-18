'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Activity, 
  Settings,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChartImgAPI, generateChart, generateChartWithIndicators } from '@/lib/chartimg-api'

interface ChartImgChartProps {
  symbol: string
  timeframe?: string
  width?: number
  height?: number
  theme?: 'light' | 'dark'
  indicators?: string[]
  chartType?: 'candlestick' | 'line' | 'area' | 'bar'
  showControls?: boolean
  className?: string
}

export function ChartImgChart({ 
  symbol, 
  timeframe = '1d',
  width = 800,
  height = 400,
  theme = 'dark',
  indicators = [],
  chartType = 'candlestick',
  showControls = true,
  className = ''
}: ChartImgChartProps) {
  const [chartUrl, setChartUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTimeframe, setCurrentTimeframe] = useState(timeframe)
  const [currentChartType, setCurrentChartType] = useState(chartType)
  const [currentIndicators, setCurrentIndicators] = useState<string[]>(indicators)
  const [showIndicators, setShowIndicators] = useState(indicators.length > 0)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const timeframes = ChartImgAPI.getAvailableTimeframes()
  const chartTypes = ChartImgAPI.getAvailableChartTypes()
  const availableIndicators = ChartImgAPI.getAvailableIndicators()

  // Check if ChartImg is configured
  const isConfigured = ChartImgAPI.isConfigured()
  const apiStatus = ChartImgAPI.getAPIStatus()

  // Generate chart
  const generateChartImage = useCallback(async () => {
    if (!isConfigured) {
      setError('ChartImg API not configured. Please add CHARTIMG_API_KEY to your environment variables.')
      setChartUrl(ChartImgAPI.generateFallbackChart(symbol))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const options = {
        symbol,
        timeframe: currentTimeframe,
        width,
        height,
        theme,
        chartType: currentChartType,
        indicators: showIndicators ? currentIndicators : []
      }

      const result = await generateChart(options)
      
      if (result.success) {
        setChartUrl(result.url)
        setLastUpdate(new Date())
        console.log('Chart generated successfully:', result.url)
      } else {
        throw new Error(result.error || 'Failed to generate chart')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setChartUrl(ChartImgAPI.generateFallbackChart(symbol))
      console.error('Error generating chart:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [symbol, currentTimeframe, currentChartType, currentIndicators, showIndicators, width, height, theme, isConfigured])

  // Generate chart with indicators
  const generateChartWithTechnicalIndicators = useCallback(async () => {
    if (!isConfigured) {
      setError('ChartImg API not configured')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await generateChartWithIndicators(symbol, currentIndicators, currentTimeframe)
      
      if (result.success) {
        setChartUrl(result.url)
        setLastUpdate(new Date())
        console.log('Chart with indicators generated successfully')
      } else {
        throw new Error(result.error || 'Failed to generate chart with indicators')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error generating chart with indicators:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [symbol, currentIndicators, currentTimeframe, isConfigured])

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe: string) => {
    setCurrentTimeframe(newTimeframe)
  }

  // Handle chart type change
  const handleChartTypeChange = (newChartType: string) => {
    setCurrentChartType(newChartType as any)
  }

  // Handle indicator toggle
  const handleIndicatorToggle = (indicator: string) => {
    setCurrentIndicators(prev => {
      if (prev.includes(indicator)) {
        return prev.filter(i => i !== indicator)
      } else {
        return [...prev, indicator]
      }
    })
  }

  // Download chart
  const downloadChart = () => {
    if (chartUrl && chartUrl.startsWith('http')) {
      const link = document.createElement('a')
      link.href = chartUrl
      link.download = `${symbol}-${currentTimeframe}-${currentChartType}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Initial chart generation
  useEffect(() => {
    generateChartImage()
  }, [generateChartImage])

  // Regenerate chart when parameters change
  useEffect(() => {
    if (chartUrl) {
      generateChartImage()
    }
  }, [currentTimeframe, currentChartType, currentIndicators, showIndicators])

  if (!isConfigured) {
    return (
      <Card className={`bg-black/20 border border-yellow-800/30 backdrop-blur-sm ${className}`}>
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-yellow-400" />
            <span>{symbol} Chart</span>
            <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 bg-yellow-500/10">
              API Not Configured
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">ChartImg API Not Configured</h3>
            <p className="text-gray-300 mb-4">
              Please add your ChartImg API key to your environment variables.
            </p>
            <div className="bg-black/30 border border-yellow-800/50 rounded-lg p-4 text-left">
              <p className="text-sm text-gray-300 mb-2">Add to your <code className="bg-black/50 px-2 py-1 rounded">.env.local</code> file:</p>
              <code className="text-xs text-yellow-300 block bg-black/50 p-2 rounded">
                CHARTIMG_API_KEY=your_actual_api_key_here
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full ${className}`}
    >
      <Card className="bg-black/20 border border-purple-800/30 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <CardTitle className="text-xl text-white">{symbol}</CardTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="border-purple-500/30 text-purple-300 bg-purple-500/10">
                    ChartImg
                  </Badge>
                  <Badge variant="outline" className="border-green-500/30 text-green-300 bg-green-500/10">
                    {currentChartType.toUpperCase()}
                  </Badge>
                  {showIndicators && currentIndicators.length > 0 && (
                    <Badge variant="outline" className="border-blue-500/30 text-blue-300 bg-blue-500/10">
                      {currentIndicators.length} Indicators
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* API Status */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-green-600/20 border border-green-500/30 rounded-full px-3 py-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400 text-sm font-medium">API Ready</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Chart Controls */}
          {showControls && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* Timeframe Selection */}
              <div className="flex items-center space-x-1">
                {timeframes.slice(0, 6).map((tf) => (
                  <Button
                    key={tf.value}
                    variant={currentTimeframe === tf.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTimeframeChange(tf.value)}
                    className="text-xs"
                  >
                    {tf.label}
                  </Button>
                ))}
              </div>

              {/* Chart Type Selection */}
              <div className="flex items-center space-x-1">
                {chartTypes.map((type) => (
                  <Button
                    key={type.value}
                    variant={currentChartType === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleChartTypeChange(type.value)}
                    className="text-xs"
                  >
                    {type.label}
                  </Button>
                ))}
              </div>

              {/* Additional Controls */}
              <div className="flex items-center space-x-2">
                <Button
                  variant={showIndicators ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowIndicators(!showIndicators)}
                  className="text-xs"
                >
                  {showIndicators ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span className="ml-1">Indicators</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateChartImage}
                  disabled={isLoading}
                  className="text-xs border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadChart}
                  disabled={!chartUrl || chartUrl.startsWith('data:')}
                  className="text-xs border-green-500/30 text-green-300 hover:bg-green-500/10"
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Technical Indicators Selection */}
          {showIndicators && (
            <div className="bg-black/30 border border-purple-800/50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-white mb-2">Technical Indicators</h4>
              <div className="flex flex-wrap gap-2">
                {availableIndicators.map((indicator) => (
                  <Button
                    key={indicator}
                    variant={currentIndicators.includes(indicator) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleIndicatorToggle(indicator)}
                    className="text-xs"
                  >
                    {indicator.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Chart Display */}
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                  <p className="text-white mt-2 text-sm">Generating chart...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute top-4 right-4 bg-red-600/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white">
                <div className="flex items-center space-x-1">
                  <Activity className="w-4 h-4" />
                  <span>Error: {error}</span>
                </div>
              </div>
            )}

            <div className="bg-black/20 border border-purple-800/30 rounded-lg overflow-hidden">
              {chartUrl ? (
                <img
                  src={chartUrl}
                  alt={`${symbol} ${currentTimeframe} ${currentChartType} chart`}
                  className="w-full h-auto"
                  style={{ minHeight: `${height}px` }}
                  onError={() => {
                    setError('Failed to load chart image')
                    setChartUrl(ChartImgAPI.generateFallbackChart(symbol))
                  }}
                />
              ) : (
                <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-purple-400 mx-auto mb-2" />
                    <p className="text-gray-300">Loading chart...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Chart Info Overlay */}
            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 text-sm border border-purple-500/30">
              <div className="space-y-1 text-xs">
                <div className="text-gray-400">Symbol: {symbol}</div>
                <div className="text-gray-400">Timeframe: {currentTimeframe}</div>
                <div className="text-gray-400">Type: {currentChartType}</div>
                {showIndicators && currentIndicators.length > 0 && (
                  <div className="text-gray-400">Indicators: {currentIndicators.join(', ')}</div>
                )}
                <div className="text-purple-400">Last Update: {lastUpdate.toLocaleTimeString()}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Export convenience components
export const SimpleChartImgChart = ({ symbol, ...props }: Omit<ChartImgChartProps, 'showControls'>) => (
  <ChartImgChart symbol={symbol} showControls={false} {...props} />
)

export const ChartImgChartWithIndicators = ({ symbol, indicators = ['sma', 'ema', 'rsi'], ...props }: ChartImgChartProps) => (
  <ChartImgChart symbol={symbol} indicators={indicators} {...props} />
)
