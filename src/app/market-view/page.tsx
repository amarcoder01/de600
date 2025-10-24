'use client'

import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Filter, ChevronDown, RefreshCw, Play, Pause, BarChart3, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { MarketOverview } from "@/components/market/market-overview"
import { StockCard } from "@/components/market/stock-card"
import { StockSearch } from "@/components/market/stock-search"
import { StockDetailModal } from "@/components/market/stock-detail-modal"
import { stockApi } from "@/lib/market-api"
import type { Stock } from "@/types/market"
import { queryClient } from "@/lib/queryClient"
import { useRouter } from "next/navigation"

function MarketViewContent() {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState("marketCap")
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [allStocks, setAllStocks] = useState<Stock[]>([])
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [hasScrolled, setHasScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setHasScrolled(window.scrollY > 2)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleBack = () => {
    const canGoBack = typeof window !== 'undefined' && ((window.history?.state as any)?.idx ?? 0) > 0
    if (canGoBack) {
      router.back()
    } else {
      router.push('/dashboard')
    }
  }

  const limit = 10

  const { 
    data: stocksData, 
    isLoading, 
    error,
    isRefetching 
  } = useQuery({
    queryKey: ["/api/stocks", currentPage, limit, sortBy],
    queryFn: () => stockApi.getStocks(currentPage, limit, sortBy),
    staleTime: 30000,
  })

  // Handle data accumulation
  useEffect(() => {
    if (stocksData?.stocks) {
      if (currentPage === 1) {
        // Reset for new sort or first load
        setAllStocks(stocksData.stocks)
      } else {
        // Append for load more
        setAllStocks(prev => [...prev, ...stocksData.stocks])
      }
    }
  }, [stocksData, currentPage])

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefreshEnabled) {
      // Use static 30-second refresh interval
      const refreshInterval = 30000;
      
      autoRefreshRef.current = setInterval(() => {
        // Silent refresh to avoid spamming users with toasts
        queryClient.invalidateQueries({ queryKey: ["/api/stocks"] })
        queryClient.invalidateQueries({ queryKey: ["/api/market/indices"] })
      }, refreshInterval)

      return () => {
        if (autoRefreshRef.current) {
          clearInterval(autoRefreshRef.current)
        }
      }
    } else {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current)
        autoRefreshRef.current = null
      }
    }
  }, [autoRefreshEnabled, queryClient, (stocksData as any)?.marketStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current)
      }
    }
  }, [])

  const refreshMutation = useMutation({
    mutationFn: () => stockApi.refreshStockData(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks"] })
      queryClient.invalidateQueries({ queryKey: ["/api/market/indices"] })
      toast({
        title: "Data Refreshed",
        description: "Stock data has been updated with latest information.",
      })
    },
    onError: () => {
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh data.",
        variant: "destructive",
      })
    },
  })

  const handleLoadMore = () => {
    if (stocksData?.hasMore) {
      setCurrentPage(prev => prev + 1)
    }
  }

  // Reset to page 1 when sort changes
  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy)
    setCurrentPage(1)
    setAllStocks([])
  }

  const handleStockClick = (stock: Stock) => {
    setSelectedStock(stock)
    setIsDetailModalOpen(true)
  }

  const handleRefresh = () => {
    refreshMutation.mutate()
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 lg:px-8 py-6">
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-destructive mb-2">
                Unable to Load Data
              </h2>
              <Button onClick={handleRefresh} variant="destructive">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header data-scrolled={hasScrolled} className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-none data-[scrolled=true]:shadow-md transition-shadow">
        <div className="px-4 lg:px-8 flex h-16 items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    aria-label="Go back"
                    className="h-8 w-8 p-0 transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <ArrowLeft className="w-4 h-4 transition-colors hover:text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  Back to dashboard
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <svg 
                  className="w-4 h-4 text-primary-foreground" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight" data-testid="app-title">
              Market View
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {/* Removed refresh and play buttons for cleaner production interface */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 lg:px-8 py-6">
        
        {/* Market Overview */}
        <MarketOverview />

        {/* Search Section */}
        <div className="mb-8">
          <StockSearch onStockSelect={handleStockClick} />
        </div>

        {/* Stock Listings Section */}
        <section>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h2 className="text-2xl font-bold mb-2 sm:mb-0" data-testid="stock-listings-title">
              Stock Listings
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-48" data-testid="select-sort-by">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketCap">Sort by: Market Cap</SelectItem>
                  <SelectItem value="price">Sort by: Price</SelectItem>
                  <SelectItem value="volume">Sort by: Volume</SelectItem>
                  <SelectItem value="changePercent">Sort by: Change %</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stock Cards */}
          <div className="space-y-4" data-testid="stock-list">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: limit }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="w-12 h-12 rounded-lg" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : allStocks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground text-lg">
                    No stock data available. Please check your connection and try refreshing.
                  </p>
                </CardContent>
              </Card>
            ) : (
              allStocks.map((stock: Stock) => (
                <StockCard
                  key={stock.symbol}
                  stock={stock}
                  onClick={() => handleStockClick(stock)}
                />
              ))
            )}
          </div>

          {/* Load More Button */}
          {stocksData?.hasMore && (
            <div className="flex justify-center mt-8" data-testid="load-more-container">
              <Button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="flex items-center space-x-2 shadow-sm hover:shadow-md"
                data-testid="button-load-more"
              >
                <span>Load More Stocks</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          )}

        </section>
      </main>

      {/* Stock Detail Modal */}
      <StockDetailModal
        stock={selectedStock}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  )
}

export default function MarketViewPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <MarketViewContent />
    </QueryClientProvider>
  )
}
