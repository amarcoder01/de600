'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { 
  TrendingUp, 
  Loader2,
  BarChart3,
  CheckCircle,
  XCircle,
  Target,
  Activity,
  Database
} from 'lucide-react'

interface BacktestResult {
  success: boolean
  results?: {
    performance: {
      total_return: number
      sharpe_ratio: number
      max_drawdown: number
      volatility: number
      win_rate?: number
      profit_factor?: number
    }
    total_trades: number
    portfolio_value: number
    validation?: {
      accuracy_grade?: string
      accuracy_metrics?: {
        data_accuracy?: number
        calculation_accuracy?: number
        strategy_accuracy?: number
        overall_accuracy?: number
        confidence_level?: number
        validation_score?: number
      }
    }
  }
  error?: string
}

interface PolygonBacktestComponentProps {
  className?: string
}

export default function PolygonBacktestComponent({ className }: PolygonBacktestComponentProps) {
  const [strategy, setStrategy] = useState('momentum')
  const [symbols, setSymbols] = useState('AAPL,MSFT,GOOGL')
  const [startDate, setStartDate] = useState('2021-01-01')
  const [endDate, setEndDate] = useState('2024-12-31')
  const [initialCapital, setInitialCapital] = useState(100000)
  const [positionSize, setPositionSize] = useState(0.1)
  const [commission, setCommission] = useState(0.001)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BacktestResult | null>(null)

  const formatPercentage = (value: number): string => {
    // Convert decimal to percentage and format nicely
    const percentage = value * 100;
    if (Math.abs(percentage) < 0.01) {
      return '0.00%';
    }
    // Handle very small percentages
    if (Math.abs(percentage) < 0.1) {
      return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(3)}%`;
    }
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  }

  const formatNumber = (value: number): string => {
    // Format numbers with appropriate decimal places
    if (Math.abs(value) < 0.01) {
      return '0.00';
    }
    if (Math.abs(value) >= 1000) {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  const validateDateRange = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const minDate = new Date('2020-08-01'); // Polygon.io Starter Plan data starts from August 2020
    const maxDate = new Date();
    
    if (start < minDate) {
      return `Start date cannot be before 2020-08-01. Available data range: 2020-08-01 to current date.`;
    }
    
    if (end > maxDate) {
      return `End date cannot be in the future. Available data range: 2020-08-01 to current date.`;
    }
    
    if (start >= end) {
      return `End date must be after start date.`;
    }
    
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 30) {
      return `Date range must be at least 30 days for meaningful backtesting.`;
    }
    
    return null; // No error
  };

  const runBacktest = async () => {
    console.log('🚀 runBacktest function called')
    setLoading(true)
    setResult(null)

    try {
      // Validate date range
      const dateError = validateDateRange();
      if (dateError) {
        setResult({
          success: false,
          error: dateError
        });
        setLoading(false);
        return;
      }

      // Create parameters object from individual state values
      const parsedParameters = {
        initial_capital: initialCapital,
        position_size: positionSize,
        commission: commission
      }
      console.log('Parameters created successfully:', parsedParameters)

      console.log('Running backtest with parameters:', {
        strategy_name: strategy,
        symbols: symbols.split(',').map(s => s.trim()),
        start_date: startDate,
        end_date: endDate,
        parameters: parsedParameters
      })

      const response = await fetch('/api/qlib-backtesting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategy_name: strategy,
          symbols: symbols.split(',').map(s => s.trim()),
          start_date: startDate,
          end_date: endDate,
          parameters: parsedParameters
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Backtest response:', data)
      console.log('Response structure:', {
        success: data.success,
        dataExists: !!data.data,
        dataSuccess: data.data?.success,
        performance: data.data?.performance,
        totalTrades: data.data?.performance?.total_trades
      })
      
      // Handle the nested data structure from the API
      if (data.success && data.data) {
        console.log('Processing successful response')
        const processedResult = {
          success: true,
          results: {
            performance: {
              total_return: data.data.performance.total_return || 0,
              sharpe_ratio: data.data.performance.sharpe_ratio || 0,
              max_drawdown: data.data.performance.max_drawdown || 0,
              volatility: data.data.performance.volatility || 0,
              win_rate: data.data.performance.win_rate || 0,
              profit_factor: data.data.performance.profit_factor || 0
            },
            total_trades: data.data.performance.total_trades || 0,
            portfolio_value: data.data.performance.final_portfolio_value || data.data.performance.initial_capital || 100000,
            validation: data.data.validation || null
          }
        }
        console.log('Processed result:', processedResult)
        console.log('Performance values:', {
          total_return: processedResult.results.performance.total_return,
          sharpe_ratio: processedResult.results.performance.sharpe_ratio,
          max_drawdown: processedResult.results.performance.max_drawdown,
          win_rate: processedResult.results.performance.win_rate,
          profit_factor: processedResult.results.performance.profit_factor,
          total_trades: processedResult.results.total_trades,
          portfolio_value: processedResult.results.portfolio_value
        })
        try {
          setResult(processedResult)
          console.log('✅ setResult completed successfully')
        } catch (setError) {
          console.error('❌ Error in setResult:', setError)
          throw setError
        }
      } else {
        console.log('Response indicates failure, setting error result')
        console.log('Failed response data:', data)
        setResult({
          success: false,
          error: data.error || 'Backtest failed - no success flag in response'
        })
      }
    } catch (error) {
      console.error('Backtest error:', error)
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      })
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Configuration
            </CardTitle>
            <CardDescription>
              Configure your backtesting parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="momentum">Momentum Strategy</SelectItem>
                  <SelectItem value="mean_reversion">Mean Reversion Strategy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbols">Symbols (comma-separated)</Label>
              <Input
                id="symbols"
                value={symbols}
                onChange={(e) => setSymbols(e.target.value)}
                placeholder="AAPL,MSFT,GOOGL"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min="2020-08-01"
                  max={new Date().toISOString().split('T')[0]}
                />
                                 <p className="text-xs text-gray-500">
                   Available: 2020-08-01 to current date
                 </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min="2020-08-01"
                  max={new Date().toISOString().split('T')[0]}
                />
                                 <p className="text-xs text-gray-500">
                   Must be after start date, up to current date
                 </p>
              </div>
            </div>

                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="initialCapital">Initial Capital ($)</Label>
                 <Input
                   id="initialCapital"
                   type="number"
                   value={initialCapital}
                   onChange={(e) => setInitialCapital(Number(e.target.value))}
                   placeholder="100000"
                   min="1000"
                   step="1000"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="positionSize">Position Size (%)</Label>
                 <Input
                   id="positionSize"
                   type="number"
                   value={positionSize}
                   onChange={(e) => setPositionSize(Number(e.target.value))}
                   placeholder="0.1"
                   min="0.01"
                   max="1"
                   step="0.01"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="commission">Commission (%)</Label>
                 <Input
                   id="commission"
                   type="number"
                   value={commission}
                   onChange={(e) => setCommission(Number(e.target.value))}
                   placeholder="0.001"
                   min="0"
                   max="0.1"
                   step="0.001"
                 />
               </div>
             </div>

            <div className="flex space-x-2">
              <Button 
                onClick={runBacktest} 
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Backtest...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Run Backtest
                  </>
                )}
              </Button>
            </div>


          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Results
            </CardTitle>
            <CardDescription>
              Backtesting performance metrics and analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              result.success ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">Backtest Completed Successfully</span>
                  </div>
                  
                  {result.results?.validation?.accuracy_grade && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">
                        ✅ Validated & Accurate (Grade: {result.results.validation.accuracy_grade})
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatPercentage(result.results?.performance.total_return || 0)}
                      </div>
                      <div className="text-sm text-gray-600">Total Return</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatNumber(result.results?.performance.sharpe_ratio || 0)}
                      </div>
                      <div className="text-sm text-gray-600">Sharpe Ratio</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {formatPercentage(result.results?.performance.max_drawdown || 0)}
                      </div>
                      <div className="text-sm text-gray-600">Max Drawdown</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatNumber(result.results?.total_trades || 0)}
                      </div>
                      <div className="text-sm text-gray-600">Total Trades</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {formatPercentage(result.results?.performance.win_rate || 0)}
                      </div>
                      <div className="text-sm text-gray-600">Win Rate</div>
                    </div>
                    <div className="text-center p-3 bg-indigo-50 rounded-lg">
                      <div className="text-2xl font-bold text-indigo-600">
                        {formatNumber(result.results?.performance.profit_factor || 0)}
                      </div>
                      <div className="text-sm text-gray-600">Profit Factor</div>
                    </div>
                  </div>

                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xl font-bold text-gray-800">
                      {formatCurrency(result.results?.portfolio_value || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Final Portfolio Value</div>
                  </div>

                  {/* Validation Accuracy Section */}
                  {result.results?.validation && (
                    <div className="space-y-3">
                      <div className="text-center">
                        <h4 className="font-semibold text-gray-800 mb-2">Backtest Validation & Accuracy</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="text-center p-2 bg-green-50 rounded border">
                          <div className="text-lg font-bold text-green-600">
                            {formatPercentage(result.results.validation.accuracy_metrics?.data_accuracy || 0)}
                          </div>
                          <div className="text-xs text-gray-600">Data Accuracy</div>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded border">
                          <div className="text-lg font-bold text-blue-600">
                            {formatPercentage(result.results.validation.accuracy_metrics?.calculation_accuracy || 0)}
                          </div>
                          <div className="text-xs text-gray-600">Calculation Accuracy</div>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded border">
                          <div className="text-lg font-bold text-purple-600">
                            {formatPercentage(result.results.validation.accuracy_metrics?.strategy_accuracy || 0)}
                          </div>
                          <div className="text-xs text-gray-600">Strategy Accuracy</div>
                        </div>
                        <div className="text-center p-2 bg-orange-50 rounded border">
                          <div className="text-lg font-bold text-orange-600">
                            {formatPercentage(result.results.validation.accuracy_metrics?.overall_accuracy || 0)}
                          </div>
                          <div className="text-xs text-gray-600">Overall Accuracy</div>
                        </div>
                      </div>

                      <div className="text-center p-2 bg-indigo-50 rounded border">
                        <div className="text-lg font-bold text-indigo-600">
                          {result.results.validation.accuracy_grade || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-600">Accuracy Grade</div>
                      </div>

                      <div className="text-center p-2 bg-gray-50 rounded border">
                        <div className="text-sm font-semibold text-gray-700">
                          Confidence Level: {formatPercentage(result.results.validation.accuracy_metrics?.confidence_level || 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Validation Score: {formatNumber(result.results.validation.accuracy_metrics?.validation_score || 0)}
                        </div>
                      </div>
                    </div>
                  )}

                  <Badge variant="outline" className="w-full justify-center">
                    Strategy: {strategy}
                  </Badge>
                  

                </div>
              ) : (
                <div className="text-center p-6">
                  <div className="text-red-600 text-lg font-semibold mb-2 flex items-center justify-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Backtest Failed
                  </div>
                  <div className="text-gray-600 text-sm mb-4">
                    {result.error}
                  </div>
                  <div className="text-xs text-gray-500">
                    Please check your parameters and try again. Make sure the symbols are valid and the date range is reasonable.
                  </div>
                </div>
              )
            ) : (
              <div className="text-center p-6 text-gray-500">
                <div className="mb-2">📊 Ready to Run Backtest</div>
                <div className="text-xs">
                  Configure your parameters and click "Run Backtest" to see results
                </div>

              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
