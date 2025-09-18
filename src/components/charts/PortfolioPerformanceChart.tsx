'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart as PieChartIcon,
  Activity,
  Calendar,
  DollarSign,
  Target,
  AlertTriangle
} from 'lucide-react'
import { PaperTradingAccount, Stock } from '@/types'

interface PortfolioPerformanceChartProps {
  account: PaperTradingAccount
  realTimeData: Map<string, Stock>
  timeframe: '1D' | '1W' | '1M' | '3M' | '1Y'
}

interface PerformanceData {
  date: string
  portfolioValue: number
  cashValue: number
  positionsValue: number
  totalPnL: number
  totalPnLPercent: number
  dailyReturn: number
  cumulativeReturn: number
}

interface SectorData {
  name: string
  value: number
  percentage: number
  color: string
}

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#6366F1', '#14B8A6', '#F43F5E'
]

export function PortfolioPerformanceChart({ account, realTimeData, timeframe }: PortfolioPerformanceChartProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [sectorData, setSectorData] = useState<SectorData[]>([])
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRealData, setIsRealData] = useState(true)
  const [dataWarning, setDataWarning] = useState<string | null>(null)

  // Generate mock performance data based on timeframe
  const generatePerformanceData = useMemo(() => {
    const data: PerformanceData[] = []
    const now = new Date()
    let days = 0
    
    switch (timeframe) {
      case '1D':
        days = 1
        break
      case '1W':
        days = 7
        break
      case '1M':
        days = 30
        break
      case '3M':
        days = 90
        break
      case '1Y':
        days = 365
        break
    }

    const initialValue = account.initialBalance
    let currentValue = initialValue
    let cumulativeReturn = 0

    for (let i = days; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      
      // Generate realistic daily returns with some volatility
      const dailyReturn = (Math.random() - 0.5) * 0.04 // ±2% daily return
      const dailyReturnPercent = dailyReturn * 100
      
      currentValue = currentValue * (1 + dailyReturn)
      cumulativeReturn += dailyReturnPercent
      
      const positionsValue = currentValue * 0.8 // Assume 80% in positions
      const cashValue = currentValue * 0.2 // Assume 20% in cash
      const totalPnL = currentValue - initialValue
      const totalPnLPercent = ((currentValue - initialValue) / initialValue) * 100

      data.push({
        date: date.toISOString().split('T')[0],
        portfolioValue: currentValue,
        cashValue,
        positionsValue,
        totalPnL,
        totalPnLPercent,
        dailyReturn: dailyReturnPercent,
        cumulativeReturn
      })
    }

    // Set warning for simulated data
    setIsRealData(false)
    setDataWarning('Portfolio performance data is simulated. Real trading data will appear after making trades.')

    return data
  }, [account.initialBalance, timeframe])

  // Generate sector allocation data
  const generateSectorData = useMemo(() => {
    if (!account.positions.length) return []

    const sectorMap = new Map<string, number>()
    
    account.positions.forEach(pos => {
      const currentPrice = realTimeData.get(pos.symbol)?.price || pos.currentPrice
      const value = currentPrice * pos.quantity
      const sector = pos.sector || 'Unknown'
      
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + value)
    })

    const totalValue = Array.from(sectorMap.values()).reduce((sum, val) => sum + val, 0)
    
    return Array.from(sectorMap.entries())
      .map(([name, value], index) => ({
        name,
        value,
        percentage: (value / totalValue) * 100,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)
  }, [account.positions, realTimeData])

  useEffect(() => {
    setPerformanceData(generatePerformanceData)
    setSectorData(generateSectorData)
  }, [generatePerformanceData, generateSectorData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as PerformanceData
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600 dark:text-gray-300">
              Portfolio Value: <span className="font-medium">{formatCurrency(data.portfolioValue)}</span>
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              Daily Return: <span className={`font-medium ${data.dailyReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(data.dailyReturn)}
              </span>
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              Total P&L: <span className={`font-medium ${data.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data.totalPnL)} ({formatPercentage(data.totalPnLPercent)})
              </span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  const renderChart = () => {
    if (chartType === 'line') {
      return (
        <LineChart data={performanceData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            stroke="#9CA3AF"
            fontSize={12}
            tickFormatter={(value) => {
              const date = new Date(value)
              if (timeframe === '1D') return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              if (timeframe === '1W') return date.toLocaleDateString('en-US', { weekday: 'short' })
              if (timeframe === '1M') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              return date.toLocaleDateString('en-US', { month: 'short' })
            }}
          />
          <YAxis 
            stroke="#9CA3AF"
            fontSize={12}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="portfolioValue" 
            stroke="#3B82F6" 
            strokeWidth={3}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
          />
        </LineChart>
      )
    }

    if (chartType === 'area') {
      return (
        <AreaChart data={performanceData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            stroke="#9CA3AF"
            fontSize={12}
            tickFormatter={(value) => {
              const date = new Date(value)
              if (timeframe === '1D') return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              if (timeframe === '1W') return date.toLocaleDateString('en-US', { weekday: 'short' })
              if (timeframe === '1M') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              return date.toLocaleDateString('en-US', { month: 'short' })
            }}
          />
          <YAxis 
            stroke="#9CA3AF"
            fontSize={12}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="portfolioValue" 
            stroke="#3B82F6" 
            fill="#3B82F6"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </AreaChart>
      )
    }

    return (
      <BarChart data={performanceData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis 
          dataKey="date" 
          stroke="#9CA3AF"
          fontSize={12}
          tickFormatter={(value) => {
            const date = new Date(value)
            if (timeframe === '1D') return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            if (timeframe === '1W') return date.toLocaleDateString('en-US', { weekday: 'short' })
            if (timeframe === '1M') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            return date.toLocaleDateString('en-US', { month: 'short' })
          }}
        />
        <YAxis 
          stroke="#9CA3AF"
          fontSize={12}
          tickFormatter={formatCurrency}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey="portfolioValue" 
          fill="#3B82F6"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    )
  }

  const renderSectorChart = () => {
    if (!sectorData.length) return null

    return (
      <PieChart width={200} height={200}>
        <Pie
          data={sectorData}
          cx={100}
          cy={100}
          innerRadius={40}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {sectorData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => [formatCurrency(value), 'Value']}
          labelFormatter={(label) => `${label} (${sectorData.find(d => d.name === label)?.percentage.toFixed(1)}%)`}
        />
      </PieChart>
    )
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading performance data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-2" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Data Source Warning */}
      {!isRealData && dataWarning && (
        <div className="bg-orange-600/20 border border-orange-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 text-orange-400 mt-0.5">⚠️</div>
            <div>
              <h4 className="font-medium text-orange-200">Portfolio Data Notice</h4>
              <p className="text-orange-300 text-sm mt-1">
                {dataWarning}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant={chartType === 'line' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('line')}
          >
            <LineChart className="w-4 h-4 mr-2" />
            Line
          </Button>
          <Button
            variant={chartType === 'area' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('area')}
          >
            <AreaChart className="w-4 h-4 mr-2" />
            Area
          </Button>
          <Button
            variant={chartType === 'bar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('bar')}
          >
            <BarChart className="w-4 h-4 mr-2" />
            Bar
          </Button>
        </div>
      </div>

      {/* Main Performance Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Portfolio Performance
                </span>
                <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-50">
                  {timeframe}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                {renderChart()}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Sector Allocation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChartIcon className="w-5 h-5 mr-2" />
                Sector Allocation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sectorData.length > 0 ? (
                <div className="space-y-4">
                  {renderSectorChart()}
                  <div className="space-y-2">
                    {sectorData.slice(0, 5).map((sector, index) => (
                      <div key={sector.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: sector.color }}
                          />
                          <span className="font-medium">{sector.name}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {sector.percentage.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <PieChartIcon className="mx-auto h-8 w-8 mb-2" />
                  <p>No sector data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Return</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${account.totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(account.totalPnLPercent)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(account.totalPnL)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(account.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(account.availableCash)} cash
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{account.positions.length}</div>
            <p className="text-xs text-muted-foreground">
              Active positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trades</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{account.transactions.length}</div>
            <p className="text-xs text-muted-foreground">
              Total transactions
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
