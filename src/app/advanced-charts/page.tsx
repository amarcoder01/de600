'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import html2canvas from 'html2canvas'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { 
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  Square,
  Circle,
  Target,
  Ruler,
  Settings,
  Download,
  Share2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Brain,
  Calculator,
  Activity,
  Crown,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react'
import { AdvancedChartingComponent } from '@/components/charts/AdvancedChartingComponent'
import { PatternRecognitionComponent } from '@/components/charts/PatternRecognitionComponent'
import { DrawingToolsComponent } from '@/components/charts/DrawingToolsComponent'
import { AIChartAnalysis } from '@/components/charts/AIChartAnalysis'

import { ErrorBoundary } from '@/components/charts/ErrorBoundary'

interface ChartSettings {
  symbol: string
  timeframe: string
  chartType: 'candlestick' | 'line' | 'area' | 'bar' | 'renko' | 'heikin-ashi'
  theme: 'dark' | 'light' | 'professional'
  showVolume: boolean
  showGrid: boolean
  showLegend: boolean
  indicators: string[]
  drawingTools: string[]
}

interface TechnicalIndicator {
  id: string
  name: string
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'custom'
  description: string
  parameters: Record<string, any>
  enabled: boolean
}

interface DrawingTool {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  enabled: boolean
}

export default function AdvancedChartsPage() {
  const [chartSettings, setChartSettings] = useState<ChartSettings>({
    symbol: 'AAPL',
    timeframe: '1d',
    chartType: 'candlestick',
    theme: 'dark',
    showVolume: true,
    showGrid: true,
    showLegend: true,
    indicators: [],
    drawingTools: []
  })

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('chart')
  const [chartData, setChartData] = useState<any[]>([])
  const [chartKey, setChartKey] = useState(0) // For forcing chart refresh
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [priceChange, setPriceChange] = useState<number>(0)

  // Technical Indicators
  const [indicators, setIndicators] = useState<TechnicalIndicator[]>([
    {
      id: 'sma',
      name: 'Simple Moving Average',
      category: 'trend',
      description: 'Average price over a specified period',
      parameters: { period: 20, color: '#3b82f6' },
      enabled: false
    },
    {
      id: 'ema',
      name: 'Exponential Moving Average',
      category: 'trend',
      description: 'Weighted average giving more importance to recent prices',
      parameters: { period: 12, color: '#ef4444' },
      enabled: false
    },
    {
      id: 'rsi',
      name: 'Relative Strength Index',
      category: 'momentum',
      description: 'Measures speed and magnitude of price changes',
      parameters: { period: 14, overbought: 70, oversold: 30, color: '#8b5cf6' },
      enabled: false
    },
    {
      id: 'macd',
      name: 'MACD',
      category: 'trend',
      description: 'Moving Average Convergence Divergence',
      parameters: { fast: 12, slow: 26, signal: 9, color: '#06b6d4' },
      enabled: false
    },
    {
      id: 'bollinger',
      name: 'Bollinger Bands',
      category: 'volatility',
      description: 'Volatility bands placed above and below moving average',
      parameters: { period: 20, stdDev: 2, color: '#f59e0b' },
      enabled: false
    },
    {
      id: 'stochastic',
      name: 'Stochastic Oscillator',
      category: 'momentum',
      description: 'Momentum indicator comparing closing price to price range',
      parameters: { kPeriod: 14, dPeriod: 3, color: '#6366f1' },
      enabled: false
    },
    {
      id: 'williams_r',
      name: 'Williams %R',
      category: 'momentum',
      description: 'Momentum oscillator measuring overbought/oversold levels',
      parameters: { period: 14, color: '#10b981' },
      enabled: false
    },
    {
      id: 'atr',
      name: 'Average True Range',
      category: 'volatility',
      description: 'Measures market volatility',
      parameters: { period: 14, color: '#ec4899' },
      enabled: false
    },
    {
      id: 'ichimoku',
      name: 'Ichimoku Cloud',
      category: 'trend',
      description: 'Complete trend-following system with support/resistance',
      parameters: { color: '#3b82f6' },
      enabled: false
    },
    {
      id: 'parabolic_sar',
      name: 'Parabolic SAR',
      category: 'trend',
      description: 'Trend reversal indicator with trailing stop',
      parameters: { color: '#8b5cf6' },
      enabled: false
    },
    {
      id: 'cci',
      name: 'Commodity Channel Index',
      category: 'momentum',
      description: 'Measures price deviation from average',
      parameters: { period: 20, color: '#06b6d4' },
      enabled: false
    },
    {
      id: 'mfi',
      name: 'Money Flow Index',
      category: 'volume',
      description: 'Volume-weighted RSI measuring buying/selling pressure',
      parameters: { period: 14, color: '#f97316' },
      enabled: false
    },
    {
      id: 'volume',
      name: 'Volume',
      category: 'volume',
      description: 'Trading volume analysis',
      parameters: { color: '#10b981' },
      enabled: true
    }
  ])

  // Drawing Tools
  const [drawingTools, setDrawingTools] = useState<DrawingTool[]>([
    {
      id: 'trendline',
      name: 'Trend Line',
      icon: TrendingUp,
      description: 'Draw trend lines for support and resistance',
      enabled: false
    },
    {
      id: 'fibonacci',
      name: 'Fibonacci Retracement',
      icon: Target,
      description: 'Fibonacci retracement levels',
      enabled: false
    },
    {
      id: 'rectangle',
      name: 'Rectangle',
      icon: Square,
      description: 'Draw rectangles for pattern analysis',
      enabled: false
    },
    {
      id: 'ellipse',
      name: 'Ellipse',
      icon: Circle,
      description: 'Draw ellipses for pattern identification',
      enabled: false
    },
    {
      id: 'text',
      name: 'Text Annotation',
      icon: Target,
      description: 'Add text annotations to charts',
      enabled: false
    }
  ])

  const timeframes = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '30m', label: '30 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '1d', label: '1 Day' },
    { value: '1w', label: '1 Week' },
    { value: '1mo', label: '1 Month' },
    { value: '3mo', label: '3 Months' },
    { value: '6mo', label: '6 Months' },
    { value: '1y', label: '1 Year' },
    { value: '5y', label: '5 Years' },
    { value: 'max', label: 'Max' }
  ]

  const chartTypes = [
    { value: 'candlestick', label: 'Candlestick', icon: BarChart3 },
    { value: 'line', label: 'Line', icon: LineChart },
    { value: 'area', label: 'Area', icon: TrendingUp },
    { value: 'bar', label: 'Bar', icon: BarChart3 },
    { value: 'renko', label: 'Renko', icon: Square },
    { value: 'heikin-ashi', label: 'Heikin-Ashi', icon: TrendingUp }
  ]

  const themes = [
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'professional', label: 'Professional', icon: Crown }
  ]

  const handleSymbolChange = (symbol: string) => {
    setChartSettings(prev => ({ ...prev, symbol: symbol.toUpperCase() }))
  }

  const handleTimeframeChange = (timeframe: string) => {
    setChartSettings(prev => ({ ...prev, timeframe }))
  }

  const handleChartTypeChange = (chartType: ChartSettings['chartType']) => {
    setChartSettings(prev => ({ ...prev, chartType }))
  }

  const handleThemeChange = (theme: ChartSettings['theme']) => {
    setChartSettings(prev => ({ ...prev, theme }))
  }

  const toggleIndicator = (indicatorId: string) => {
    setIndicators(prev => prev.map(ind => 
      ind.id === indicatorId ? { ...ind, enabled: !ind.enabled } : ind
    ))
  }

  const toggleDrawingTool = (toolId: string) => {
    setDrawingTools(prev => prev.map(tool => 
      tool.id === toolId ? { ...tool, enabled: !tool.enabled } : tool
    ))
  }

  const getEnabledIndicators = () => {
    return indicators.filter(ind => ind.enabled).map(ind => ind.id)
  }

  const getEnabledDrawingTools = () => {
    return drawingTools.filter(tool => tool.enabled).map(tool => tool.id)
  }

  // Handle chart actions
  const handleExportChart = () => {
    // Create a canvas element to capture the chart
    const chartContainer = document.querySelector('[data-chart-container]') as HTMLElement
    if (chartContainer) {
      html2canvas(chartContainer).then(canvas => {
        const link = document.createElement('a')
        link.download = `${chartSettings.symbol}-${chartSettings.timeframe}-chart.png`
        link.href = canvas.toDataURL()
        link.click()
      })
    }
  }

  const handleShareChart = () => {
    const shareData = {
      title: `${chartSettings.symbol} Chart`,
      text: `Check out this ${chartSettings.symbol} chart on ${chartSettings.timeframe} timeframe`,
      url: window.location.href
    }
    
    if (navigator.share) {
      navigator.share(shareData)
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Chart URL copied to clipboard!')
      })
    }
  }

  // Fetch chart data and update price information
  const fetchChartData = async () => {
    try {
      console.log('📊 Advanced Charts: Fetching chart data...', { 
        symbol: chartSettings.symbol, 
        timeframe: chartSettings.timeframe 
      })
      
      const response = await fetch(`/api/chart/${chartSettings.symbol}?range=${chartSettings.timeframe}&interval=1m`)
      
      console.log('📊 Advanced Charts: API response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('📊 Advanced Charts: API response data:', { 
          success: result.success, 
          dataLength: result.data?.length,
          source: result.source 
        })
        
        if (result.success && result.data) {
          setChartData(result.data)
          
          // Update price information
          if (result.data.length > 0) {
            const latest = result.data[result.data.length - 1]
            const previous = result.data[result.data.length - 2]
            
            setCurrentPrice(latest.close)
            if (previous) {
              setPriceChange(((latest.close - previous.close) / previous.close) * 100)
            }
            
            console.log('📊 Advanced Charts: Updated price info:', { 
              currentPrice: latest.close, 
              priceChange: previous ? ((latest.close - previous.close) / previous.close) * 100 : 0 
            })
          }
        } else {
          console.warn('📊 Advanced Charts: No data in response')
        }
      } else {
        console.error('📊 Advanced Charts: API request failed:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('📊 Advanced Charts: Error fetching chart data:', error)
    }
  }

  // Fetch data when settings change
  useEffect(() => {
    fetchChartData()
  }, [chartSettings.symbol, chartSettings.timeframe])

  // Monitor chart data changes
  useEffect(() => {
    console.log('📊 Advanced Charts: Chart data updated:', { 
      dataLength: chartData.length,
      symbol: chartSettings.symbol,
      timeframe: chartSettings.timeframe 
    })
  }, [chartData, chartSettings.symbol, chartSettings.timeframe])

  const handleRefreshChart = () => {
    setChartKey(prev => prev + 1)
    setIsLoading(true)
    fetchChartData().finally(() => {
      setTimeout(() => setIsLoading(false), 1000)
    })
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              Advanced Charting Platform
            </h1>
            <p className="text-muted-foreground mt-2">
              Professional charting with 50+ technical indicators and advanced drawing tools
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Crown className="h-3 w-3" />
              PRO
            </Badge>
            <Button
              onClick={() => setIsFullscreen(!isFullscreen)}
              variant="outline"
              size="sm"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Chart Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Chart Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Symbol Input */}
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="e.g., AAPL, TSLA, SPY"
                  value={chartSettings.symbol}
                  onChange={(e) => handleSymbolChange(e.target.value)}
                  className="font-mono"
                />
              </div>

              {/* Timeframe Selector */}
              <div className="space-y-2">
                <Label>Timeframe</Label>
                <Select value={chartSettings.timeframe} onValueChange={handleTimeframeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeframes.map((tf) => (
                      <SelectItem key={tf.value} value={tf.value}>
                        {tf.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chart Type */}
              <div className="space-y-2">
                <Label>Chart Type</Label>
                <Select value={chartSettings.chartType} onValueChange={handleChartTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chartTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={chartSettings.theme} onValueChange={handleThemeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {themes.map((theme) => (
                      <SelectItem key={theme.value} value={theme.value}>
                        <div className="flex items-center gap-2">
                          <theme.icon className="h-4 w-4" />
                          {theme.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Chart Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-volume"
                  checked={chartSettings.showVolume}
                  onCheckedChange={(checked) => setChartSettings(prev => ({ ...prev, showVolume: checked }))}
                />
                <Label htmlFor="show-volume">Show Volume</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-grid"
                  checked={chartSettings.showGrid}
                  onCheckedChange={(checked) => setChartSettings(prev => ({ ...prev, showGrid: checked }))}
                />
                <Label htmlFor="show-grid">Show Grid</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-legend"
                  checked={chartSettings.showLegend}
                  onCheckedChange={(checked) => setChartSettings(prev => ({ ...prev, showLegend: checked }))}
                />
                <Label htmlFor="show-legend">Show Legend</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Chart Area */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                   <TabsList className="grid w-full grid-cols-5">
           <TabsTrigger value="chart" className="flex items-center gap-2">
             <BarChart3 className="h-4 w-4" />
             Chart
           </TabsTrigger>
           <TabsTrigger value="indicators" className="flex items-center gap-2">
             <Calculator className="h-4 w-4" />
             Indicators
           </TabsTrigger>
           <TabsTrigger value="drawing" className="flex items-center gap-2">
             <Ruler className="h-4 w-4" />
             Drawing Tools
           </TabsTrigger>
           <TabsTrigger value="analysis" className="flex items-center gap-2">
             <Brain className="h-4 w-4" />
             Analysis
           </TabsTrigger>
           <TabsTrigger value="ai" className="flex items-center gap-2">
             <Sparkles className="h-4 w-4" />
             AI Analysis
           </TabsTrigger>
           
         </TabsList>

          <TabsContent value="chart" className="space-y-4">
            <Card className={isFullscreen ? 'fixed inset-4 z-50' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {chartSettings.symbol} - {chartSettings.timeframe.toUpperCase()}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportChart}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleShareChart}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleRefreshChart}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] w-full relative" data-chart-container>
                  <ErrorBoundary>
                    <AdvancedChartingComponent
                      key={`chart-${chartSettings.symbol}-${chartSettings.timeframe}-${chartSettings.chartType}-${chartSettings.theme}-${chartKey}`}
                      symbol={chartSettings.symbol}
                      timeframe={chartSettings.timeframe}
                      chartType={chartSettings.chartType}
                      theme={chartSettings.theme}
                      showVolume={chartSettings.showVolume}
                      showGrid={chartSettings.showGrid}
                      showLegend={chartSettings.showLegend}
                      indicators={getEnabledIndicators()}
                      drawingTools={getEnabledDrawingTools()}
                    />
                  </ErrorBoundary>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="indicators" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Technical Indicators
                </CardTitle>
                <CardDescription>
                  Add technical indicators to enhance your analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {indicators.map((indicator) => (
                    <Card key={indicator.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{indicator.name}</h4>
                          <Switch
                            checked={indicator.enabled}
                            onCheckedChange={() => toggleIndicator(indicator.id)}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {indicator.description}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {indicator.category}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

                     <TabsContent value="drawing" className="space-y-4">
             <DrawingToolsComponent />
           </TabsContent>

                                <TabsContent value="analysis" className="space-y-4">
             <PatternRecognitionComponent 
               data={chartData}
               symbol={chartSettings.symbol}
               timeframe={chartSettings.timeframe}
             />
           </TabsContent>

           <TabsContent value="ai" className="space-y-4">
             <AIChartAnalysis
               symbol={chartSettings.symbol}
               timeframe={chartSettings.timeframe}
               chartData={chartData}
               currentPrice={currentPrice || 0}
               priceChange={priceChange || 0}
             />
           </TabsContent>

           
         </Tabs>
      </div>
    </div>
  )
}
