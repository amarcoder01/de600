import { TrendingUp, TrendingDown } from 'lucide-react';
import { StockData } from '@shared/schema';

interface StockTableProps {
  title: string;
  stocks: StockData[];
  type: 'gainers' | 'losers';
  lastUpdated?: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

const formatVolume = (volume: number) => {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toString();
};

const formatChange = (change: number, changePercent: number) => {
  const sign = change >= 0 ? '+' : '';
  const formattedChange = Math.abs(change).toFixed(2);
  const formattedPercent = Math.abs(changePercent).toFixed(2);
  
  return `${sign}$${formattedChange} (${sign}${formattedPercent}%)`;
};

export default function StockTable({ title, stocks, type, lastUpdated }: StockTableProps) {
  const isGainers = type === 'gainers';
  const IconComponent = isGainers ? TrendingUp : TrendingDown;
  const colorClass = isGainers ? 'text-success' : 'text-destructive';
  const bgClass = isGainers ? 'bg-success/20' : 'bg-destructive/20';
  
  const getLastUpdatedText = () => {
    if (!lastUpdated) return 'Unknown';
    const date = new Date(lastUpdated);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    return `${diffMins} min ago`;
  };

  return (
    <section className="bg-card rounded-xl border border-border overflow-hidden slide-up">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-bold text-foreground flex items-center" data-testid={`title-${type}`}>
          <IconComponent className={`${colorClass} mr-3`} />
          {title}
        </h2>
      </div>

      <div className="p-6">
        {stocks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid={`empty-state-${type}`}>
            No {type} data available at the moment.
          </div>
        ) : (
          <div className="space-y-4">
            {stocks.slice(0, 5).map((stock, index) => (
              <div 
                key={`${stock.symbol}-${index}`}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer"
                data-testid={`row-stock-${stock.symbol}`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 ${bgClass} rounded-lg flex items-center justify-center`}>
                    <span className={`font-bold ${colorClass} text-lg`} data-testid={`text-symbol-${stock.symbol}`}>
                      {stock.symbol}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground" data-testid={`text-name-${stock.symbol}`}>
                      {stock.name}
                    </h3>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground" data-testid={`text-price-${stock.symbol}`}>
                    {formatPrice(stock.price)}
                  </p>
                  <p className={`${colorClass} font-medium`} data-testid={`text-change-${stock.symbol}`}>
                    {formatChange(stock.change, stock.changePercent)}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`text-volume-${stock.symbol}`}>
                    Vol: {formatVolume(stock.volume)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
