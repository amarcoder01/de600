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
import { YahooFinanceChartAPI } from '@/lib/yahoo-finance-chart-api'

interface YahooFinanceChartProps {
  symbol: string
  interval?: string
  range?: string
  width?: number
  height?: number
  theme?: 'light' | 'dark'
  indicators?: string[]
  chartType?: 'line' | 'area' | 'bar'
  showControls?: boolean
  className?: string
}

export function YahooFinanceChart({ 
  symbol, 
  interval = '1d',
  range = '1mo',
  width = 800,
  height = 400,
  theme = 'dark',
  indicators = [],
  chartType = 'line',
  showControls = true,
  className = ''
}: YahooFinanceChartProps) {
  const [chartUrl, setChartUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentInterval, setCurrentInterval] = useState(interval)
  const [currentRange, setCurrentRange] = useState(range)
  const [currentChartType, setCurrentChartType] = useState(chartType)
  const [currentIndicators, setCurrentIndicators] = useState<string[]>(indicators)
  const [showIndicators, setShowIndicators] = useState(indicators.length > 0)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [chartData, setChartData] = useState<any>(null)

  const intervals = YahooFinanceChartAPI.getAvailableIntervals()
  const ranges = YahooFinanceChartAPI.getAvailableRanges()
  const chartTypes = YahooFinanceChartAPI.getAvailableChartTypes()

  // Check if Yahoo Finance API is configured
  const isConfigured = YahooFinanceChartAPI.isConfigured()
  const apiStatus = YahooFinanceChartAPI.getAPIStatus()

  // Generate chart image URL using QuickChart.io
  const generateChartImageURL = (options: {
    symbol: string
    interval: string
    range: string
    width: number
    height: number
    theme: string
    chartType: string
    data: any[]
  }) => {
    const { symbol, interval, width, height, theme, chartType, data } = options

    // Format data for chart rendering
    const chartPoints = data.map((point: any) => ({
      x: new Date(point.time).toISOString().split('T')[0],
      y: point.close || point.open || 0
    })).filter((point: any) => point.y > 0)

    // Create chart configuration
    const chartConfig = {
      type: chartType === 'candlestick' ? 'line' : chartType,
      data: {
        datasets: [{
          label: symbol,
          data: chartPoints,
          borderColor: theme === 'dark' ? '#8b5cf6' : '#3b82f6',
          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
          fill: false
        }]
      },
      options: {
        responsive: true,
        width: width,
        height: height,
        plugins: {
          title: {
            display: true,
            text: `${symbol} Chart (${interval})`,
            color: theme === 'dark' ? '#ffffff' : '#000000'
          }
        },
        scales: {
          x: {
            grid: {
              color: theme === 'dark' ? '#374151' : '#e5e7eb'
            },
            ticks: {
              color: theme === 'dark' ? '#9ca3af' : '#6b7280'
            }
          },
          y: {
            grid: {
              color: theme === 'dark' ? '#374151' : '#e5e7eb'
            },
            ticks: {
              color: theme === 'dark' ? '#9ca3af' : '#6b7280'
            }
          }
        }
      }
    }

    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig))
    return `https://quickchart.io/chart?c=${encodedConfig}`
  }

  // Generate chart
  const generateChartImage = useCallback(async () => {
    // Use our API route to avoid CORS issues
    setIsLoading(true)
    setError(null)

    try {
      // Call our Next.js API route instead of direct Yahoo Finance API
      const apiUrl = `/api/chart/${symbol}?interval=${currentInterval}&range=${currentRange}`
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        // Generate chart image URL using QuickChart.io with the fetched data
        const chartImageUrl = generateChartImageURL({
          symbol,
          interval: currentInterval,
          range: currentRange,
          width,
          height,
          theme,
          chartType: currentChartType,
          data: result.data
        })
        
        setChartUrl(chartImageUrl)
        setChartData(result.data)
        setLastUpdate(new Date())
        console.log('Chart generated successfully:', chartImageUrl)
      } else {
        throw new Error(result.error || 'Failed to generate chart')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setChartUrl(YahooFinanceChartAPI.generateFallbackChart(symbol))
      console.error('Error generating chart:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [symbol, currentInterval, currentRange, currentChartType, currentIndicators, showIndicators, width, height, theme, isConfigured])

  // Fetch chart data only
  const fetchDataOnly = useCallback(async () => {
    // Use our API route to avoid CORS issues
    setIsLoading(true)
    setError(null)

    try {
      const apiUrl = `/api/chart/${symbol}?interval=${currentInterval}&range=${currentRange}`
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setChartData(result.data)
        setLastUpdate(new Date())
        console.log('Chart data fetched successfully')
      } else {
        throw new Error(result.error || 'Failed to fetch chart data')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching chart data:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [symbol, currentInterval, currentRange, currentIndicators, isConfigured])

  // Handle interval change
  const handleIntervalChange = (newInterval: string) => {
    setCurrentInterval(newInterval)
  }

  // Handle range change
  const handleRangeChange = (newRange: string) => {
    setCurrentRange(newRange)
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
      link.download = `${symbol}-${currentInterval}-${currentChartType}.png`
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
  }, [currentInterval, currentRange, currentChartType, currentIndicators, showIndicators])

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
            <h3 className="text-lg font-semibold text-white mb-2">Yahoo Finance API Not Configured</h3>
            <p className="text-gray-300 mb-4">
              Please add your Yahoo Finance API key to your environment variables.
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
                    Yahoo Finance
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
              {/* Interval Selection */}
              <div className="flex items-center space-x-1">
                {intervals.slice(0, 6).map((int) => (
                  <Button
                    key={int.value}
                    variant={currentInterval === int.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleIntervalChange(int.value)}
                    className="text-xs"
                  >
                    {int.label}
                  </Button>
                ))}
              </div>

              {/* Range Selection */}
              <div className="flex items-center space-x-1">
                {ranges.slice(0, 6).map((rng) => (
                  <Button
                    key={rng.value}
                    variant={currentRange === rng.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleRangeChange(rng.value)}
                    className="text-xs"
                  >
                    {rng.label}
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
                  alt={`${symbol} ${currentInterval} ${currentChartType} chart`}
                  className="w-full h-auto"
                  style={{ minHeight: `${height}px` }}
                  onError={() => {
                    setError('Failed to load chart image')
                    setChartUrl(YahooFinanceChartAPI.generateFallbackChart(symbol))
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
                <div className="text-gray-400">Interval: {currentInterval}</div>
                <div className="text-gray-400">Range: {currentRange}</div>
                <div className="text-gray-400">Type: {currentChartType}</div>
                {showIndicators && currentIndicators.length > 0 && (
                  <div className="text-gray-400">Indicators: {currentIndicators.join(', ')}</div>
                )}
                <div className="text-purple-400">Last Update: {lastUpdate.toLocaleTimeString()}</div>
              </div>
            </div>
          </div>

          {/* Chart Data Summary */}
          {chartData && (
            <div className="bg-black/30 border border-purple-800/50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-white mb-2">Chart Data Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="text-gray-400">
                  <span className="text-purple-400">Data Points:</span> {chartData.chart?.result?.[0]?.timestamp?.length || 0}
                </div>
                <div className="text-gray-400">
                  <span className="text-purple-400">Currency:</span> {chartData.chart?.result?.[0]?.meta?.currency || 'USD'}
                </div>
                <div className="text-gray-400">
                  <span className="text-purple-400">Exchange:</span> {chartData.chart?.result?.[0]?.meta?.exchangeName || 'Unknown'}
                </div>
                <div className="text-gray-400">
                  <span className="text-purple-400">Symbol:</span> {chartData.chart?.result?.[0]?.meta?.symbol || symbol}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Export convenience components
export const SimpleYahooFinanceChart = ({ symbol, ...props }: Omit<YahooFinanceChartProps, 'showControls'>) => (
  <YahooFinanceChart symbol={symbol} showControls={false} {...props} />
)

export const YahooFinanceChartWithIndicators = ({ symbol, indicators = ['sma', 'ema', 'rsi'], ...props }: YahooFinanceChartProps) => (
  <YahooFinanceChart symbol={symbol} indicators={indicators} {...props} />
)
