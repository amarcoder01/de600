'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { 
  Play, 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  DollarSign,
  Target,
  Shield
} from 'lucide-react'
import { qlibAPI, type BacktestResult, type PerformanceMetrics } from '@/lib/qlib-api'

interface QlibDashboardProps {
  className?: string
}

export default function QlibDashboard({ className }: QlibDashboardProps) {
  const [loading, setLoading] = useState(false)
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState('momentum')
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['AAPL', 'MSFT', 'GOOGL'])
  const [startDate, setStartDate] = useState('2023-01-01')
  const [endDate, setEndDate] = useState('2023-12-31')
  const [initialCapital, setInitialCapital] = useState(100000)
  const [status, setStatus] = useState<{ success: boolean; message?: string; error?: string } | null>(null)

  const strategyTemplates = qlibAPI.getStrategyTemplates()

  const [usePolygonData, setUsePolygonData] = useState(false)

  const handleRunBacktest = async () => {
    setLoading(true)
    try {
      // Choose between Polygon.io and traditional QLib based on toggle
      const apiMethod = usePolygonData ? qlibAPI.runPolygonBacktest : qlibAPI.runBacktest
      
      const result = await apiMethod({
        strategy_name: selectedStrategy,
        symbols: selectedSymbols,
        start_date: startDate,
        end_date: endDate,
        parameters: {
          initial_capital: initialCapital,
          commission: 0.001,
          slippage: 0.0005,
          position_size: 0.1,
          max_positions: 10,
          stop_loss: 0.05,
          take_profit: 0.15,
          rebalance_frequency: 'daily'
        }
      })
      
      if (result.success && result.data) {
        setBacktestResults(prev => [result.data!, ...prev])
        setStatus({ success: true, message: 'Backtest completed successfully' })
      } else {
        setStatus({ success: false, error: result.error })
      }
    } catch (error) {
      setStatus({ success: false, error: 'Failed to run backtest' })
    } finally {
      setLoading(false)
    }
  }

  const handleCompareStrategies = async () => {
    setLoading(true)
    try {
      const result = await qlibAPI.compareStrategies({
        symbols: selectedSymbols,
        start_date: startDate,
        end_date: endDate
      })
      
      if (result.success && result.data) {
        // Convert comparison results to backtest results format
        const comparisonResults = Object.entries(result.data).map(([strategy, metrics]) => ({
          success: true,
          experiment_id: `${strategy}_${Date.now()}`,
          strategy_name: strategy,
          symbols: selectedSymbols,
          start_date: startDate,
          end_date: endDate,
          parameters: qlibAPI.getDefaultParameters(),
          performance: metrics,
          reports: { summary: metrics, charts: {}, trades_analysis: {} }
        }))
        
        setBacktestResults(prev => [...comparisonResults, ...prev])
        setStatus({ success: true, message: 'Strategy comparison completed' })
      } else {
        setStatus({ success: false, error: result.error })
      }
    } catch (error) {
      setStatus({ success: false, error: 'Failed to compare strategies' })
    } finally {
      setLoading(false)
    }
  }

  const renderPerformanceMetrics = (metrics: PerformanceMetrics) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">
          {(metrics.total_return * 100).toFixed(2)}%
        </div>
        <div className="text-sm text-muted-foreground">Total Return</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold">
          {metrics.sharpe_ratio?.toFixed(2) || 'N/A'}
        </div>
        <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-red-600">
          {(metrics.max_drawdown * 100).toFixed(2)}%
        </div>
        <div className="text-sm text-muted-foreground">Max Drawdown</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold">
          {metrics.volatility?.toFixed(2) || 'N/A'}
        </div>
        <div className="text-sm text-muted-foreground">Volatility</div>
      </div>
    </div>
  )

  const renderBacktestResults = () => (
    <div className="space-y-4">
      {backtestResults.map((result) => (
        <Card key={result.experiment_id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                <span>{result.strategy_name} Strategy</span>
                <Badge variant="outline">{result.symbols.join(', ')}</Badge>
              </div>
              <Badge variant={result.performance.total_return > 0 ? "default" : "destructive"}>
                {(result.performance.total_return * 100).toFixed(2)}%
              </Badge>
            </CardTitle>
            <CardDescription>
              {result.start_date} to {result.end_date} • {result.performance.total_trades || 0} trades
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderPerformanceMetrics(result.performance)}
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Backtesting</h1>
          <p className="text-muted-foreground">
            Professional-grade backtesting with advanced analytics and risk management
          </p>
        </div>
      </div>

      {status && (
        <Alert>
          <AlertDescription>
            {status.message || status.error}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backtesting Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Backtesting Configuration
            </CardTitle>
            <CardDescription>
              Configure your backtesting parameters and strategy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
              <Switch
                id="polygon-data"
                checked={usePolygonData}
                onCheckedChange={setUsePolygonData}
              />
              <Label htmlFor="polygon-data" className="text-sm">
                Use Polygon.io Data {usePolygonData && <Badge className="ml-2 bg-blue-100 text-blue-800">Premium</Badge>}
              </Label>
              {usePolygonData && (
                <div className="text-xs text-blue-600">
                  5+ years of institutional-grade data
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy</Label>
              <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(strategyTemplates).map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbols">Symbols (comma-separated)</Label>
              <Input
                id="symbols"
                value={selectedSymbols.join(', ')}
                onChange={(e) => setSelectedSymbols(e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                placeholder="AAPL, MSFT, GOOGL"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capital">Initial Capital ($)</Label>
              <Input
                id="capital"
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                placeholder="100000"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleRunBacktest} 
                disabled={loading}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Run Backtest
              </Button>
              <Button 
                onClick={handleCompareStrategies} 
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Compare Strategies
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Quick Stats
            </CardTitle>
            <CardDescription>
              Overview of your backtesting results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Backtests</span>
                <span className="font-semibold">{backtestResults.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Successful Strategies</span>
                <span className="font-semibold text-green-600">
                  {backtestResults.filter(r => r.performance.total_return > 0).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Best Return</span>
                <span className="font-semibold text-green-600">
                  {backtestResults.length > 0 
                    ? `${(Math.max(...backtestResults.map(r => r.performance.total_return)) * 100).toFixed(2)}%`
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Worst Return</span>
                <span className="font-semibold text-red-600">
                  {backtestResults.length > 0 
                    ? `${(Math.min(...backtestResults.map(r => r.performance.total_return)) * 100).toFixed(2)}%`
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backtest Results */}
      {backtestResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Backtest Results
            </CardTitle>
            <CardDescription>
              Recent backtesting results and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderBacktestResults()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
