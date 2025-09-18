import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTopGainersLosersStore } from '@/store/topGainersLosersStore';
import { topGainersLosersApiService } from '@/lib/top-gainers-losers-api';
import { StockSearchResult } from '@/types/top-gainers-losers';
import Header from '@/components/top-gainers-losers/Header';
import MarketOverview from '@/components/top-gainers-losers/MarketOverview';
import StockGrid from '@/components/top-gainers-losers/StockGrid';
import LoadingOverlay from '@/components/top-gainers-losers/LoadingOverlay';
import ErrorState from '@/components/top-gainers-losers/ErrorState';
import StockDetailsModal from '@/components/top-gainers-losers/StockDetailsModal';

export default function Dashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  
  const { 
    setMarketData, 
    setMarketStatus, 
    setLoading, 
    setError,
    setLastRefresh,
    autoRefresh,
    stockCount,
    setStockCount,
    isLoadingMore,
    setLoadingMore
  } = useTopGainersLosersStore();

  // Load more handler
  const handleLoadMore = () => {
    if (isLoadingMore) return;
    
    setLoadingMore(true);
    const newCount = Math.min(stockCount + 25, 100); // Max 100 stocks
    setStockCount(newCount);
    // Query will automatically refetch when stockCount changes due to queryKey dependency
  };

  // Stock selection handler
  const handleStockSelect = (stock: StockSearchResult) => {
    setSelectedSymbol(stock.symbol);
  };

  // Fetch market data
  const { data: marketData, isLoading: isLoadingMarket, error: marketError, refetch: refetchMarket } = useQuery({
    queryKey: ['/api/top-gainers-losers/market-data', stockCount],
    queryFn: () => topGainersLosersApiService.fetchMarketData(stockCount),
    refetchInterval: autoRefresh ? 30000 : false, // 30 seconds
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  // Fetch market status
  const { data: marketStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['/api/top-gainers-losers/market-status'],
    queryFn: () => topGainersLosersApiService.fetchMarketStatus(),
    refetchInterval: 60000, // 1 minute
    refetchIntervalInBackground: true,
  });

  // Update store when data changes
  useEffect(() => {
    if (marketData) {
      setMarketData(marketData);
      setLastRefresh(new Date());
      setError(null);
    }
  }, [marketData, setMarketData, setLastRefresh, setError]);

  useEffect(() => {
    if (marketStatus) {
      setMarketStatus(marketStatus);
    }
  }, [marketStatus, setMarketStatus]);

  useEffect(() => {
    setLoading(isLoadingMarket || isLoadingStatus);
  }, [isLoadingMarket, isLoadingStatus, setLoading]);

  useEffect(() => {
    if (marketError) {
      setError(marketError instanceof Error ? marketError.message : 'Failed to fetch market data');
    }
  }, [marketError, setError]);

  // Reset loading more state when query finishes
  useEffect(() => {
    if (!isLoadingMarket) {
      setLoadingMore(false);
    }
  }, [isLoadingMarket, setLoadingMore]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <LoadingOverlay />
      
      <main className="container mx-auto px-4 py-8">
        <MarketOverview />
        
        <div className="space-y-12">
          <StockGrid 
            title="Top Gainers"
            stocks={marketData?.gainers || []}
            type="gainers"
            onSelectStock={handleStockSelect}
            onLoadMore={handleLoadMore}
            isLoadingMore={isLoadingMore}
            canLoadMore={stockCount < 100}
          />
          <StockGrid 
            title="Top Losers" 
            stocks={marketData?.losers || []}
            type="losers"
            onSelectStock={handleStockSelect}
            onLoadMore={handleLoadMore}
            isLoadingMore={isLoadingMore}
            canLoadMore={stockCount < 100}
          />
        </div>
        
        <ErrorState />
      </main>

      {/* Stock Details Modal */}
      <StockDetailsModal 
        symbol={selectedSymbol}
        onClose={() => setSelectedSymbol(null)}
      />
    </div>
  );
}
