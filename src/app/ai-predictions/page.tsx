'use client'

import React from 'react'
import AIPredictionsComponent from '@/components/ai-predictions/AIPredictionsComponent'
import { BackButton } from '@/components/navigation/BackButton'

export default function AIPredictionsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-start gap-2 sm:gap-3 mb-8">
        <BackButton buttonClassName="h-8 w-8" />
        <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          AI Predictions
        </h1>
        <p className="text-muted-foreground">
          Machine learning models for market forecasting
        </p>
        </div>
      </div>

      <AIPredictionsComponent />
    </div>
  )
}
