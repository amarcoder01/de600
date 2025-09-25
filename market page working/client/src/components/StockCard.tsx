import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Plus } from "lucide-react";
import type { Stock } from "@/types/stock";

interface StockCardProps {
  stock: Stock;
  onAddToWatchlist?: (symbol: string) => void;
  className?: string;
}

export function StockCard({ stock, onAddToWatchlist, className }: StockCardProps) {
  const isPositive = stock.change >= 0;

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-lg" data-testid={`stock-symbol-${stock.symbol}`}>
                {stock.symbol}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-lg" data-testid={`stock-name-${stock.symbol}`}>
                {stock.name}
              </h3>
              <p className="text-muted-foreground text-sm" data-testid={`stock-sector-${stock.symbol}`}>
                {stock.sector || 'Unknown'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-8">
            <div className="text-right">
              <div className="text-2xl font-bold" data-testid={`stock-price-${stock.symbol}`}>
                ${stock.currentPrice.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Current Price</div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-1">
                {isPositive ? (
                  <TrendingUp className="text-green-600 dark:text-green-400 text-xs" />
                ) : (
                  <TrendingDown className="text-red-600 dark:text-red-400 text-xs" />
                )}
                <span 
                  className={`font-semibold ${
                    isPositive 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}
                  data-testid={`stock-change-${stock.symbol}`}
                >
                  {isPositive ? '+' : ''}${stock.change.toFixed(2)}
                </span>
              </div>
              <div 
                className={`text-sm ${
                  isPositive 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}
                data-testid={`stock-change-percent-${stock.symbol}`}
              >
                {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
              </div>
            </div>
            
            <div className="text-right">
              <div className="font-semibold" data-testid={`stock-volume-${stock.symbol}`}>
                {formatVolume(stock.volume)}
              </div>
              <div className="text-sm text-muted-foreground">Volume</div>
            </div>
            
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => onAddToWatchlist?.(stock.symbol)}
              className="flex items-center space-x-2"
              data-testid={`button-add-watchlist-${stock.symbol}`}
            >
              <Plus className="w-4 h-4" />
              <span>Watch</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
