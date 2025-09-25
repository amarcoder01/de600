'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Brain, Search, Sparkles, History, BookmarkPlus, Filter } from 'lucide-react';
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

interface QueryHistory {
  id: string;
  query: string;
  parsedFilters: FilterCriteria;
  resultCount: number;
  createdAt: string;
}

interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  filters: FilterCriteria;
  createdAt: string;
}

interface AlternativeQuery {
  query: string;
  reasoning: string;
}

const SmartScreener: React.FC = () => {
  const [naturalQuery, setNaturalQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stocks, setStocks] = useState<ScreenerStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedFilters, setParsedFilters] = useState<FilterCriteria | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [alternativeQueries, setAlternativeQueries] = useState<AlternativeQuery[]>([]);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'ticker',
    direction: 'asc',
  });

  // Sample queries (kept minimal; expandable for more)
  const sampleQueries = [
    "Find dividend stocks under $50",
    "Tech stocks between $100 and $500",
    "High-volume stocks today"
  ];

  // Load query history and saved filters on component mount
  useEffect(() => {
    loadQueryHistory();
    loadSavedFilters();
  }, []);

  const loadQueryHistory = async () => {
    try {
      const response = await fetch('/api/screener/query-history');
      if (response.ok) {
        const history = await response.json();
        setQueryHistory(history.slice(0, 10)); // Show last 10 queries
      }
    } catch (error) {
      console.error('Error loading query history:', error);
    }
  };

  const loadSavedFilters = async () => {
    try {
      const response = await fetch('/api/screener/saved-filters');
      if (response.ok) {
        const filters = await response.json();
        setSavedFilters(filters);
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  };

  const handleNaturalLanguageSearch = async () => {
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
        
        // Refresh query history
        loadQueryHistory();
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

  const handleHistoryQuery = (historyItem: QueryHistory) => {
    setNaturalQuery(historyItem.query);
    setParsedFilters(historyItem.parsedFilters);
  };

  const handleAlternativeQuery = (alternative: AlternativeQuery) => {
    setNaturalQuery(alternative.query);
    setShowAlternatives(false);
  };

  const saveCurrentFilter = async () => {
    if (!parsedFilters || !naturalQuery.trim()) {
      toast.error('No filter to save');
      return;
    }

    const name = prompt('Enter a name for this filter:');
    if (!name) return;

    try {
      const response = await fetch('/api/screener/saved-filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: naturalQuery,
          filters: parsedFilters
        })
      });

      if (response.ok) {
        toast.success('Filter saved successfully');
        loadSavedFilters();
      } else {
        throw new Error('Failed to save filter');
      }
    } catch (error) {
      console.error('Error saving filter:', error);
      toast.error('Failed to save filter');
    }
  };

  const applySavedFilter = (savedFilter: SavedFilter) => {
    setNaturalQuery(savedFilter.description || savedFilter.name);
    setParsedFilters(savedFilter.filters);
  };

  return (
    <div className="space-y-6">
      {/* Header (compact, production-friendly) */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Brain className="h-6 w-6 text-blue-600 hidden sm:inline" />
          Smart Stock Screener
          <Sparkles className="h-5 w-5 text-yellow-500 hidden sm:inline" />
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Type what you want. Example: "find stocks priced between 100 and 1500" or "dividend stocks under 50".
        </p>
      </div>

      {/* Main Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-col sm:flex-row">
            <Textarea
              placeholder="e.g., find stocks priced between 100 and 1500, dividend stocks under 50, high volume tech..."
              value={naturalQuery}
              onChange={(e) => setNaturalQuery(e.target.value)}
              className="min-h-[72px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleNaturalLanguageSearch();
                }
              }}
            />
            <div className="flex flex-row sm:flex-col gap-2">
              <Button 
                onClick={handleNaturalLanguageSearch}
                disabled={isProcessing || !naturalQuery.trim()}
                className="sm:h-20 h-11"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Searching...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Search Stocks
                  </div>
                )}
              </Button>
              {parsedFilters && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={saveCurrentFilter}
                  className="h-11 sm:h-10"
                >
                  <BookmarkPlus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Sample Queries (collapsible to reduce noise) */}
          <div className="space-y-2">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowExamples((s) => !s)}
            >
              {showExamples ? 'Hide examples' : 'Show examples'}
            </button>
            {showExamples && (
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parsed Filters (compact badges) */}
      {parsedFilters && (
        <div className="flex flex-wrap gap-2">
          {parsedFilters.search && (
            <Badge variant="outline"><Filter className="h-3 w-3 mr-1" />{parsedFilters.search}</Badge>
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

      {/* Tabs for Results, History, and Saved Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search">Results</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
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
              onExportCSV={() => {}}
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

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Queries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {queryHistory.length > 0 ? (
                <div className="space-y-3">
                  {queryHistory.map((item) => (
                    <div key={item.id} className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                         onClick={() => handleHistoryQuery(item)}>
                      <div className="font-medium">{item.query}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {item.resultCount} results • {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No query history yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookmarkPlus className="h-5 w-5" />
                Saved Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              {savedFilters.length > 0 ? (
                <div className="space-y-3">
                  {savedFilters.map((filter) => (
                    <div key={filter.id} className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                         onClick={() => applySavedFilter(filter)}>
                      <div className="font-medium">{filter.name}</div>
                      {filter.description && (
                        <div className="text-sm text-muted-foreground mt-1">{filter.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-2">
                        Saved {new Date(filter.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No saved filters yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SmartScreener;