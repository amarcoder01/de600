'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Filter, X, Brain, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import FilterControls from './FilterControls';
import ResultsTable from './ResultsTable';
import { ScreenerStock, FilterCriteria, SortConfig } from '../../types/screener';
import { fetchAllUSStocks, getPopularStocks } from '../../lib/screener/polygonApi';

const StockScreener: React.FC = () => {
  const router = useRouter();
  const [stocks, setStocks] = useState<ScreenerStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
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
    field: 'ticker',
    direction: 'asc',
  });
  // Server-side pagination state when market-wide filters are applied
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [serverOffset, setServerOffset] = useState(0);
  const [serverHasMore, setServerHasMore] = useState(false);
  const SERVER_PAGE_SIZE = 200;
  
  // Pagination state
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [allStocks, setAllStocks] = useState<ScreenerStock[]>([]); // Store all loaded stocks for filtering
  const [showingDefaultStocks, setShowingDefaultStocks] = useState(true); // Track if we're showing default popular stocks

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
        stock.market_cap !== undefined && stock.market_cap >= currentFilters.marketCapMin! * 1000000
      );
    }

    if (currentFilters.marketCapMax !== undefined) {
      filteredResults = filteredResults.filter(stock => 
        stock.market_cap !== undefined && stock.market_cap <= currentFilters.marketCapMax! * 1000000
      );
    }

    if (currentFilters.volumeMin !== undefined) {
      filteredResults = filteredResults.filter(stock => 
        stock.volume !== undefined && stock.volume >= currentFilters.volumeMin!
      );
    }

         if (currentFilters.sector && currentFilters.sector !== 'all') {
       filteredResults = filteredResults.filter(stock => 
         stock.sector === currentFilters.sector
       );
     }

     if (currentFilters.exchange && currentFilters.exchange !== 'all') {
       filteredResults = filteredResults.filter(stock => 
         stock.exchange === currentFilters.exchange
       );
     }
    
    return filteredResults;
  };

  // Sort stocks function
  const sortStocks = (stocksToSort: ScreenerStock[], config: SortConfig): ScreenerStock[] => {
    return [...stocksToSort].sort((a, b) => {
      let aValue: any = a[config.field as keyof ScreenerStock];
      let bValue: any = b[config.field as keyof ScreenerStock];

      // Handle undefined values
      if (aValue === undefined) aValue = config.direction === 'asc' ? Infinity : -Infinity;
      if (bValue === undefined) bValue = config.direction === 'asc' ? Infinity : -Infinity;

      // Handle string values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return config.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return config.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  useEffect(() => {
    const loadDefaultStocks = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Load popular stocks quickly for instant display
        console.log('🚀 Loading popular stocks for instant display...');
        const popularStocks = await getPopularStocks();
        
        setStocks(popularStocks);
        setAllStocks(popularStocks);
        setShowingDefaultStocks(true);
        setHasMore(true); // Allow loading more stocks
        
        toast.success(`Showing ${popularStocks.length} popular stocks`, {
          description: 'Click "Load More Stocks" to see additional stocks'
        });
        
        console.log(`✅ Loaded ${popularStocks.length} popular stocks instantly`);
      } catch (error) {
        console.error('Error loading popular stocks:', error);
        setError('Failed to load popular stocks');
        toast.error('Failed to load popular stocks');
        
        // Fallback to original loading method if popular stocks fail
        try {
          console.log('🔄 Falling back to full stock loading...');
          const result = await fetchAllUSStocks(undefined, 40);
          setAllStocks(result.stocks);
          setStocks(result.stocks);
          setNextCursor(result.nextCursor);
          setHasMore(result.hasMore);
          setShowingDefaultStocks(false);
          toast.success(`Loaded ${result.stocks.length} stocks`);
        } catch (fallbackError) {
          console.error('Error in fallback loading:', fallbackError);
          setError('Failed to load stock data');
          toast.error('Failed to load stock data');
        }
      } finally {
        setLoading(false);
        setBatchProgress({ isProcessing: false, current: 0, total: 0, message: '' });
      }
    };

    loadDefaultStocks();
  }, []);

  // Load more stocks function for pagination
  const loadMoreStocks = async () => {
    if (loadingMore) return;
    
    // If we're showing default stocks, transition to full stock loading
    if (showingDefaultStocks) {
      setLoadingMore(true);
      try {
        setBatchProgress({ 
          isProcessing: true, 
          current: 0, 
          total: 100, 
          message: 'Loading comprehensive stock data...' 
        });
        
        console.log('🔄 Transitioning from popular stocks to full stock data...');
        const result = await fetchAllUSStocks(undefined, 100, (current: number, total: number, message: string) => {
          setBatchProgress({ isProcessing: true, current, total, message });
        });
        
        // Merge popular stocks with new stocks, removing duplicates
        const existingTickers = new Set(stocks.map(s => s.ticker));
        const newStocks = result.stocks.filter(s => !existingTickers.has(s.ticker));
        const mergedStocks = [...stocks, ...newStocks];
        
        setAllStocks(mergedStocks);
        setStocks(mergedStocks);
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
        setShowingDefaultStocks(false);
        
        toast.success(`Loaded ${newStocks.length} additional stocks`, {
          description: `Total: ${mergedStocks.length} stocks available`
        });
        
        console.log(`✅ Loaded ${newStocks.length} additional stocks, total: ${mergedStocks.length}`);
      } catch (error) {
        console.error('Error loading additional stocks:', error);
        toast.error('Failed to load additional stocks');
      } finally {
        setLoadingMore(false);
        setBatchProgress({ isProcessing: false, current: 0, total: 0, message: '' });
      }
      return;
    }
    
    // If market-wide filters are applied, use server-side pagination
    if (filtersApplied) {
      if (!serverHasMore) return;
      setLoadingMore(true);
      try {
        setBatchProgress({ isProcessing: true, current: 0, total: 100, message: 'Loading more results...' });
        const response = await fetch('/api/screener', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters,
            limit: SERVER_PAGE_SIZE,
            offset: serverOffset,
            sort: { field: sortConfig.field, direction: sortConfig.direction },
          }),
        });
        if (!response.ok) throw new Error(`API ${response.status}`);
        const data = await response.json();
        const newStocks: ScreenerStock[] = Array.isArray(data.stocks) ? data.stocks : [];
        const merged = sortStocks([...stocks, ...newStocks], sortConfig);
        setStocks(merged);
        const nextOffset = (data.offset ?? serverOffset) + newStocks.length;
        setServerOffset(nextOffset);
        setServerHasMore(!!data.hasMore);
        toast.success(`Loaded ${newStocks.length} more results`);
      } catch (error) {
        console.error('Error loading more server results:', error);
        toast.error('Failed to load more results');
      } finally {
        setLoadingMore(false);
        setBatchProgress({ isProcessing: false, current: 0, total: 0, message: '' });
      }
      return;
    }

    // Default path: client-side pagination of locally loaded stocks
    if (!hasMore || !nextCursor) {
      return;
    }
    setLoadingMore(true);
    try {
      setBatchProgress({ isProcessing: true, current: 0, total: 100, message: 'Loading additional stocks...' });
      const result = await fetchAllUSStocks(nextCursor, 40, (current: number, total: number, message: string) => {
        setBatchProgress({ isProcessing: true, current, total, message });
      });
      const newAllStocks = [...allStocks, ...result.stocks];
      setAllStocks(newAllStocks);
      const filteredStocks = applyClientSideFilters(newAllStocks, filters);
      const sortedStocks = sortStocks(filteredStocks, sortConfig);
      setStocks(sortedStocks);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
      if (result.hasMore) {
        toast.success(`Loaded ${result.stocks.length} more stocks. Total: ${newAllStocks.length}`);
      } else {
        toast.success(`Loaded ${result.stocks.length} more stocks. No more results. Total: ${newAllStocks.length}`);
      }
    } catch (error) {
      console.error('Error loading more stocks:', error);
      toast.error('Failed to load more stocks');
    } finally {
      setLoadingMore(false);
      setBatchProgress({ isProcessing: false, current: 0, total: 0, message: '' });
    }
  };

  const applyFilters = async () => {
    setLoading(true);
    setError(null);
    
    // Persistent filtering that continues until stocks are found (up to 60 seconds)
    const startTime = Date.now();
    const maxDuration = 60000; // 60 seconds maximum
    let attempt = 1;
    
    const attemptFiltering = async (): Promise<boolean> => {
      try {
        // If we have meaningful filters, use server-side screening for comprehensive results
        const hasFilters = filters.search || filters.priceMin || filters.priceMax || 
                          filters.marketCapMin || filters.marketCapMax || filters.volumeMin ||
                          (filters.sector && filters.sector !== 'all') || 
                          (filters.exchange && filters.exchange !== 'all');
        
        if (hasFilters) {
          const elapsed = Date.now() - startTime;
          const remainingTime = Math.max(0, maxDuration - elapsed);
          
          setBatchProgress({ 
            isProcessing: false, 
            current: 0, 
            total: 0, 
            message: '' 
          });
          
          // Call backend universal screener so filters apply across full market
          const response = await fetch('/api/screener', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filters,
              limit: SERVER_PAGE_SIZE,
              offset: 0,
              sort: { field: sortConfig.field, direction: sortConfig.direction },
            }),
          });
          
          if (!response.ok) throw new Error(`API ${response.status}`);
          const data = await response.json();
          const results = Array.isArray(data.stocks) ? data.stocks : [];
          const sortedResults = sortStocks(results, sortConfig);
          
          if (sortedResults.length > 0) {
            // Found stocks! Success
            setStocks(sortedResults);
            setFiltersApplied(true);
            setShowingDefaultStocks(false);
            setServerOffset((data.offset ?? 0) + results.length);
            setServerHasMore(!!data.hasMore);
            toast.success(`Found ${sortedResults.length} stocks matching your criteria after ${attempt} attempt(s)`);
            return true;
          } else {
            // No stocks found, continue trying if time allows
            const timeRemaining = maxDuration - (Date.now() - startTime);
            if (timeRemaining > 5000) { // At least 5 seconds remaining
              attempt++;
              console.log(`🔄 No stocks found on attempt ${attempt-1}, retrying... (${Math.ceil(timeRemaining/1000)}s remaining)`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
              return await attemptFiltering();
            } else {
              // Time expired, show warning
              setStocks([]);
              toast.warning(`No stocks found matching your criteria after ${attempt} attempts over 60 seconds. Try adjusting your filters.`);
              return false;
            }
          }
        } else {
          // No meaningful filters, just apply client-side filtering to current stocks
          const fallbackResults = applyClientSideFilters(allStocks, filters);
          const sortedFallback = sortStocks(fallbackResults, sortConfig);
          setStocks(sortedFallback);
          setFiltersApplied(false);
          toast.success(`Showing ${sortedFallback.length} stocks`);
          return true;
        }
      } catch (error) {
        console.error(`Error on filtering attempt ${attempt}:`, error);
        const timeRemaining = maxDuration - (Date.now() - startTime);
        if (timeRemaining > 5000) {
          attempt++;
          console.log(`🔄 Error on attempt ${attempt-1}, retrying... (${Math.ceil(timeRemaining/1000)}s remaining)`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
          return await attemptFiltering();
        } else {
          throw error; // Time expired, throw the error
        }
      }
    };
    
    try {
      await attemptFiltering();
    } catch (error) {
      console.error('Error applying filters:', error);
      
      // Fallback to client-side filtering on server-side failure
      try {
        const fallbackResults = applyClientSideFilters(allStocks, filters);
        const sortedFallback = sortStocks(fallbackResults, sortConfig);
        setStocks(sortedFallback);
        setFiltersApplied(false);
        toast.warning(`Showing ${sortedFallback.length} results from loaded stocks.`);
      } catch (fallbackError) {
        console.error('Fallback filtering failed:', fallbackError);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        if (errorMessage.includes('API key')) {
          setError('API configuration issue. Please check your API key.');
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

  const handleSearch = async (searchTerm: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setActiveSearchQuery(searchTerm);
    
    if (!searchTerm.trim()) {
      // Reset to all stocks if search is cleared
      const filteredStocks = applyClientSideFilters(allStocks, filters);
      const sortedStocks = sortStocks(filteredStocks, sortConfig);
      setStocks(sortedStocks);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true);
      setError(null);
      
      try {
        // Use server-side screener for search so results are fully hydrated and market-wide
        const response = await fetch('/api/screener', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: { ...filters, search: searchTerm },
            limit: 200,
            offset: 0,
            sort: { field: sortConfig.field, direction: sortConfig.direction },
          }),
        });
        if (!response.ok) throw new Error(`API ${response.status}`);
        const data = await response.json();
        const results: ScreenerStock[] = Array.isArray(data.stocks) ? data.stocks : [];
        const sortedResults = sortStocks(results, sortConfig);
        setStocks(sortedResults);
        setFiltersApplied(true);
        setShowingDefaultStocks(false);
        setServerOffset((data.offset ?? 0) + sortedResults.length);
        setServerHasMore(!!data.hasMore);
        if (sortedResults.length === 0) {
          toast.info(`No stocks found matching "${searchTerm}"`);
        } else {
          toast.success(`Found ${sortedResults.length} stocks matching "${searchTerm}"`);
        }
      } catch (error) {
        console.error('❌ Error searching stocks:', error);
        setError('Failed to search stocks');
        toast.error('Failed to search stocks');
      } finally {
        setSearchLoading(false);
      }
    }, 60000); // Increased timeout to 60 seconds to allow more time for filtering until stocks are found
  };

  const handleSort = (field: keyof ScreenerStock): void => {
    const newDirection = sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    const newSortConfig: SortConfig = { field: field, direction: newDirection as 'asc' | 'desc' };
    setSortConfig(newSortConfig);
    
    const sortedStocks = sortStocks(stocks, newSortConfig);
    setStocks(sortedStocks);
  };

  const handleFilterChange = (newFilters: FilterCriteria) => {
    setFilters(newFilters);
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
    setFiltersApplied(false);
    setServerOffset(0);
    setServerHasMore(false);
    
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
        stock.change_percent || 'N/A',
        stock.volume || 'N/A',
        stock.market_cap || 'N/A',
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border shadow-sm">
        <div className="px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                  Stock Screener
                </h1>
                {/* AI Screener Button */}
                <button
                  onClick={() => router.push('/smart-screener')}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <Brain className="w-4 h-4" />
                  <span className="hidden md:inline">AI Screener</span>
                  <Sparkles className="w-3 h-3 opacity-80" />
                </button>
                {/* Mobile AI Screener Button */}
                <button
                  onClick={() => router.push('/smart-screener')}
                  className="sm:hidden p-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                  title="AI Screener"
                >
                  <Brain className="w-4 h-4" />
                </button>
                {/* Mobile Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden p-2 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Filter className="w-4 h-4 text-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-120px)]">
        {/* Mobile Filter Overlay */}
        {showFilters && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowFilters(false)}
          />
        )}
        
        {/* Filters Sidebar */}
        <div className={`${showFilters ? 'block' : 'hidden'} lg:block lg:w-80 xl:w-96 bg-card border-r border-border overflow-y-auto order-2 lg:order-1 screener-filters-sidebar ${showFilters ? 'show' : ''}`}>
          <div className="p-4 lg:p-6">
            <div className="lg:hidden flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>
            <FilterControls
              filters={filters}
              onFilterChange={handleFilterChange}
              onApplyFilters={applyFilters}
              onSearch={handleSearch}
              onClearFilters={clearFilters}
              loading={loading}
              searchLoading={searchLoading}
            />
            
            {/* Batch Processing Progress Indicator */}
            {batchProgress.isProcessing && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
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
        </div>

        {/* Results */}
        <div className="flex-1 bg-background overflow-hidden order-1 lg:order-2">
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-hidden">
              <ResultsTable
                stocks={stocks}
                loading={loading}
                error={error || undefined}
                sortConfig={sortConfig}
                onSort={handleSort}
                hasMore={filtersApplied ? serverHasMore : hasMore}
                loadingMore={loadingMore}
                onLoadMore={loadMoreStocks}
                onExportCSV={exportToCSV}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockScreener;
