import { TrendingUp, TrendingDown, Plus, Loader2 } from 'lucide-react';
import { StockData, StockSearchResult } from '@shared/schema';
import { Button } from '@/components/ui/button';

interface StockGridProps {
  stocks: StockData[];
  title: string;
  type: 'gainers' | 'losers';
  onSelectStock?: (stock: StockSearchResult) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  canLoadMore?: boolean;
}

export default function StockGrid({ stocks, title, type, onSelectStock, onLoadMore, isLoadingMore = false, canLoadMore = true }: StockGridProps) {
  const isGainer = type === 'gainers';
  
  const handleStockClick = (stock: StockData) => {
    if (onSelectStock) {
      // Convert StockData to StockSearchResult format
      const searchResult: StockSearchResult = {
        symbol: stock.symbol,
        name: stock.name,
        type: 'EQUITY', // Default type for stocks
        exchange: 'NASDAQ' // Default exchange
      };
      onSelectStock(searchResult);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center" data-testid={`${type}-title`}>
          {isGainer ? (
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
          ) : (
            <TrendingDown className="w-5 h-5 mr-2 text-red-600" />
          )}
          {title}
        </h2>
        <span className="text-sm text-muted-foreground" data-testid={`${type}-count`}>
          {stocks.length} stocks
        </span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {stocks.map((stock) => (
          <div
            key={stock.symbol}
            onClick={() => handleStockClick(stock)}
            className="bg-card border border-border rounded-lg p-4 hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 cursor-pointer group"
            data-testid={`stock-card-${stock.symbol}`}
          >
            <div className="space-y-3">
              {/* Stock Symbol and Name */}
              <div>
                <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors" data-testid={`stock-symbol-${stock.symbol}`}>
                  {stock.symbol}
                </h3>
                <p className="text-sm text-muted-foreground truncate" title={stock.name} data-testid={`stock-name-${stock.symbol}`}>
                  {stock.name}
                </p>
              </div>

              {/* Price */}
              <div>
                <p className="text-2xl font-bold text-foreground" data-testid={`stock-price-${stock.symbol}`}>
                  ${stock.price.toFixed(2)}
                </p>
              </div>

              {/* Change and Change Percent */}
              <div className="flex items-center justify-between">
                <div className={`flex items-center ${
                  isGainer ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {isGainer ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  <span className="font-medium" data-testid={`stock-change-${stock.symbol}`}>
                    {isGainer ? '+' : ''}{stock.change.toFixed(2)}
                  </span>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  isGainer 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`} data-testid={`stock-percent-${stock.symbol}`}>
                  {isGainer ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-1 text-xs text-muted-foreground">
                {stock.volume > 0 && (
                  <div className="flex justify-between">
                    <span>Volume:</span>
                    <span data-testid={`stock-volume-${stock.symbol}`}>
                      {(stock.volume / 1000000).toFixed(1)}M
                    </span>
                  </div>
                )}
                {stock.marketCap && stock.marketCap > 0 && (
                  <div className="flex justify-between">
                    <span>Market Cap:</span>
                    <span data-testid={`stock-marketcap-${stock.symbol}`}>
                      ${(stock.marketCap / 1000000000).toFixed(1)}B
                    </span>
                  </div>
                )}
                {stock.sector && (
                  <div className="flex justify-between">
                    <span>Sector:</span>
                    <span className="truncate ml-2" title={stock.sector} data-testid={`stock-sector-${stock.symbol}`}>
                      {stock.sector}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {stocks.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No {type} data available</p>
        </div>
      )}
      
      {/* Load More Button */}
      {stocks.length > 0 && canLoadMore && onLoadMore && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            variant="outline"
            size="lg"
            className="min-w-[200px]"
            data-testid={`load-more-${type}`}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading More...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Load More {title}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}