import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, TrendingUp, PieChart } from "lucide-react";

interface ChartPlaceholderProps {
  className?: string;
}

export function ChartPlaceholder({ className }: ChartPlaceholderProps) {
  return (
    <Card className={`bg-gradient-to-br from-card to-muted/30 border-dashed ${className}`}>
      <CardContent className="p-8">
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-4">
              <BarChart3 className="w-8 h-8 opacity-50" />
              <TrendingUp className="w-8 h-8 opacity-50" />
              <PieChart className="w-8 h-8 opacity-50" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium">Charts</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground/60 max-w-sm">
              <div className="space-y-1">
                <div className="font-medium">Charts</div>
                <div>Candlestick</div>
                <div>Line Charts</div>
                <div>Volume</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">Indicators</div>
                <div>Moving Avg</div>
                <div>RSI</div>
                <div>MACD</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">Analysis</div>
                <div>Trends</div>
                <div>Patterns</div>
                <div>Alerts</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}