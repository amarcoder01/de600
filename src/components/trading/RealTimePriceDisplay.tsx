import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { usePriceChangeIndicator } from '@/hooks/useRealTimeComparison';
import { cn } from '@/lib/utils';

interface RealTimePriceDisplayProps {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  isUpdating?: boolean;
  className?: string;
}

export function RealTimePriceDisplay({
  symbol,
  price,
  change,
  changePercent,
  isUpdating = false,
  className
}: RealTimePriceDisplayProps) {
  const { changeDirection, isAnimating } = usePriceChangeIndicator(symbol, price);

  const getChangeIcon = () => {
    if (change > 0) return <ArrowUp className="w-3 h-3" />;
    if (change < 0) return <ArrowDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getChangeColor = () => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPriceChangeClass = () => {
    if (!isAnimating) return '';
    if (changeDirection === 'up') return 'animate-pulse bg-green-100 border-green-300';
    if (changeDirection === 'down') return 'animate-pulse bg-red-100 border-red-300';
    return '';
  };

  return (
    <div className={cn('transition-all duration-300', getPriceChangeClass(), className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">
            ${price.toFixed(2)}
          </span>
          {isUpdating && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </div>
        <Badge 
          variant={change >= 0 ? 'default' : 'destructive'}
          className={cn(
            'flex items-center gap-1 transition-all duration-300',
            isAnimating && 'scale-110'
          )}
        >
          {getChangeIcon()}
          <span className={getChangeColor()}>
            {change >= 0 ? '+' : ''}${change.toFixed(2)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
          </span>
        </Badge>
      </div>
    </div>
  );
}

// Component for displaying real-time volume with animation
export function RealTimeVolumeDisplay({ 
  volume, 
  isUpdating = false 
}: { 
  volume: number; 
  isUpdating?: boolean; 
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Volume:</span>
      <span className={cn(
        'font-medium transition-all duration-300',
        isUpdating && 'text-blue-600 animate-pulse'
      )}>
        {volume.toLocaleString()}
      </span>
      {isUpdating && (
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
      )}
    </div>
  );
}

// Component for market cap with real-time updates
export function RealTimeMarketCapDisplay({ 
  marketCap, 
  isUpdating = false 
}: { 
  marketCap: number; 
  isUpdating?: boolean; 
}) {
  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Market Cap:</span>
      <span className={cn(
        'font-medium transition-all duration-300',
        isUpdating && 'text-blue-600 animate-pulse'
      )}>
        {formatMarketCap(marketCap)}
      </span>
      {isUpdating && (
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
      )}
    </div>
  );
}