import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { StockSearchResult } from "@/types/stock";

export function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['/api/stocks/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      
      const res = await apiRequest('POST', '/api/stocks/search', { query: searchQuery });
      return await res.json() as StockSearchResult[];
    },
    enabled: searchQuery.length > 2,
  });

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowResults(value.length > 0);
  }, []);

  const handleSelectStock = useCallback((stock: StockSearchResult) => {
    setSearchQuery(stock.symbol);
    setShowResults(false);
    // Navigate to stock detail or add to watchlist
    console.log('Selected stock:', stock);
  }, []);

  return (
    <div className="hidden sm:flex items-center space-x-2 relative">
      <div className="relative">
        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm"></i>
        <input 
          type="text" 
          placeholder="Search stocks..." 
          value={searchQuery}
          onChange={handleSearch}
          onFocus={() => setShowResults(searchQuery.length > 0)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          className="pl-10 pr-4 py-2 w-64 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          data-testid="input-search"
        />
        
        {/* Search Results Dropdown */}
        {showResults && (searchResults || isLoading) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground" data-testid="text-loading">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Searching...
              </div>
            ) : searchResults?.length ? (
              <>
                {searchResults.map((stock, index) => (
                  <button
                    key={`${stock.symbol}-${index}`}
                    onClick={() => handleSelectStock(stock)}
                    className="w-full px-4 py-3 text-left hover:bg-accent flex items-center justify-between border-b border-border last:border-0"
                    data-testid={`button-stock-${stock.symbol}`}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{stock.symbol}</div>
                      <div className="text-sm text-muted-foreground truncate">{stock.name}</div>
                    </div>
                    <div className="text-xs text-muted-foreground ml-2">
                      {Math.round(stock.relevanceScore * 100)}% match
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <div className="p-4 text-center text-muted-foreground" data-testid="text-no-results">
                No stocks found for "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
