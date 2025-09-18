'use client'

import React, { useState } from 'react'
import { TradingViewChart } from '@/components/charts/TradingViewChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  ExternalLink,
  Download
} from 'lucide-react'

interface ChartMessageProps {
  chartData: {
    type: string
    symbol: string
    timeframe: string
    chartType: string
    indicators: string[]
    currentPrice: number
    priceChange: number
    priceChangePercent: number
    dataPoints: number
    source: string
    chartUrl?: string
    analysis: string
  }
}

export function ChartMessage({ chartData }: ChartMessageProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(chartData.timeframe)

  const {
    symbol,
    currentPrice,
    priceChange,
    priceChangePercent,
    chartType,
    indicators,
    dataPoints,
    source,
    analysis
  } = chartData

  const isPriceUp = priceChange >= 0

  const handleTimeframeChange = (newTimeframe: string) => {
    setSelectedTimeframe(newTimeframe)
  }

  const openFullChart = () => {
    // Open chart in same tab with return URL
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
    const url = `/chart/${symbol}?timeframe=${selectedTimeframe}&chartType=${chartType}&indicators=${indicators.join(',')}&returnUrl=${returnUrl}`
    window.location.href = url
  }

  return (
    <div className="w-full max-w-4xl">
      {/* Chart Header */}
      <Card className="mb-4">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <span>{symbol} Chart</span>
              <Badge variant="outline" className="text-xs">
                {chartType}
              </Badge>
            </CardTitle>
            
            <div className="flex items-center space-x-4">
              {/* Price Info */}
              <div className="text-right">
                <div className="text-2xl font-bold">${currentPrice.toFixed(2)}</div>
                <div className={`flex items-center space-x-1 text-sm ${isPriceUp ? 'text-green-500' : 'text-red-500'}`}>
                  {isPriceUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{isPriceUp ? '+' : ''}${priceChange.toFixed(2)}</span>
                  <span>({isPriceUp ? '+' : ''}{priceChangePercent.toFixed(2)}%)</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={openFullChart}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open
                </Button>
              </div>
            </div>
          </div>

          {/* Chart Metadata */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <Info className="w-4 h-4" />
                <span>{dataPoints} data points</span>
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {indicators.map((indicator) => (
                <Badge key={indicator} variant="secondary" className="text-xs">
                  {indicator.toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Interactive Chart */}
          <TradingViewChart
            symbol={symbol}
            timeframe={selectedTimeframe}
            chartType={chartType as 'candlestick' | 'line' | 'area'}
            indicators={indicators}
            height={450}
            onTimeframeChange={handleTimeframeChange}
          />
        </CardContent>
      </Card>

      {/* Analysis Section */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span>Technical Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap">{analysis}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
