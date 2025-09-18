"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData, HistogramData } from 'lightweight-charts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  LineChart, 
  BarChart3, 
  TrendingUp, 
  Activity, 
  PieChart,
  Target,
  Zap,
  Loader2,
  Maximize2,
  Minimize2,
  Settings,
  Eye,
  EyeOff,
  Download,
  Share2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Percent,
  BarChart,
  CandlestickChart,
  AreaChart
} from 'lucide-react'

interface ChartData {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface StockChartProps {
  symbol: string
  data: ChartData[]
  color?: string
  showVolume?: boolean
  showIndicators?: boolean
  chartType?: 'candlestick' | 'line' | 'area'
}

interface ComparisonChartProps {
  stocks: Array<{
    symbol: string
    data: ChartData[]
    color: string
  }>
  period: string
}

interface TechnicalIndicatorsProps {
  symbol: string
  data: ChartData[]
}

interface ChartMetrics {
  currentPrice: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  avgVolume: number
  marketCap?: number
  pe?: number
  beta?: number
}

// Technical Analysis Functions
const calculateSMA = (data: number[], period: number): number[] => {
  const sma: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN)
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      sma.push(sum / period)
    }
  }
  return sma
}

const calculateEMA = (data: number[], period: number): number[] => {
  const ema: number[] = []
  const multiplier = 2 / (period + 1)
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema.push(data[i])
    } else {
      ema.push((data[i] * multiplier) + (ema[i - 1] * (1 - multiplier)))
    }
  }
  return ema
}

const calculateRSI = (data: number[], period: number = 14): number[] => {
  const rsi: number[] = []
  const gains: number[] = []
  const losses: number[] = []
  
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }
  
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      rsi.push(NaN)
    } else {
      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period
      const rs = avgGain / avgLoss
      rsi.push(100 - (100 / (1 + rs)))
    }
  }
  return rsi
}

const calculateBollingerBands = (data: number[], period: number = 20, stdDev: number = 2) => {
  const sma = calculateSMA(data, period)
  const upper: number[] = []
  const lower: number[] = []
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(NaN)
      lower.push(NaN)
    } else {
      const slice = data.slice(i - period + 1, i + 1)
      const mean = sma[i]
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period
      const standardDeviation = Math.sqrt(variance)
      
      upper.push(mean + (standardDeviation * stdDev))
      lower.push(mean - (standardDeviation * stdDev))
    }
  }
  
  return { upper, middle: sma, lower }
}

// Advanced Financial Metrics Functions
const calculateVolatility = (data: number[]): number => {
  if (data.length < 2) return 0
  
  const returns = []
  for (let i = 1; i < data.length; i++) {
    returns.push((data[i] - data[i - 1]) / data[i - 1])
  }
  
  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
  
  return Math.sqrt(variance) * 100 // Convert to percentage
}

const calculateSharpeRatio = (data: number[], riskFreeRate: number = 0.02): number => {
  if (data.length < 2) return 0
  
  const returns = []
  for (let i = 1; i < data.length; i++) {
    returns.push((data[i] - data[i - 1]) / data[i - 1])
  }
  
  const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length
  const volatility = Math.sqrt(variance)
  
  if (volatility === 0) return 0
  
  return (meanReturn - riskFreeRate) / volatility
}

export function EnhancedPriceChart({ 
  symbol, 
  data, 
  color = '#3b82f6', 
  showVolume = true, 
  showIndicators = true,
  chartType = 'candlestick'
}: StockChartProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedTimeframe, setSelectedTimeframe] = useState('1d')
  const [showSMA, setShowSMA] = useState(true)
  const [showEMA, setShowEMA] = useState(true)
  const [showBollinger, setShowBollinger] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  const metrics = useMemo((): ChartMetrics => {
    if (!data || data.length === 0) {
      return {
        currentPrice: 0,
        change: 0,
        changePercent: 0,
        high: 0,
        low: 0,
        volume: 0,
        avgVolume: 0
      }
    }

    const currentPrice = data[data.length - 1].close
    const previousPrice = data[0].close
    const change = currentPrice - previousPrice
    const changePercent = (change / previousPrice) * 100
    const high = Math.max(...data.map(d => d.high))
    const low = Math.min(...data.map(d => d.low))
    const volume = data[data.length - 1].volume
    const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length

    return {
      currentPrice,
      change,
      changePercent,
      high,
      low,
      volume,
      avgVolume
    }
  }, [data])

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    return data.map((point, index) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume
    }))
  }, [data])

  const technicalIndicators = useMemo(() => {
    if (!data || data.length === 0) return null

    const closePrices = data.map(d => d.close)
    const sma20 = calculateSMA(closePrices, 20)
    const sma50 = calculateSMA(closePrices, 50)
    const ema12 = calculateEMA(closePrices, 12)
    const ema26 = calculateEMA(closePrices, 26)
    const bb = calculateBollingerBands(closePrices, 20, 2)

    return {
      sma20,
      sma50,
      ema12,
      ema26,
      bollingerBands: bb
    }
  }, [data])

  useEffect(() => {
    if (!chartContainerRef.current || !chartData.length) return

    // Ensure container is still mounted
    if (!chartContainerRef.current.isConnected) return

    // Cleanup previous chart
    if (chartRef.current) {
      try {
        chartRef.current.remove()
      } catch (error) {
        // Chart might already be disposed, ignore the error
        console.warn('Chart cleanup warning:', error)
      }
      chartRef.current = null
    }

    // Create new chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: isExpanded ? 500 : 300,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#cccccc',
      },
      timeScale: {
        borderColor: '#cccccc',
        timeVisible: true,
        secondsVisible: false,
      },
    })

    chartRef.current = chart

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })

    // Add volume series
    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      })

      const volumeData = chartData.map(point => ({
        time: point.time as any,
        value: point.volume,
        color: point.close >= point.open ? '#10b981' : '#ef4444'
      }))
      volumeSeries.setData(volumeData)
    }

    // Add technical indicators
    if (showIndicators && technicalIndicators) {
      if (showSMA) {
        // SMA 20
        const sma20Data = chartData.map((point, index) => ({
          time: point.time as any,
          value: technicalIndicators.sma20[index] || NaN
        })).filter(point => !isNaN(point.value))

        chart.addLineSeries({
          color: '#3b82f6',
          lineWidth: 2,
          title: 'SMA 20',
        }).setData(sma20Data)

        // SMA 50
        const sma50Data = chartData.map((point, index) => ({
          time: point.time as any,
          value: technicalIndicators.sma50[index] || NaN
        })).filter(point => !isNaN(point.value))

        chart.addLineSeries({
          color: '#f59e0b',
          lineWidth: 2,
          title: 'SMA 50',
        }).setData(sma50Data)
      }

      if (showEMA) {
        // EMA 12
        const ema12Data = chartData.map((point, index) => ({
          time: point.time as any,
          value: technicalIndicators.ema12[index] || NaN
        })).filter(point => !isNaN(point.value))

        chart.addLineSeries({
          color: '#8b5cf6',
          lineWidth: 2,
          title: 'EMA 12',
        }).setData(ema12Data)

        // EMA 26
        const ema26Data = chartData.map((point, index) => ({
          time: point.time as any,
          value: technicalIndicators.ema26[index] || NaN
        })).filter(point => !isNaN(point.value))

        chart.addLineSeries({
          color: '#ec4899',
          lineWidth: 2,
          title: 'EMA 26',
        }).setData(ema26Data)
      }

      if (showBollinger && technicalIndicators.bollingerBands) {
        const bb = technicalIndicators.bollingerBands
        
        // Upper band
        const upperData = chartData.map((point, index) => ({
          time: point.time as any,
          value: bb.upper[index] || NaN
        })).filter(point => !isNaN(point.value))

        chart.addLineSeries({
          color: '#6b7280',
          lineWidth: 1,
          title: 'BB Upper',
        }).setData(upperData)

        // Lower band
        const lowerData = chartData.map((point, index) => ({
          time: point.time as any,
          value: bb.lower[index] || NaN
        })).filter(point => !isNaN(point.value))

        chart.addLineSeries({
          color: '#6b7280',
          lineWidth: 1,
          title: 'BB Lower',
        }).setData(lowerData)
      }
    }

    // Set data
    candlestickSeries.setData(chartData as any)

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: isExpanded ? 500 : 300,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) {
        try {
          chartRef.current.remove()
        } catch (error) {
          // Chart might already be disposed, ignore the error
          console.warn('Chart cleanup warning:', error)
        }
        chartRef.current = null
      }
    }
  }, [chartData, showVolume, showIndicators, showSMA, showEMA, showBollinger, isExpanded, technicalIndicators])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.remove()
        } catch (error) {
          // Chart might already be disposed, ignore the error
          console.warn('Chart unmount cleanup warning:', error)
        }
        chartRef.current = null
      }
    }
  }, [])

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CandlestickChart className="w-5 h-5" />
            {symbol} Price Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={isExpanded ? 'col-span-2 row-span-2' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CandlestickChart className="w-5 h-5" />
            <CardTitle>{symbol}</CardTitle>
            <Badge variant={metrics.changePercent >= 0 ? 'default' : 'destructive'}>
              {metrics.changePercent >= 0 ? '+' : ''}{metrics.changePercent.toFixed(2)}%
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <CardDescription>
          ${metrics.currentPrice.toFixed(2)} • {data.length} data points • Last updated: {new Date(data[data.length - 1]?.timestamp).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">1D</SelectItem>
                <SelectItem value="5d">5D</SelectItem>
                <SelectItem value="1mo">1M</SelectItem>
                <SelectItem value="3mo">3M</SelectItem>
                <SelectItem value="6mo">6M</SelectItem>
                <SelectItem value="1y">1Y</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button
                variant={showSMA ? "default" : "outline"}
                size="sm"
                onClick={() => setShowSMA(!showSMA)}
              >
                SMA
              </Button>
              <Button
                variant={showEMA ? "default" : "outline"}
                size="sm"
                onClick={() => setShowEMA(!showEMA)}
              >
                EMA
              </Button>
              <Button
                variant={showBollinger ? "default" : "outline"}
                size="sm"
                onClick={() => setShowBollinger(!showBollinger)}
              >
                BB
              </Button>
            </div>
          </div>

          {/* Chart Container */}
          <div ref={chartContainerRef} className="w-full" />

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-600">Current</div>
              <div className="text-lg font-bold text-gray-900">${metrics.currentPrice.toFixed(2)}</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-600">Change</div>
              <div className={`text-lg font-bold ${metrics.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.change >= 0 ? '+' : ''}{metrics.change.toFixed(2)}
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-600">High</div>
              <div className="text-lg font-bold text-blue-600">${metrics.high.toFixed(2)}</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-600">Low</div>
              <div className="text-lg font-bold text-red-600">${metrics.low.toFixed(2)}</div>
            </div>
          </div>

          {/* Volume Metrics */}
          {showVolume && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-600">Volume</div>
                <div className="text-lg font-bold text-gray-900">
                  {metrics.volume.toLocaleString()}
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-600">Avg Volume</div>
                <div className="text-lg font-bold text-gray-900">
                  {metrics.avgVolume.toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function EnhancedComparisonChart({ stocks, period }: ComparisonChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(period)
  const [chartType, setChartType] = useState<'line' | 'area'>('line')
  const [showLegend, setShowLegend] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set(stocks.map(s => s.symbol)))
  const [hoveredStock, setHoveredStock] = useState<string | null>(null)
  const [realTimeData, setRealTimeData] = useState<{[symbol: string]: any[]}>({})
  const [loading, setLoading] = useState<{[symbol: string]: boolean}>({})

  // Fetch real-time data when period changes
  useEffect(() => {
    const fetchData = async () => {
      const symbols = stocks.map(s => s.symbol)
      
      for (const symbol of symbols) {
        setLoading(prev => ({ ...prev, [symbol]: true }))
        
        try {
          const response = await fetch(`/api/chart-data/${symbol}?period=${selectedPeriod}`)
          if (response.ok) {
            const result = await response.json()
            setRealTimeData(prev => ({ ...prev, [symbol]: result.data }))
          } else {
            console.error(`Failed to fetch data for ${symbol}`)
          }
        } catch (error) {
          console.error(`Error fetching data for ${symbol}:`, error)
        } finally {
          setLoading(prev => ({ ...prev, [symbol]: false }))
        }
      }
    }

    if (stocks.length > 0) {
      fetchData()
    }
  }, [selectedPeriod, stocks])

  const normalizedData = useMemo(() => {
    if (!stocks || stocks.length === 0) return []

    return stocks.map(stock => {
      // Use real-time data if available, otherwise fall back to original data
      const dataToUse = realTimeData[stock.symbol] || stock.data || []
      
      if (!dataToUse || dataToUse.length === 0) return null
      
      const firstPrice = dataToUse[0].close
      const lastPrice = dataToUse[dataToUse.length - 1].close
      const totalReturn = ((lastPrice - firstPrice) / firstPrice) * 100
      
      return {
        symbol: stock.symbol,
        color: stock.color,
        firstPrice,
        lastPrice,
        totalReturn,
        data: dataToUse.map(point => ({
          time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
          value: (point.close / firstPrice) * 100,
          price: point.close,
          volume: point.volume
        }))
      }
    }).filter(Boolean)
  }, [stocks, realTimeData])

  const performanceMetrics = useMemo(() => {
    if (!normalizedData.length) return null

    const sortedByReturn = [...normalizedData].sort((a, b) => (b?.totalReturn || 0) - (a?.totalReturn || 0))
    const bestPerformer = sortedByReturn[0]
    const worstPerformer = sortedByReturn[sortedByReturn.length - 1]
    const avgReturn = normalizedData.reduce((sum, stock) => sum + (stock?.totalReturn || 0), 0) / normalizedData.length

    return {
      bestPerformer,
      worstPerformer,
      avgReturn,
      totalStocks: normalizedData.length
    }
  }, [normalizedData])

  if (!stocks || stocks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Stock Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Select stocks to compare</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Advanced Performance Comparison
            </CardTitle>
                         {performanceMetrics && performanceMetrics.bestPerformer && (
               <div className="flex items-center gap-4 text-sm">
                 <div className="flex items-center gap-1">
                   <span className="text-muted-foreground">Best:</span>
                   <Badge variant="default" className="text-xs">
                     {performanceMetrics.bestPerformer.symbol} +{performanceMetrics.bestPerformer.totalReturn.toFixed(2)}%
                   </Badge>
                 </div>
                 <div className="flex items-center gap-1">
                   <span className="text-muted-foreground">Avg:</span>
                   <Badge variant={performanceMetrics.avgReturn >= 0 ? 'default' : 'destructive'} className="text-xs">
                     {performanceMetrics.avgReturn >= 0 ? '+' : ''}{performanceMetrics.avgReturn.toFixed(2)}%
                   </Badge>
                 </div>
               </div>
             )}
          </div>
                     <div className="flex items-center gap-2">
             <Button
               variant="outline"
               size="sm"
               onClick={() => setShowLegend(!showLegend)}
             >
               {showLegend ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
             </Button>
             <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
               <SelectTrigger className="w-32">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="1d">1 Day</SelectItem>
                 <SelectItem value="5d">5 Days</SelectItem>
                 <SelectItem value="1mo">1 Month</SelectItem>
                 <SelectItem value="3mo">3 Months</SelectItem>
                 <SelectItem value="6mo">6 Months</SelectItem>
                 <SelectItem value="1y">1 Year</SelectItem>
               </SelectContent>
             </Select>
            <Select value={chartType} onValueChange={(value: 'line' | 'area') => setChartType(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="area">Area</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
                 <CardDescription>
           Real-time performance comparison with live data from Polygon.io • Period: {selectedPeriod} • {Object.values(loading).some(Boolean) ? 'Loading...' : 'Live'}
         </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
                     {/* Advanced Comparison Chart */}
           <div className="relative h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border">
             {/* Loading Overlay */}
             {Object.values(loading).some(Boolean) && (
               <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-xl">
                 <div className="flex items-center gap-2">
                   <Loader2 className="w-5 h-5 animate-spin" />
                   <span className="text-sm font-medium">Loading real-time data...</span>
                 </div>
               </div>
             )}
             <svg className="w-full h-full" viewBox="0 0 800 320">
              {/* Grid Lines */}
              {showGrid && (
                <>
                  {[0, 25, 50, 75, 100, 125, 150, 175, 200].map((y, index) => (
                    <line
                      key={index}
                      x1="40"
                      y1={320 - (y / 200) * 280}
                      x2="760"
                      y2={320 - (y / 200) * 280}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      strokeDasharray="5,5"
                    />
                  ))}
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((x, index) => (
                    <line
                      key={index}
                      x1={40 + (x / 10) * 720}
                      y1="40"
                      x2={40 + (x / 10) * 720}
                      y2="320"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      strokeDasharray="5,5"
                    />
                  ))}
                </>
              )}

              {/* Y-axis labels */}
              {[0, 50, 100, 150, 200].map((value, index) => (
                <text
                  key={index}
                  x="35"
                  y={320 - (value / 200) * 280 + 4}
                  fontSize="10"
                  fill="#6b7280"
                  textAnchor="end"
                >
                  {value}%
                </text>
              ))}

              {/* Chart Lines */}
              {normalizedData
                .filter((stock): stock is NonNullable<typeof stock> => stock !== null && selectedStocks.has(stock.symbol))
                .map((stock, index) => (
                  <g key={stock.symbol}>
                    <path
                      d={stock.data.map((point, index) => {
                        const x = 40 + (index / (stock.data.length - 1)) * 720
                        const y = 320 - (point.value / 200) * 280
                        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                      }).join(' ')}
                      stroke={stock.color}
                      strokeWidth={hoveredStock === stock.symbol ? "4" : "2"}
                      fill="none"
                      opacity={hoveredStock === stock.symbol ? 1 : 0.8}
                      onMouseEnter={() => setHoveredStock(stock.symbol)}
                      onMouseLeave={() => setHoveredStock(null)}
                      style={{ cursor: 'pointer' }}
                    />
                    {chartType === 'area' && (
                      <path
                        d={`M 40 320 ${stock.data.map((point, index) => {
                          const x = 40 + (index / (stock.data.length - 1)) * 720
                          const y = 320 - (point.value / 200) * 280
                          return `L ${x} ${y}`
                        }).join(' ')} L 760 320 Z`}
                        fill={stock.color}
                        opacity="0.1"
                      />
                    )}
                    
                    {/* Data points on hover */}
                    {hoveredStock === stock.symbol && stock.data.map((point, index) => {
                      const x = 40 + (index / (stock.data.length - 1)) * 720
                      const y = 320 - (point.value / 200) * 280
                      return (
                        <circle
                          key={index}
                          cx={x}
                          cy={y}
                          r="4"
                          fill={stock.color}
                          stroke="white"
                          strokeWidth="2"
                        />
                      )
                    })}
                  </g>
                ))}

              {/* Interactive Legend */}
              {showLegend && (
                <g transform="translate(40, 20)">
                  {normalizedData
                    .filter((stock): stock is NonNullable<typeof stock> => stock !== null && selectedStocks.has(stock.symbol))
                    .map((stock, index) => (
                      <g
                        key={stock.symbol}
                        onMouseEnter={() => setHoveredStock(stock.symbol)}
                        onMouseLeave={() => setHoveredStock(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <rect
                          x={index * 120}
                          y="0"
                          width="110"
                          height="25"
                          fill="white"
                          stroke="#e5e7eb"
                          strokeWidth="1"
                          rx="4"
                          opacity={hoveredStock === stock.symbol ? 1 : 0.8}
                        />
                        <circle
                          cx={index * 120 + 15}
                          cy="12"
                          r="6"
                          fill={stock.color}
                          opacity={hoveredStock === stock.symbol ? 1 : 0.8}
                        />
                        <text
                          x={index * 120 + 25}
                          y="17"
                          fontSize="11"
                          fill="#374151"
                          fontWeight="500"
                        >
                          {stock.symbol}
                        </text>
                        <text
                          x={index * 120 + 25}
                          y="28"
                          fontSize="9"
                          fill={stock.totalReturn >= 0 ? "#10b981" : "#ef4444"}
                          fontWeight="600"
                        >
                          {stock.totalReturn >= 0 ? '+' : ''}{stock.totalReturn.toFixed(1)}%
                        </text>
                      </g>
                    ))}
                </g>
              )}
            </svg>
          </div>

                     {/* Advanced Performance Metrics */}
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {normalizedData
               .filter(stock => stock && selectedStocks.has(stock.symbol))
               .map(stock => {
                 if (!stock) return null
                 const volatility = calculateVolatility(stock.data.map(d => d.value))
                 const sharpeRatio = calculateSharpeRatio(stock.data.map(d => d.value))
                 
                 return (
                   <div 
                     key={stock.symbol} 
                     className={`p-4 rounded-lg border transition-all duration-200 ${
                       hoveredStock === stock.symbol 
                         ? 'border-blue-300 bg-blue-50 shadow-md' 
                         : 'border-gray-200 bg-white'
                     }`}
                     onMouseEnter={() => setHoveredStock(stock.symbol)}
                     onMouseLeave={() => setHoveredStock(null)}
                   >
                     <div className="flex items-center justify-between mb-3">
                       <div className="flex items-center gap-2">
                         <div 
                           className="w-4 h-4 rounded-full" 
                           style={{ backgroundColor: stock.color }}
                         />
                         <span className="font-semibold text-lg">{stock.symbol}</span>
                       </div>
                       <Badge variant={stock.totalReturn >= 0 ? 'default' : 'destructive'}>
                         {stock.totalReturn >= 0 ? '+' : ''}{stock.totalReturn.toFixed(2)}%
                       </Badge>
                     </div>
                     
                     <div className="space-y-2 text-sm">
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">Start Price:</span>
                         <span className="font-medium">${stock.firstPrice.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">End Price:</span>
                         <span className="font-medium">${stock.lastPrice.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">Volatility:</span>
                         <span className="font-medium">{volatility.toFixed(2)}%</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">Sharpe Ratio:</span>
                         <span className="font-medium">{sharpeRatio.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">Data Points:</span>
                         <span className="font-medium">{stock.data.length}</span>
                       </div>
                     </div>
                   </div>
                 )
               })}
           </div>

                     {/* Performance Summary Cards */}
           {performanceMetrics && performanceMetrics.bestPerformer && performanceMetrics.worstPerformer && (
             <div className="grid gap-4 md:grid-cols-4">
               <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                 <CardContent className="p-4">
                   <div className="flex items-center gap-2 mb-2">
                     <TrendingUp className="w-4 h-4 text-green-600" />
                     <span className="text-sm font-medium text-green-800">Best Performer</span>
                   </div>
                   <div className="text-2xl font-bold text-green-900">
                     {performanceMetrics.bestPerformer.symbol}
                   </div>
                   <div className="text-lg font-semibold text-green-700">
                     +{performanceMetrics.bestPerformer.totalReturn.toFixed(2)}%
                   </div>
                 </CardContent>
               </Card>

               <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
                 <CardContent className="p-4">
                   <div className="flex items-center gap-2 mb-2">
                     <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
                     <span className="text-sm font-medium text-red-800">Worst Performer</span>
                   </div>
                   <div className="text-2xl font-bold text-red-900">
                     {performanceMetrics.worstPerformer.symbol}
                   </div>
                   <div className="text-lg font-semibold text-red-700">
                     {performanceMetrics.worstPerformer.totalReturn.toFixed(2)}%
                   </div>
                 </CardContent>
               </Card>

               <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                 <CardContent className="p-4">
                   <div className="flex items-center gap-2 mb-2">
                     <BarChart3 className="w-4 h-4 text-blue-600" />
                     <span className="text-sm font-medium text-blue-800">Average Return</span>
                   </div>
                   <div className="text-2xl font-bold text-blue-900">
                     {performanceMetrics.avgReturn.toFixed(2)}%
                   </div>
                   <div className="text-sm text-blue-700">
                     Across {performanceMetrics.totalStocks} stocks
                   </div>
                 </CardContent>
               </Card>

               <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                 <CardContent className="p-4">
                   <div className="flex items-center gap-2 mb-2">
                     <Activity className="w-4 h-4 text-purple-600" />
                     <span className="text-sm font-medium text-purple-800">Performance Spread</span>
                   </div>
                   <div className="text-2xl font-bold text-purple-900">
                     {(performanceMetrics.bestPerformer.totalReturn - performanceMetrics.worstPerformer.totalReturn).toFixed(2)}%
                   </div>
                   <div className="text-sm text-purple-700">
                     Best vs Worst
                   </div>
                 </CardContent>
               </Card>
             </div>
           )}
        </div>
      </CardContent>
    </Card>
  )
}

export function TechnicalIndicatorsChart({ symbol, data }: TechnicalIndicatorsProps) {
  const [showRSI, setShowRSI] = useState(true)
  const [showMACD, setShowMACD] = useState(true)

  const indicators = useMemo(() => {
    if (!data || data.length === 0) return null

    const closePrices = data.map(d => d.close)
    const rsi = calculateRSI(closePrices, 14)
    
    // MACD
    const ema12 = calculateEMA(closePrices, 12)
    const ema26 = calculateEMA(closePrices, 26)
    const macd = ema12.map((value, index) => value - ema26[index])
    const signal = calculateEMA(macd, 9)
    const histogram = macd.map((value, index) => value - signal[index])

    return {
      rsi,
      macd,
      signal,
      histogram
    }
  }, [data])

  if (!data || data.length === 0 || !indicators) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Technical Indicators
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={showRSI ? "default" : "outline"}
              size="sm"
              onClick={() => setShowRSI(!showRSI)}
            >
              RSI
            </Button>
            <Button
              variant={showMACD ? "default" : "outline"}
              size="sm"
              onClick={() => setShowMACD(!showMACD)}
            >
              MACD
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* RSI Chart */}
          {showRSI && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">RSI (14)</span>
                <span className="text-sm text-gray-600">
                  {indicators.rsi[indicators.rsi.length - 1]?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div className="relative h-24 bg-gray-50 rounded-lg p-2">
                <svg className="w-full h-full" viewBox="0 0 400 80">
                  {/* RSI Line */}
                  <path
                    d={indicators.rsi.map((value, index) => {
                      if (isNaN(value)) return ''
                      const x = (index / (indicators.rsi.length - 1)) * 360 + 20
                      const y = 70 - (value / 100) * 60
                      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                    }).join(' ')}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    fill="none"
                  />
                  
                  {/* Overbought/oversold lines */}
                  <line x1="20" y1="10" x2="380" y2="10" stroke="#ef4444" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="20" y1="70" x2="380" y2="70" stroke="#ef4444" strokeWidth="1" strokeDasharray="5,5" />
                  
                  {/* Labels */}
                  <text x="385" y="15" fontSize="10" fill="#ef4444">70</text>
                  <text x="385" y="75" fontSize="10" fill="#ef4444">30</text>
                </svg>
              </div>
            </div>
          )}

          {/* MACD Chart */}
          {showMACD && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">MACD</span>
                <span className="text-sm text-gray-600">
                  {indicators.macd[indicators.macd.length - 1]?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div className="relative h-24 bg-gray-50 rounded-lg p-2">
                <svg className="w-full h-full" viewBox="0 0 400 80">
                  {/* MACD Line */}
                  <path
                    d={indicators.macd.map((value, index) => {
                      if (isNaN(value)) return ''
                      const x = (index / (indicators.macd.length - 1)) * 360 + 20
                      const y = 40 - value * 10
                      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                    }).join(' ')}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    fill="none"
                  />
                  
                  {/* Signal Line */}
                  <path
                    d={indicators.signal.map((value, index) => {
                      if (isNaN(value)) return ''
                      const x = (index / (indicators.signal.length - 1)) * 360 + 20
                      const y = 40 - value * 10
                      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                    }).join(' ')}
                    stroke="#f59e0b"
                    strokeWidth="2"
                    fill="none"
                  />
                  
                  {/* Histogram */}
                  {indicators.histogram.map((value, index) => {
                    if (isNaN(value)) return null
                    const x = (index / (indicators.histogram.length - 1)) * 360 + 20
                    const height = Math.abs(value) * 10
                    const y = value >= 0 ? 40 - height : 40
                    
                    return (
                      <rect
                        key={index}
                        x={x - 1}
                        y={y}
                        width="2"
                        height={height}
                        fill={value >= 0 ? '#10b981' : '#ef4444'}
                      />
                    )
                  })}
                </svg>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function VolumeAnalysisChart({ symbol, data }: TechnicalIndicatorsProps) {
  const volumeMetrics = useMemo(() => {
    if (!data || data.length === 0) return null

    const volumes = data.map(d => d.volume)
    const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
    const maxVolume = Math.max(...volumes)
    const minVolume = Math.min(...volumes)
    const currentVolume = volumes[volumes.length - 1]
    const volumeChange = ((currentVolume - avgVolume) / avgVolume) * 100

    return {
      avgVolume,
      maxVolume,
      minVolume,
      currentVolume,
      volumeChange
    }
  }, [data])

  if (!data || data.length === 0 || !volumeMetrics) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Volume Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Volume Chart */}
          <div className="relative h-32 bg-gray-50 rounded-lg p-4">
            <svg className="w-full h-full" viewBox="0 0 400 120">
              {data.map((point, index) => {
                const x = (index / (data.length - 1)) * 360 + 20
                const height = (point.volume / volumeMetrics.maxVolume) * 100
                const y = 110 - height
                
                return (
                  <rect
                    key={index}
                    x={x - 1}
                    y={y}
                    width="2"
                    height={height}
                    fill={point.close >= point.open ? '#10b981' : '#ef4444'}
                    opacity="0.7"
                  />
                )
              })}
              
              {/* Average volume line */}
              <line 
                x1="20" 
                y1={110 - (volumeMetrics.avgVolume / volumeMetrics.maxVolume) * 100} 
                x2="380" 
                y2={110 - (volumeMetrics.avgVolume / volumeMetrics.maxVolume) * 100} 
                stroke="#6b7280" 
                strokeWidth="1" 
                strokeDasharray="5,5" 
              />
            </svg>
          </div>

          {/* Volume Metrics */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-600">Current Volume</div>
              <div className="text-lg font-bold text-gray-900">
                {volumeMetrics.currentVolume.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-600">Avg Volume</div>
              <div className="text-lg font-bold text-gray-900">
                {volumeMetrics.avgVolume.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-600">Volume Change</div>
              <div className={`text-lg font-bold ${volumeMetrics.volumeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {volumeMetrics.volumeChange >= 0 ? '+' : ''}{volumeMetrics.volumeChange.toFixed(1)}%
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-600">Max Volume</div>
              <div className="text-lg font-bold text-blue-600">
                {volumeMetrics.maxVolume.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
