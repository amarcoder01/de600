'use client'

import React from 'react'
import ProductionPortfolioManager from '@/components/portfolio/ProductionPortfolioManager'
import PortfolioErrorBoundary from '@/components/portfolio/PortfolioErrorBoundary'

export default function PortfolioManagerPage() {
  return (
    <PortfolioErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Portfolio Manager
          </h1>
          <p className="text-muted-foreground">
            Manage your investment portfolio and track performance
          </p>
        </div>

        <ProductionPortfolioManager />
      </div>
    </PortfolioErrorBoundary>
  )
}
