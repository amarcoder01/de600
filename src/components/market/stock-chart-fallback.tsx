import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StockChartFallbackProps {
  symbol: string;
  currentPrice: number;
  width?: number;
  height?: number;
}

interface ChartDataPoint {
  date: string;
  price: number;
  volume: number;
}

export function StockChartFallback({ symbol, currentPrice, width = 700, height = 400 }: StockChartFallbackProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Generate sample chart data for demonstration
    const generateSampleData = () => {
      const data: ChartDataPoint[] = [];
      const basePrice = currentPrice || 100;
      const today = new Date();
      
      for (let i = 30; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Generate realistic price movement
        const randomChange = (Math.random() - 0.5) * (basePrice * 0.05);
        const price = i === 0 ? currentPrice : basePrice + randomChange * (i / 30);
        
        data.push({
          date: date.toLocaleDateString(),
          price: Math.max(price, basePrice * 0.8),
          volume: Math.floor(Math.random() * 1000000) + 500000
        });
      }
      
      return data;
    };

    // Simulate loading delay
    setTimeout(() => {
      setChartData(generateSampleData());
      setIsLoading(false);
    }, 1000);
  }, [symbol, currentPrice]);

  if (isLoading) {
    return (
      <div 
        style={{ width: '100%', height: `${height}px` }}
        className="flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 rounded-lg border border-dashed"
      >
        <div className="text-center p-6">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg font-medium text-gray-700 mb-2">Loading Chart Data...</div>
          <div className="text-sm text-gray-600">Fetching {symbol} price history</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ width: '100%', height: `${height}px` }}
      className="bg-white rounded-lg border shadow-sm"
    >
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{symbol}</h3>
            <p className="text-sm text-gray-500">30-Day Price Chart</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">${currentPrice?.toFixed(2)}</div>
            <div className="text-sm text-green-600">Current Price</div>
          </div>
        </div>
      </div>
      
      <div className="p-4" style={{ height: `${height - 100}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#666"
              fontSize={12}
              tick={{ fill: '#666' }}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tick={{ fill: '#666' }}
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: any, name: string) => [
                name === 'price' ? `$${value.toFixed(2)}` : value.toLocaleString(),
                name === 'price' ? 'Price' : 'Volume'
              ]}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="px-4 pb-4">
        <div className="text-xs text-gray-500 text-center">
          Fallback chart • Data for demonstration purposes
        </div>
      </div>
    </div>
  );
}
