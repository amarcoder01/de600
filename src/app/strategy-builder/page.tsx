'use client'

import React from 'react'
import UnifiedStrategyBuilder from '@/components/trading/UnifiedStrategyBuilder'

export default function StrategyBuilderPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Unified AI Strategy Builder
        </h1>
        <p className="text-muted-foreground">
          Create, test, and optimize advanced trading strategies using AI and machine learning for maximum accuracy
        </p>
      </div>

      <UnifiedStrategyBuilder />
    </div>
  )
}
