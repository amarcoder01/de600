import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import FilterControls from '../components/FilterControls';
import ResultsTable from '../components/ResultsTable';
import { ScreenerStock, FilterCriteria, SortConfig } from '../types/stock';
import { fetchStockTickers, searchStocks, getPopularStocks, fetchAllUSStocks, PolygonApiService } from '../services/polygonApi';

const StockScreener: React.FC = () => {
  const [stocks, setStocks] = useState<ScreenerStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>('');
  const [batchProgress, setBatchProgress] = useState<{
    isProcessing: boolean;
    current: number;
    total: number;
    message: string;
  }>({ isProcessing: false, current: 0, total: 0, message: '' });
  const [filters, setFilters] = useState<FilterCriteria>({
    search: '',
    priceMin: undefined,
    priceMax: undefined,
    marketCapMin: undefined,
    marketCapMax: undefined,
    volumeMin: undefined,
    sector: '',
    exchange: ''
  });
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'ticker',
    direction: 'asc',
  });
  
  // Pagination state
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [allStocks, setAllStocks] = useState<ScreenerStock[]>([]); // Store all loaded stocks for filtering

  // Load initial batch of US stocks on component mount
  // Helper function to apply client-side filters
  const applyClientSideFilters = (stocksToFilter: ScreenerStock[], currentFilters: FilterCriteria): ScreenerStock[] => {
    let filteredResults = stocksToFilter;
    
    if (currentFilters.priceMin !== undefined) {
      filteredResults = filteredResults.filter(stock => 
        stock.price !== undefined && stock.price >= currentFilters.priceMin!
      );
    }

    if (currentFilters.priceMax !== undefined) {
      filteredResults = filteredResults.filter(stock => 
        stock.price !== undefined && stock.price <= currentFilters.priceMax!
      );
    }

    if (currentFilters.marketCapMin !== undefined) {
      filteredResults = filteredResults.filter(stock => 
        stock.marketCap !== undefined && stock.marketCap >= currentFilters.marketCapMin! * 1000000
      );
    }

    if (currentFilters.marketCapMax !== undefined) {
      filteredResults = filteredResults.filter(stock => 
        stock.marketCap !== undefined && stock.marketCap <= currentFilters.marketCapMax! * 1000000
      );
    }

    if (currentFilters.volumeMin !== undefined) {
      filteredResults = filteredResults.filter(stock => 
        stock.volume !== undefined && stock.volume >= currentFilters.volumeMin!
      );
    }



    if (currentFilters.sector) {
      filteredResults = filteredResults.filter(stock => 
        stock.sector === currentFilters.sector
      );
    }

    if (currentFilters.exchange) {
      filteredResults = filteredResults.filter(stock => 
        stock.exchange === currentFilters.exchange
      );
    }
    
    return filteredResults;
  };

  useEffect(() => {
    const loadInitialStocks = async () => {
      setLoading(true);
      setError(null);
      console.log('🚀 Loading initial US stocks...');
      
      try {
        // Set up progress tracking for initial load
        setBatchProgress({
          isProcessing: true,
          current: 0,
          total: 100,
          message: 'Loading stock tickers and fetching price data...'
        });
        
        const result = await fetchAllUSStocks(undefined, 100, (current, total, message) => {
          setBatchProgress({
            isProcessing: true,
            current,
            total,
            message
          });
        });
        
        console.log('📊 Initial US stocks loaded:', {
          count: result.stocks.length,
          hasMore: result.hasMore,
          nextCursor: result.nextCursor
        });
        
        setAllStocks(result.stocks);
        setStocks(result.stocks);
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
        
        toast.success(`Loaded ${result.stocks.length} US stocks with complete data`);
      } catch (error) {
        console.error('❌ Error loading initial stocks:', error);
        setError('Failed to load initial stock data');
        toast.error('Failed to load stock data');
      } finally {
        setLoading(false);
        setBatchProgress({ isProcessing: false, current: 0, total: 0, message: '' });
      }
    };

    loadInitialStocks();
  }, []);

  // Load more stocks function for pagination
  const loadMoreStocks = async () => {
    if (!hasMore || !nextCursor || loadingMore) {
      return;
    }

    setLoadingMore(true);
    console.log('📈 Loading more US stocks with cursor:', nextCursor);
    
    try {
      // Set up progress tracking for loading more stocks
      setBatchProgress({
        isProcessing: true,
        current: 0,
        total: 100,
        message: 'Loading additional stocks and fetching price data...'
      });
      
      const result = await fetchAllUSStocks(nextCursor, 100, (current, total, message) => {
        setBatchProgress({
          isProcessing: true,
          current,
          total,
          message
        });
      });
      
      console.log('📊 Additional US stocks loaded:', {
        count: result.stocks.length,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor
      });
      
      const newAllStocks = [...allStocks, ...result.stocks];
      setAllStocks(newAllStocks);
      
      // Apply current filters to the new complete dataset
      const filteredStocks = applyClientSideFilters(newAllStocks, filters);
      const sortedStocks = sortStocks(filteredStocks, sortConfig);
      setStocks(sortedStocks);
      
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
      
      toast.success(`Loaded ${result.stocks.length} more stocks with complete data. Total: ${newAllStocks.length}`);
    } catch (error) {
      console.error('❌ Error loading more stocks:', error);
      toast.error('Failed to load more stocks');
    } finally {
      setLoadingMore(false);
      setBatchProgress({ isProcessing: false, current: 0, total: 0, message: '' });
    }
  };

  const applyFilters = async () => {
    setLoading(true);
    setError(null);
    console.log('🔍 Starting universal filter application with filters:', filters);
    
    try {
      // Use enterprise-grade screening for optimal results
      console.log('🏢 Using professional screening across complete market');
      
      const polygonService = new PolygonApiService();
      const result = await polygonService.getUniversalScreenerResults(
        filters,
        100, // limit
        (current, total, message) => {
          setBatchProgress({
            isProcessing: true,
            current,
            total,
            message
          });
        }
      );
      
      console.log(`🏢 Professional screening returned ${result.stocks.length} stocks with complete data`);
      
      // Apply sorting
      const sortedResults = sortStocks(result.stocks, sortConfig);
      setStocks(sortedResults);
      
      if (sortedResults.length === 0) {
        console.warn('⚠️ No stocks found after filtering. Check if filters are too restrictive.');
        toast.warning('No stocks found matching your criteria. Try adjusting your filters.');
      } else {
        console.log(`✅ Successfully found ${sortedResults.length} stocks using professional screening`);
        toast.success(`Found ${sortedResults.length} stocks with real-time data`);
      }
    } catch (error) {
      console.error('❌ Error applying universal filters:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        filters: filters
      });
      
      // Fallback to client-side filtering on server-side failure
      console.log('🔄 Falling back to client-side filtering on loaded stocks');
      try {
        const fallbackResults = applyClientSideFilters(allStocks, filters);
        const sortedFallback = sortStocks(fallbackResults, sortConfig);
        setStocks(sortedFallback);
        toast.warning(`Professional screening failed. Showing ${sortedFallback.length} results from loaded stocks.`);
      } catch (fallbackError) {
        console.error('❌ Fallback filtering also failed:', fallbackError);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        if (errorMessage.includes('API key')) {
          setError('API configuration issue. Please check your Polygon.io API key.');
        } else if (errorMessage.includes('rate limit')) {
          setError('API rate limit exceeded. Please try again in a moment.');
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          setError('Network error. Please check your internet connection and try again.');
        } else {
          setError('Unable to fetch stock data. Please try again later.');
        }
        
        toast.error('Failed to apply filters. Please check console for details.');
        setStocks([]);
      }
    } finally {
      setLoading(false);
      setBatchProgress({ isProcessing: false, current: 0, total: 0, message: '' });
    }
  };

  const sortStocks = (stocksToSort: ScreenerStock[], config: SortConfig): ScreenerStock[] => {
    return [...stocksToSort].sort((a, b) => {
      const aValue = a[config.key];
      const bValue = b[config.key];

      // Handle undefined values
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return config.direction === 'asc' ? comparison : -comparison;
      }

      // Handle number comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        // Handle NaN values
        if (isNaN(aValue) && isNaN(bValue)) return 0;
        if (isNaN(aValue)) return 1;
        if (isNaN(bValue)) return -1;
        
        const comparison = aValue - bValue;
        return config.direction === 'asc' ? comparison : -comparison;
      }

      return 0;
    });
  };

  const handleSort = (field: keyof ScreenerStock) => {
    const newSortConfig = {
      key: field,
      direction: sortConfig.key === field && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    } as SortConfig;
    
    setSortConfig(newSortConfig);
    
    const sortedStocks = sortStocks(stocks, newSortConfig);
    setStocks(sortedStocks);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      priceMin: undefined,
      priceMax: undefined,
      marketCapMin: undefined,
      marketCapMax: undefined,
      volumeMin: undefined,
      sector: '',
      exchange: ''
    });
    
    // Reset to show all currently loaded stocks
    const sortedStocks = sortStocks(allStocks, sortConfig);
    setStocks(sortedStocks);
    
    toast.info('Filters cleared. Showing loaded stocks. Apply filters to search the complete market.');
  };

  const exportToCSV = useCallback(() => {
    if (stocks.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = [
      'Symbol',
      'Company Name',
      'Price',
      'Change',
      'Change %',
      'Volume',
      'Market Cap',

      'Sector',
      'Exchange',
    ];

    const csvContent = [
      headers.join(','),
      ...stocks.map(stock => [
        stock.ticker,
        `"${stock.name}"`, // Wrap in quotes to handle commas in company names
        stock.price || 'N/A',
        stock.change || 'N/A',
        stock.changePercent || 'N/A',
        stock.volume || 'N/A',
        stock.marketCap || 'N/A',

        `"${stock.sector || 'N/A'}"`,
        stock.exchange || 'N/A',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stock-screener-results-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV file downloaded successfully');
  }, [stocks]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Stock Screener</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <FilterControls
              filters={filters}
              onFiltersChange={setFilters}
              onApplyFilters={applyFilters}
              onClearFilters={clearFilters}
              loading={loading}
            />
            
            {/* Batch Processing Progress Indicator */}
            {batchProgress.isProcessing && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-blue-800">Processing Stock Data</h3>
                    <div className="mt-1 text-sm text-blue-700">
                      {batchProgress.message}
                    </div>
                    <div className="mt-2">
                      <div className="bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <div className="mt-1 text-xs text-blue-600">
                        {batchProgress.current} of {batchProgress.total} processed
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-1 text-sm text-red-700">
                      {error}
                    </div>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      type="button"
                      className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                      onClick={() => setError(null)}
                    >
                      <span className="sr-only">Dismiss</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <ResultsTable
              stocks={stocks}
              loading={loading}
              sortConfig={sortConfig}
              onSort={handleSort}
              onExportCSV={exportToCSV}
            />
            
            {/* Load More Button */}
            {hasMore && !loading && (
              <div className="mt-6 text-center">
                <button
                  onClick={loadMoreStocks}
                  disabled={loadingMore}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading More...
                    </>
                  ) : (
                    <>
                      Load More Stocks
                      <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
                <p className="mt-2 text-sm text-gray-500">Showing {allStocks.length} stocks.</p>
              </div>
            )}
            
            {!hasMore && allStocks.length > 0 && null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockScreener;