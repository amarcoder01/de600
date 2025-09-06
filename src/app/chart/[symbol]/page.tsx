'use client'

import React, { Suspense } from 'react'
import { TradingViewChart } from '@/components/charts/TradingViewChart'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Home } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

interface ChartPageProps {
  params: {
    symbol: string
  }
}

function ChartPageContent({ symbol }: { symbol: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const timeframe = searchParams?.get('timeframe') || '1mo'
  const chartType = searchParams?.get('chartType') || 'candlestick'
  const indicators = searchParams?.get('indicators')?.split(',') || ['sma20', 'volume']

  const handleTimeframeChange = (newTimeframe: string) => {
    const newUrl = `/chart/${symbol}?timeframe=${newTimeframe}&chartType=${chartType}&indicators=${indicators.join(',')}`
    router.push(newUrl)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Chat</span>
            </Button>
            
            <div className="text-lg font-semibold">
              {symbol.toUpperCase()} Chart
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/treadgpt')}
            className="flex items-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span>TradeGPT</span>
          </Button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="p-4 max-w-7xl mx-auto">
        <TradingViewChart
          symbol={symbol}
          timeframe={timeframe}
          chartType={chartType as 'candlestick' | 'line' | 'area'}
          indicators={indicators}
          height={700}
          onTimeframeChange={handleTimeframeChange}
        />
      </div>
    </div>
  )
}

export default function ChartPage({ params }: ChartPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading chart...</p>
        </div>
      </div>
    }>
      <ChartPageContent symbol={params.symbol} />
    </Suspense>
  )
}
