'use client'

import React, { useState } from 'react'
import { TradingViewChart } from '@/components/charts/TradingViewChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  Info, 
  ExternalLink
} from 'lucide-react'

interface ChartMessageProps {
  chartData: {
    type: string
    symbol: string
    timeframe: string
    chartType: string
    indicators: string[]
    currentPrice?: number
    dataPoints: number
    dataSource?: string
    chartUrl?: string
    analysis: string
  }
}

export function ChartMessage({ chartData }: ChartMessageProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(chartData.timeframe)

  const {
    symbol,
    currentPrice,
    chartType,
    indicators,
    dataPoints,
    dataSource,
    analysis
  } = chartData


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
                <div className="text-2xl font-bold">${Number.isFinite(currentPrice as number) ? (currentPrice as number).toFixed(2) : 'N/A'}</div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  onClick={openFullChart}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open
                </Button>
              </div>
            </div>
          </div>

          {/* Chart Metadata (data points removed per requirement) */}
          <div className="flex items-center justify-end text-sm text-gray-500">
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
            showHeaderPrice={false}
            showHeaderTitle={false}
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
