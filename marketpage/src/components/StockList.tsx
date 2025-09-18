import React from 'react';
import { Stock } from '../types/stock';
import StockCard from './StockCard';
import { Loader2 } from 'lucide-react';

interface StockListProps {
  stocks: Stock[];
  onStockSelect: (stock: Stock) => void;
  loading?: boolean;
}

const StockList: React.FC<StockListProps> = ({ stocks, onStockSelect, loading = false }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Searching stocks...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {stocks.map((stock) => (
        <StockCard
          key={stock.ticker}
          stock={stock}
          onClick={() => onStockSelect(stock)}
        />
      ))}
    </div>
  );
};

export default StockList;