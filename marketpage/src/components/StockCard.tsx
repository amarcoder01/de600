import React from 'react';
import { Stock } from '../types/stock';
import { TrendingUp, Building2 } from 'lucide-react';

interface StockCardProps {
  stock: Stock;
  onClick: () => void;
}

const StockCard: React.FC<StockCardProps> = ({ stock, onClick }) => {
  const formatExchange = (exchange: string) => {
    // Format exchange names for better display
    const exchangeMap: Record<string, string> = {
      'XNAS': 'NASDAQ',
      'XNYS': 'NYSE',
      'BATS': 'BATS',
      'ARCX': 'NYSE Arca'
    };
    return exchangeMap[exchange] || exchange;
  };

  const formatMarketCap = (ticker: string) => {
    // This is a placeholder - in a real app, you'd get this from the API
    // For now, we'll show the currency
    return stock.currency_name || 'USD';
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer group"
    >
      {/* Header with ticker and type */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
            {stock.ticker}
          </h3>
          <div className="flex items-center mt-1">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {stock.type}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <TrendingUp className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
        </div>
      </div>

      {/* Company name */}
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-700 line-clamp-2 leading-tight">
          {stock.name}
        </p>
      </div>

      {/* Exchange and market info */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <div className="flex items-center">
          <Building2 className="h-3 w-3 mr-1" />
          <span>{formatExchange(stock.primary_exchange)}</span>
        </div>
        <span className="font-medium">{formatMarketCap(stock.ticker)}</span>
      </div>

      {/* Status indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${
            stock.active ? 'bg-green-400' : 'bg-gray-400'
          }`}></div>
          <span className="text-xs text-gray-500">
            {stock.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {stock.locale.toUpperCase()}
        </span>
      </div>

      {/* Click indicator */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors duration-200">
          Click for details →
        </p>
      </div>
    </div>
  );
};

export default StockCard;