import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Users, 
  MapPin,
  Calendar,
  BarChart3,
  Target,
  Shield,
  Activity,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StockDetails {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  marketCap: number
  pe: number
  eps: number
  dividendYield: number
  dividendPayoutRatio: number
  beta: number
  high52Week: number
  low52Week: number
  volume: number
  avgVolume: number
  sector: string
  industry: string
  employees: number
  founded: number
  headquarters: string
  debtToEquity: number
  currentRatio: number
  institutionalOwnership: number
  analystRating: string
  revenueGrowth: number
  profitMargin: number
  roe: number
  movingAverage50: number
  movingAverage200: number
  rsi: number
  macd: {
    macd: number
    signal: number
    histogram: number
  }
  volumeTrend: number
  aiPrediction: {
    nextDayPrice: number
    nextWeekPrice: number
    probability: number
    confidence: number
    direction: 'bullish' | 'bearish' | 'neutral'
  }
}

interface FinancialMetricsDisplayProps {
  stock: StockDetails
  loading?: boolean
}

export function FinancialMetricsDisplay({ stock, loading = false }: FinancialMetricsDisplayProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
    return `$${value.toFixed(2)}`
  }

  const formatPercentage = (value: number) => `${value.toFixed(2)}%`
  const formatNumber = (value: number) => value.toLocaleString()

  const getRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'strong buy': return 'bg-green-100 text-green-800'
      case 'buy': return 'bg-blue-100 text-blue-800'
      case 'hold': return 'bg-yellow-100 text-yellow-800'
      case 'sell': return 'bg-orange-100 text-orange-800'
      case 'strong sell': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'bullish': return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'bearish': return <TrendingDown className="w-4 h-4 text-red-600" />
      default: return <Activity className="w-4 h-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Core Financials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Core Financials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Current Price</div>
              <div className="text-2xl font-bold">{formatCurrency(stock.price)}</div>
              <div className={cn(
                "text-sm font-medium",
                stock.changePercent >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {stock.changePercent >= 0 ? '+' : ''}{formatPercentage(stock.changePercent)}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Market Cap</div>
              <div className="text-xl font-semibold">{formatCurrency(stock.marketCap)}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">P/E Ratio</div>
              <div className="text-xl font-semibold">{stock.pe ? stock.pe.toFixed(2) : 'N/A'}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">EPS</div>
              <div className="text-xl font-semibold">{stock.eps ? formatCurrency(stock.eps) : 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 52-Week Range */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            52-Week Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">52-Week High</span>
              <span className="font-semibold text-green-600">{formatCurrency(stock.high52Week)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">52-Week Low</span>
              <span className="font-semibold text-red-600">{formatCurrency(stock.low52Week)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${((stock.price - stock.low52Week) / (stock.high52Week - stock.low52Week)) * 100}%`
                }}
              ></div>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Current: {formatCurrency(stock.price)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Beta</div>
              <div className="text-lg font-semibold">{stock.beta ? stock.beta.toFixed(2) : 'N/A'}</div>
              <div className="text-xs text-muted-foreground">
                {stock.beta ? (stock.beta < 1 ? 'Less volatile' : 'More volatile') : ''}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Revenue Growth</div>
              <div className={cn(
                "text-lg font-semibold",
                stock.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {stock.revenueGrowth ? formatPercentage(stock.revenueGrowth) : 'N/A'}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Profit Margin</div>
              <div className="text-lg font-semibold">{stock.profitMargin ? formatPercentage(stock.profitMargin) : 'N/A'}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">ROE</div>
              <div className="text-lg font-semibold">{stock.roe ? formatPercentage(stock.roe) : 'N/A'}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Dividend Yield</div>
              <div className="text-lg font-semibold">{stock.dividendYield ? formatPercentage(stock.dividendYield) : 'N/A'}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Volume</div>
              <div className="text-lg font-semibold">{formatNumber(stock.volume)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Fundamentals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Fundamentals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Sector:</span>
                <span className="font-medium">{stock.sector}</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Industry:</span>
                <span className="font-medium">{stock.industry}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Headquarters:</span>
                <span className="font-medium">{stock.headquarters}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Employees:</span>
                <span className="font-medium">{stock.employees ? formatNumber(stock.employees) : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Founded:</span>
                <span className="font-medium">{stock.founded || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Analyst Rating:</span>
                <Badge className={getRatingColor(stock.analystRating)}>
                  {stock.analystRating}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Technical Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">50-Day MA</div>
              <div className="text-lg font-semibold">{formatCurrency(stock.movingAverage50)}</div>
              <div className={cn(
                "text-xs",
                stock.price > stock.movingAverage50 ? "text-green-600" : "text-red-600"
              )}>
                {stock.price > stock.movingAverage50 ? 'Above' : 'Below'}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">200-Day MA</div>
              <div className="text-lg font-semibold">{formatCurrency(stock.movingAverage200)}</div>
              <div className={cn(
                "text-xs",
                stock.price > stock.movingAverage200 ? "text-green-600" : "text-red-600"
              )}>
                {stock.price > stock.movingAverage200 ? 'Above' : 'Below'}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">RSI</div>
              <div className="text-lg font-semibold">{stock.rsi ? stock.rsi.toFixed(2) : 'N/A'}</div>
              <div className={cn(
                "text-xs",
                stock.rsi < 30 ? "text-green-600" : stock.rsi > 70 ? "text-red-600" : "text-yellow-600"
              )}>
                {stock.rsi < 30 ? 'Oversold' : stock.rsi > 70 ? 'Overbought' : 'Neutral'}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Volume Trend</div>
              <div className={cn(
                "text-lg font-semibold",
                stock.volumeTrend >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {stock.volumeTrend ? formatPercentage(stock.volumeTrend) : 'N/A'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk & Stability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Risk & Stability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Debt-to-Equity</div>
              <div className="text-lg font-semibold">{stock.debtToEquity ? stock.debtToEquity.toFixed(2) : 'N/A'}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Current Ratio</div>
              <div className="text-lg font-semibold">{stock.currentRatio ? stock.currentRatio.toFixed(2) : 'N/A'}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Institutional Ownership</div>
              <div className="text-lg font-semibold">{stock.institutionalOwnership ? formatPercentage(stock.institutionalOwnership) : 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Prediction Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            AI Prediction Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Prediction Direction</span>
              <div className="flex items-center gap-2">
                {getDirectionIcon(stock.aiPrediction.direction)}
                <Badge variant="outline" className="capitalize">
                  {stock.aiPrediction.direction}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Next Day Price</div>
                <div className="text-lg font-semibold">{formatCurrency(stock.aiPrediction.nextDayPrice)}</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Next Week Price</div>
                <div className="text-lg font-semibold">{formatCurrency(stock.aiPrediction.nextWeekPrice)}</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Probability of Positive Movement</span>
                <span className="font-medium">{formatPercentage(stock.aiPrediction.probability)}</span>
              </div>
              <Progress value={stock.aiPrediction.probability} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">AI Confidence Score</span>
                <span className="font-medium">{formatPercentage(stock.aiPrediction.confidence)}</span>
              </div>
              <Progress value={stock.aiPrediction.confidence} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
