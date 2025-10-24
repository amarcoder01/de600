'use client'

import React from 'react'
import ProductionPortfolioManager from '@/components/portfolio/ProductionPortfolioManager'
import PortfolioErrorBoundary from '@/components/portfolio/PortfolioErrorBoundary'
import { BackButton } from '@/components/navigation/BackButton'

export default function PortfolioManagerPage() {
  return (
    <PortfolioErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-start gap-2 sm:gap-3 mb-8">
          <BackButton buttonClassName="h-8 w-8" />
          <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Portfolio Manager
          </h1>
          <p className="text-muted-foreground">
            Manage your investment portfolio and track performance
          </p>
          </div>
        </div>

        <ProductionPortfolioManager />
      </div>
    </PortfolioErrorBoundary>
  )
}
