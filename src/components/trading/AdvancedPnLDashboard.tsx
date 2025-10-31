'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  RefreshCw,
  Calendar,
  Target,
  Activity,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Filter,
  Download
} from 'lucide-react'
import { PaperTradingAccount, PaperPosition, PaperTransaction, Stock } from '@/types'

interface AdvancedPnLDashboardProps {
  account: PaperTradingAccount
  onRefresh: () => void
  realTimeData: Map<string, Stock>
}

interface PnLMetrics {
  totalPnL: number
  totalPnLPercent: number
  realizedPnL: number
  unrealizedPnL: number
  dayPnL: number
  weekPnL: number
  monthPnL: number
  bestPosition: { symbol: string; pnl: number } | null
  worstPosition: { symbol: string; pnl: number } | null
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
}

interface DailyPnL {
  date: string
  pnl: number
  cumulativePnL: number
  positions: number
}

export default function AdvancedPnLDashboard({ 
  account, 
  onRefresh, 
  realTimeData 
}: AdvancedPnLDashboardProps) {
  const [pnlMetrics, setPnlMetrics] = useState<PnLMetrics | null>(null)
  const [dailyPnL, setDailyPnL] = useState<DailyPnL[]>([])
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | 'ALL'>('1M')
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Real-time update interval
  useEffect(() => {
    const interval = setInterval(() => {
      calculateMetrics()
      setLastUpdate(new Date())
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [account, realTimeData])

  // Calculate comprehensive P&L metrics
  const calculateMetrics = useCallback(() => {
    if (!account) return

    const positions = account.positions || []
    const transactions = account.transactions || []

    // Calculate unrealized P&L with real-time prices
    let totalUnrealizedPnL = 0
    let bestPosition: { symbol: string; pnl: number } | null = null
    let worstPosition: { symbol: string; pnl: number } | null = null

    positions.forEach(position => {
      const realTimePrice = realTimeData.get(position.symbol)?.price || position.currentPrice
      const unrealizedPnL = (realTimePrice - position.averagePrice) * position.quantity
      totalUnrealizedPnL += unrealizedPnL

      if (!bestPosition || unrealizedPnL > bestPosition.pnl) {
        bestPosition = { symbol: position.symbol, pnl: unrealizedPnL }
      }
      if (!worstPosition || unrealizedPnL < worstPosition.pnl) {
        worstPosition = { symbol: position.symbol, pnl: unrealizedPnL }
      }
    })

    // Calculate realized P&L from transactions - improved logic
    const sellTransactions = transactions.filter(t => t.type === 'sell')
    const buyTransactions = transactions.filter(t => t.type === 'buy')
    
    let totalRealizedPnL = 0
    let wins = 0
    let losses = 0
    let totalWins = 0
    let totalLosses = 0
    let totalTrades = 0

    // Group transactions by symbol for better matching
    const transactionsBySymbol: { [symbol: string]: { buys: any[], sells: any[] } } = {}
    
    buyTransactions.forEach(buy => {
      if (!transactionsBySymbol[buy.symbol]) {
        transactionsBySymbol[buy.symbol] = { buys: [], sells: [] }
      }
      transactionsBySymbol[buy.symbol].buys.push(buy)
    })
    
    sellTransactions.forEach(sell => {
      if (!transactionsBySymbol[sell.symbol]) {
        transactionsBySymbol[sell.symbol] = { buys: [], sells: [] }
      }
      transactionsBySymbol[sell.symbol].sells.push(sell)
    })

    // Calculate P&L for each symbol
    Object.keys(transactionsBySymbol).forEach(symbol => {
      const { buys, sells } = transactionsBySymbol[symbol]
      
      // Sort by timestamp
      buys.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      sells.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      
      // Match sells with buys (FIFO)
      let buyIndex = 0
      let remainingBuyQuantity = 0
      
      sells.forEach(sell => {
        if (!sell.quantity || !sell.price) return
        
        let sellQuantityRemaining = sell.quantity
        
        while (sellQuantityRemaining > 0 && buyIndex < buys.length) {
          const buy = buys[buyIndex]
          if (!buy.quantity || !buy.price) {
            buyIndex++
            continue
          }
          
          if (remainingBuyQuantity === 0) {
            remainingBuyQuantity = buy.quantity
          }
          
          const tradeQuantity = Math.min(sellQuantityRemaining, remainingBuyQuantity)
          const tradePnL = (sell.price - buy.price) * tradeQuantity - 
                          ((sell.commission || 0) + (buy.commission || 0)) * (tradeQuantity / sell.quantity)
          
          totalRealizedPnL += tradePnL
          totalTrades++
          
          if (tradePnL > 0) {
            wins++
            totalWins += tradePnL
          } else if (tradePnL < 0) {
            losses++
            totalLosses += Math.abs(tradePnL)
          }
          
          sellQuantityRemaining -= tradeQuantity
          remainingBuyQuantity -= tradeQuantity
          
          if (remainingBuyQuantity === 0) {
            buyIndex++
          }
        }
      })
    })

    // Calculate time-based P&L
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const dayTransactions = transactions.filter(t => new Date(t.timestamp) >= dayAgo)
    const weekTransactions = transactions.filter(t => new Date(t.timestamp) >= weekAgo)
    const monthTransactions = transactions.filter(t => new Date(t.timestamp) >= monthAgo)

    // Calculate time-based P&L more accurately - only for specific periods
    const calculatePeriodPnL = (periodStart: Date, periodEnd: Date, periodName: string) => {
      let periodPnL = 0
      
      // Get transactions within this specific period
      const periodTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.timestamp)
        return transactionDate >= periodStart && transactionDate <= periodEnd
      })
      
      const periodSells = periodTransactions.filter(t => t.type === 'sell')
      const periodBuys = periodTransactions.filter(t => t.type === 'buy')
      
      // Calculate realized P&L from completed trades in this period
      periodSells.forEach(sell => {
        if (sell.price && sell.quantity) {
          const sellValue = sell.price * sell.quantity - (sell.commission || 0)
          // Find corresponding buy (can be from any time, not just this period)
          const correspondingBuy = transactions
            .filter(t => t.type === 'buy' && t.symbol === sell.symbol && t.price && t.quantity)
            .find(buy => new Date(buy.timestamp) <= new Date(sell.timestamp))
          
          if (correspondingBuy && correspondingBuy.price) {
            const buyValue = correspondingBuy.price * sell.quantity + (correspondingBuy.commission || 0)
            periodPnL += (sellValue - buyValue)
          }
        }
      })
      
      // For positions opened in this period, add their current unrealized P&L
      positions.forEach(position => {
        const firstBuyTransaction = transactions
          .filter(t => t.type === 'buy' && t.symbol === position.symbol)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0]
        
        if (firstBuyTransaction) {
          const openDate = new Date(firstBuyTransaction.timestamp)
          // Only include if position was opened within this specific period
          if (openDate >= periodStart && openDate <= periodEnd) {
            const realTimePrice = realTimeData.get(position.symbol)?.price || position.currentPrice
            const unrealizedPnL = (realTimePrice - position.averagePrice) * position.quantity
            periodPnL += unrealizedPnL
          }
        }
      })
      
      return periodPnL
    }

    const dayPnL = calculatePeriodPnL(dayAgo, now, 'day')
    const weekPnL = calculatePeriodPnL(weekAgo, now, 'week') 
    const monthPnL = calculatePeriodPnL(monthAgo, now, 'month')

    // Include unrealized P&L in statistics for open positions
    let totalWinsIncludingUnrealized = totalWins
    let totalLossesIncludingUnrealized = totalLosses
    let winsIncludingUnrealized = wins
    let lossesIncludingUnrealized = losses

    // Add unrealized P&L from open positions to statistics
    positions.forEach(position => {
      const realTimePrice = realTimeData.get(position.symbol)?.price || position.currentPrice
      const unrealizedPnL = (realTimePrice - position.averagePrice) * position.quantity
      
      if (unrealizedPnL > 0) {
        totalWinsIncludingUnrealized += unrealizedPnL
        winsIncludingUnrealized++
      } else if (unrealizedPnL < 0) {
        totalLossesIncludingUnrealized += Math.abs(unrealizedPnL)
        lossesIncludingUnrealized++
      }
    })

    const totalPnL = totalRealizedPnL + totalUnrealizedPnL
    const totalPnLPercent = account.initialBalance > 0 ? (totalPnL / account.initialBalance) * 100 : 0
    const winRate = (winsIncludingUnrealized + lossesIncludingUnrealized) > 0 ? 
      (winsIncludingUnrealized / (winsIncludingUnrealized + lossesIncludingUnrealized)) * 100 : 0
    const avgWin = winsIncludingUnrealized > 0 ? totalWinsIncludingUnrealized / winsIncludingUnrealized : 0
    const avgLoss = lossesIncludingUnrealized > 0 ? totalLossesIncludingUnrealized / lossesIncludingUnrealized : 0
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? 999 : 0)

    setPnlMetrics({
      totalPnL,
      totalPnLPercent,
      realizedPnL: totalRealizedPnL,
      unrealizedPnL: totalUnrealizedPnL,
      dayPnL,
      weekPnL,
      monthPnL,
      bestPosition,
      worstPosition,
      winRate,
      avgWin,
      avgLoss,
      profitFactor
    })

    // Calculate daily P&L for chart
    calculateDailyPnL(transactions)
  }, [account, realTimeData])

  const calculateDailyPnL = (transactions: PaperTransaction[]) => {
    const dailyData: { [key: string]: { pnl: number; positions: number } } = {}
    
    // Group transactions by date and calculate daily P&L
    const sellTransactions = transactions.filter(t => t.type === 'sell')
    const buyTransactions = transactions.filter(t => t.type === 'buy')
    
    sellTransactions.forEach(sell => {
      const date = new Date(sell.timestamp).toISOString().split('T')[0]
      if (!dailyData[date]) {
        dailyData[date] = { pnl: 0, positions: 0 }
      }
      
      if (sell.price && sell.quantity) {
        // Find corresponding buy transaction
        const correspondingBuy = buyTransactions.find(buy => 
          buy.symbol === sell.symbol && 
          buy.price && buy.quantity &&
          new Date(buy.timestamp) <= new Date(sell.timestamp)
        )
        
        if (correspondingBuy && correspondingBuy.price) {
          const sellValue = sell.price * sell.quantity - (sell.commission || 0)
          const buyValue = correspondingBuy.price * sell.quantity + (correspondingBuy.commission || 0)
          const tradePnL = sellValue - buyValue
          
          dailyData[date].pnl += tradePnL
          dailyData[date].positions++
        }
      }
    })

    const sortedDates = Object.keys(dailyData).sort()
    let cumulativePnL = 0
    
    const dailyPnLData = sortedDates.map(date => {
      cumulativePnL += dailyData[date].pnl
      return {
        date,
        pnl: dailyData[date].pnl,
        cumulativePnL,
        positions: dailyData[date].positions
      }
    })

    setDailyPnL(dailyPnLData)
  }

  // Initial calculation
  useEffect(() => {
    calculateMetrics()
  }, [calculateMetrics])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const exportPnLData = () => {
    const data = {
      account: account.name,
      exportDate: new Date().toISOString(),
      metrics: pnlMetrics,
      dailyPnL,
      positions: account.positions.map(pos => ({
        symbol: pos.symbol,
        quantity: pos.quantity,
        averagePrice: pos.averagePrice,
        currentPrice: realTimeData.get(pos.symbol)?.price || pos.currentPrice,
        unrealizedPnL: pos.unrealizedPnL,
        unrealizedPnLPercent: pos.unrealizedPnLPercent
      }))
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pnl-report-${account.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!pnlMetrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced P&L Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportPnLData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className={`text-2xl font-bold ${pnlMetrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(pnlMetrics.totalPnL)}
                </p>
                <p className={`text-sm ${pnlMetrics.totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(pnlMetrics.totalPnLPercent)}
                </p>
              </div>
              {pnlMetrics.totalPnL >= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-600" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Profits</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    account.positions.reduce((sum, pos) => {
                      const realTimePrice = realTimeData.get(pos.symbol)?.price || pos.currentPrice
                      const unrealizedPnL = (realTimePrice - pos.averagePrice) * pos.quantity
                      return sum + Math.max(0, unrealizedPnL)
                    }, Math.max(0, pnlMetrics.realizedPnL))
                  )}
                </p>
                <p className="text-sm text-green-600">
                  Avg: {formatCurrency(pnlMetrics.avgWin)}
                </p>
              </div>
              <ArrowUpRight className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Losses</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(
                    account.positions.reduce((sum, pos) => {
                      const realTimePrice = realTimeData.get(pos.symbol)?.price || pos.currentPrice
                      const unrealizedPnL = (realTimePrice - pos.averagePrice) * pos.quantity
                      return sum + Math.abs(Math.min(0, unrealizedPnL))
                    }, Math.abs(Math.min(0, pnlMetrics.realizedPnL)))
                  )}
                </p>
                <p className="text-sm text-red-600">
                  Avg: {formatCurrency(pnlMetrics.avgLoss)}
                </p>
              </div>
              <ArrowDownRight className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unrealized P&L</p>
                <p className={`text-2xl font-bold ${pnlMetrics.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(pnlMetrics.unrealizedPnL)}
                </p>
                <p className="text-sm text-muted-foreground">Open Positions</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {pnlMetrics.winRate.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">
                  PF: {pnlMetrics.profitFactor.toFixed(2)}
                </p>
              </div>
              <Target className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time-based P&L */}
      <Card>
        <CardHeader>
          <CardTitle>Time-based Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Today</p>
              <p className={`text-xl font-bold ${pnlMetrics.dayPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(pnlMetrics.dayPnL)}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className={`text-xl font-bold ${pnlMetrics.weekPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(pnlMetrics.weekPnL)}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className={`text-xl font-bold ${pnlMetrics.monthPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(pnlMetrics.monthPnL)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profit/Loss Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <ArrowUpRight className="w-5 h-5 mr-2" />
              Profitable Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {account.positions
                .filter(pos => {
                  const realTimePrice = realTimeData.get(pos.symbol)?.price || pos.currentPrice
                  const unrealizedPnL = (realTimePrice - pos.averagePrice) * pos.quantity
                  return unrealizedPnL > 0
                })
                .sort((a, b) => {
                  const aPnL = ((realTimeData.get(a.symbol)?.price || a.currentPrice) - a.averagePrice) * a.quantity
                  const bPnL = ((realTimeData.get(b.symbol)?.price || b.currentPrice) - b.averagePrice) * b.quantity
                  return bPnL - aPnL
                })
                .slice(0, 5)
                .map(pos => {
                  const realTimePrice = realTimeData.get(pos.symbol)?.price || pos.currentPrice
                  const unrealizedPnL = (realTimePrice - pos.averagePrice) * pos.quantity
                  return (
                    <div key={pos.id} className="flex justify-between items-center">
                      <span className="font-medium">{pos.symbol}</span>
                      <span className="text-green-600 font-bold">
                        {formatCurrency(unrealizedPnL)}
                      </span>
                    </div>
                  )
                })}
              {account.positions.filter(pos => {
                const realTimePrice = realTimeData.get(pos.symbol)?.price || pos.currentPrice
                const unrealizedPnL = (realTimePrice - pos.averagePrice) * pos.quantity
                return unrealizedPnL > 0
              }).length === 0 && (
                <p className="text-muted-foreground text-sm">No profitable positions</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <ArrowDownRight className="w-5 h-5 mr-2" />
              Losing Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {account.positions
                .filter(pos => {
                  const realTimePrice = realTimeData.get(pos.symbol)?.price || pos.currentPrice
                  const unrealizedPnL = (realTimePrice - pos.averagePrice) * pos.quantity
                  return unrealizedPnL < 0
                })
                .sort((a, b) => {
                  const aPnL = ((realTimeData.get(a.symbol)?.price || a.currentPrice) - a.averagePrice) * a.quantity
                  const bPnL = ((realTimeData.get(b.symbol)?.price || b.currentPrice) - b.averagePrice) * b.quantity
                  return aPnL - bPnL
                })
                .slice(0, 5)
                .map(pos => {
                  const realTimePrice = realTimeData.get(pos.symbol)?.price || pos.currentPrice
                  const unrealizedPnL = (realTimePrice - pos.averagePrice) * pos.quantity
                  return (
                    <div key={pos.id} className="flex justify-between items-center">
                      <span className="font-medium">{pos.symbol}</span>
                      <span className="text-red-600 font-bold">
                        {formatCurrency(unrealizedPnL)}
                      </span>
                    </div>
                  )
                })}
              {account.positions.filter(pos => {
                const realTimePrice = realTimeData.get(pos.symbol)?.price || pos.currentPrice
                const unrealizedPnL = (realTimePrice - pos.averagePrice) * pos.quantity
                return unrealizedPnL < 0
              }).length === 0 && (
                <p className="text-muted-foreground text-sm">No losing positions</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-blue-600">
              <BarChart3 className="w-5 h-5 mr-2" />
              P&L Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Profitable:</span>
                <span className="font-medium text-green-600">
                  {account.positions.filter(pos => {
                    const realTimePrice = realTimeData.get(pos.symbol)?.price || pos.currentPrice
                    const unrealizedPnL = (realTimePrice - pos.averagePrice) * pos.quantity
                    return unrealizedPnL > 0
                  }).length} positions
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Losing:</span>
                <span className="font-medium text-red-600">
                  {account.positions.filter(pos => {
                    const realTimePrice = realTimeData.get(pos.symbol)?.price || pos.currentPrice
                    const unrealizedPnL = (realTimePrice - pos.averagePrice) * pos.quantity
                    return unrealizedPnL < 0
                  }).length} positions
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Breakeven:</span>
                <span className="font-medium text-gray-600">
                  {account.positions.filter(pos => {
                    const realTimePrice = realTimeData.get(pos.symbol)?.price || pos.currentPrice
                    const unrealizedPnL = (realTimePrice - pos.averagePrice) * pos.quantity
                    return Math.abs(unrealizedPnL) < 0.01
                  }).length} positions
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Positions:</span>
                  <span className="font-bold">{account.positions.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Position Details with Real-time Updates */}
      <Card>
        <CardHeader>
          <CardTitle>Position P&L Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Symbol</th>
                  <th className="text-right p-2">Quantity</th>
                  <th className="text-right p-2">Avg Price</th>
                  <th className="text-right p-2">Current Price</th>
                  <th className="text-right p-2">Market Value</th>
                  <th className="text-right p-2">Unrealized P&L</th>
                  <th className="text-right p-2">P&L %</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {account.positions.map((position) => {
                  const realTimePrice = realTimeData.get(position.symbol)?.price || position.currentPrice
                  const unrealizedPnL = (realTimePrice - position.averagePrice) * position.quantity
                  const unrealizedPnLPercent = ((realTimePrice - position.averagePrice) / position.averagePrice) * 100
                  const marketValue = realTimePrice * position.quantity

                  return (
                    <tr key={position.id} className="border-b hover:bg-gray-800/50 dark:hover:bg-gray-700/50">
                      <td className="p-2 font-medium">{position.symbol}</td>
                      <td className="p-2 text-right">{position.quantity.toLocaleString()}</td>
                      <td className="p-2 text-right">{formatCurrency(position.averagePrice)}</td>
                      <td className="p-2 text-right font-medium">
                        {formatCurrency(realTimePrice)}
                      </td>
                      <td className="p-2 text-right">{formatCurrency(marketValue)}</td>
                      <td className={`p-2 text-right font-medium ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(unrealizedPnL)}
                      </td>
                      <td className={`p-2 text-right font-medium ${unrealizedPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(unrealizedPnLPercent)}
                      </td>
                      <td className="p-2 text-center">
                        {unrealizedPnL >= 0 ? (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-medium"
                            aria-label="Profitable position"
                          >
                            Profit
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-md font-medium"
                            aria-label="Losing position"
                          >
                            Loss
                          </Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Trading Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-xl font-bold text-blue-600">{pnlMetrics.winRate.toFixed(1)}%</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Avg Win</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(pnlMetrics.avgWin)}</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Avg Loss</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(pnlMetrics.avgLoss)}</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Profit Factor</p>
              <p className="text-xl font-bold text-purple-600">{pnlMetrics.profitFactor.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
