'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles, Clock, X } from 'lucide-react';

interface QueryHistory {
  id: string;
  query: string;
  parsedFilters: any;
  resultCount: number;
  createdAt: string;
}

interface AIQueryInputProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  queryHistory?: QueryHistory[];
  onClearHistory?: () => void;
}

const AIQueryInput: React.FC<AIQueryInputProps> = ({
  onSearch,
  loading = false,
  queryHistory = [],
  onClearHistory
}) => {
  const [query, setQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      onSearch(query.trim());
    }
  };

  const handleHistoryClick = (historicalQuery: string) => {
    setQuery(historicalQuery);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const exampleQueries = [
    "Find tech stocks with high growth",
    "Show me dividend stocks under $50",
    "Large cap stocks with low P/E ratio",
    "Energy stocks with strong momentum",
    "Small cap growth stocks"
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" focusable="false" />
                <h3 className="text-lg font-semibold">Ask in Natural Language</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Describe what you're looking for and let AI find the right stocks
              </p>
            </div>
            
            <div className="relative">
              <Input
                ref={inputRef}
                type="text"
                placeholder="e.g., Find tech stocks with high growth and low debt"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowHistory(true)}
                className="pr-12 text-base"
                disabled={loading}
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0"
                disabled={!query.trim() || loading}
              >
                <Search className="h-4 w-4" aria-hidden="true" focusable="false" />
              </Button>
            </div>

            {/* Example Queries */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Try these examples:</p>
              <div className="flex flex-wrap gap-2">
                {exampleQueries.map((example, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => {
                      setQuery(example);
                      inputRef.current?.focus();
                    }}
                  >
                    {example}
                  </Badge>
                ))}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Query History */}
      {showHistory && queryHistory.length > 0 && (
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" focusable="false" />
                <h4 className="text-sm font-medium">Recent Searches</h4>
              </div>
              <div className="flex items-center space-x-2">
                {onClearHistory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearHistory}
                    className="text-xs h-6 px-2"
                  >
                    Clear All
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" aria-hidden="true" focusable="false" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {queryHistory.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleHistoryClick(item.query)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.query}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.resultCount} results • {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Search className="h-3 w-3 text-muted-foreground ml-2 flex-shrink-0" aria-hidden="true" focusable="false" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIQueryInput;