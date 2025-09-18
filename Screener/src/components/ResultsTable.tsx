import React from 'react';
import { ChevronUp, ChevronDown, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { ScreenerStock, SortConfig, SortDirection } from '../types/stock';

interface ResultsTableProps {
  stocks: ScreenerStock[];
  loading: boolean;
  sortConfig: SortConfig;
  onSort: (field: keyof ScreenerStock) => void;
  onExportCSV: () => void;
}

const ResultsTable: React.FC<ResultsTableProps> = ({
  stocks,
  loading,
  sortConfig,
  onSort,
  onExportCSV,
}) => {
  const formatNumber = (value: number | undefined, decimals = 2): string => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatMarketCap = (value: number | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatVolume = (value: number | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toLocaleString();
  };

  const formatPercentage = (value: number | undefined): string => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    const formatted = `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    return formatted;
  };

  const getPercentageColor = (value: number | undefined): string => {
    if (value === undefined || value === null || isNaN(value)) return 'text-gray-500';
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getSortIcon = (field: keyof ScreenerStock) => {
    if (sortConfig.key !== field) {
      return <ChevronUp className="w-4 h-4 text-gray-400" />;
    }
    
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-600" />
      : <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  const columns = [
    { field: 'ticker' as keyof ScreenerStock, label: 'Symbol', width: 'w-20' },
    { field: 'name' as keyof ScreenerStock, label: 'Company Name', width: 'w-48' },
    { field: 'price' as keyof ScreenerStock, label: 'Price', width: 'w-24' },
    { field: 'change' as keyof ScreenerStock, label: 'Change', width: 'w-24' },
    { field: 'changePercent' as keyof ScreenerStock, label: 'Change %', width: 'w-24' },
    { field: 'volume' as keyof ScreenerStock, label: 'Volume', width: 'w-24' },
    { field: 'marketCap' as keyof ScreenerStock, label: 'Market Cap', width: 'w-28' },
    { field: 'sector' as keyof ScreenerStock, label: 'Sector', width: 'w-32' },
    { field: 'exchange' as keyof ScreenerStock, label: 'Exchange', width: 'w-20' },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading stocks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Screening Results
            </h2>
            <p className="text-sm text-gray-600">
              {stocks.length} stocks found with real-time data
            </p>
          </div>
          <button
            onClick={onExportCSV}
            disabled={stocks.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.field}
                  className={`${column.width} px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors`}
                  onClick={() => onSort(column.field)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {getSortIcon(column.field)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stocks.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <TrendingUp className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-lg font-medium">No stocks found</p>
                    <p className="text-sm">Try adjusting your filters to see more results</p>
                  </div>
                </td>
              </tr>
            ) : (
              stocks.map((stock) => (
                <tr key={stock.ticker} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {stock.ticker}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 truncate max-w-48" title={stock.name}>
                      {stock.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${formatNumber(stock.price)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium flex items-center gap-1 ${getPercentageColor(stock.change)}`}>
                      {stock.change !== undefined && stock.change !== null && !isNaN(stock.change) && (
                        stock.change >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )
                      )}
                      {stock.change !== undefined && stock.change !== null && !isNaN(stock.change) 
                        ? `${stock.change >= 0 ? '+' : ''}$${formatNumber(Math.abs(stock.change))}`
                        : 'N/A'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getPercentageColor(stock.changePercent)}`}>
                      {formatPercentage(stock.changePercent)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatVolume(stock.volume)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatMarketCap(stock.marketCap)}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 truncate max-w-32" title={stock.sector}>
                      {stock.sector || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {stock.exchange}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;