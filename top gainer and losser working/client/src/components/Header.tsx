import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useStockStore } from '@/store/stockStore';
import StockSearch from '@/components/StockSearch';
import StockDetailsModal from '@/components/StockDetailsModal';
import { StockSearchResult } from '@shared/schema';

export default function Header() {
  const { marketStatus } = useStockStore();
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string | null>(null);

  const handleStockSelect = (stock: StockSearchResult) => {
    setSelectedStockSymbol(stock.symbol);
  };

  const handleCloseModal = () => {
    setSelectedStockSymbol(null);
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="text-primary text-2xl" />
              <h1 className="text-2xl font-bold text-foreground">StockTracker</h1>
            </div>
            <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
              <span>Market Status:</span>
              <div className="flex items-center space-x-1">
                <div 
                  className={`w-2 h-2 rounded-full ${
                    marketStatus?.isOpen ? 'bg-success animate-pulse' : 'bg-destructive'
                  }`}
                />
                <span>{marketStatus?.status || 'Unknown'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <StockSearch onSelectStock={handleStockSelect} />
          </div>
        </div>
      </div>
      
      <StockDetailsModal 
        symbol={selectedStockSymbol} 
        onClose={handleCloseModal} 
      />
    </header>
  );
}
