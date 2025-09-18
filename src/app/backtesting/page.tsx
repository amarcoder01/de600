'use client'

import React from 'react'
import PolygonBacktestComponent from '@/components/qlib/PolygonBacktestComponent'

export default function BacktestingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Backtesting
        </h1>
        <p className="text-muted-foreground">
          Test your trading strategies with historical data
        </p>
      </div>

      <PolygonBacktestComponent />
    </div>
  )
}
