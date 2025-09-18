import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTopGainersLosersStore } from '@/store/topGainersLosersStore';
import { topGainersLosersApiService } from '@/lib/top-gainers-losers-api';

export default function ErrorState() {
  const { error, setError, setLoading, setMarketData, setLastRefresh } = useTopGainersLosersStore();

  if (!error) return null;

  const handleRetry = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const data = await topGainersLosersApiService.fetchMarketData();
      setMarketData(data);
      setLastRefresh(new Date());
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 mt-8" data-testid="error-state">
      <div className="flex items-center space-x-4">
        <AlertTriangle className="text-red-600 text-2xl" />
        <div>
          <h3 className="font-semibold text-foreground">Unable to fetch market data</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <Button 
          onClick={handleRetry}
          className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          data-testid="button-retry"
        >
          Retry
        </Button>
      </div>
    </div>
  );
}
