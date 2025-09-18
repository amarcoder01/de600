'use client'

import React from 'react'
import StockComparisonAnalyzer from '@/components/trading/StockComparisonAnalyzer'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function StockComparisonPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ErrorBoundary>
        <StockComparisonAnalyzer />
      </ErrorBoundary>
    </div>
  )
}
