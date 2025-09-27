import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Brain, Newspaper, MessageSquare, Loader2, Expand } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { stockApi } from "@/lib/market-api";
import { StockChart } from "./stock-chart";
import StockAIAnalysis from "./stock-ai-analysis";
import StockNews from "./stock-news";
import AIExpertChat from "./ai-expert-chat";
import type { Stock } from "@/types/market";

interface StockDetailModalProps {
  stock: Stock | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StockDetailModal({ stock, isOpen, onClose }: StockDetailModalProps) {
  if (!stock) return null;

  const [isFullScreenChart, setIsFullScreenChart] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 1200, height: 800 });
  // Compute change locally to ensure UI reflects accurate delta even if backend fields are zero
  const computedChange = (stock.currentPrice ?? 0) - (stock.previousClose ?? 0);
  const computedChangePercent = (stock.previousClose ?? 0) > 0
    ? (computedChange / stock.previousClose) * 100
    : 0;
  const isPositive = computedChange >= 0;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateWindowSize = () => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight
        });
      };
      
      updateWindowSize();
      window.addEventListener('resize', updateWindowSize);
      
      return () => window.removeEventListener('resize', updateWindowSize);
    }
  }, []);

  // Fetch detailed stock data including financial metrics
  const { data: detailedData, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["/api/stocks", stock.symbol, "details"],
    queryFn: () => stockApi.getStockDetails(stock.symbol),
    staleTime: 60000, // 1 minute
    enabled: isOpen, // Only fetch when modal is open
  });

  const formatMarketCap = (marketCap: number | null | undefined): string => {
    if (!marketCap) return 'N/A';
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(2)}T`;
    } else if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(2)}B`;
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(2)}M`;
    }
    return `$${marketCap.toLocaleString()}`;
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  // Determine a font-size class that keeps the ticker inside the avatar
  const getSymbolSizeClass = (len: number) => {
    if (len <= 3) return 'text-xl';
    if (len === 4) return 'text-base';
    if (len === 5) return 'text-sm';
    return 'text-xs';
  };

  const symbolSizeClass = getSymbolSizeClass(stock.symbol?.length || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="stock-detail-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                <span className={`text-primary font-bold leading-none text-center whitespace-nowrap ${symbolSizeClass}`}>{stock.symbol}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold" data-testid={`modal-stock-name-${stock.symbol}`}>
                  {stock.name}
                </h2>
                <p className="text-muted-foreground">{stock.sector || 'Unknown Sector'}</p>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6">
          {/* Price Overview */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5" />
                <span>Price Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-3xl font-bold" data-testid={`modal-current-price-${stock.symbol}`}>
                    ${stock.currentPrice.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Current Price</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className={`text-2xl font-bold flex items-center justify-center space-x-1 ${
                    isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    <span data-testid={`modal-price-change-${stock.symbol}`}>
                      {isPositive ? '+' : ''}${stock.change.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">Change</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className={`text-2xl font-bold ${
                    isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`} data-testid={`modal-change-percent-${stock.symbol}`}>
                    {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Change %</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold" data-testid={`modal-volume-${stock.symbol}`}>
                    {formatVolume(stock.volume)}
                  </div>
                  <div className="text-sm text-muted-foreground">Volume</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Information Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="flex items-center space-x-1">
                <BarChart3 className="w-4 h-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>
              <TabsTrigger value="news">News</TabsTrigger>
              <TabsTrigger value="chat">TradeGPT</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <span>Key Metrics</span>
                      {isLoadingDetails && <Loader2 className="w-4 h-4 animate-spin" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Market Cap</span>
                      <span className="font-medium" data-testid={`modal-market-cap-${stock.symbol}`}>
                        {formatMarketCap(detailedData?.marketCap || stock.marketCap)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Day High</span>
                      <span className="font-medium" data-testid={`modal-day-high-${stock.symbol}`}>
                        {detailedData?.dayHigh ? `$${detailedData.dayHigh.toFixed(2)}` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Day Low</span>
                      <span className="font-medium" data-testid={`modal-day-low-${stock.symbol}`}>
                        {detailedData?.dayLow ? `$${detailedData.dayLow.toFixed(2)}` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">52W High</span>
                      <span className="font-medium" data-testid={`modal-52w-high-${stock.symbol}`}>
                        {detailedData?.fiftyTwoWeekHigh ? `$${detailedData.fiftyTwoWeekHigh.toFixed(2)}` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">52W Low</span>
                      <span className="font-medium" data-testid={`modal-52w-low-${stock.symbol}`}>
                        {detailedData?.fiftyTwoWeekLow ? `$${detailedData.fiftyTwoWeekLow.toFixed(2)}` : 'N/A'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sector</span>
                      <Badge variant="secondary">{stock.sector || 'Unknown'}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Exchange</span>
                      <span className="font-medium">{detailedData?.exchange || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Currency</span>
                      <span className="font-medium">{detailedData?.currency || 'USD'}</span>
                    </div>
                    {detailedData?.employees && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Employees</span>
                        <span className="font-medium" data-testid={`modal-employees-${stock.symbol}`}>
                          {detailedData.employees.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {detailedData?.sharesOutstanding && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shares Outstanding</span>
                        <span className="font-medium" data-testid={`modal-shares-outstanding-${stock.symbol}`}>
                          {(detailedData.sharesOutstanding / 1e9).toFixed(2)}B
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Company Description */}
              {detailedData?.description && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Company Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`modal-description-${stock.symbol}`}>
                      {detailedData.description}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="chart" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-5 h-5" />
                      <span>Price Chart</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsFullScreenChart(true)}
                      className="flex items-center space-x-1"
                      data-testid={`expand-chart-${stock.symbol}`}
                    >
                      <Expand className="w-4 h-4" />
                      <span>Full Screen</span>
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full">
                    <StockChart
                      symbol={stock.symbol}
                      currentPrice={stock.currentPrice}
                      width={700}
                      height={400}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-analysis" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="w-5 h-5" />
                    <span>AI-Powered Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StockAIAnalysis symbol={stock.symbol} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="news" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Newspaper className="w-5 h-5" />
                    <span>Latest News</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StockNews symbol={stock.symbol} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chat" className="space-y-4">
              <AIExpertChat symbol={stock.symbol} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
      
      {/* Full Screen Chart Modal */}
      <Dialog open={isFullScreenChart} onOpenChange={setIsFullScreenChart}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-2" data-testid="fullscreen-chart-modal">
          <DialogHeader className="px-4 py-2">
            <DialogTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>{stock.name} ({stock.symbol}) - Interactive Chart</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 px-2 pb-2">
            <StockChart
              symbol={stock.symbol}
              currentPrice={stock.currentPrice}
              width={Math.max(windowSize.width - 50, 800)}
              height={Math.max(windowSize.height - 150, 500)}
              hideControls={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}