import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Clock, User, AlertCircle, Newspaper } from "lucide-react";
import { StockNewsResponse, NewsArticle } from "@/types/market";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StockNewsProps {
  symbol: string;
}

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

const getSourceColor = (source: string): string => {
  const colors: { [key: string]: string } = {
    'Yahoo Finance': 'bg-purple-100 text-purple-800 border-purple-200',
    'Reuters': 'bg-blue-100 text-blue-800 border-blue-200',
    'MarketWatch': 'bg-green-100 text-green-800 border-green-200',
    'Bloomberg': 'bg-orange-100 text-orange-800 border-orange-200',
    'CNBC': 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[source] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export default function StockNews({ symbol }: StockNewsProps) {
  const { data: newsData, isLoading, error } = useQuery<StockNewsResponse>({
    queryKey: ['/api/stocks', symbol, 'news'],
    enabled: !!symbol,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-3">
            <Newspaper className="w-6 h-6 animate-pulse text-primary" />
            <div className="text-lg font-medium">Loading news...</div>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded" />
                    <div className="h-3 bg-muted rounded w-5/6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-500" />
        <AlertDescription className="text-red-700">
          Unable to load news.
        </AlertDescription>
      </Alert>
    );
  }

  if (!newsData || !newsData.articles || newsData.articles.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <div className="text-center space-y-2">
          <Newspaper className="w-12 h-12 mx-auto opacity-50" />
          <h3 className="text-lg font-medium">No news available</h3>
          <p className="text-sm">No recent news found for {symbol}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="stock-news-content">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Newspaper className="w-5 h-5 text-primary" />
          <span className="font-medium">Latest News</span>
          <Badge variant="secondary" data-testid="news-count">
            {newsData.articles.length} articles
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        {newsData.articles.map((article: NewsArticle, index: number) => (
          <Card key={index} className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header with time only */}
                <div className="flex items-center justify-end">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-3 h-3 mr-1" />
                    <span data-testid={`news-time-${index}`}>
                      {formatTimeAgo(article.publishedAt)}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 
                  className="text-lg font-semibold leading-tight line-clamp-2"
                  data-testid={`news-title-${index}`}
                >
                  {article.title}
                </h3>

                {/* Summary */}
                {article.summary && (
                  <p 
                    className="text-sm text-muted-foreground leading-relaxed line-clamp-3"
                    data-testid={`news-summary-${index}`}
                  >
                    {article.summary}
                  </p>
                )}

                {/* Footer with related symbols and read more */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-2">
                    {article.relatedSymbols && article.relatedSymbols.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-muted-foreground">Related:</span>
                        {article.relatedSymbols.slice(0, 3).map((relatedSymbol: string, idx: number) => (
                          <Badge 
                            key={idx} 
                            variant="outline" 
                            className="text-xs px-1 py-0"
                            data-testid={`related-symbol-${index}-${idx}`}
                          >
                            {relatedSymbol}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {article.url && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
                      data-testid={`news-link-${index}`}
                    >
                      Read more
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer removed for cleaner production interface */}
    </div>
  );
}