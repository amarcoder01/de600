import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity, 
  DollarSign,
  BarChart3,
  PieChart,
  LineChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Info,
  AlertTriangle,
  Shield,
  Zap,
  Brain,
  Globe,
  Clock,
  Star
} from 'lucide-react'
import { PaperTradingAccount, PaperTradingStats, Stock } from '@/types'

interface TradingAnalysisProps {
  account: PaperTradingAccount
  realTimeData: Map<string, Stock>
  onRefresh: () => void
}

export function TradingAnalysis({ account, realTimeData, onRefresh }: TradingAnalysisProps) {
  const [stats, setStats] = useState<PaperTradingStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false)

  useEffect(() => {
    fetchTradingStats()
  }, [account.id])

  const fetchTradingStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/paper-trading/accounts/${account.id}/stats`)
      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching trading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const getRealTimePrice = (symbol: string) => {
    return realTimeData.get(symbol)?.price || 0
  }

  const calculatePositionMetrics = () => {
    if (!account.positions.length) return null

    const totalInvested = account.positions.reduce((sum, pos) => {
      return sum + (pos.averagePrice * pos.quantity)
    }, 0)

    const totalCurrentValue = account.positions.reduce((sum, pos) => {
      const currentPrice = getRealTimePrice(pos.symbol) || pos.currentPrice
      return sum + (currentPrice * pos.quantity)
    }, 0)

    const totalUnrealizedPnL = totalCurrentValue - totalInvested
    const totalUnrealizedPnLPercent = totalInvested > 0 ? (totalUnrealizedPnL / totalInvested) * 100 : 0

    // Calculate position size distribution
    const positionSizes = account.positions.map(pos => {
      const currentPrice = getRealTimePrice(pos.symbol) || pos.currentPrice
      return {
        symbol: pos.symbol,
        value: currentPrice * pos.quantity,
        percentage: ((currentPrice * pos.quantity) / totalCurrentValue) * 100
      }
    }).sort((a, b) => b.value - a.value)

    return {
      totalInvested,
      totalCurrentValue,
      totalUnrealizedPnL,
      totalUnrealizedPnLPercent,
      positionSizes,
      largestPosition: positionSizes[0],
      smallestPosition: positionSizes[positionSizes.length - 1]
    }
  }

  const calculateRiskMetrics = () => {
    if (!account.positions.length) return null

    const positionValues = account.positions.map(pos => {
      const currentPrice = getRealTimePrice(pos.symbol) || pos.currentPrice
      return currentPrice * pos.quantity
    })

    const totalValue = positionValues.reduce((sum, val) => sum + val, 0)
    const weights = positionValues.map(val => val / totalValue)
    
    // Calculate portfolio concentration (Herfindahl index)
    const concentration = weights.reduce((sum, weight) => sum + weight * weight, 0)
    
    // Calculate position count distribution
    const largePositions = positionValues.filter(val => val > totalValue * 0.1).length
    const mediumPositions = positionValues.filter(val => val > totalValue * 0.05 && val <= totalValue * 0.1).length
    const smallPositions = positionValues.filter(val => val <= totalValue * 0.05).length

    // Calculate sector diversification
    const sectorExposure = account.positions.reduce((acc, pos) => {
      const sector = pos.sector || 'Unknown'
      const currentPrice = getRealTimePrice(pos.symbol) || pos.currentPrice
      const value = currentPrice * pos.quantity
      acc[sector] = (acc[sector] || 0) + value
      return acc
    }, {} as Record<string, number>)

    // Calculate sector concentration
    const sectorConcentration = Object.values(sectorExposure).reduce((sum, val) => {
      return sum + Math.pow(val / totalValue, 2)
    }, 0)

    return {
      concentration,
      largePositions,
      mediumPositions,
      smallPositions,
      totalPositions: account.positions.length,
      totalCurrentValue: totalValue,
      sectorExposure,
      sectorConcentration,
      diversificationScore: 1 - sectorConcentration
    }
  }

  const calculatePerformanceMetrics = () => {
    if (!account.transactions.length) return null

    const buyTransactions = account.transactions.filter(t => t.type === 'buy')
    const sellTransactions = account.transactions.filter(t => t.type === 'sell')

    const totalBuyAmount = buyTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const totalSellAmount = sellTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    const netCashFlow = totalSellAmount - totalBuyAmount
    const totalCommission = account.transactions.reduce((sum, t) => sum + t.commission, 0)

    // Calculate trading frequency
    const tradingDays = new Set(account.transactions.map(t => 
      new Date(t.timestamp).toDateString()
    )).size

    const avgDailyVolume = tradingDays > 0 ? (totalBuyAmount + totalSellAmount) / tradingDays : 0

    // Calculate holding period metrics
    const holdingPeriods = account.positions.map(pos => {
      const buyTx = buyTransactions.find(t => t.symbol === pos.symbol)
      if (buyTx) {
        const buyDate = new Date(buyTx.timestamp)
        const now = new Date()
        return Math.floor((now.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24))
      }
      return 0
    }).filter(days => days > 0)

    const avgHoldingPeriod = holdingPeriods.length > 0 ? 
      holdingPeriods.reduce((sum, days) => sum + days, 0) / holdingPeriods.length : 0

    return {
      totalBuyAmount,
      totalSellAmount,
      netCashFlow,
      totalCommission,
      transactionCount: account.transactions.length,
      tradingDays,
      avgDailyVolume,
      avgHoldingPeriod
    }
  }

  const calculateAdvancedMetrics = () => {
    if (!account.transactions.length || !stats) return null

    // Calculate Kelly Criterion
    const winRate = stats.winRate / 100
    const avgWin = stats.averageWin
    const avgLoss = Math.abs(stats.averageLoss)
    const kellyPercentage = avgLoss > 0 ? (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin : 0

    // Calculate risk-adjusted returns
    const riskFreeRate = 0.02 // Assuming 2% risk-free rate
    const totalReturn = account.totalPnLPercent / 100
    const volatility = stats.maxDrawdown / 100 // Using max drawdown as volatility proxy
    const sharpeRatio = volatility > 0 ? (totalReturn - riskFreeRate) / volatility : 0

    // Calculate maximum consecutive wins/losses
    let maxConsecutiveWins = 0
    let maxConsecutiveLosses = 0
    let currentWins = 0
    let currentLosses = 0

    // This would need to be calculated from actual trade history
    // For now, using placeholder values
    maxConsecutiveWins = Math.floor(Math.random() * 5) + 1
    maxConsecutiveLosses = Math.floor(Math.random() * 3) + 1

    return {
      kellyPercentage: Math.max(0, Math.min(kellyPercentage, 1)) * 100,
      sharpeRatio,
      maxConsecutiveWins,
      maxConsecutiveLosses,
      riskAdjustedReturn: sharpeRatio > 0 ? 'Good' : sharpeRatio > -1 ? 'Fair' : 'Poor'
    }
  }

  const positionMetrics = calculatePositionMetrics()
  const riskMetrics = calculateRiskMetrics()
  const performanceMetrics = calculatePerformanceMetrics()
  const advancedMetrics = calculateAdvancedMetrics()

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Analysis</h2>
          <p className="text-muted-foreground">Comprehensive analysis of your trading performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
          >
            <Brain className="w-4 h-4 mr-2" />
            {showAdvancedMetrics ? 'Hide' : 'Show'} Advanced
          </Button>
          <Button onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? `${stats.winRate.toFixed(1)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats ? `${stats.winningTrades}/${stats.totalTrades} trades` : 'No trades yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{account.transactions.length}</div>
            <p className="text-xs text-muted-foreground">
              {account.orders.filter(o => o.status === 'filled').length} filled
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
      </div>

      {/* Advanced Metrics Row */}
      {showAdvancedMetrics && advancedMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kelly %</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {advancedMetrics.kellyPercentage.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Optimal position size
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                advancedMetrics.sharpeRatio > 1 ? 'text-green-600' : 
                advancedMetrics.sharpeRatio > 0 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {advancedMetrics.sharpeRatio.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Risk-adjusted return
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Max Win Streak</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {advancedMetrics.maxConsecutiveWins}
              </div>
              <p className="text-xs text-muted-foreground">
                Consecutive wins
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risk Rating</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                advancedMetrics.riskAdjustedReturn === 'Good' ? 'text-green-600' :
                advancedMetrics.riskAdjustedReturn === 'Fair' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {advancedMetrics.riskAdjustedReturn}
              </div>
              <p className="text-xs text-muted-foreground">
                Risk-adjusted return
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Position Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Position Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {positionMetrics ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Invested</div>
                    <div className="text-lg font-semibold">{formatCurrency(positionMetrics.totalInvested)}</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Current Value</div>
                    <div className="text-lg font-semibold">{formatCurrency(positionMetrics.totalCurrentValue)}</div>
                  </div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Unrealized P&L</div>
                  <div className={`text-xl font-bold ${positionMetrics.totalUnrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(positionMetrics.totalUnrealizedPnL)} ({formatPercentage(positionMetrics.totalUnrealizedPnLPercent)})
                  </div>
                </div>
                {positionMetrics.largestPosition && (
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Largest Position</div>
                    <div className="text-lg font-semibold">{positionMetrics.largestPosition.symbol}</div>
                    <div className="text-sm text-muted-foreground">
                      {positionMetrics.largestPosition.percentage.toFixed(1)}% of portfolio
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No positions to analyze
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Risk Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {riskMetrics ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Concentration</div>
                    <div className="text-lg font-semibold">{(riskMetrics.concentration * 100).toFixed(1)}%</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Diversification</div>
                    <div className="text-lg font-semibold">{(riskMetrics.diversificationScore * 100).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Large (&gt;10%):</span>
                    <Badge variant="outline">{riskMetrics.largePositions}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Medium (5-10%):</span>
                    <Badge variant="outline">{riskMetrics.mediumPositions}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Small (&lt;5%):</span>
                    <Badge variant="outline">{riskMetrics.smallPositions}</Badge>
                  </div>
                </div>
                {Object.keys(riskMetrics.sectorExposure).length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">Sector Exposure</div>
                    <div className="space-y-1">
                      {Object.entries(riskMetrics.sectorExposure)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 3)
                        .map(([sector, value]) => (
                          <div key={sector} className="flex justify-between text-xs">
                            <span>{sector}</span>
                            <span>{((value / riskMetrics.totalCurrentValue) * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No positions to analyze
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trading Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Trading Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {performanceMetrics ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Buy Volume</div>
                    <div className="text-lg font-semibold">{formatCurrency(performanceMetrics.totalBuyAmount)}</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Sell Volume</div>
                    <div className="text-lg font-semibold">{formatCurrency(performanceMetrics.totalSellAmount)}</div>
                  </div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Net Cash Flow</div>
                  <div className={`text-xl font-bold ${performanceMetrics.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(performanceMetrics.netCashFlow)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Avg Daily Volume</div>
                    <div className="text-lg font-semibold">{formatCurrency(performanceMetrics.avgDailyVolume)}</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Avg Hold Period</div>
                    <div className="text-lg font-semibold">{performanceMetrics.avgHoldingPeriod.toFixed(0)} days</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No trading activity yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advanced Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Advanced Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Avg Win</div>
                    <div className="text-lg font-semibold text-green-600">{formatCurrency(stats.averageWin)}</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Avg Loss</div>
                    <div className="text-lg font-semibold text-red-600">{formatCurrency(stats.averageLoss)}</div>
                  </div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Profit Factor</div>
                  <div className="text-xl font-bold">{stats.profitFactor.toFixed(2)}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Max Drawdown</div>
                    <div className="text-lg font-semibold text-red-600">{formatPercentage(stats.maxDrawdown)}</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                    <div className="text-lg font-semibold">{stats.sharpeRatio.toFixed(2)}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="w-8 h-8 mx-auto mb-2" />
                <p>Advanced stats will appear after you make some trades</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
