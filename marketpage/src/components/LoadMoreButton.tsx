import React from 'react';
import { Loader2, ChevronDown } from 'lucide-react';

interface LoadMoreButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({ 
  onClick, 
  loading = false, 
  disabled = false 
}) => {
  return (
    <div className="flex justify-center mt-8 mb-4">
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`
          inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          ${
            disabled || loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:bg-blue-800'
          }
        `}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Loading more stocks...
          </>
        ) : (
          <>
            <ChevronDown className="h-5 w-5 mr-2" />
            Load More Stocks
          </>
        )}
      </button>
    </div>
  );
};

export default LoadMoreButton;