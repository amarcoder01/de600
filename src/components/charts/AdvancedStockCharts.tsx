"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Minimize2
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

export function PriceChart({ symbol, data, color = '#3b82f6', showVolume = true }: StockChartProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    return data.map((point, index) => ({
      time: new Date(point.timestamp).getTime(),
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume
    }))
  }, [data])

  const priceChange = useMemo(() => {
    if (chartData.length < 2) return 0
    const first = chartData[0].close
    const last = chartData[chartData.length - 1].close
    return ((last - first) / first) * 100
  }, [chartData])

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="w-5 h-5" />
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
            <LineChart className="w-5 h-5" />
            <CardTitle>{symbol} Price Chart</CardTitle>
            <Badge variant={priceChange >= 0 ? 'default' : 'destructive'}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
        <CardDescription>
          {data.length} data points • Last updated: {new Date(data[data.length - 1]?.timestamp).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Price Chart */}
          <div className="relative h-64 bg-gray-50 rounded-lg p-4">
            <svg className="w-full h-full" viewBox="0 0 400 200">
              {chartData.length > 1 && (
                <path
                  d={chartData.map((point, index) => {
                    const x = (index / (chartData.length - 1)) * 360 + 20
                    const y = 180 - ((point.close - Math.min(...chartData.map(p => p.close))) / 
                      (Math.max(...chartData.map(p => p.close)) - Math.min(...chartData.map(p => p.close)))) * 160
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')}
                  stroke={color}
                  strokeWidth="2"
                  fill="none"
                />
              )}
              
              {/* Price labels */}
              {chartData.length > 0 && (
                <>
                  <text x="10" y="15" fontSize="12" fill="#666">
                    ${Math.max(...chartData.map(p => p.close)).toFixed(2)}
                  </text>
                  <text x="10" y="185" fontSize="12" fill="#666">
                    ${Math.min(...chartData.map(p => p.close)).toFixed(2)}
                  </text>
                </>
              )}
            </svg>
          </div>

          {/* Volume Chart */}
          {showVolume && (
            <div className="relative h-24 bg-gray-50 rounded-lg p-4">
              <svg className="w-full h-full" viewBox="0 0 400 80">
                {chartData.map((point, index) => {
                  const x = (index / (chartData.length - 1)) * 360 + 20
                  const maxVolume = Math.max(...chartData.map(p => p.volume))
                  const height = (point.volume / maxVolume) * 60
                  const y = 70 - height
                  
                  return (
                    <rect
                      key={index}
                      x={x - 2}
                      y={y}
                      width="4"
                      height={height}
                      fill={color}
                      opacity="0.6"
                    />
                  )
                })}
              </svg>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium">Current</div>
              <div className="text-green-600">${chartData[chartData.length - 1]?.close.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="font-medium">High</div>
              <div className="text-blue-600">${Math.max(...chartData.map(p => p.high)).toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="font-medium">Low</div>
              <div className="text-red-600">${Math.min(...chartData.map(p => p.low)).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ComparisonChart({ stocks, period }: ComparisonChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(period)

  const normalizedData = useMemo(() => {
    if (!stocks || stocks.length === 0) return []

    return stocks.map(stock => {
      if (!stock.data || stock.data.length === 0) return null
      
      const firstPrice = stock.data[0].close
      return {
        symbol: stock.symbol,
        color: stock.color,
        data: stock.data.map(point => ({
          time: new Date(point.timestamp).getTime(),
          normalizedPrice: (point.close / firstPrice) * 100
        }))
      }
    }).filter(Boolean)
  }, [stocks])

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
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance Comparison
          </CardTitle>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">1 Day</SelectItem>
              <SelectItem value="5d">5 Days</SelectItem>
              <SelectItem value="1mo">1 Month</SelectItem>
              <SelectItem value="3mo">3 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CardDescription>
          Normalized performance comparison (base = 100)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Comparison Chart */}
          <div className="relative h-64 bg-gray-50 rounded-lg p-4">
            <svg className="w-full h-full" viewBox="0 0 400 200">
              {normalizedData.filter(stock => stock !== null).map((stock, stockIndex) => (
                <path
                  key={stock?.symbol}
                  d={stock?.data.map((point, index) => {
                    const x = (index / (stock?.data.length - 1)) * 360 + 20
                    const y = 180 - ((point.normalizedPrice - 90) / 20) * 160
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')}
                  stroke={stock?.color}
                  strokeWidth="2"
                  fill="none"
                />
              ))}
              
              {/* Legend */}
              {normalizedData.filter(stock => stock !== null).map((stock, index) => (
                <g key={stock?.symbol}>
                  <circle cx={20} cy={20 + index * 20} r="4" fill={stock?.color} />
                  <text x={30} y={25 + index * 20} fontSize="12" fill="#333">
                    {stock?.symbol}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Performance Summary */}
          <div className="grid grid-cols-2 gap-4">
            {normalizedData.filter(stock => stock !== null).map(stock => {
              const firstPrice = stock?.data[0].normalizedPrice
              const lastPrice = stock?.data[stock?.data.length - 1].normalizedPrice
              const change = ((lastPrice - firstPrice) / firstPrice) * 100
              
              return (
                <div key={stock?.symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: stock?.color }}
                    />
                    <span className="font-medium">{stock?.symbol}</span>
                  </div>
                  <Badge variant={change >= 0 ? 'default' : 'destructive'}>
                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TechnicalIndicatorsChart({ symbol, data }: TechnicalIndicatorsProps) {
  const [selectedIndicator, setSelectedIndicator] = useState('rsi')

  const indicators = useMemo(() => {
    if (!data || data.length === 0) return {}

    // Calculate RSI
    const rsiData = data.map((point, index) => {
      if (index < 14) return { time: new Date(point.timestamp).getTime(), rsi: 50 }
      
      const gains = data.slice(index - 14, index + 1).map(p => Math.max(0, p.close - data[Math.max(0, index - 15)]?.close || p.close))
      const losses = data.slice(index - 14, index + 1).map(p => Math.max(0, (data[Math.max(0, index - 15)]?.close || p.close) - p.close))
      
      const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / 14
      const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / 14
      
      const rs = avgGain / avgLoss
      const rsi = 100 - (100 / (1 + rs))
      
      return { time: new Date(point.timestamp).getTime(), rsi }
    })

    // Calculate Moving Averages
    const sma20 = data.map((point, index) => {
      if (index < 19) return { time: new Date(point.timestamp).getTime(), sma: point.close }
      
      const sum = data.slice(index - 19, index + 1).reduce((acc, p) => acc + p.close, 0)
      return { time: new Date(point.timestamp).getTime(), sma: sum / 20 }
    })

    const sma50 = data.map((point, index) => {
      if (index < 49) return { time: new Date(point.timestamp).getTime(), sma: point.close }
      
      const sum = data.slice(index - 49, index + 1).reduce((acc, p) => acc + p.close, 0)
      return { time: new Date(point.timestamp).getTime(), sma: sum / 50 }
    })

    return { rsi: rsiData, sma20, sma50 }
  }, [data])

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Technical Indicators
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Technical Indicators - {symbol}
          </CardTitle>
          <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rsi">RSI</SelectItem>
              <SelectItem value="sma">Moving Averages</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Indicator Chart */}
          <div className="relative h-48 bg-gray-50 rounded-lg p-4">
            <svg className="w-full h-full" viewBox="0 0 400 180">
              {selectedIndicator === 'rsi' && indicators.rsi && (
                <>
                  <path
                    d={indicators.rsi.map((point, index) => {
                      const x = (index / (indicators.rsi.length - 1)) * 360 + 20
                      const y = 160 - (point.rsi / 100) * 140
                      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                    }).join(' ')}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    fill="none"
                  />
                  {/* Overbought/oversold lines */}
                  <line x1="20" y1="28" x2="380" y2="28" stroke="#ef4444" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="20" y1="152" x2="380" y2="152" stroke="#ef4444" strokeWidth="1" strokeDasharray="5,5" />
                  <text x="385" y="32" fontSize="10" fill="#ef4444">70</text>
                  <text x="385" y="156" fontSize="10" fill="#ef4444">30</text>
                </>
              )}
              
              {selectedIndicator === 'sma' && indicators.sma20 && indicators.sma50 && (
                <>
                  <path
                    d={indicators.sma20.map((point, index) => {
                      const x = (index / (indicators.sma20.length - 1)) * 360 + 20
                      const maxPrice = Math.max(...indicators.sma20.map(p => p.sma))
                      const minPrice = Math.min(...indicators.sma20.map(p => p.sma))
                      const y = 160 - ((point.sma - minPrice) / (maxPrice - minPrice)) * 140
                      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                    }).join(' ')}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path
                    d={indicators.sma50.map((point, index) => {
                      const x = (index / (indicators.sma50.length - 1)) * 360 + 20
                      const maxPrice = Math.max(...indicators.sma50.map(p => p.sma))
                      const minPrice = Math.min(...indicators.sma50.map(p => p.sma))
                      const y = 160 - ((point.sma - minPrice) / (maxPrice - minPrice)) * 140
                      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                    }).join(' ')}
                    stroke="#ef4444"
                    strokeWidth="2"
                    fill="none"
                  />
                </>
              )}
            </svg>
          </div>

          {/* Indicator Values */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {selectedIndicator === 'rsi' && indicators.rsi && (
              <div className="text-center">
                <div className="font-medium">Current RSI</div>
                <div className={indicators.rsi[indicators.rsi.length - 1].rsi > 70 ? 'text-red-600' : 
                               indicators.rsi[indicators.rsi.length - 1].rsi < 30 ? 'text-green-600' : 'text-blue-600'}>
                  {indicators.rsi[indicators.rsi.length - 1].rsi.toFixed(2)}
                </div>
              </div>
            )}
            {selectedIndicator === 'sma' && indicators.sma20 && indicators.sma50 && (
              <>
                <div className="text-center">
                  <div className="font-medium">SMA 20</div>
                  <div className="text-blue-600">${indicators.sma20[indicators.sma20.length - 1].sma.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">SMA 50</div>
                  <div className="text-red-600">${indicators.sma50[indicators.sma50.length - 1].sma.toFixed(2)}</div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function VolumeAnalysisChart({ symbol, data }: StockChartProps) {
  const volumeData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    return data.map((point, index) => ({
      time: new Date(point.timestamp).getTime(),
      volume: point.volume,
      priceChange: index > 0 ? ((point.close - data[index - 1].close) / data[index - 1].close) * 100 : 0
    }))
  }, [data])

  const avgVolume = useMemo(() => {
    if (!volumeData.length) return 0
    return volumeData.reduce((sum, point) => sum + point.volume, 0) / volumeData.length
  }, [volumeData])

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Volume Analysis
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Volume Analysis - {symbol}
        </CardTitle>
        <CardDescription>
          Trading volume and price correlation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Volume Chart */}
          <div className="relative h-48 bg-gray-50 rounded-lg p-4">
            <svg className="w-full h-full" viewBox="0 0 400 180">
              {volumeData.map((point, index) => {
                const x = (index / (volumeData.length - 1)) * 360 + 20
                const maxVolume = Math.max(...volumeData.map(p => p.volume))
                const height = (point.volume / maxVolume) * 120
                const y = 160 - height
                const color = point.priceChange >= 0 ? '#10b981' : '#ef4444'
                
                return (
                  <rect
                    key={index}
                    x={x - 3}
                    y={y}
                    width="6"
                    height={height}
                    fill={color}
                    opacity="0.7"
                  />
                )
              })}
              
              {/* Average volume line */}
              <line 
                x1="20" 
                y1={160 - (avgVolume / Math.max(...volumeData.map(p => p.volume))) * 120} 
                x2="380" 
                y2={160 - (avgVolume / Math.max(...volumeData.map(p => p.volume))) * 120} 
                stroke="#666" 
                strokeWidth="1" 
                strokeDasharray="5,5" 
              />
            </svg>
          </div>

          {/* Volume Statistics */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium">Current Volume</div>
              <div className="text-blue-600">
                {((volumeData[volumeData.length - 1]?.volume || 0) / 1000000).toFixed(2)}M
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium">Avg Volume</div>
              <div className="text-gray-600">
                {(avgVolume / 1000000).toFixed(2)}M
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium">Volume Ratio</div>
              <div className={volumeData[volumeData.length - 1]?.volume > avgVolume ? 'text-green-600' : 'text-red-600'}>
                {((volumeData[volumeData.length - 1]?.volume || 0) / avgVolume).toFixed(2)}x
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
