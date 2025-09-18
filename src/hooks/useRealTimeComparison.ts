import { useState, useEffect, useCallback, useRef } from 'react'
import { RealTimeComparisonService, StockUpdate } from '@/services/realtime-comparison-service'

export interface RealTimeComparisonData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume?: number
  timestamp: number
  isUpdating?: boolean
}

export interface RealTimeComparisonOptions {
  symbols: string[]
  enabled?: boolean
  updateInterval?: number
  onUpdate?: (symbol: string, data: RealTimeComparisonData) => void
  onConnectionChange?: (connected: boolean) => void
}

export function useRealTimeComparison(options: RealTimeComparisonOptions) {
  const { symbols, enabled = true, updateInterval = 5000, onUpdate, onConnectionChange } = options;
  const [data, setData] = useState<Record<string, RealTimeComparisonData>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  const serviceRef = useRef<RealTimeComparisonService | null>(null);

  // Initialize service
  useEffect(() => {
    serviceRef.current = RealTimeComparisonService.getInstance();
  }, []);

  const handleUpdate = useCallback((symbol: string, update: StockUpdate) => {
    const comparisonData: RealTimeComparisonData = {
      symbol,
      price: update.price,
      change: update.change,
      changePercent: update.changePercent,
      timestamp: update.timestamp,
      volume: update.volume,
      isUpdating: true
    };
    
    setData(prev => ({
      ...prev,
      [symbol]: comparisonData
    }));
    
    setLastUpdate(new Date());
    onUpdate?.(symbol, comparisonData);
    
    // Clear updating indicator after animation
    setTimeout(() => {
      setData(prev => ({
        ...prev,
        [symbol]: {
          ...prev[symbol],
          isUpdating: false
        }
      }));
    }, 1000);
  }, [onUpdate]);

  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    onConnectionChange?.(connected);
  }, [onConnectionChange]);

  useEffect(() => {
    if (!enabled || !serviceRef.current) return;

    const service = serviceRef.current;
    
    // Subscribe to updates
    service.subscribe(handleUpdate);
    service.onConnectionChange(handleConnectionChange);

    // Add new symbols
    const newSymbols = symbols.filter(symbol => !subscribedSymbolsRef.current.has(symbol));
    if (newSymbols.length > 0) {
      service.addSymbols(newSymbols).then(() => {
        newSymbols.forEach(symbol => subscribedSymbolsRef.current.add(symbol));
      }).catch(error => {
        console.error('Error adding symbols to real-time service:', error);
      });
    }

    // Remove symbols that are no longer needed
    const symbolsToRemove = Array.from(subscribedSymbolsRef.current).filter(symbol => !symbols.includes(symbol));
    if (symbolsToRemove.length > 0) {
      service.removeSymbols(symbolsToRemove);
      symbolsToRemove.forEach(symbol => subscribedSymbolsRef.current.delete(symbol));
    }

    return () => {
      service.unsubscribe(handleUpdate);
      const symbolsToCleanup = Array.from(subscribedSymbolsRef.current);
      if (symbolsToCleanup.length > 0) {
        service.removeSymbols(symbolsToCleanup);
      }
      subscribedSymbolsRef.current.clear();
    };
  }, [symbols, enabled, handleUpdate, handleConnectionChange]);

  const refreshAll = useCallback(() => {
    // Simple refresh - just trigger a re-render
    console.log('Refresh requested');
  }, []);

  const getSymbolData = useCallback((symbol: string) => {
    return data[symbol] || null;
  }, [data]);

  return {
    data,
    isConnected,
    lastUpdate,
    refreshAll,
    getSymbolData
  };
}

// Hook for price change visual indicators
export function usePriceChangeIndicator(symbol: string, currentPrice: number) {
  const [previousPrice, setPreviousPrice] = useState<number>(currentPrice);
  const [changeDirection, setChangeDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (currentPrice !== previousPrice && previousPrice !== 0) {
      setChangeDirection(currentPrice > previousPrice ? 'up' : 'down');
      setIsAnimating(true);
      setPreviousPrice(currentPrice);
      
      // Reset animation after delay
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (previousPrice === 0) {
      setPreviousPrice(currentPrice);
    }
  }, [currentPrice, previousPrice]);

  const getIndicatorClass = useCallback(() => {
    if (!isAnimating) return '';
    
    switch (changeDirection) {
      case 'up':
        return 'bg-green-100 text-green-800 animate-pulse border-green-200';
      case 'down':
        return 'bg-red-100 text-red-800 animate-pulse border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 animate-pulse border-blue-200';
    }
  }, [changeDirection, isAnimating]);

  const getArrowIcon = useCallback(() => {
    switch (changeDirection) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      default:
        return '→';
    }
  }, [changeDirection]);

  const getChangeColor = useCallback(() => {
    switch (changeDirection) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }, [changeDirection]);

  return {
    changeDirection,
    isAnimating,
    getIndicatorClass,
    getArrowIcon,
    getChangeColor
  };
}