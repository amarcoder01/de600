import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter, ChevronDown, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StockCard } from "./StockCard";
import { stockApi } from "@/lib/api";
import type { Stock } from "@/types/stock";

interface StockListProps {
  className?: string;
}

export function StockList({ className }: StockListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("marketCap");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const limit = 10;

  const { 
    data: stocksData, 
    isLoading, 
    error,
    isRefetching 
  } = useQuery({
    queryKey: ["/api/stocks", currentPage, limit],
    queryFn: () => stockApi.getStocks(currentPage, limit),
    staleTime: 30000,
  });

  const refreshMutation = useMutation({
    mutationFn: () => stockApi.refreshStockData(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/market/indices"] });
      toast({
        title: "Data Refreshed",
        description: "Stock data has been updated with latest information.",
      });
    },
    onError: () => {
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh data.",
        variant: "destructive",
      });
    },
  });

  const addToWatchlistMutation = useMutation({
    mutationFn: (symbol: string) => stockApi.addToWatchlist(symbol),
    onSuccess: (_, symbol) => {
      toast({
        title: "Added to Watchlist",
        description: `${symbol} has been added to your watchlist.`,
      });
    },
    onError: () => {
      toast({
        title: "Unable to Add",
        description: "Could not add stock to watchlist.",
        variant: "destructive",
      });
    },
  });

  const handleLoadMore = () => {
    if (stocksData?.hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleAddToWatchlist = (symbol: string) => {
    addToWatchlistMutation.mutate(symbol);
  };

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  if (error) {
    return (
      <div className={className}>
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-destructive mb-2">
              Unable to Load Data
            </h2>
            <Button onClick={handleRefresh} variant="destructive">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <section className={className}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-2xl font-bold mb-2 sm:mb-0" data-testid="stock-listings-title">
          Stock Listings
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48" data-testid="select-sort-by">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="marketCap">Sort by: Market Cap</SelectItem>
              <SelectItem value="price">Sort by: Price</SelectItem>
              <SelectItem value="volume">Sort by: Volume</SelectItem>
              <SelectItem value="changePercent">Sort by: Change %</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" data-testid="button-filter">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshMutation.isPending || isRefetching}
            data-testid="button-refresh-data"
          >
            <RefreshCw className={`w-4 h-4 ${(refreshMutation.isPending || isRefetching) ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stock Cards */}
      <div className="space-y-4" data-testid="stock-list">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: limit }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : stocksData?.stocks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground text-lg">
                No stock data available. Please check your connection and try refreshing.
              </p>
            </CardContent>
          </Card>
        ) : (
          stocksData?.stocks.map((stock: Stock) => (
            <StockCard
              key={stock.symbol}
              stock={stock}
              onAddToWatchlist={handleAddToWatchlist}
            />
          ))
        )}
      </div>

      {/* Load More Button */}
      {stocksData?.hasMore && (
        <div className="flex justify-center mt-8" data-testid="load-more-container">
          <Button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="flex items-center space-x-2 shadow-sm hover:shadow-md"
            data-testid="button-load-more"
          >
            <span>Load More Stocks</span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      )}
    </section>
  );
}
