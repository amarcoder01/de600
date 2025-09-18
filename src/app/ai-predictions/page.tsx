'use client'

import React from 'react'
import AIPredictionsComponent from '@/components/ai-predictions/AIPredictionsComponent'

export default function AIPredictionsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          AI Predictions
        </h1>
        <p className="text-muted-foreground">
          Machine learning models for market forecasting
        </p>
      </div>

      <AIPredictionsComponent />
    </div>
  )
}
