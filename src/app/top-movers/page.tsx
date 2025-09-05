'use client'

import React from 'react'
import { useTopMovers } from '@/hooks/useTopMovers'
import { StockList } from '@/components/top-movers/StockList'
import { MarketStatus } from '@/components/top-movers/MarketStatus'
import { ErrorMessage } from '@/components/top-movers/ErrorMessage'
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'

export default function TopMoversPage() {
  const {
    gainers,
    losers,
    loading,
    error,
    marketStatus,
    loadMoreGainers,
    loadMoreLosers,
    hasMoreGainers,
    hasMoreLosers,
    lastUpdated,
    nextRefresh,
    refreshData,
  } = useTopMovers()

  // Check if we have any data at all
  const hasAnyData = gainers.length > 0 || losers.length > 0
  const isMarketClosed = marketStatus && marketStatus.market === 'closed'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Top Movers
              </h1>
              <p className="text-gray-600 mt-1">
                Real-time Top Gainers &amp; Losers
              </p>
              {/* Last updated hidden for cleaner production UI */}
              {isMarketClosed && (
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  ⚠️ Market is currently closed - showing last available data
                </p>
              )}
            </div>
            <button
              onClick={refreshData}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Market Status */}
        <MarketStatus marketStatus={marketStatus} loading={loading} />

        {/* Global Error */}
        {error && (
          <ErrorMessage 
            message={error} 
            onRetry={refreshData}
            className="mb-8"
          />
        )}

        {/* No Data Available Message */}
        {!loading && !error && !hasAnyData && (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200 mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-blue-100 p-4 rounded-full">
                <TrendingUp className="w-12 h-12 text-blue-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              No Market Data Available
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              We're currently unable to fetch top movers data. This could be due to:
            </p>
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-6">
              <div className="text-left">
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Market is closed (weekends, holidays, after hours)
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Temporary API service interruption
                  </li>
                </ul>
              </div>
              <div className="text-left">
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Data processing delays
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    API rate limit reached
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex items-center justify-center text-sm text-gray-500 mb-6">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span>Data updates every 15 minutes during market hours</span>
            </div>
            <button
              onClick={refreshData}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Refreshing...' : 'Try Again'}
            </button>
          </div>
        )}

        {/* Stock Lists */}
        {hasAnyData && (
          <div className="space-y-12">
            <StockList
              title="📈 Top Gainers"
              stocks={gainers}
              loading={loading}
              error={null}
              onLoadMore={loadMoreGainers}
              hasMore={hasMoreGainers}
              type="gainers"
            />
            
            <StockList
              title="📉 Top Losers"
              stocks={losers}
              loading={loading}
              error={null}
              onLoadMore={loadMoreLosers}
              hasMore={hasMoreLosers}
              type="losers"
            />
          </div>
        )}

        {/* Next Refresh Info */}
        {/* Next automatic refresh hidden for cleaner production UI */}
      </main>
    </div>
  )
}
