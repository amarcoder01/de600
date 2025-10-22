'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Brain, Search, Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import ResultsTable from './ResultsTable';
import FilterControls from './FilterControls';
import { ScreenerStock, FilterCriteria, SortConfig } from '../../types/screener';

// History and Saved filters removed per request

interface AlternativeQuery {
  query: string;
  reasoning: string;
}

const SmartScreener: React.FC = () => {
  const { data: session } = useSession();
  const [naturalQuery, setNaturalQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stocks, setStocks] = useState<ScreenerStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedFilters, setParsedFilters] = useState<FilterCriteria | null>(null);
  // Removed: history and saved filters state
  const [alternativeQueries, setAlternativeQueries] = useState<AlternativeQuery[]>([]);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'ticker',
    direction: 'asc',
  });

  // For now, no users have access - will add user validation later
  const hasAccess = false;

  const handleRestrictedAccess = () => {
    toast.error('Smart Screener is available to selected users only.', {
      duration: 4000,
    });
  };

  // Sample queries (kept minimal; expandable for more)
  const sampleQueries = [
    "Find dividend stocks under $50",
    "Tech stocks between $100 and $500",
    "High-volume stocks today"
  ];

  // Removed: effects and loaders for history/saved

  const handleNaturalLanguageSearch = async () => {
    // Check access first
    if (!hasAccess) {
      handleRestrictedAccess();
      return;
    }

    if (!naturalQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setAlternativeQueries([]);
    setShowAlternatives(false);

    try {
      // Step 1: Parse natural language query
      const parseResponse = await fetch('/api/screener/ai-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: naturalQuery })
      });

      if (!parseResponse.ok) {
        throw new Error('Failed to parse query');
      }

      const parseResult = await parseResponse.json();
      setParsedFilters(parseResult.filters);

      // Step 2: Search for stocks using parsed filters
      setLoading(true);
      const searchResponse = await fetch('/api/screener/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: naturalQuery,
          filters: parseResult.filters,
          sort: sortConfig
        })
      });

      if (!searchResponse.ok) {
        throw new Error('Failed to search stocks');
      }

      const searchResult = await searchResponse.json();
      
      if (searchResult.stocks && searchResult.stocks.length > 0) {
        setStocks(searchResult.stocks);
        toast.success(`Found ${searchResult.stocks.length} stocks matching your query`);
      } else {
        // No results found, try alternative search
        await handleAlternativeSearch();
      }
    } catch (error) {
      console.error('Error in natural language search:', error);
      setError(error instanceof Error ? error.message : 'Search failed');
      toast.error('Search failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setLoading(false);
    }
  };

  const handleAlternativeSearch = async () => {
    try {
      const response = await fetch('/api/screener/alternative-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalQuery: naturalQuery,
          sort: sortConfig
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate alternatives');
      }

      const result = await response.json();
      
      if (result.alternatives && result.alternatives.length > 0) {
        setAlternativeQueries(result.alternatives);
        setShowAlternatives(true);
        
        if (result.stocks && result.stocks.length > 0) {
          setStocks(result.stocks);
          toast.success(`Found ${result.stocks.length} stocks using alternative search`);
        } else {
          toast.warning('No stocks found. Try the suggested alternative queries.');
        }
      } else {
        toast.warning('No stocks found and no alternatives available. Try a different query.');
      }
    } catch (error) {
      console.error('Error in alternative search:', error);
      toast.error('Alternative search failed');
    }
  };

  const handleSampleQuery = (query: string) => {
    setNaturalQuery(query);
  };

  const handleAlternativeQuery = (alternative: AlternativeQuery) => {
    setNaturalQuery(alternative.query);
    setShowAlternatives(false);
  };
  // Removed: saved filters (save/apply)

  // Export CSV for current stocks
  const exportCSV = () => {
    try {
      const headers = [
        'ticker','name','price','change','change_percent','volume','market_cap','sector','exchange'
      ];
      const rows = stocks.map(s => [
        s.ticker ?? '', s.name ?? '', s.price ?? '', s.change ?? '', s.change_percent ?? '', s.volume ?? '', s.market_cap ?? '', s.sector ?? '', s.exchange ?? ''
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.map(v => typeof v === 'string' && v.includes(',') ? `"${v}"` : v).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'screener-results.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header (compact, production-friendly) */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Brain className="h-6 w-6 text-blue-600 hidden sm:inline" aria-hidden="true" focusable="false" />
          Smart Stock Screener
        </h1>
        {!hasAccess && (
          <p className="text-sm text-muted-foreground">Available to selected users only.</p>
        )}
      </div>

      {/* Access Restriction Notice */}
      {!hasAccess && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="pt-6">
            <p className="text-sm text-orange-700">Available to selected users only.</p>
          </CardContent>
        </Card>
      )}

      {/* Main Search Interface */}
      <Card className={!hasAccess ? "opacity-75" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" aria-hidden="true" focusable="false" />
            Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-col sm:flex-row">
            <Textarea
              placeholder={hasAccess ? 
                "e.g., find stocks priced between 100 and 1500, dividend stocks under 50, high volume tech..." :
                "Selected users only"
              }
              value={naturalQuery}
              onChange={(e) => hasAccess && setNaturalQuery(e.target.value)}
              className="min-h-[72px] resize-none"
              disabled={!hasAccess}
              onKeyDown={(e) => {
                if (hasAccess && e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleNaturalLanguageSearch();
                }
              }}
            />
            <div className="flex flex-row sm:flex-col gap-2">
              <Button 
                onClick={hasAccess ? handleNaturalLanguageSearch : handleRestrictedAccess}
                disabled={isProcessing || !naturalQuery.trim()}
                variant={hasAccess ? "default" : "outline"}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Searching...
                  </div>
                ) : hasAccess ? (
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4" aria-hidden="true" focusable="false" />
                    Search Stocks
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Selected Users Only
                  </div>
                )}
              </Button>
              {/* Removed saved filter button */}
            </div>
          </div>

          {/* Samples removed from top per request */}
        </CardContent>
      </Card>

      {/* Parsed Filters (compact badges) */}
      {parsedFilters && (
        <div className="flex flex-wrap gap-2">
          {parsedFilters.search && (
            <Badge variant="outline"><Filter className="h-3 w-3 mr-1" aria-hidden="true" focusable="false" />{parsedFilters.search}</Badge>
          )}
          {typeof parsedFilters.priceMin === 'number' && (
            <Badge variant="outline">Min ${parsedFilters.priceMin}</Badge>
          )}
          {typeof parsedFilters.priceMax === 'number' && (
            <Badge variant="outline">Max ${parsedFilters.priceMax}</Badge>
          )}
          {typeof parsedFilters.marketCapMin === 'number' && (
            <Badge variant="outline">Cap ≥ {parsedFilters.marketCapMin}M</Badge>
          )}
          {typeof parsedFilters.marketCapMax === 'number' && (
            <Badge variant="outline">Cap ≤ {parsedFilters.marketCapMax}M</Badge>
          )}
          {typeof parsedFilters.volumeMin === 'number' && (
            <Badge variant="outline">Vol ≥ {parsedFilters.volumeMin.toLocaleString()}</Badge>
          )}
          {parsedFilters.sector && parsedFilters.sector !== 'all' && (
            <Badge variant="outline">{parsedFilters.sector}</Badge>
          )}
          {parsedFilters.exchange && parsedFilters.exchange !== 'all' && (
            <Badge variant="outline">{parsedFilters.exchange}</Badge>
          )}
        </div>
      )}

      {/* Alternative Queries */}
      {showAlternatives && alternativeQueries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alternative Search Suggestions</CardTitle>
            <CardDescription>
              No results found for your query. Try these alternatives:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alternativeQueries.map((alt, index) => (
                <div key={index} className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                     onClick={() => handleAlternativeQuery(alt)}>
                  <div className="font-medium">{alt.query}</div>
                  <div className="text-sm text-muted-foreground mt-1">{alt.reasoning}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Results only (History and Saved removed) */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="search">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          {error && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-red-600">{error}</div>
              </CardContent>
            </Card>
          )}
          
          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2">Searching stocks...</span>
                </div>
              </CardContent>
            </Card>
          ) : stocks.length > 0 ? (
            <ResultsTable 
              stocks={stocks} 
              sortConfig={sortConfig}
              onSort={(field) => {
                setSortConfig(prev => ({
                  field,
                  direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
                }));
              }}
              loading={false}
              onLoadMore={() => {}}
              hasMore={false}
              loadingMore={false}
              onExportCSV={exportCSV}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Start by typing a query above, then press Enter.
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Bottom prompt suggestions */}
      <div className="pt-2">
        <div className="text-xs text-muted-foreground mb-2">Try these prompts:</div>
        <div className="flex flex-wrap gap-2">
          {sampleQueries.map((query, index) => (
            <Badge 
              key={index}
              variant="secondary" 
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => handleSampleQuery(query)}
            >
              {query}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SmartScreener;