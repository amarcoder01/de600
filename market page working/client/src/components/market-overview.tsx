import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Radio } from "lucide-react";
import { stockApi } from "@/lib/api";
import type { MarketIndex } from "@/types/stock";

interface MarketOverviewProps {
  className?: string;
}

export function MarketOverview({ className }: MarketOverviewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/market/indices"],
    queryFn: () => stockApi.getMarketIndices(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (error) {
    return (
      <div className={`mb-8 ${className}`}>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive text-sm">
            Failed to load market data. Please check your internet connection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className={`mb-8 ${className}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1" data-testid="market-overview-title">
            Market Overview
          </h2>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-24" />
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          : data?.indices.map((index: MarketIndex) => (
              <Card key={index.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg" data-testid={`index-name-${index.symbol}`}>
                      {index.name}
                    </h3>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      index.changePercent >= 0
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {index.changePercent >= 0 ? (
                        <TrendingUp className="inline w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="inline w-3 h-3 mr-1" />
                      )}
                      <span data-testid={`index-change-percent-${index.symbol}`}>
                        {index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold" data-testid={`index-value-${index.symbol}`}>
                      {index.value.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <span 
                        className={index.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                        data-testid={`index-change-${index.symbol}`}
                      >
                        {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">Today</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        }
      </div>
    </section>
  );
}
