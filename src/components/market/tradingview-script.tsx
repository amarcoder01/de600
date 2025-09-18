import Script from 'next/script';

export function TradingViewScript() {
  return (
    <>
      <Script
        src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('TradingView script loaded globally');
        }}
        onError={(error) => {
          console.error('Failed to load TradingView script globally:', error);
        }}
      />
    </>
  );
}
