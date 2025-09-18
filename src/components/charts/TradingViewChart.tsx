'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, ISeriesApi, ColorType, LineStyle } from 'lightweight-charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, TrendingUp, TrendingDown, BarChart3, Activity } from 'lucide-react'

interface ChartData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface TradingViewChartProps {
  symbol: string
  timeframe?: string
  chartType?: 'candlestick' | 'line' | 'area'
  indicators?: string[]
  height?: number
  data?: ChartData[]
  onTimeframeChange?: (timeframe: string) => void
}

export function TradingViewChart({
  symbol,
  timeframe = '1mo',
  chartType = 'candlestick',
  indicators = ['sma20', 'volume'],
  height = 500,
  data,
  onTimeframeChange
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const smaSeriesRef = useRef<{ [key: string]: ISeriesApi<'Line'> }>({})

  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(!data)
  const [error, setError] = useState<string | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number | null>(null)
  const [priceChangePercent, setPriceChangePercent] = useState<number | null>(null)

  const timeframes = [
    { value: '1d', label: '1D' },
    { value: '5d', label: '5D' },
    { value: '1mo', label: '1M' },
    { value: '3mo', label: '3M' },
    { value: '6mo', label: '6M' },
    { value: '1y', label: '1Y' },
    { value: '2y', label: '2Y' },
    { value: '5y', label: '5Y' }
  ]

  // Helper function to sort and deduplicate chart data
  const sanitizeChartData = (rawData: any[]): ChartData[] => {
    if (!rawData || rawData.length === 0) return []
    
    return rawData
      .map((item: any) => ({
        time: new Date(item.time).toISOString().split('T')[0],
        open: Number(item.open) || 0,
        high: Number(item.high) || 0,
        low: Number(item.low) || 0,
        close: Number(item.close) || 0,
        volume: Number(item.volume) || 0
      }))
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()) // Sort by time ascending
      .filter((item, index, array) => {
        // Remove duplicate timestamps and invalid data
        if (index === 0) return true
        return item.time !== array[index - 1].time && item.close > 0
      })
  }

  // Helper function to safely remove series
  const safelyRemoveSeries = (series: any) => {
    if (series && chartRef.current) {
      try {
        chartRef.current.removeSeries(series)
      } catch (error) {
        console.warn('Error removing series:', error)
      }
    }
  }

  // Handle data prop changes
  useEffect(() => {
    if (data && data.length > 0) {
      const sanitizedData = sanitizeChartData(data)
      setChartData(sanitizedData)
    }
  }, [data])

  // Fetch chart data
  useEffect(() => {
    if (!data) {
      fetchChartData()
    }
  }, [symbol, timeframe, data])

  // Initialize chart
  useEffect(() => {
    if (chartContainerRef.current && chartData.length > 0) {
      initializeChart()
    }

    return () => {
      // Cleanup all series references first
      Object.values(smaSeriesRef.current).forEach(safelyRemoveSeries)

      // Clear all references
      candlestickSeriesRef.current = null
      lineSeriesRef.current = null
      areaSeriesRef.current = null
      volumeSeriesRef.current = null
      smaSeriesRef.current = {}

      // Remove chart
      if (chartRef.current) {
        try {
          chartRef.current.remove()
        } catch (error) {
          console.warn('Error removing chart during cleanup:', error)
        }
        chartRef.current = null
      }
    }
  }, [chartData, chartType])

  // Update indicators
  useEffect(() => {
    if (chartRef.current && chartData.length > 0) {
      updateIndicators()
    }
  }, [indicators, chartData])

  const fetchChartData = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log(`📊 Fetching chart data for ${symbol} (${timeframe})`)
      
      const interval = getIntervalFromTimeframe(timeframe)
      const response = await fetch(`/api/chart/${symbol}?range=${timeframe}&interval=${interval}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chart data: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success && result.data && result.data.length > 0) {
        const formattedData = sanitizeChartData(result.data)
        setChartData(formattedData)
        
        // Calculate price metrics
        if (formattedData.length >= 2) {
          const latest = formattedData[formattedData.length - 1]
          const previous = formattedData[formattedData.length - 2]
          
          setCurrentPrice(latest.close)
          const change = latest.close - previous.close
          setPriceChange(change)
          setPriceChangePercent((change / previous.close) * 100)
        }
      } else {
        throw new Error('No chart data available')
      }
    } catch (err) {
      console.error('Error fetching chart data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load chart')
    } finally {
      setLoading(false)
    }
  }

  const getIntervalFromTimeframe = (tf: string): string => {
    switch (tf) {
      case '1d': return '5m'
      case '5d': return '15m'
      case '1mo': return '1h'
      case '3mo': return '1d'
      case '6mo': return '1d'
      case '1y': return '1d'
      case '2y': return '1wk'
      case '5y': return '1mo'
      default: return '1d'
    }
  }

  const initializeChart = () => {
    if (!chartContainerRef.current || chartData.length === 0) return

    // Remove existing chart and clear all series references
    if (chartRef.current) {
      try {
        chartRef.current.remove()
      } catch (error) {
        console.warn('Error removing chart:', error)
      }
    }

    // Clear all series references
    candlestickSeriesRef.current = null
    lineSeriesRef.current = null
    areaSeriesRef.current = null
    volumeSeriesRef.current = null
    smaSeriesRef.current = {}

    // Create new chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.9)',
      },
      grid: {
        vertLines: {
          color: 'rgba(197, 203, 206, 0.1)',
        },
        horzLines: {
          color: 'rgba(197, 203, 206, 0.1)',
        },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
    })

    chartRef.current = chart

    // Create main price series
    let mainSeries: ISeriesApi<any>

    if (chartType === 'candlestick') {
      mainSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      })
      candlestickSeriesRef.current = mainSeries
    } else if (chartType === 'line') {
      mainSeries = chart.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
      })
      lineSeriesRef.current = mainSeries
    } else {
      mainSeries = chart.addAreaSeries({
        topColor: 'rgba(41, 98, 255, 0.4)',
        bottomColor: 'rgba(41, 98, 255, 0.0)',
        lineColor: 'rgba(41, 98, 255, 1.0)',
        lineWidth: 2,
      })
      areaSeriesRef.current = mainSeries
    }

    // Set data based on chart type
    if (chartType === 'candlestick') {
      mainSeries.setData(chartData)
    } else {
      const lineData = chartData.map(item => ({
        time: item.time,
        value: item.close
      }))
      mainSeries.setData(lineData)
    }

    // Add volume series if requested
    if (indicators.includes('volume')) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      })

      // Set volume series scale margins
      chart.priceScale('').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      })

      const volumeData = chartData.map(item => ({
        time: item.time,
        value: item.volume || 0,
        color: item.close >= item.open ? '#26a69a' : '#ef5350'
      }))

      volumeSeries.setData(volumeData)
      volumeSeriesRef.current = volumeSeries
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener('resize', handleResize)

    // Fit content
    chart.timeScale().fitContent()
  }

  const updateIndicators = () => {
    if (!chartRef.current || chartData.length === 0) return

    // Clear existing indicator series
    Object.values(smaSeriesRef.current).forEach(safelyRemoveSeries)
    smaSeriesRef.current = {}

    // Add SMA indicators
    indicators.forEach(indicator => {
      if (indicator.startsWith('sma')) {
        const period = parseInt(indicator.replace('sma', ''))
        const smaData = calculateSMA(chartData, period)
        
        const smaSeries = chartRef.current!.addLineSeries({
          color: getSMAColor(period),
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
        })

        smaSeries.setData(smaData)
        smaSeriesRef.current[indicator] = smaSeries
      }
    })
  }

  const calculateSMA = (data: ChartData[], period: number) => {
    const smaData = []
    
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, item) => acc + item.close, 0)
      const average = sum / period
      
      smaData.push({
        time: data[i].time,
        value: average
      })
    }
    
    return smaData
  }

  const getSMAColor = (period: number): string => {
    switch (period) {
      case 20: return '#FF6B35'
      case 50: return '#F7931E'
      case 200: return '#FFD23F'
      default: return '#2196F3'
    }
  }

  const handleTimeframeChange = (newTimeframe: string) => {
    if (onTimeframeChange) {
      onTimeframeChange(newTimeframe)
    } else {
      // Internal state change
      setChartData([])
      fetchChartData()
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>{symbol.toUpperCase()} Chart</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading chart data...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>{symbol.toUpperCase()} Chart</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={fetchChartData} variant="outline">
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>{symbol.toUpperCase()} Chart</span>
          </CardTitle>
          
          {currentPrice && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold">${currentPrice.toFixed(2)}</div>
                {priceChange !== null && priceChangePercent !== null && (
                  <div className={`flex items-center space-x-1 ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {priceChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>${priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}</span>
                    <span>({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          {/* Timeframe Buttons */}
          <div className="flex space-x-1">
            {timeframes.map((tf) => (
              <Button
                key={tf.value}
                variant={timeframe === tf.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeframeChange(tf.value)}
              >
                {tf.label}
              </Button>
            ))}
          </div>

          {/* Active Indicators */}
          <div className="flex items-center space-x-2">
            {indicators.map((indicator) => (
              <Badge key={indicator} variant="secondary" className="text-xs">
                {indicator.toUpperCase()}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div 
          ref={chartContainerRef} 
          className="w-full"
          style={{ height: `${height}px` }}
        />
        

      </CardContent>
    </Card>
  )
}
