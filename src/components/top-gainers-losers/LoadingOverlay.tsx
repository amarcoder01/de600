import { useTopGainersLosersStore } from '@/store/topGainersLosersStore';

export default function LoadingOverlay() {
  const { isLoading } = useTopGainersLosersStore();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center" data-testid="loading-overlay">
      <div className="bg-card p-6 rounded-lg shadow-xl flex items-center space-x-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="text-foreground font-medium">Fetching latest market data...</span>
      </div>
    </div>
  );
}
