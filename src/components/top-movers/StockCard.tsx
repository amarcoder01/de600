import React from 'react'
import { StockCardProps } from '@/types/top-movers'
import { 
  formatCurrency, 
  formatMarketCap
} from '@/lib/top-movers-utils'

export const StockCard: React.FC<StockCardProps> = ({ stock }) => {
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-900 mb-1">
            {stock.ticker}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">
            {stock.name}
          </p>
        </div>
        {/* Change percentage hidden as requested */}
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Last Price</p>
          <p className="font-semibold text-gray-900">
            {formatCurrency(stock.value)}
          </p>
        </div>
        {/* Change value hidden as requested */}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Market Cap</p>
        <p className="font-semibold text-gray-900">
          {formatMarketCap(stock.market_cap)}
        </p>
      </div>
    </div>
  )
}
