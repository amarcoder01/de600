'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, BarChart3, TestTube } from 'lucide-react';

interface BacktestResult {
  success: boolean;
  results?: {
    performance: {
      total_return: number;
      sharpe_ratio: number;
      max_drawdown: number;
      volatility: number;
    };
    total_trades: number;
    portfolio_value: number;
  };
  error?: string;
}

export default function PolygonBacktestingPage() {
  const [strategy, setStrategy] = useState('momentum');
  const [symbols, setSymbols] = useState('AAPL,MSFT,GOOGL');
  const [startDate, setStartDate] = useState('2021-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [parameters, setParameters] = useState('{"initial_capital": 100000, "position_size": 0.1, "commission": 0.001}');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [testOutput, setTestOutput] = useState<string>('');

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
    console.log('🚀 runBacktest function called');
    setLoading(true);
    setResult(null);

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

      // Validate and parse parameters
      let parsedParameters;
      try {
        parsedParameters = JSON.parse(parameters);
        console.log('Parameters parsed successfully:', parsedParameters);
      } catch (parseError) {
        console.error('Parameter parsing error:', parseError);
        setResult({
          success: false,
          error: 'Invalid parameters JSON format: ' + (parseError instanceof Error ? parseError.message : 'Unknown parsing error')
        });
        setLoading(false);
        return;
      }

      console.log('Running backtest with parameters:', {
        strategy_name: strategy,
        symbols: symbols.split(',').map(s => s.trim()),
        start_date: startDate,
        end_date: endDate,
        parameters: parsedParameters
      });

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
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Backtest response:', data);
      console.log('Response structure:', {
        success: data.success,
        hasData: !!data.data,
        dataSuccess: data.data?.success,
        performance: data.data?.performance,
        totalTrades: data.data?.performance?.total_trades
      });
      
      // Handle the nested data structure from the API
      if (data.success && data.data) {
        console.log('Processing successful response');
        const processedResult = {
          success: true,
          results: {
            performance: {
              total_return: data.data.performance.total_return || 0,
              sharpe_ratio: data.data.performance.sharpe_ratio || 0,
              max_drawdown: data.data.performance.max_drawdown || 0,
              volatility: data.data.performance.volatility || 0
            },
            total_trades: data.data.performance.total_trades || 0,
            portfolio_value: data.data.performance.final_portfolio_value || data.data.performance.initial_capital || 100000
          }
        };
        console.log('Processed result:', processedResult);
        try {
          setResult(processedResult);
          console.log('✅ setResult completed successfully');
        } catch (setError) {
          console.error('❌ Error in setResult:', setError);
          throw setError;
        }
      } else {
        console.log('Response indicates failure, setting error result');
        console.log('Failed response data:', data);
        setResult({
          success: false,
          error: data.error || 'Backtest failed - no success flag in response'
        });
      }
    } catch (error) {
      console.error('Backtest error:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  const runTest = async () => {
    setLoading(true);
    setTestOutput('');

    try {
      const response = await fetch('/api/qlib-backtesting?action=test');
      const data = await response.json();
      
      if (data.success) {
        setTestOutput(data.output);
      } else {
        setTestOutput('Test failed: ' + data.error);
      }
    } catch (error) {
      setTestOutput('Test error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <BarChart3 className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Polygon.io Backtesting</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TestTube className="h-5 w-5" />
              <span>Backtest Configuration</span>
            </CardTitle>
            <CardDescription>
              Configure your backtesting parameters using Polygon.io 5+ years of historical data
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
                  Available: 2020-08-01 to current date (4+ years)
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

            <div className="space-y-2">
              <Label htmlFor="parameters">Parameters (JSON)</Label>
              <Textarea
                id="parameters"
                value={parameters}
                onChange={(e) => setParameters(e.target.value)}
                placeholder='{"initial_capital": 100000, "position_size": 0.1}'
                rows={4}
              />
            </div>

            {/* Debug Information */}
            <div className="p-3 bg-blue-50 rounded text-sm border border-blue-200">
              <div className="font-semibold text-blue-800 mb-2">🔍 Debug Information</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Strategy: <span className="font-mono">{strategy}</span></div>
                <div>Symbols: <span className="font-mono">{symbols}</span></div>
                <div>Start Date: <span className="font-mono">{startDate}</span></div>
                <div>End Date: <span className="font-mono">{endDate}</span></div>
                <div>Loading: <span className="font-mono">{loading.toString()}</span></div>
                <div>Result Status: <span className="font-mono">{result ? (result.success ? 'Success' : 'Failed') : 'None'}</span></div>
              </div>
              {result && !result.success && (
                <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                  <div className="text-red-800 font-semibold">Error Details:</div>
                  <div className="text-red-700 text-xs font-mono">{result.error}</div>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <Button 
                onClick={runBacktest} 
                disabled={loading}
                className="flex-1"
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
              <Button 
                onClick={runTest} 
                disabled={loading}
                variant="outline"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Backtest Results</CardTitle>
            <CardDescription>
              Performance metrics and analysis results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              result.success ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatPercentage(result.results?.performance.total_return || 0)}
                      </div>
                      <div className="text-sm text-gray-600">Total Return</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {(result.results?.performance.sharpe_ratio || 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">Sharpe Ratio</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xl font-bold text-gray-800">
                      ${formatNumber(result.results?.portfolio_value || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Final Portfolio Value</div>
                  </div>

                  <Badge variant="outline" className="w-full justify-center">
                    Strategy: {strategy}
                  </Badge>
                  
                         <div className="text-xs text-gray-500 text-center">
         Data source: Polygon.io (5+ years of historical data)
       </div>
                </div>
              ) : (
                <div className="text-center p-6">
                  <div className="text-red-600 text-lg font-semibold mb-2">
                    ❌ Backtest Failed
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
           <div className="text-xs mt-2 text-blue-600">
             Powered by Polygon.io - 5+ years of historical data available
           </div>
                  </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Output */}
      {testOutput && (
        <Card>
          <CardHeader>
            <CardTitle>Test Output</CardTitle>
            <CardDescription>
              Polygon.io data fetching and backtesting system test results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
              {testOutput}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Information Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Polygon.io Data Information</CardTitle>
          <CardDescription>
            Information about the Polygon.io historical data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-600">All US Stocks</div>
              <div className="text-sm text-gray-600">+ ETFs & More</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold text-green-600">2020-Present</div>
              <div className="text-sm text-gray-600">Historical Data</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-semibold text-purple-600">Adjusted OHLCV</div>
              <div className="text-sm text-gray-600">Data Format</div>
            </div>
          </div>
                      <div className="mt-4 text-sm text-gray-600">
              <p><strong>Data Source:</strong> Polygon.io with split and dividend adjusted daily OHLCV data</p>
              <p><strong>Date Range:</strong> 2020-08-01 to current date (4+ years of data)</p>
              <p><strong>Available Strategies:</strong> Momentum, Mean Reversion strategies</p>
              <p><strong>Features:</strong> Professional-grade backtesting with real-time data and comprehensive analytics</p>
              <p><strong>Rate Limits:</strong> 5 requests per minute (Starter Plan)</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
