import React, { useState, useEffect } from 'react';
import { Stock, StockDetails, AppError } from '../types/stock';
import { stockService } from '../services/stockService';
import SearchBox from './SearchBox';
import StockList from './StockList';
import LoadMoreButton from './LoadMoreButton';
import StockModal from './StockModal';
import { AlertCircle, TrendingUp } from 'lucide-react';

const StockDashboard: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [stockDetails, setStockDetails] = useState<StockDetails | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMarketClosed, setIsMarketClosed] = useState(false);

  useEffect(() => {
    loadInitialStocks();
    setIsMarketClosed(stockService.isMarketClosed());
  }, []);

  const loadInitialStocks = async () => {
    try {
      setLoading(true);
      setError(null);
      const { stocks: initialStocks, nextCursor: cursor } = await stockService.getStocks(50);
      setStocks(initialStocks);
      setNextCursor(cursor);
    } catch (err) {
      const error = err as AppError;
      setError(error.message || 'Failed to load stocks');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreStocks = async () => {
    if (!nextCursor || loadingMore) return;

    try {
      setLoadingMore(true);
      setError(null);
      const { stocks: moreStocks, nextCursor: cursor } = await stockService.getStocks(50, nextCursor);
      setStocks(prev => [...prev, ...moreStocks]);
      setNextCursor(cursor);
    } catch (err) {
      const error = err as AppError;
      setError(error.message || 'Failed to load more stocks');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchQuery('');
      return;
    }

    try {
      setIsSearching(true);
      setSearchQuery(query);
      setError(null);
      const results = await stockService.searchStocks(query);
      setSearchResults(results);
    } catch (err) {
      const error = err as AppError;
      setError(error.message || 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStockSelect = async (stock: Stock) => {
    setSelectedStock(stock);
    setModalLoading(true);
    setStockDetails(null);

    try {
      const details = await stockService.getStockDetails(stock.ticker);
      setStockDetails({ ...details, name: stock.name });
    } catch (err) {
      const error = err as AppError;
      setError(error.message || 'Failed to load stock details');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedStock(null);
    setStockDetails(null);
  };

  const clearSearch = () => {
    setSearchResults([]);
    setIsSearching(false);
    setSearchQuery('');
  };

  const displayedStocks = searchQuery ? searchResults : stocks;
  const showLoadMore = !searchQuery && nextCursor && !loading;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Stock Dashboard</h1>
            </div>
            <SearchBox 
              onSearch={handleSearch} 
              loading={isSearching}
              onClear={clearSearch}
            />
          </div>
        </div>
      </header>

      {/* Market Status Banner */}
      {isMarketClosed && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
              <p className="text-yellow-800 font-medium">
                Market Closed – Showing Last Close Data
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Results Header */}
        {searchQuery && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Search results for "{searchQuery}" ({searchResults.length} found)
            </h2>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading stocks...</span>
          </div>
        )}

        {/* Stock List */}
        {!loading && (
          <>
            <StockList 
              stocks={displayedStocks} 
              onStockSelect={handleStockSelect}
              loading={isSearching}
            />
            
            {/* Load More Button */}
            {showLoadMore && (
              <LoadMoreButton 
                onClick={loadMoreStocks}
                loading={loadingMore}
                disabled={!nextCursor}
              />
            )}
            
            {/* No Results Message */}
            {!loading && displayedStocks.length === 0 && (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">
                  {searchQuery ? 'No stocks found for your search.' : 'No stocks available.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Stock Details Modal */}
      {selectedStock && (
        <StockModal
          stock={selectedStock}
          stockDetails={stockDetails}
          loading={modalLoading}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default StockDashboard;