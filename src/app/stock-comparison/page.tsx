'use client'

import React from 'react'
import StockComparisonAnalyzer from '@/components/trading/StockComparisonAnalyzer'
import ErrorBoundary from '@/components/ErrorBoundary'
import { BackButton } from '@/components/navigation/BackButton'

export default function StockComparisonPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-start gap-2 sm:gap-3 mb-4">
        <BackButton buttonClassName="h-8 w-8" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Stock Comparison</h1>
          <p className="text-muted-foreground">Compare multiple stocks side-by-side</p>
        </div>
      </div>
      <ErrorBoundary>
        <StockComparisonAnalyzer />
      </ErrorBoundary>
    </div>
  )
}
