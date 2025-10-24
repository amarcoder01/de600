'use client'

import React from 'react'
import PolygonBacktestComponent from '@/components/qlib/PolygonBacktestComponent'
import { BackButton } from '@/components/navigation/BackButton'

export default function BacktestingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-start gap-2 sm:gap-3 mb-8">
        <BackButton buttonClassName="h-8 w-8" />
        <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Backtesting
        </h1>
        <p className="text-muted-foreground">
          Test your trading strategies with historical data
        </p>
        </div>
      </div>

      <PolygonBacktestComponent />
    </div>
  )
}
