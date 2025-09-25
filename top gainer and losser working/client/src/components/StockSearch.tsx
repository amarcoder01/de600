import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiService } from '@/services/api';
import { StockSearchResult } from '@shared/schema';

interface StockSearchProps {
  onSelectStock?: (stock: StockSearchResult) => void;
  placeholder?: string;
}

export default function StockSearch({ onSelectStock, placeholder = "Search stocks..." }: StockSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Search stocks query
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['/api/stocks/search', debouncedQuery],
    queryFn: () => apiService.searchStocks(debouncedQuery),
    enabled: debouncedQuery.length >= 1,
    staleTime: 30000, // 30 seconds
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.length > 0);
  };

  const handleSelectStock = (stock: StockSearchResult) => {
    setQuery('');
    setIsOpen(false);
    onSelectStock?.(stock);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
  };

  const results = searchResults?.results || [];

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          className="pl-10 pr-10"
          data-testid="input-stock-search"
        />
        {query && (
          <Button
            onClick={handleClear}
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            data-testid="button-clear-search"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground" data-testid="search-loading">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((stock, index) => (
                <div
                  key={`${stock.symbol}-${index}`}
                  onClick={() => handleSelectStock(stock)}
                  className="px-4 py-3 hover:bg-muted cursor-pointer transition-colors"
                  data-testid={`search-result-${stock.symbol}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-foreground">
                        {stock.symbol}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {stock.name}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stock.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : debouncedQuery.length >= 1 ? (
            <div className="p-4 text-center text-muted-foreground" data-testid="search-no-results">
              No stocks found for "{debouncedQuery}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}