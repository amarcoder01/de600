import { useQuery } from "@tanstack/react-query";
import { 
  Brain, TrendingUp, TrendingDown, Minus, CheckCircle, AlertTriangle, XCircle, Target, BarChart3,
  DollarSign, Activity, Clock, Users, Newspaper, Volume2, Lightbulb, TrendingUpDown
} from "lucide-react";
import { StockAnalysis } from "@/types/stock";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// Safe text formatting function to prevent XSS attacks
function formatAnalysisText(text: string): React.ReactNode[] {
  if (!text) return [];
  
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  return lines.map((line, index) => {
    const trimmedLine = line.trim();
    
    // Handle bullet points
    if (trimmedLine.startsWith('• ')) {
      return (
        <div key={index} className="flex items-start space-x-2 mb-2">
          <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
          <span className="text-sm">{trimmedLine.substring(2)}</span>
        </div>
      );
    }
    
    // Handle bold text
    const parts = trimmedLine.split(/(\*\*.*?\*\*)/);
    const formattedParts = parts.map((part, partIndex) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={partIndex} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    
    return (
      <div key={index} className="mb-2">
        <span className="text-sm">{formattedParts}</span>
      </div>
    );
  });
}

interface StockAIAnalysisProps {
  symbol: string;
}

const getSentimentIcon = (sentiment: string) => {
  switch (sentiment) {
    case 'bullish': return <TrendingUp className="w-4 h-4 text-green-500" />;
    case 'bearish': return <TrendingDown className="w-4 h-4 text-red-500" />;
    default: return <Minus className="w-4 h-4 text-gray-500" />;
  }
};

const getSentimentColor = (sentiment: string) => {
  switch (sentiment) {
    case 'bullish': return 'text-green-600 bg-green-50 border-green-200';
    case 'bearish': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getRiskIcon = (riskLevel: string) => {
  switch (riskLevel) {
    case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'medium': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'high': return <XCircle className="w-4 h-4 text-red-500" />;
    default: return <AlertTriangle className="w-4 h-4 text-gray-500" />;
  }
};

const getRiskColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'low': return 'text-green-600 bg-green-50 border-green-200';
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'high': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getRecommendationIcon = (recommendation: string) => {
  switch (recommendation) {
    case 'buy': return <TrendingUp className="w-4 h-4 text-green-500" />;
    case 'sell': return <TrendingDown className="w-4 h-4 text-red-500" />;
    default: return <Target className="w-4 h-4 text-blue-500" />;
  }
};

const getRecommendationColor = (recommendation: string) => {
  switch (recommendation) {
    case 'buy': return 'text-green-600 bg-green-50 border-green-200';
    case 'sell': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-blue-600 bg-blue-50 border-blue-200';
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'uptrend': return <TrendingUp className="w-4 h-4 text-green-500" />;
    case 'downtrend': return <TrendingDown className="w-4 h-4 text-red-500" />;
    default: return <TrendingUpDown className="w-4 h-4 text-gray-500" />;
  }
};

export default function StockAIAnalysis({ symbol }: StockAIAnalysisProps) {
  const { data: analysis, isLoading, error } = useQuery<StockAnalysis>({
    queryKey: [`/api/stocks/${symbol}/analysis`],
    enabled: !!symbol,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 animate-pulse text-primary" />
            <div className="text-lg font-medium">Analyzing {symbol}...</div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <AlertDescription className="text-red-700">
          Unable to analyze {symbol}.
        </AlertDescription>
      </Alert>
    );
  }

  if (!analysis) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <div className="text-center space-y-2">
          <BarChart3 className="w-12 h-12 mx-auto opacity-50" />
          <p>No analysis available for {symbol}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="ai-analysis-content">
      {/* Analysis Header with Timestamp */}
      <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-primary">AI Expert Analysis for {symbol}</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {analysis?.analysisTimestamp 
            ? `Generated ${new Date(analysis.analysisTimestamp).toLocaleString()}`
            : 'Analysis in progress...'
          }
        </div>
      </div>
      
      {/* Analysis Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                {getSentimentIcon(analysis.sentiment)}
                <span className="text-sm font-medium">Sentiment</span>
              </div>
              <Badge className={getSentimentColor(analysis.sentiment)} data-testid={`sentiment-${analysis.sentiment}`}>
                {analysis.sentiment}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                {getRiskIcon(analysis.riskLevel)}
                <span className="text-sm font-medium">Risk Level</span>
              </div>
              <Badge className={getRiskColor(analysis.riskLevel)} data-testid={`risk-${analysis.riskLevel}`}>
                {analysis.riskLevel}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                {getRecommendationIcon(analysis.recommendation)}
                <span className="text-sm font-medium">Recommendation</span>
              </div>
              <Badge className={getRecommendationColor(analysis.recommendation)} data-testid={`recommendation-${analysis.recommendation}`}>
                {analysis.recommendation.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Confidence</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-sm font-semibold">{Math.round(analysis.confidence * 100)}%</div>
                <Progress value={analysis.confidence * 100} className="flex-1 h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="strategy" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="targets">Targets</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="strategy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5" />
                <span>Trading Strategy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm leading-relaxed">
                  {formatAnalysisText(analysis.tradingStrategy)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-green-600">Bullish Entry Point</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      {formatAnalysisText(analysis.entryPoints.bullish)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-red-600">Bearish Entry Point</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      {formatAnalysisText(analysis.entryPoints.bearish)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center space-x-2">
                  <Target className="w-4 h-4" />
                  <span>Key Points</span>
                </h4>
                <ul className="space-y-2">
                  {analysis.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Technical Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">${analysis.technicalAnalysis.support.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Support Level</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">${analysis.technicalAnalysis.resistance.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Resistance Level</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-1">
                        {getTrendIcon(analysis.technicalAnalysis.trend)}
                        <span className="text-lg font-bold capitalize">{analysis.technicalAnalysis.trend}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">Current Trend</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center space-x-2">
                  <Activity className="w-4 h-4" />
                  <span>Momentum Analysis</span>
                </h4>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm">{analysis.technicalAnalysis.momentum}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center space-x-2">
                    <Volume2 className="w-4 h-4" />
                    <span>Volume Analysis</span>
                  </h4>
                  <div className="p-3 bg-muted/30 rounded">
                    <p className="text-sm">{analysis.volumeAnalysis}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center space-x-2">
                    <Newspaper className="w-4 h-4" />
                    <span>News Impact</span>
                  </h4>
                  <div className="p-3 bg-muted/30 rounded">
                    <p className="text-sm">{analysis.newsImpact}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5" />
                <span>Price Targets & Risk Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-green-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">${analysis.priceTargets.conservative.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Conservative Target</div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">${analysis.priceTargets.optimistic.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Optimistic Target</div>
                  </CardContent>
                </Card>

                <Card className="border-red-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">${analysis.priceTargets.stopLoss.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Stop Loss</div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Risk Factors</span>
                </h4>
                <ul className="space-y-2">
                  {analysis.riskFactors.map((risk, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Market Context</span>
                </h4>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm leading-relaxed">{analysis.marketContext}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Time Horizon Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-orange-600">Short Term (1-7 days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      {formatAnalysisText(analysis.timeHorizon.shortTerm)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-blue-600">Medium Term (1-3 months)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      {formatAnalysisText(analysis.timeHorizon.mediumTerm)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-purple-600">Long Term (6+ months)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      {formatAnalysisText(analysis.timeHorizon.longTerm)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5" />
                <span>Fundamental Insights & Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold">Key Fundamental Factors</h4>
                <ul className="space-y-2">
                  {analysis.fundamentalInsights.map((insight, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Competitor Comparison</span>
                </h4>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm leading-relaxed">{analysis.competitorComparison}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center space-x-2">
                  <Brain className="w-4 h-4" />
                  <span>Expert Reasoning</span>
                </h4>
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="text-sm leading-relaxed">
                    {formatAnalysisText(analysis.reasoning)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}