import { useEffect, useRef, useState } from 'react';
import { InternalLightChart } from '@/components/market/internal-lightchart';

interface StockChartProps {
  symbol: string;
  currentPrice: number;
  width?: number;
  height?: number;
  hideControls?: boolean; // Hide tip message and internal chart button
}

declare global {
  interface Window {
    TradingView: any;
  }
}

export function StockChart({ symbol, currentPrice, width = 700, height = 400, hideControls = false }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [tradingViewError, setTradingViewError] = useState(false);
  const [fallbackData, setFallbackData] = useState<any>(null);
  const [showInternalChart, setShowInternalChart] = useState(false);

  // Normalize US ticker to common TradingView-friendly formats
  const normalizeUsTicker = (raw: string) => {
    let s = (raw || '').trim().toUpperCase();
    // Replace spaces with nothing, common for inputs like "BRK B"
    s = s.replace(/\s+/g, '');
    // Convert dash class shares to dot (BRK-B -> BRK.B, BF-B -> BF.B)
    s = s.replace(/-/g, '.');
    return s;
  };

  // Build candidate TradingView symbols to try sequentially
  const getTradingViewCandidates = (sym: string) => {
    const s = normalizeUsTicker(sym);
    // Some well-known direct mappings for speed
    const quickMap: Record<string, string> = {
      'AAPL': 'NASDAQ:AAPL',
      'MSFT': 'NASDAQ:MSFT',
      'GOOGL': 'NASDAQ:GOOGL',
      'GOOG': 'NASDAQ:GOOG',
      'AMZN': 'NASDAQ:AMZN',
      'TSLA': 'NASDAQ:TSLA',
      'META': 'NASDAQ:META',
      'NVDA': 'NASDAQ:NVDA',
      'NFLX': 'NASDAQ:NFLX',
      'ORCL': 'NYSE:ORCL',
      'ADBE': 'NASDAQ:ADBE',
      'CRM': 'NYSE:CRM',
      'PYPL': 'NASDAQ:PYPL',
      'INTC': 'NASDAQ:INTC',
      'CSCO': 'NASDAQ:CSCO',
      'PEP': 'NASDAQ:PEP',
      'KO': 'NYSE:KO',
      'DIS': 'NYSE:DIS',
      'VZ': 'NYSE:VZ',
      'NKE': 'NYSE:NKE',
      'WMT': 'NYSE:WMT',
      'HD': 'NYSE:HD',
      'BAC': 'NYSE:BAC',
      'JPM': 'NYSE:JPM',
      'V': 'NYSE:V',
      'MA': 'NYSE:MA',
      'JNJ': 'NYSE:JNJ',
      'PG': 'NYSE:PG',
      'UNH': 'NYSE:UNH',
      'ABBV': 'NYSE:ABBV',
      'F': 'NYSE:F',
      'GE': 'NYSE:GE',
      'T': 'NYSE:T',
      'XOM': 'NYSE:XOM',
      'CVX': 'NYSE:CVX',
      'QBTS': 'NYSE:QBTS',
      // Class shares commonly referenced with dots on TradingView
      'BRK.B': 'NYSE:BRK.B',
      'BRK.A': 'NYSE:BRK.A',
      'BF.B': 'NYSE:BF.B',
      'BF.A': 'NYSE:BF.A',
    };

    if (quickMap[s]) {
      return [quickMap[s], s];
    }

    // Try a broad set of US exchanges plus raw symbol so TradingView can resolve
    const exchanges = [
      'NASDAQ',
      'NYSE',
      'AMEX',
      'NYSEARCA',
      'BATS',
      'CBOE',
    ];

    const candidates = exchanges.map(ex => `${ex}:${s}`);
    // Add raw symbol at the end to let TradingView auto-resolve
    candidates.push(s);
    return candidates;
  };

  // Fetch fallback chart data from our internal API
  const fetchFallbackChartData = async (symbol: string) => {
    try {
      const response = await fetch(`/api/chart/${symbol}?range=1d&interval=1m`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.dataPoints > 0) {
          setFallbackData(data);
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to fetch fallback chart data:', error);
    }
    return false;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    setTradingViewError(false);
    setFallbackData(null);
    setIsLoaded(false);

    // Clear previous widget content
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    const candidates = getTradingViewCandidates(symbol);
    let disposed = false;
    let attemptIndex = 0;
    let timeoutId: any = null;

    const tryNext = async () => {
      if (disposed) return;
      const candidate = candidates[attemptIndex];
      if (!candidate) {
        // Exhausted all candidates, fetch fallback
        console.warn('All TradingView symbol attempts failed for:', symbol);
        setTradingViewError(true);
        await fetchFallbackChartData(symbol);
        return;
      }

      // Clear container for fresh attempt
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Create widget container
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'tradingview-widget-container__widget';
      widgetContainer.style.height = `${height - 50}px`;
      widgetContainer.style.width = '100%';
      containerRef.current?.appendChild(widgetContainer);

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.async = true;

      const config = {
        autosize: true,
        symbol: candidate,
        interval: 'D',
        timezone: 'America/New_York',
        theme: 'light',
        style: '1',
        locale: 'en',
        toolbar_bg: '#f1f3f6',
        enable_publishing: false,
        allow_symbol_change: false,
        calendar: false,
        hide_side_toolbar: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        container_id: 'tradingview_widget',
        studies: [
          'Volume@tv-basicstudies'
        ],
        show_popup_button: false,
        popup_width: '1000',
        popup_height: '650',
        support_host: 'https://www.tradingview.com'
      } as const;

      script.innerHTML = JSON.stringify(config);

      let completed = false;
      const attemptSymbol = candidate;

      // If script loads, consider it a success (TradingView doesn't always trigger onerror for bad symbols)
      script.onload = () => {
        if (disposed || completed) return;
        completed = true;
        clearTimeout(timeoutId);
        setIsLoaded(true);
        // Success, stop trying further
      };

      script.onerror = () => {
        if (disposed || completed) return;
        completed = true;
        clearTimeout(timeoutId);
        console.warn('TradingView script error, trying next symbol candidate:', attemptSymbol);
        attemptIndex += 1;
        tryNext();
      };

      // Set a per-attempt timeout; if not loaded in time, try next candidate
      timeoutId = setTimeout(() => {
        if (disposed || completed) return;
        completed = true;
        console.warn('TradingView attempt timeout for candidate:', attemptSymbol);
        attemptIndex += 1;
        tryNext();
      }, 8000);

      widgetContainer.appendChild(script);
    };

    tryNext();

    // Cleanup function
    return () => {
      disposed = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, height]);

  return (
    <div className="w-full">
      {/* Chart container with fixed height */}
      <div 
        style={{ width: '100%', height: `${height}px` }}
        className="chart-widget-container"
      >
        {/* Loading state */}
        {!isLoaded && (
          <div className="flex items-center justify-center h-full bg-muted/10 rounded-lg border border-dashed animate-pulse">
            <div className="text-center p-6">
              <div className="text-lg font-medium text-muted-foreground mb-2">Loading Chart...</div>
              <div className="text-sm text-muted-foreground">Preparing interactive chart for {symbol}</div>
            </div>
          </div>
        )}
        
        <div 
          ref={containerRef}
          className={`w-full h-full ${!isLoaded ? 'hidden' : ''}`}
          data-testid={`tradingview-chart-${symbol}`}
        />
      </div>

      {/* Chart type selector and helpful message - only show when not hiding controls */}
      {!showInternalChart && !hideControls && (
        <div className="mt-3 space-y-2">
          {/* Helpful tip message */}
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="text-xs text-blue-700 dark:text-blue-300">
              💡 <strong>Tip:</strong> If the chart above doesn't load or appears blank, try our internal chart for reliable data visualization.
            </div>
          </div>
          
          {/* Chart selector */}
          <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Want a different chart view for <strong>{symbol}</strong>?
            </div>
            <button
              className="ml-3 px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
              onClick={() => {
                setShowInternalChart(true);
                // If we don't have fallback data, try to fetch it
                if (!fallbackData || !fallbackData.data || fallbackData.data.length === 0) {
                  fetchFallbackChartData(symbol);
                }
              }}
              data-testid={`btn-internal-chart-${symbol}`}
            >
              Load Internal Chart
            </button>
          </div>
        </div>
      )}

      {/* Error state - only show when TradingView fails */}
      {!showInternalChart && tradingViewError && (
        <div className="mt-2 p-2 border rounded-md bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
          <div className="text-xs text-orange-700 dark:text-orange-300">
            <strong>Note:</strong> Having trouble loading the interactive chart. You can use the internal chart above.
          </div>
        </div>
      )}

      {/* Internal chart render (explicit by user or automatic with fetched data) */}
      {(showInternalChart || (tradingViewError && (fallbackData?.data?.length ?? 0) > 0)) && (
        <div className="mt-4">
          <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Internal Chart View</strong> - {symbol} ({fallbackData?.data?.length || 0} data points)
            </div>
          </div>
          
          {/* Show loading state if no data yet */}
          {(!fallbackData || !fallbackData.data || fallbackData.data.length === 0) ? (
            <div className="w-full h-[400px] flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Loading chart data...</div>
              </div>
            </div>
          ) : (
            <InternalLightChart symbol={symbol} data={fallbackData?.data} height={400} />
          )}
        </div>
      )}
    </div>
  );
}