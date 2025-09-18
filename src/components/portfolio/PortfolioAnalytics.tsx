'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  RefreshCw,
  Loader2,
  Activity,
  Shield,
  Zap,
  Users,
  Building2
} from 'lucide-react'

interface PortfolioPosition {
  id: string
  symbol: string
  name: string
  quantity: number
  averagePrice: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  entryDate: string
  notes?: string
}

interface Trade {
  id: string
  symbol: string
  type: 'buy' | 'sell'
  quantity: number
  price: number
  amount: number
  date: string
  notes?: string
}

interface Portfolio {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

interface SectorData {
  sector: string
  industry: string
  name: string
}

interface PortfolioAnalyticsProps {
  portfolio?: Portfolio | null
  positions: PortfolioPosition[]
  trades: Trade[]
  onRefresh?: () => void
}

export default function PortfolioAnalytics({ 
  portfolio, 
  positions, 
  trades, 
  onRefresh 
}: PortfolioAnalyticsProps) {
  const [sectorData, setSectorData] = useState<Record<string, SectorData>>({})
  const [isLoadingSectors, setIsLoadingSectors] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)

  // Debug logging
  console.log('PortfolioAnalytics - Received data:', { 
    portfolio, 
    positionsCount: positions.length, 
    tradesCount: trades.length 
  })
  
  // Calculate portfolio statistics using only real-time data
  const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0)
  const totalCost = positions.reduce((sum, pos) => sum + (pos.quantity * pos.averagePrice), 0)
  const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0)
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0

  // Fetch sector data for all positions
  const fetchSectorData = useCallback(async () => {
    if (positions.length === 0) return

    setIsLoadingSectors(true)
    try {
      const symbols = positions.map(pos => pos.symbol)
      console.log('📡 PortfolioAnalytics - Fetching sector data for symbols:', symbols)

      const response = await fetch('/api/portfolio/sector-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbols })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch sector data')
      }

      const data = await response.json()
      if (data.success) {
        setSectorData(data.data)
        console.log('✅ PortfolioAnalytics - Sector data loaded:', data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch sector data')
      }
    } catch (error) {
      console.error('❌ PortfolioAnalytics - Error fetching sector data:', error)
    } finally {
      setIsLoadingSectors(false)
    }
  }, [positions])

  // Fetch portfolio analytics from API
  const fetchAnalytics = useCallback(async () => {
    if (!portfolio) return

    setIsLoadingAnalytics(true)
    try {
      console.log('📡 PortfolioAnalytics - Fetching analytics for portfolio:', portfolio.id)

      const response = await fetch(`/api/portfolio/${portfolio.id}/analytics`)
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()
      if (data.success) {
        setAnalyticsData(data.data)
        console.log('✅ PortfolioAnalytics - Analytics loaded:', data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch analytics')
      }
    } catch (error) {
      console.error('❌ PortfolioAnalytics - Error fetching analytics:', error)
    } finally {
      setIsLoadingAnalytics(false)
    }
  }, [portfolio])

  // Load data on component mount and when positions change
  useEffect(() => {
    fetchSectorData()
    fetchAnalytics()
  }, [fetchSectorData, fetchAnalytics])

  // Calculate sector allocation using real sector data
  const sectorAllocation = positions.reduce((acc, position) => {
    const sectorInfo = sectorData[position.symbol]
    const sector = sectorInfo?.sector || 'Unknown'
    acc[sector] = (acc[sector] || 0) + position.marketValue
    return acc
  }, {} as Record<string, number>)

  // Calculate win rate based on completed trades ONLY - no fallbacks
  const calculateWinRate = () => {
    if (trades.length === 0) return 0
    
    // Group trades by symbol to calculate realized P&L
    const symbolTrades = trades.reduce((acc, trade) => {
      if (!acc[trade.symbol]) {
        acc[trade.symbol] = { buys: [], sells: [] }
      }
      if (trade.type === 'buy') {
        acc[trade.symbol].buys.push(trade)
      } else {
        acc[trade.symbol].sells.push(trade)
      }
      return acc
    }, {} as Record<string, { buys: any[], sells: any[] }>)

    let winningTrades = 0
    let totalCompletedTrades = 0

    // Calculate realized P&L for each symbol
    Object.entries(symbolTrades).forEach(([symbol, symbolData]) => {
      const { buys, sells } = symbolData
      
      // Only count as completed trade if we have both buys and sells
      if (buys.length === 0 || sells.length === 0) return
      
      // Calculate total shares bought and total cost
      const totalSharesBought = buys.reduce((sum, buy) => sum + buy.quantity, 0)
      const totalBuyCost = buys.reduce((sum, buy) => sum + buy.amount, 0)
      const avgBuyPrice = totalBuyCost / totalSharesBought

      // For each sell trade, calculate if it was profitable
      sells.forEach(sell => {
        // Calculate the cost basis for the shares being sold
        const sellCost = sell.quantity * avgBuyPrice
        const sellValue = sell.amount
        const realizedPnL = sellValue - sellCost
        
        // Count as winning trade if P&L is positive
        if (realizedPnL > 0) {
          winningTrades++
        }
        totalCompletedTrades++
      })
    })

    // Return 0 if no completed trades, otherwise return win rate percentage
    return totalCompletedTrades > 0 ? (winningTrades / totalCompletedTrades) * 100 : 0
  }

  const winRate = calculateWinRate()
  
  // Debug logging for win rate calculation
  console.log('📊 Win Rate Calculation:', {
    totalTrades: trades.length,
    sellTrades: trades.filter(t => t.type === 'sell').length,
    buyTrades: trades.filter(t => t.type === 'buy').length,
    calculatedWinRate: winRate,
    completedTrades: trades.filter(t => t.type === 'sell').length,
    trades: trades.map(t => ({ 
      symbol: t.symbol, 
      type: t.type, 
      quantity: t.quantity, 
      price: t.price, 
      amount: t.amount,
      date: t.date 
    }))
  })
  
  // Calculate position-based metrics for display
  const winningPositions = positions.filter(pos => pos.unrealizedPnL > 0)
  const losingPositions = positions.filter(pos => pos.unrealizedPnL < 0)
  
  // Debug logging for positions and Top Performers
  console.log('🎯 Top Performers Debug:', {
    totalPositions: positions.length,
    winningPositions: winningPositions.length,
    losingPositions: losingPositions.length,
    positions: positions.map(pos => ({
      symbol: pos.symbol,
      quantity: pos.quantity,
      averagePrice: pos.averagePrice,
      currentPrice: pos.currentPrice,
      marketValue: pos.marketValue,
      unrealizedPnL: pos.unrealizedPnL,
      unrealizedPnLPercent: pos.unrealizedPnLPercent
    })),
    winningPositionsData: winningPositions.map(pos => ({
      symbol: pos.symbol,
      unrealizedPnL: pos.unrealizedPnL,
      unrealizedPnLPercent: pos.unrealizedPnLPercent
    }))
  })

  // Calculate diversification score
  const diversificationScore = positions.length > 0 ? 
    Math.min(positions.length * 10, 100) : 0

  // Calculate largest position percentage
  const largestPosition = positions.reduce((max, pos) => 
    pos.marketValue > max ? pos.marketValue : max, 0)
  const largestPositionPercent = totalValue > 0 ? (largestPosition / totalValue) * 100 : 0

  // Risk assessment
  const getRiskLevel = () => {
    if (largestPositionPercent > 50) return 'High'
    if (largestPositionPercent > 30) return 'Medium'
    return 'Low'
  }

  const riskLevel = getRiskLevel()

  // Calculate sector concentration risk
  const sectorConcentration = Object.values(sectorAllocation).reduce((max, value) => 
    Math.max(max, (value / totalValue) * 100), 0)

  // Calculate trade performance metrics
  const buyTrades = trades.filter(t => t.type === 'buy')
  const sellTrades = trades.filter(t => t.type === 'sell')
  const totalBuyAmount = buyTrades.reduce((sum, trade) => sum + trade.amount, 0)
  const totalSellAmount = sellTrades.reduce((sum, trade) => sum + trade.amount, 0)
  const netCashFlow = totalSellAmount - totalBuyAmount

  // Calculate average trade size
  const averageTradeSize = trades.length > 0 ? 
    trades.reduce((sum, trade) => sum + trade.amount, 0) / trades.length : 0

  // Calculate trading frequency (trades per month)
  const tradingFrequency = trades.length > 0 ? {
    total: trades.length,
    monthly: trades.length / Math.max(1, (Date.now() - new Date(portfolio?.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24 * 30))
  } : { total: 0, monthly: 0 }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Portfolio Analytics</h2>
          <p className="text-gray-600">Comprehensive analysis of your investment portfolio</p>
        </div>
        <Button 
          onClick={() => {
            fetchSectorData()
            fetchAnalytics()
            onRefresh?.()
          }}
          variant="outline"
          disabled={isLoadingSectors || isLoadingAnalytics}
        >
          {(isLoadingSectors || isLoadingAnalytics) ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Data
        </Button>
      </div>

      

      {/* Sector Allocation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-green-600" />
            Sector Allocation
            {isLoadingSectors && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <CardDescription>
            Distribution of your portfolio across different sectors (real-time data from Polygon.io)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSectors ? (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Loading sector data from Polygon.io...</p>
            </div>
          ) : Object.keys(sectorAllocation).length === 0 ? (
            <div className="text-center py-8">
              <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No positions found. Add positions to see sector allocation.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(sectorAllocation)
                .sort(([,a], [,b]) => b - a)
                .map(([sector, value]) => {
                  const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0
                  const sectorColor = getSectorColor(sector)
                  return (
                    <div key={sector} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${sectorColor}`}></div>
                        <div>
                          <span className="font-medium">{sector}</span>
                          <div className="text-xs text-gray-500">
                            {positions.filter(pos => sectorData[pos.symbol]?.sector === sector).length} positions
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${value.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trading Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-600" />
            Trading Activity
          </CardTitle>
          <CardDescription>
            Your trading performance and activity metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-800">
                {trades.length}
              </div>
              <div className="text-sm text-purple-600">Total Trades</div>
              <div className="text-xs text-gray-500 mt-1">
                {buyTrades.length} buys, {sellTrades.length} sells
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-800">
                ${averageTradeSize.toLocaleString()}
              </div>
              <div className="text-sm text-blue-600">Avg Trade Size</div>
              <div className="text-xs text-gray-500 mt-1">
                Per transaction
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-800">
                {tradingFrequency.monthly.toFixed(1)}
              </div>
              <div className="text-sm text-green-600">Trades/Month</div>
              <div className="text-xs text-gray-500 mt-1">
                Trading frequency
              </div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                ${netCashFlow.toLocaleString()}
              </div>
              <div className="text-sm text-orange-600">Net Cash Flow</div>
              <div className="text-xs text-gray-500 mt-1">
                Sells - Buys
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      

      

      {/* Portfolio Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Portfolio Summary
          </CardTitle>
        </CardHeader>
                 <CardContent>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
               <div className="text-sm text-gray-600">Total Positions</div>
               <div className="text-2xl font-bold">{positions.length}</div>
             </div>
             <div className="space-y-2">
               <div className="text-sm text-gray-600">Total Value</div>
               <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
             </div>
           </div>
         </CardContent>
      </Card>
    </div>
  )
}

// Helper function to get sector colors
function getSectorColor(sector: string): string {
  const colors: Record<string, string> = {
    'Technology': 'bg-blue-500',
    'Healthcare': 'bg-green-500',
    'Financial Services': 'bg-purple-500',
    'Consumer Discretionary': 'bg-pink-500',
    'Consumer Staples': 'bg-yellow-500',
    'Energy': 'bg-red-500',
    'Industrials': 'bg-indigo-500',
    'Materials': 'bg-gray-500',
    'Real Estate': 'bg-orange-500',
    'Communication Services': 'bg-teal-500',
    'Utilities': 'bg-cyan-500',
    'Other': 'bg-gray-400',
    'Unknown': 'bg-gray-300'
  }
  return colors[sector] || 'bg-gray-300'
}
