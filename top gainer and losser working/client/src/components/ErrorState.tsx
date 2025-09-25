import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStockStore } from '@/store/stockStore';
import { apiService } from '@/services/api';

export default function ErrorState() {
  const { error, setError, setLoading, setMarketData, setLastRefresh } = useStockStore();

  if (!error) return null;

  const handleRetry = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const data = await apiService.fetchMarketData();
      setMarketData(data);
      setLastRefresh(new Date());
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 mt-8" data-testid="error-state">
      <div className="flex items-center space-x-4">
        <AlertTriangle className="text-destructive text-2xl" />
        <div>
          <h3 className="font-semibold text-foreground">Unable to fetch market data</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <Button 
          onClick={handleRetry}
          className="ml-auto px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors"
          data-testid="button-retry"
        >
          Retry
        </Button>
      </div>
    </div>
  );
}
