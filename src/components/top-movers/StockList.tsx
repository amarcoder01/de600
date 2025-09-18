import React from 'react'
import { StockListProps } from '@/types/top-movers'
import { StockCard } from './StockCard'
import { LoadingSpinner } from './LoadingSpinner'
import { ErrorMessage } from './ErrorMessage'
import { Button } from '@/components/ui/button'
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'

export const StockList: React.FC<StockListProps> = ({
  title,
  stocks,
  loading,
  error,
  onLoadMore,
  hasMore,
  type
}) => {
  if (error) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
        <ErrorMessage message={error} />
      </div>
    )
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
      
      {loading && stocks.length === 0 ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="large" />
        </div>
      ) : (
        <>
          {stocks.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                {stocks.map((stock) => (
                  <StockCard 
                    key={stock.ticker} 
                    stock={stock} 
                    type={type}
                  />
                ))}
              </div>
              
              {hasMore && (
                <div className="flex justify-center">
                  <Button
                    onClick={onLoadMore}
                    disabled={loading}
                    variant="outline"
                    className="flex items-center"
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="small" className="mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <div className="flex justify-center mb-4">
                {type === 'gainers' ? (
                  <TrendingUp className="w-12 h-12 text-gray-400" />
                ) : (
                  <TrendingDown className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {type} data available
              </h3>
              <p className="text-gray-500 mb-4 max-w-md mx-auto">
                {type === 'gainers' 
                  ? 'No stocks are currently showing significant gains. This could be due to market conditions or data availability.'
                  : 'No stocks are currently showing significant losses. This could be due to market conditions or data availability.'
                }
              </p>
              <div className="flex items-center justify-center text-sm text-gray-400">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span>Data updates every 15 minutes</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
