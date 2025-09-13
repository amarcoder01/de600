import React, { useEffect } from 'react'
import { Stock, StockDetails } from '@/types/market-view'
import { X, Loader2, Building2, DollarSign } from 'lucide-react'

interface StockModalProps {
  stock: Stock
  stockDetails: StockDetails | null
  loading: boolean
  onClose: () => void
}

export const StockModal: React.FC<StockModalProps> = ({ stock, stockDetails, loading, onClose }) => {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price)
  }

  const asOfDisplay = stockDetails?.asOf
    ? new Date(stockDetails.asOf).toLocaleString('en-US', { timeZone: 'America/New_York' })
    : undefined

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {stock.ticker}
                </h3>
                <p className="text-sm text-gray-500">
                  {stock.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">Loading stock details...</span>
              </div>
            ) : stockDetails ? (
              <div className="space-y-6">
                {/* Price Information */}
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <DollarSign className="h-6 w-6 text-gray-500" />
                    <span className="text-3xl font-bold text-gray-900">
                      {formatPrice(stockDetails.price)}
                    </span>
                  </div>
                  

                  {/* Session and extended hours info */}
                  <div className="mt-2 text-xs text-gray-500 space-y-1">
                    <div className="flex items-center justify-center space-x-2">
                      {stockDetails.session && stockDetails.session !== 'closed' && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium uppercase ${
                          stockDetails.session === 'regular' 
                            ? 'bg-green-100 text-green-800'
                            : stockDetails.session === 'pre' || stockDetails.session === 'post'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {stockDetails.session}
                          {stockDetails.isExtendedHours ? ' • EXT' : ''}
                        </span>
                      )}
                      {stockDetails.marketState && stockDetails.marketState !== 'closed' && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          stockDetails.marketState === 'open'
                            ? 'bg-green-100 text-green-800'
                            : stockDetails.marketState === 'extended'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {stockDetails.marketState}
                        </span>
                      )}
                      {stockDetails.isMarketClosed && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 uppercase">
                          closed
                        </span>
                      )}
                    </div>
                    {asOfDisplay && (
                      <div className="text-center">
                        <span className="text-gray-500">As of: {asOfDisplay} ET</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stock Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Exchange</p>
                    <p className="text-lg font-semibold text-gray-900 uppercase">
                      {stock.primary_exchange}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Market</p>
                    <p className="text-lg font-semibold text-gray-900 uppercase">
                      {stock.market}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Currency</p>
                    <p className="text-lg font-semibold text-gray-900 uppercase">
                      {stock.currency_name}
                    </p>
                  </div>
                </div>

                {/* Key Stats (optional, Starter plan-friendly) */}
                {(stockDetails.todayOpen || stockDetails.todayHigh || stockDetails.todayLow || stockDetails.todayVolume || stockDetails.vwap || stockDetails.high52w || stockDetails.low52w || stockDetails.prevOpen || stockDetails.prevHigh || stockDetails.prevLow || stockDetails.prevVolume) && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Stats</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {(stockDetails.todayOpen !== undefined || stockDetails.todayHigh !== undefined || stockDetails.todayLow !== undefined) && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-500 mb-1">Today O / H / L</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {stockDetails.todayOpen !== undefined ? formatPrice(stockDetails.todayOpen) : '—'} / {stockDetails.todayHigh !== undefined ? formatPrice(stockDetails.todayHigh) : '—'} / {stockDetails.todayLow !== undefined ? formatPrice(stockDetails.todayLow) : '—'}
                          </p>
                        </div>
                      )}
                      {(stockDetails.todayVolume !== undefined || stockDetails.vwap !== undefined) && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-500 mb-1">Volume / VWAP</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {stockDetails.todayVolume !== undefined ? stockDetails.todayVolume.toLocaleString() : '—'}{stockDetails.vwap !== undefined ? ` / ${formatPrice(stockDetails.vwap)}` : ''}
                          </p>
                        </div>
                      )}
                      {(stockDetails.prevOpen !== undefined || stockDetails.prevHigh !== undefined || stockDetails.prevLow !== undefined) && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-500 mb-1">Prev O / H / L</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {stockDetails.prevOpen !== undefined ? formatPrice(stockDetails.prevOpen) : '—'} / {stockDetails.prevHigh !== undefined ? formatPrice(stockDetails.prevHigh) : '—'} / {stockDetails.prevLow !== undefined ? formatPrice(stockDetails.prevLow) : '—'}
                          </p>
                        </div>
                      )}
                      {stockDetails.prevVolume !== undefined && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-500 mb-1">Prev Volume</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {stockDetails.prevVolume.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {(stockDetails.high52w !== undefined || stockDetails.low52w !== undefined) && (
                        <div className="bg-gray-50 rounded-lg p-4 col-span-2">
                          <p className="text-sm text-gray-500 mb-1">52 Week High / Low</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {stockDetails.high52w !== undefined ? formatPrice(stockDetails.high52w) : '—'} / {stockDetails.low52w !== undefined ? formatPrice(stockDetails.low52w) : '—'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Market Status */}
                {stockDetails.isMarketClosed && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 font-medium">
                      {stockDetails.marketState === 'extended' 
                        ? '📈 Extended hours trading. Showing current data.'
                        : '⚠️ Market is currently closed. Showing last available data.'
                      }
                    </p>
                  </div>
                )}
                
                {!stockDetails.isMarketClosed && stockDetails.marketState === 'open' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 font-medium">
                      🟢 Market is currently open. Live data available.
                    </p>
                  </div>
                )}

                {/* Additional Info */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Type: <span className="uppercase">{stock.type}</span></span>
                    <span>Locale: {stock.locale.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
                    <span>Status: {stock.active ? 'Active' : 'Inactive'}</span>
                    <span>Last Updated: {new Date(stock.last_updated_utc).toLocaleDateString()}</span>
                  </div>
                  {stockDetails.priceSource && (
                    <div className="mt-2 text-xs text-gray-500">Price Source: {stockDetails.priceSource}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Failed to load stock details.</p>
                <button
                  onClick={onClose}
                  className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
