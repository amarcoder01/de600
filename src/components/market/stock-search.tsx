import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, X } from "lucide-react";
import { stockApi } from "@/lib/market-api";
import { StockCard } from "./stock-card";
import type { Stock } from "@/types/market";

interface StockSearchProps {
  className?: string;
  onStockSelect?: (stock: Stock) => void;
}

export function StockSearch({ className, onStockSelect }: StockSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/stocks/search", debouncedQuery],
    queryFn: async () => {
      console.log(`Searching for: "${debouncedQuery}"`);
      try {
        const result = await stockApi.searchStocks(debouncedQuery);
        console.log('Search result:', result);
        return result;
      } catch (err) {
        console.error('Search error:', err);
        throw err;
      }
    },
    enabled: debouncedQuery.length >= 1,
    staleTime: 30000,
  });

  return (
    <div className={className}>

      {/* Traditional Search */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search stocks by symbol or company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-14 py-2 w-full"
            data-testid="input-stock-search"
          />
          {/* Clear (X) button */}
          {searchQuery.length > 0 && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearchQuery("");
                setDebouncedQuery("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="clear-stock-search"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {/* Loading spinner (shifted left to avoid overlap with clear button) */}
          {isLoading && (
            <Loader2 className="absolute right-10 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Search Results */}
        {error && (
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="p-4">
              <p className="text-destructive text-sm">
                Unable to search stocks.
              </p>
            </CardContent>
          </Card>
        )}

        {debouncedQuery.length >= 1 && data?.stocks && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold" data-testid="search-results-title">
              Search Results ({data.stocks.length})
            </h3>
            
            {data.stocks.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">
                    No stocks found for "{debouncedQuery}".
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {data.stocks.map((stock: Stock) => (
                  <StockCard
                    key={stock.symbol}
                    stock={stock}
                    onClick={onStockSelect}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

