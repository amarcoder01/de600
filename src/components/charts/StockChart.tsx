'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, BarChart3, Activity, Calendar, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface StockChartProps {
  symbol: string
  data?: any[]
  loading?: boolean
  error?: string
}

export function StockChart({ symbol, data, loading = false, error }: StockChartProps) {
  const [timeframe, setTimeframe] = useState('1d')
  const [showVolume, setShowVolume] = useState(true)
  const [showIndicators, setShowIndicators] = useState(true)
  const [chartData, setChartData] = useState<any[]>(data || [])
  const [isLoading, setIsLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const timeframes = [
    { value: '1d', label: '1D' },
    { value: '5d', label: '5D' },
    { value: '1mo', label: '1M' },
    { value: '3mo', label: '3M' },
    { value: '6mo', label: '6M' },
    { value: '1y', label: '1Y' },
    { value: '5y', label: '5Y' }
  ]

  useEffect(() => {
    if (chartData && chartData.length > 0 && canvasRef.current) {
      drawChart()
    }
  }, [chartData, timeframe, showVolume, showIndicators])

  // Fetch initial chart data
  useEffect(() => {
    if (symbol && !data) {
      fetchInitialChartData()
    }
  }, [symbol])

  const fetchInitialChartData = async () => {
    setIsLoading(true)
    try {
      const newData = await fetchChartData(timeframe)
      setChartData(newData)
    } catch (error) {
      console.error('Error fetching initial chart data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const drawChart = () => {
    const canvas = canvasRef.current
    if (!canvas || !chartData) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const width = canvas.width
    const height = canvas.height
    const padding = 40

    // Filter valid data
    const validData = chartData.filter(d => d.close > 0)
    if (validData.length === 0) return

    // Calculate price range
    const prices = validData.map(d => d.close)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice

    // Calculate time range
    const times = validData.map(d => d.time)
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const timeRange = maxTime - minTime || 1 // Prevent division by zero

    // Draw price line with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#8b5cf6') // Purple
    gradient.addColorStop(1, '#ec4899') // Pink
    
    ctx.strokeStyle = gradient
    ctx.lineWidth = 3
    ctx.beginPath()

    validData.forEach((point, index) => {
      const x = padding + (point.time - minTime) / timeRange * (width - 2 * padding)
      const y = height - padding - (point.close - minPrice) / priceRange * (height - 2 * padding)
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Draw volume bars if enabled
    if (showVolume) {
      const volumes = validData.map(d => d.volume)
      const maxVolume = Math.max(...volumes)
      
      ctx.fillStyle = 'rgba(139, 92, 246, 0.3)' // Purple with transparency
      
      validData.forEach(point => {
        const x = padding + (point.time - minTime) / timeRange * (width - 2 * padding)
        const barWidth = (width - 2 * padding) / validData.length * 0.8
        const barHeight = (point.volume / maxVolume) * (height - 2 * padding) * 0.3
        
        ctx.fillRect(x - barWidth / 2, height - padding - barHeight, barWidth, barHeight)
      })
    }

    // Draw grid lines
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)' // Purple grid lines
    ctx.lineWidth = 1
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (height - 2 * padding) * i / 4
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Vertical grid lines
    for (let i = 0; i <= 4; i++) {
      const x = padding + (width - 2 * padding) * i / 4
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()
    }

    // Draw price labels
    ctx.fillStyle = '#9ca3af' // Light gray for better visibility
    ctx.font = '12px Arial'
    ctx.textAlign = 'right'
    
    for (let i = 0; i <= 4; i++) {
      const price = minPrice + (priceRange * i / 4)
      const y = padding + (height - 2 * padding) * i / 4
      ctx.fillText(`$${price.toFixed(2)}`, padding - 10, y + 4)
    }

    // Draw current price indicator
    if (validData.length > 0) {
      const currentPrice = validData[validData.length - 1].close
      const x = width - padding
      const y = height - padding - (currentPrice - minPrice) / priceRange * (height - 2 * padding)
      
      // Draw glow effect
      ctx.shadowColor = '#8b5cf6'
      ctx.shadowBlur = 10
      ctx.fillStyle = '#8b5cf6'
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, 2 * Math.PI)
      ctx.fill()
      
      // Reset shadow
      ctx.shadowBlur = 0
      
      ctx.fillStyle = '#8b5cf6'
      ctx.font = '14px Arial'
      ctx.textAlign = 'left'
      ctx.fillText(`$${currentPrice.toFixed(2)}`, x + 10, y + 4)
    }
  }

  const fetchChartData = async (newTimeframe: string) => {
    try {
      const response = await fetch(`/api/chart/${symbol}?range=${newTimeframe}&interval=1m`)
      if (response.ok) {
        const data = await response.json()
        return data.data || []
      }
    } catch (error) {
      console.error('Error fetching chart data:', error)
    }
    return []
  }

  const handleTimeframeChange = async (newTimeframe: string) => {
    setTimeframe(newTimeframe)
    setIsLoading(true)
    
    // Fetch new chart data for the selected timeframe
    try {
      const newData = await fetchChartData(newTimeframe)
      if (newData && newData.length > 0) {
        setChartData(newData)
      }
    } catch (error) {
      console.error('Error fetching chart data for timeframe:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-white font-semibold">{symbol} Price Chart</h3>
            <Badge variant="outline" className="border-purple-500/30 text-purple-300 bg-purple-500/10">
              Loading...
            </Badge>
          </div>
        </div>
        <div className="relative bg-black/20 border border-purple-800/30 rounded-lg p-4 backdrop-blur-sm">
          <div className="h-80 bg-black/20 animate-pulse rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
              <p className="text-white mt-2 text-sm">Loading chart data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>{symbol} Chart</span>
            <Badge variant="destructive">Error</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Activity className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-600">{error}</p>
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
      className="w-full"
    >
      <div className="space-y-4">
        {/* Chart Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-white font-semibold">{symbol} Price Chart</h3>
            <Badge variant="outline" className="border-purple-500/30 text-purple-300 bg-purple-500/10">
              Live
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Timeframe Selector */}
            <div className="flex bg-black/30 border border-purple-800/50 rounded-lg p-1">
              {timeframes.map((tf) => (
                <Button
                  key={tf.value}
                  variant={timeframe === tf.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleTimeframeChange(tf.value)}
                  className={`text-xs ${
                    timeframe === tf.value 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : 'text-gray-400 hover:text-white hover:bg-purple-500/10'
                  }`}
                >
                  {tf.label}
                </Button>
              ))}
            </div>

            {/* Chart Controls */}
            <div className="flex items-center space-x-1">
              <Button
                variant={showVolume ? "default" : "outline"}
                size="sm"
                onClick={() => setShowVolume(!showVolume)}
                className={`text-xs ${
                  showVolume 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'border-purple-500/30 text-purple-300 hover:bg-purple-500/10'
                }`}
              >
                Volume
              </Button>
              <Button
                variant={showIndicators ? "default" : "outline"}
                size="sm"
                onClick={() => setShowIndicators(!showIndicators)}
                className={`text-xs ${
                  showIndicators 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'border-purple-500/30 text-purple-300 hover:bg-purple-500/10'
                }`}
              >
                <Settings className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Chart Canvas */}
        <div className="relative bg-black/20 border border-purple-800/30 rounded-lg p-4 backdrop-blur-sm">
          <canvas
            ref={canvasRef}
            className="w-full h-80 rounded-lg"
          />
          
                     {/* Chart Overlay Info */}
           {chartData && chartData.length > 0 && (
             <div className="absolute top-6 left-6 bg-black/80 backdrop-blur-sm rounded-lg p-3 text-sm border border-purple-500/30">
               <div className="flex items-center space-x-2">
                 <TrendingUp className="w-4 h-4 text-green-400" />
                 <span className="font-medium text-white">
                   ${chartData[chartData.length - 1]?.close?.toFixed(2) || '0.00'}
                 </span>
               </div>
               <div className="text-xs text-gray-400 mt-1">
                 Current Price
               </div>
             </div>
           )}
        </div>
      </div>
    </motion.div>
  )
}
