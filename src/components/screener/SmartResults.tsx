'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Eye,
  Star,
  StarOff,
  ExternalLink,
  Filter,
  Save
} from 'lucide-react';
import Link from 'next/link';

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  peRatio?: number;
  dividendYield?: number;
  sector?: string;
  industry?: string;
}

interface SmartResultsProps {
  results: Stock[];
  query: string;
  parsedFilters?: any;
  loading?: boolean;
  onSaveFilter?: (name: string, description: string) => void;
  onAddToWatchlist?: (symbol: string) => void;
  watchlistSymbols?: string[];
}

const SmartResults: React.FC<SmartResultsProps> = ({
  results,
  query,
  parsedFilters,
  loading = false,
  onSaveFilter,
  onAddToWatchlist,
  watchlistSymbols = []
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');

  const formatNumber = (num: number): string => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
    return volume.toString();
  };

  const handleSaveFilter = () => {
    if (onSaveFilter && filterName.trim()) {
      onSaveFilter(filterName.trim(), filterDescription.trim());
      setShowSaveDialog(false);
      setFilterName('');
      setFilterDescription('');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Analyzing your query...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
            <p className="text-muted-foreground">
              No stocks match your criteria. Try adjusting your search or check alternative suggestions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Search Results</span>
                <Badge variant="secondary">{results.length} stocks</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Results for: "{query}"
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {onSaveFilter && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveDialog(true)}
                  className="flex items-center space-x-1"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Filter</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {parsedFilters && (
          <CardContent className="pt-0">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Applied filters:</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(parsedFilters).map(([key, value]) => (
                  <Badge key={key} variant="outline" className="text-xs">
                    {key}: {String(value)}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Results Grid */}
      <div className="grid gap-4">
        {results.map((stock) => {
          const isInWatchlist = watchlistSymbols.includes(stock.symbol);
          const isPositive = stock.change >= 0;
          
          return (
            <Card key={stock.symbol} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div>
                        <h3 className="text-lg font-semibold">{stock.symbol}</h3>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {stock.name}
                        </p>
                      </div>
                      {stock.sector && (
                        <Badge variant="secondary" className="text-xs">
                          {stock.sector}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="text-lg font-semibold">
                          ${stock.price.toFixed(2)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Change</p>
                        <div className={`flex items-center space-x-1 ${
                          isPositive ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {isPositive ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span className="font-medium">
                            {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Volume</p>
                        <p className="font-medium">{formatVolume(stock.volume)}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Market Cap</p>
                        <p className="font-medium">{formatNumber(stock.marketCap)}</p>
                      </div>
                    </div>
                    
                    {(stock.peRatio || stock.dividendYield) && (
                      <>
                        <Separator className="my-4" />
                        <div className="grid grid-cols-2 gap-4">
                          {stock.peRatio && (
                            <div>
                              <p className="text-sm text-muted-foreground">P/E Ratio</p>
                              <p className="font-medium">{stock.peRatio.toFixed(2)}</p>
                            </div>
                          )}
                          {stock.dividendYield && (
                            <div>
                              <p className="text-sm text-muted-foreground">Dividend Yield</p>
                              <p className="font-medium">{stock.dividendYield.toFixed(2)}%</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <Link href={`/chart/${stock.symbol}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    
                    {onAddToWatchlist && (
                      <Button
                        variant={isInWatchlist ? "default" : "outline"}
                        size="sm"
                        onClick={() => onAddToWatchlist(stock.symbol)}
                        className="w-full"
                      >
                        {isInWatchlist ? (
                          <><StarOff className="h-4 w-4 mr-1" />Remove</>
                        ) : (
                          <><Star className="h-4 w-4 mr-1" />Watch</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Save Filter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Filter Name</label>
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="e.g., High Growth Tech Stocks"
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (Optional)</label>
              <textarea
                value={filterDescription}
                onChange={(e) => setFilterDescription(e.target.value)}
                placeholder="Describe this filter..."
                className="w-full mt-1 px-3 py-2 border rounded-md h-20 resize-none"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveFilter}
                disabled={!filterName.trim()}
              >
                Save Filter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartResults;