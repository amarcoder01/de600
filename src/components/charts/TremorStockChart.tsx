'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  AreaChart, 
  LineChart, 
  BarChart,
  Legend,
  Card as TremorCard,
  Title,
  Text
} from '@tremor/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Activity, 
  Calendar, 
  Settings,
  Play,
  Pause,
  RefreshCw,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react'

interface OHLCVData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface TremorStockChartProps {
  symbol: string
  data?: OHLCVData[]
  loading?: boolean
  error?: string
  height?: number
  className?: string
}

type ChartType = 'candlestick' | 'line' | 'area' | 'bar'
type Timeframe = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y'

export function TremorStockChart({ 
  symbol, 
  data = [], 
  loading = false, 
  error, 
  height = 500,
  className = ''
}: TremorStockChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1d')
  const [chartType, setChartType] = useState<ChartType>('line')
  const [showVolume, setShowVolume] = useState(true)
  const [realTimeMode, setRealTimeMode] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [chartData, setChartData] = useState<OHLCVData[]>(data)
  const [isLoading, setIsLoading] = useState(false)
  const [chartError, setChartError] = useState<string | null>(null)

  const timeframes: { value: Timeframe; label: string }[] = [
    { value: '1d', label: '1D' },
    { value: '5d', label: '5D' },
    { value: '1mo', label: '1M' },
    { value: '3mo', label: '3M' },
    { value: '6mo', label: '6M' },
    { value: '1y', label: '1Y' },
    { value: '5y', label: '5Y' }
  ]

  const chartTypes: { value: ChartType; label: string; icon: React.ReactNode }[] = [
    { value: 'line', label: 'Line', icon: <TrendingUp className="w-4 h-4" /> },
    { value: 'area', label: 'Area', icon: <Activity className="w-4 h-4" /> },
    { value: 'bar', label: 'Bar', icon: <BarChart3 className="w-4 h-4" /> },
    { value: 'candlestick', label: 'Candlestick', icon: <BarChart3 className="w-4 h-4" /> }
  ]

  // Fetch initial chart data
  useEffect(() => {
    console.log('🔍 useEffect triggered:', { symbol, dataLength: data?.length, loading, chartDataLength: chartData?.length })
    
    // If we already have chart data, don't fetch again
    if (chartData && chartData.length > 0) {
      console.log('✅ Already have chart data, skipping fetch')
      return
    }
    
    if (symbol && (!data || data.length === 0)) {
      console.log('📊 Fetching initial chart data for symbol:', symbol)
      fetchInitialChartData()
    } else if (data && data.length > 0) {
      console.log('✅ Setting chart data from props:', data.length, 'points')
      setChartData(data)
    }
  }, [symbol, data, chartData])

  // Real-time data refresh
  useEffect(() => {
    if (!realTimeMode || !symbol) return

    const interval = setInterval(async () => {
      try {
        console.log('Real-time refresh: fetching latest data for', symbol)
        const newData = await fetchChartData(timeframe)
        if (newData && newData.length > 0) {
          setChartData(newData)
          setLastUpdate(new Date())
          console.log('Real-time data updated:', newData.length, 'points')
        }
      } catch (error) {
        console.error('Real-time refresh error:', error)
      }
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [realTimeMode, symbol, timeframe])

  const fetchInitialChartData = async () => {
    console.log('🚀 Starting to fetch initial chart data...')
    setIsLoading(true)
    setChartError(null)
    try {
      const newData = await fetchChartData(timeframe)
      console.log('📈 Fetched data:', newData?.length, 'points')
      if (newData && newData.length > 0) {
        setChartData(newData)
        console.log('✅ Chart data set successfully')
      } else {
        console.log('⚠️ No data received from API')
        setChartError('No data received from API')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setChartError(errorMessage)
      console.error('❌ Error fetching initial chart data:', error)
    } finally {
      setIsLoading(false)
      console.log('🏁 Finished loading attempt')
    }
  }

  const fetchChartData = async (newTimeframe: Timeframe): Promise<OHLCVData[]> => {
    try {
      // Determine appropriate interval based on timeframe
      let interval = '1m'
      if (newTimeframe === '1mo' || newTimeframe === '3mo') {
        interval = '5m'
      } else if (newTimeframe === '6mo' || newTimeframe === '1y' || newTimeframe === '5y') {
        interval = '1d'
      }

      const url = `/api/chart/${symbol}?range=${newTimeframe}&interval=${interval}`
      console.log('🌐 Fetching from URL:', url)
      
      const response = await fetch(url)
      console.log('📡 Response status:', response.status, response.statusText)
      
      if (response.ok) {
        const result = await response.json()
        console.log('📊 API response:', result)
        return result.data || []
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Error fetching chart data:', error)
      throw new Error(`Failed to fetch chart data: ${errorMessage}`)
    }
  }

  const handleTimeframeChange = async (newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe)
    setIsLoading(true)
    setChartError(null)
    
    try {
      const newData = await fetchChartData(newTimeframe)
      if (newData && newData.length > 0) {
        setChartData(newData)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setChartError(errorMessage)
      console.error('Error fetching chart data for timeframe:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    await fetchInitialChartData()
  }

  // Transform data for Tremor charts
  const transformedData = useMemo(() => {
    console.log('🔄 Transforming chart data:', chartData?.length, 'points')
    if (!chartData || chartData.length === 0) {
      console.log('⚠️ No chart data to transform')
      return []
    }

    const transformed = chartData.map((item, index) => {
      const transformedItem = {
        date: new Date(item.time).toLocaleDateString(),
        time: new Date(item.time).toLocaleTimeString(),
        timestamp: item.time,
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
        volume: Number(item.volume),
        change: index > 0 ? Number(item.close) - Number(chartData[index - 1].close) : 0,
        changePercent: index > 0 ? ((Number(item.close) - Number(chartData[index - 1].close)) / Number(chartData[index - 1].close)) * 100 : 0
      }
      return transformedItem
    })

    console.log('✅ Transformed data sample:', transformed.slice(0, 3))
    return transformed
  }, [chartData])

  // Calculate current price and change
  const currentPrice = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0
    return chartData[chartData.length - 1].close
  }, [chartData])

  const priceChange = useMemo(() => {
    if (!chartData || chartData.length < 2) return 0
    const current = chartData[chartData.length - 1].close
    const previous = chartData[chartData.length - 2].close
    return current - previous
  }, [chartData])

  const priceChangePercent = useMemo(() => {
    if (!chartData || chartData.length < 2) return 0
    const current = chartData[chartData.length - 1].close
    const previous = chartData[chartData.length - 2].close
    return ((current - previous) / previous) * 100
  }, [chartData])

  // Render candlestick chart using Tremor v3 approach
  const renderCandlestickChart = () => {
    console.log('📊 Rendering candlestick chart with data:', transformedData?.length, 'points')
    if (!transformedData || transformedData.length === 0) {
      console.log('⚠️ No data for candlestick chart')
      return null
    }

    return (
      <div className="relative">
        <LineChart
          data={transformedData}
          index="date"
          categories={["close"]}
          colors={["blue"]}
          yAxisWidth={60}
          className="h-80"
        />
        
        {/* Volume chart below */}
        {showVolume && (
          <div className="mt-4 h-20">
            <BarChart
              data={transformedData}
              index="date"
              categories={["volume"]}
              colors={["purple"]}
              yAxisWidth={60}
              className="h-20"
            />
          </div>
        )}
      </div>
    )
  }

  // Render line chart using Tremor v3
  const renderLineChart = () => {
    console.log('📈 Rendering line chart with data:', transformedData?.length, 'points')
    return (
      <LineChart
        data={transformedData}
        index="date"
        categories={["close"]}
        colors={["blue"]}
        yAxisWidth={60}
        className={`h-${height - (showVolume ? 120 : 100)}`}
      />
    )
  }

  // Render area chart using Tremor v3
  const renderAreaChart = () => {
    console.log('📊 Rendering area chart with data:', transformedData?.length, 'points')
    return (
      <AreaChart
        data={transformedData}
        index="date"
        categories={["close"]}
        colors={["blue"]}
        yAxisWidth={60}
        className={`h-${height - (showVolume ? 120 : 100)}`}
      />
    )
  }

  // Render bar chart using Tremor v3
  const renderBarChart = () => {
    console.log('📊 Rendering bar chart with data:', transformedData?.length, 'points')
    return (
      <BarChart
        data={transformedData}
        index="date"
        categories={["close"]}
        colors={["blue"]}
        yAxisWidth={60}
        className={`h-${height - (showVolume ? 120 : 100)}`}
      />
    )
  }

  // Render the appropriate chart based on type
  const renderChart = () => {
    console.log('🎯 Rendering chart type:', chartType, 'with', transformedData?.length, 'data points')
    if (chartType === 'candlestick') return renderCandlestickChart()
    if (chartType === 'line') return renderLineChart()
    if (chartType === 'area') return renderAreaChart()
    if (chartType === 'bar') return renderBarChart()
    return renderLineChart()
  }

  // Main render function
  if (isLoading) {
    console.log('⏳ Rendering loading state (internal)')
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {symbol} Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-muted-foreground">Loading chart data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartError) {
    console.log('❌ Rendering error state:', chartError)
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {symbol} Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="text-red-500 text-4xl">⚠️</div>
              <p className="text-sm text-muted-foreground">Error loading chart</p>
              <p className="text-xs text-red-500">{chartError}</p>
              <Button onClick={handleRefresh} size="sm" className="mt-2">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!transformedData || transformedData.length === 0) {
    console.log('⚠️ Rendering no data state')
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {symbol} Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="text-muted-foreground text-4xl">📊</div>
              <p className="text-sm text-muted-foreground">No chart data available</p>
              <Button onClick={handleRefresh} size="sm" className="mt-2">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  console.log('🎨 Rendering chart with data:', transformedData.length, 'points, chartType:', chartType)

  return (
    <Card className={`bg-black/20 border border-purple-800/30 backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <CardTitle className="text-xl text-white">{symbol}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-2xl font-bold text-white">
                  ${currentPrice.toFixed(2)}
                </span>
                <div className={`flex items-center space-x-1 ${
                  priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {priceChange >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="font-medium">
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}
                  </span>
                  <span className="text-sm">
                    ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time indicator */}
          {realTimeMode && (
            <div className="flex items-center space-x-2 bg-green-600/20 border border-green-500/30 rounded-full px-3 py-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">LIVE</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Chart Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Timeframe Selection */}
          <div className="flex items-center space-x-1">
            {timeframes.map((tf) => (
              <Button
                key={tf.value}
                variant={timeframe === tf.value ? "default" : "outline"}
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
                variant={chartType === type.value ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType(type.value)}
                className="text-xs"
              >
                {type.icon}
                <span className="ml-1">{type.label}</span>
              </Button>
            ))}
          </div>

          {/* Additional Controls */}
          <div className="flex items-center space-x-2">
            <Button
              variant={showVolume ? "default" : "outline"}
              size="sm"
              onClick={() => setShowVolume(!showVolume)}
              className="text-xs"
            >
              {showVolume ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span className="ml-1">Volume</span>
            </Button>

            <Button
              variant={realTimeMode ? "default" : "outline"}
              size="sm"
              onClick={() => setRealTimeMode(!realTimeMode)}
              className={`text-xs ${
                realTimeMode 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'border-green-500/30 text-green-300 hover:bg-green-500/10'
              }`}
            >
              {realTimeMode ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span className="ml-1">{realTimeMode ? 'Live ON' : 'Live OFF'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="text-xs border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Chart Display */}
        <div className="relative">
          {renderChart()}
          
          {/* Chart Info Overlay */}
          <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 text-sm border border-purple-500/30">
            <div className="space-y-1 text-xs">
              <div className="text-gray-400">Data Points: {transformedData.length}</div>
              <div className="text-gray-400">Timeframe: {timeframe}</div>
              <div className="text-gray-400">Type: {chartType}</div>
              {realTimeMode && (
                <div className="text-green-400">Last Update: {lastUpdate.toLocaleTimeString()}</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
