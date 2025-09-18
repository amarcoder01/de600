import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import StockSearch from '@/components/top-gainers-losers/StockSearch';
import StockDetailsModal from '@/components/top-gainers-losers/StockDetailsModal';
import { StockSearchResult } from '@/types/top-gainers-losers';

export default function Header() {
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
              <h1 className="text-2xl font-bold text-foreground">Top Gainers & Losers</h1>
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
