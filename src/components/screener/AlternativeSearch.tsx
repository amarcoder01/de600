'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  Search, 
  TrendingUp, 
  Filter,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface AlternativeSuggestion {
  query: string;
  reason: string;
  confidence: number;
  category?: string;
}

interface AlternativeSearchProps {
  originalQuery: string;
  suggestions: AlternativeSuggestion[];
  onSearchSuggestion: (query: string) => void;
  loading?: boolean;
}

const AlternativeSearch: React.FC<AlternativeSearchProps> = ({
  originalQuery,
  suggestions,
  onSearchSuggestion,
  loading = false
}) => {
  if (loading) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
            <span className="ml-3 text-amber-700">Finding alternative suggestions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-amber-800">
            <Lightbulb className="h-5 w-5" />
            <span>No Alternative Suggestions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-amber-700">
            We couldn't find alternative suggestions for your query. 
            Try rephrasing your search or using different criteria.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'sector':
        return <Filter className="h-4 w-4" />;
      case 'performance':
        return <TrendingUp className="h-4 w-4" />;
      case 'ai-enhanced':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-amber-800">
          <Lightbulb className="h-5 w-5" />
          <span>Alternative Search Suggestions</span>
        </CardTitle>
        <p className="text-sm text-amber-700 mt-2">
          Your search for "{originalQuery}" didn't return results. 
          Here are some alternative approaches:
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {suggestions.map((suggestion, index) => (
          <Card key={index} className="border-amber-100 hover:border-amber-300 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between space-x-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(suggestion.category)}
                    <h4 className="font-medium text-amber-900">
                      {suggestion.query}
                    </h4>
                    {suggestion.category && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {suggestion.category}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-amber-700">
                    {suggestion.reason}
                  </p>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-amber-600">Confidence:</span>
                    <Badge 
                      className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}
                      variant="outline"
                    >
                      {getConfidenceLabel(suggestion.confidence)} ({Math.round(suggestion.confidence * 100)}%)
                    </Badge>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSearchSuggestion(suggestion.query)}
                  className="flex items-center space-x-1 border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  <span>Try This</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        <div className="mt-6 p-4 bg-amber-100 rounded-lg border border-amber-200">
          <div className="flex items-start space-x-3">
            <Sparkles className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800 mb-1">
                Tips for Better Results
              </h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Be more specific about sectors (e.g., "technology" instead of "tech")</li>
                <li>• Include numerical ranges (e.g., "P/E ratio under 20")</li>
                <li>• Mention market cap preferences (e.g., "large cap" or "small cap")</li>
                <li>• Add performance criteria (e.g., "high growth" or "dividend paying")</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlternativeSearch;