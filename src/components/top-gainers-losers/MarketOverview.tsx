import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTopGainersLosersStore } from '@/store/topGainersLosersStore';
import { Card, CardContent } from '@/components/ui/card';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

const formatChange = (change: number, changePercent: number) => {
  const sign = change >= 0 ? '+' : '';
  const formattedChange = Math.abs(change).toFixed(2);
  const formattedPercent = Math.abs(changePercent).toFixed(2);
  
  return `${sign}${formattedChange} (${sign}${formattedPercent}%)`;
};

export default function MarketOverview() {
  const { marketData } = useTopGainersLosersStore();
  const indices = marketData?.indices || {};

  const indexData = [
    {
      key: 'sp500',
      label: 'S&P 500',
      data: indices.sp500,
    },
    {
      key: 'nasdaq',
      label: 'NASDAQ',
      data: indices.nasdaq,
    },
    {
      key: 'dow',
      label: 'DOW',
      data: indices.dow,
    },
    {
      key: 'vix',
      label: 'VIX',
      data: indices.vix,
    },
  ];

  return (
    <section className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {indexData.map(({ key, label, data }) => {
          const isPositive = (data?.change || 0) >= 0;
          const isVix = key === 'vix';
          
          return (
            <Card key={key} className="hover:shadow-lg transition-shadow duration-200" data-testid={`card-index-${key}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold text-foreground" data-testid={`text-price-${key}`}>
                      {data ? formatPrice(data.price) : '---'}
                    </p>
                    {data && (
                      <p 
                        className={`text-sm font-medium flex items-center ${
                          isPositive ? 'text-green-600' : 'text-red-600'
                        }`}
                        data-testid={`text-change-${key}`}
                      >
                        {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                        {formatChange(data.change, data.changePercent)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
