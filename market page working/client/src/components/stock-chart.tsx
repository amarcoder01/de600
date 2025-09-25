import { useEffect, useRef, useState } from 'react';

interface StockChartProps {
  symbol: string;
  currentPrice: number;
  width?: number;
  height?: number;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

export function StockChart({ symbol, currentPrice, width = 700, height = 400 }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Format symbol for TradingView (most US stocks are on NASDAQ)
  const formatSymbolForTradingView = (sym: string) => {
    // Common exchange mappings
    const exchangeMap: { [key: string]: string } = {
      'AAPL': 'NASDAQ:AAPL',
      'MSFT': 'NASDAQ:MSFT',
      'GOOGL': 'NASDAQ:GOOGL',
      'GOOG': 'NASDAQ:GOOG',
      'AMZN': 'NASDAQ:AMZN',
      'TSLA': 'NASDAQ:TSLA',
      'META': 'NASDAQ:META',
      'NVDA': 'NASDAQ:NVDA',
      'NFLX': 'NASDAQ:NFLX',
      'ORCL': 'NASDAQ:ORCL',
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
      'CVX': 'NYSE:CVX'
    };

    // Return mapped symbol or default to NASDAQ
    return exchangeMap[sym.toUpperCase()] || `NASDAQ:${sym.toUpperCase()}`;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const tradingViewSymbol = formatSymbolForTradingView(symbol);

    // Clear previous widget
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = `${height - 50}px`;
    widgetContainer.style.width = '100%';

    // Copyright container removed for cleaner interface

    containerRef.current.appendChild(widgetContainer);

    // Create and configure the script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    
    const config = {
      autosize: true,
      symbol: tradingViewSymbol,
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
    };

    script.innerHTML = JSON.stringify(config);
    
    script.onload = () => {
      setIsLoaded(true);
    };

    script.onerror = () => {
      console.error('Failed to load TradingView widget');
      // Fallback message
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div class="flex items-center justify-center h-full bg-muted/30 rounded-lg border border-dashed">
            <div class="text-center p-6">
              <div class="text-lg font-medium text-muted-foreground mb-2">Loading...</div>
              <div class="text-sm text-muted-foreground">TradingView chart for ${symbol}</div>
            </div>
          </div>
        `;
      }
    };

    widgetContainer.appendChild(script);

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      setIsLoaded(false);
    };
  }, [symbol, height]);

  return (
    <div 
      style={{ width: '100%', height: `${height}px` }}
      className="tradingview-widget-container"
    >
      {/* Loading state */}
      {!isLoaded && (
        <div className="flex items-center justify-center h-full bg-muted/10 rounded-lg border border-dashed animate-pulse">
          <div className="text-center p-6">
            <div className="text-lg font-medium text-muted-foreground mb-2">Loading...</div>
            <div className="text-sm text-muted-foreground">Professional TradingView chart for {symbol}</div>
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef}
        className={`w-full h-full ${!isLoaded ? 'hidden' : ''}`}
        data-testid={`tradingview-chart-${symbol}`}
      />
    </div>
  );
}