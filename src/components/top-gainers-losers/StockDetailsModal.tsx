import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ExternalLink, Building, Users, Globe, Newspaper } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { topGainersLosersApiService } from '@/lib/top-gainers-losers-api';
import { StockDetails } from '@/types/top-gainers-losers';

interface StockDetailsModalProps {
  symbol: string | null;
  onClose: () => void;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

const formatMarketCap = (marketCap: number) => {
  if (marketCap >= 1e12) {
    return `$${(marketCap / 1e12).toFixed(2)}T`;
  }
  if (marketCap >= 1e9) {
    return `$${(marketCap / 1e9).toFixed(2)}B`;
  }
  if (marketCap >= 1e6) {
    return `$${(marketCap / 1e6).toFixed(2)}M`;
  }
  return `$${marketCap.toLocaleString()}`;
};

const formatVolume = (volume: number) => {
  if (volume >= 1e9) {
    return `${(volume / 1e9).toFixed(2)}B`;
  }
  if (volume >= 1e6) {
    return `${(volume / 1e6).toFixed(2)}M`;
  }
  if (volume >= 1e3) {
    return `${(volume / 1e3).toFixed(2)}K`;
  }
  return volume.toLocaleString();
};

const formatPercent = (percent: number) => {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
};

export default function StockDetailsModal({ symbol, onClose }: StockDetailsModalProps) {
  const isOpen = symbol !== null;

  const { data: stockDetails, isLoading, error } = useQuery({
    queryKey: ['/api/top-gainers-losers/stocks', symbol],
    queryFn: () => topGainersLosersApiService.fetchStockDetails(symbol!),
    enabled: isOpen && !!symbol,
    staleTime: 60000, // 1 minute
  });

  if (!isOpen) return null;

  const isPositive = (stockDetails?.change || 0) >= 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-stock-details">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            Stock Details
          </DialogTitle>
          <DialogDescription>
            View comprehensive financial information and recent news for this stock.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8" data-testid="modal-loading">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">Loading stock details...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600" data-testid="modal-error">
            <p>Failed to load stock details for {symbol}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        ) : stockDetails ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="border-b border-border pb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground" data-testid="stock-name">
                    {stockDetails.name}
                  </h2>
                  <p className="text-lg text-muted-foreground" data-testid="stock-symbol">
                    {stockDetails.symbol}
                  </p>
                  {stockDetails.sector && (
                    <div className="flex items-center mt-2 text-sm text-muted-foreground">
                      <Building className="w-4 h-4 mr-1" />
                      <span data-testid="stock-sector">{stockDetails.sector}</span>
                      {stockDetails.industry && (
                        <>
                          <span className="mx-2">•</span>
                          <span data-testid="stock-industry">{stockDetails.industry}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-foreground" data-testid="stock-price">
                    {formatPrice(stockDetails.price)}
                  </p>
                  <div className={`flex items-center justify-end mt-1 ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 mr-1" />
                    )}
                    <span data-testid="stock-change">
                      {formatPrice(Math.abs(stockDetails.change))} ({formatPercent(stockDetails.changePercent)})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stockDetails.marketCap && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Market Cap</p>
                    <p className="font-semibold" data-testid="stock-market-cap">
                      {formatMarketCap(stockDetails.marketCap)}
                    </p>
                  </div>
                )}
                {stockDetails.peRatio && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">P/E Ratio</p>
                    <p className="font-semibold" data-testid="stock-pe-ratio">
                      {stockDetails.peRatio.toFixed(2)}
                    </p>
                  </div>
                )}
                {stockDetails.beta && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Beta</p>
                    <p className="font-semibold" data-testid="stock-beta">
                      {stockDetails.beta.toFixed(2)}
                    </p>
                  </div>
                )}
                {stockDetails.eps && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">EPS</p>
                    <p className="font-semibold" data-testid="stock-eps">
                      {formatPrice(stockDetails.eps)}
                    </p>
                  </div>
                )}
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Volume</p>
                  <p className="font-semibold" data-testid="stock-volume">
                    {formatVolume(stockDetails.volume)}
                  </p>
                </div>
                {stockDetails.averageVolume && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Avg Volume</p>
                    <p className="font-semibold" data-testid="stock-avg-volume">
                      {formatVolume(stockDetails.averageVolume)}
                    </p>
                  </div>
                )}
                {stockDetails.high52Week && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">52W High</p>
                    <p className="font-semibold" data-testid="stock-52w-high">
                      {formatPrice(stockDetails.high52Week)}
                    </p>
                  </div>
                )}
                {stockDetails.low52Week && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">52W Low</p>
                    <p className="font-semibold" data-testid="stock-52w-low">
                      {formatPrice(stockDetails.low52Week)}
                    </p>
                  </div>
                )}
                {stockDetails.dividendYield && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Dividend Yield</p>
                    <p className="font-semibold" data-testid="stock-dividend-yield">
                      {formatPercent(stockDetails.dividendYield * 100)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent News */}
            {stockDetails.news && stockDetails.news.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Newspaper className="w-5 h-5 mr-2" />
                    Recent News
                  </h3>
                  <div className="space-y-3">
                    {stockDetails.news.map((newsItem, index) => (
                      <div key={index} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <a
                          href={newsItem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                          data-testid={`news-item-${index}`}
                        >
                          <h4 className="font-medium text-foreground mb-2 hover:text-primary transition-colors">
                            {newsItem.title}
                          </h4>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span data-testid={`news-source-${index}`}>{newsItem.source}</span>
                            <span data-testid={`news-date-${index}`}>
                              {new Date(newsItem.publishedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Company Info */}
            {(stockDetails.description || stockDetails.employees || stockDetails.website) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-4">Company Information</h3>
                  
                  {stockDetails.employees && (
                    <div className="flex items-center mb-3 text-sm">
                      <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Employees:</span>
                      <span className="ml-1 font-medium" data-testid="stock-employees">
                        {stockDetails.employees.toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  {stockDetails.website && (
                    <div className="flex items-center mb-3 text-sm">
                      <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                      <a
                        href={stockDetails.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 flex items-center"
                        data-testid="stock-website"
                      >
                        {stockDetails.website.replace(/^https?:\/\//, '')}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  )}
                  
                  {stockDetails.description && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Description:</p>
                      <p className="text-sm leading-relaxed" data-testid="stock-description">
                        {stockDetails.description}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
