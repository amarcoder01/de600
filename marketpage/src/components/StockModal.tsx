import React, { useEffect } from 'react';
import { Stock, StockDetails } from '../types/stock';
import { X, TrendingUp, TrendingDown, Loader2, Building2, DollarSign } from 'lucide-react';

interface StockModalProps {
  stock: Stock;
  stockDetails: StockDetails | null;
  loading: boolean;
  onClose: () => void;
}

const StockModal: React.FC<StockModalProps> = ({ stock, stockDetails, loading, onClose }) => {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${formatPrice(change)}`;
  };

  const formatPercentage = (percentage: number) => {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  };

  const isPositive = stockDetails ? stockDetails.change >= 0 : true;

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
                  
                  <div className={`flex items-center justify-center space-x-2 ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span className="font-semibold">
                      {formatChange(stockDetails.change)}
                    </span>
                    <span className="font-semibold">
                      ({formatPercentage(stockDetails.changePercent)})
                    </span>
                  </div>
                </div>

                {/* Stock Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Previous Close</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatPrice(stockDetails.previousClose)}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Exchange</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {stock.primary_exchange}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Market</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {stock.market}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Currency</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {stock.currency_name}
                    </p>
                  </div>
                </div>

                {/* Market Status */}
                {stockDetails.isMarketClosed && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 font-medium">
                      ⚠️ Market is currently closed. Showing last available data.
                    </p>
                  </div>
                )}

                {/* Additional Info */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Type: {stock.type}</span>
                    <span>Locale: {stock.locale.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
                    <span>Status: {stock.active ? 'Active' : 'Inactive'}</span>
                    <span>Last Updated: {new Date(stock.last_updated_utc).toLocaleDateString()}</span>
                  </div>
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
  );
};

export default StockModal;