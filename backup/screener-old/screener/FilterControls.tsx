'use client';

import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { FilterCriteria } from '@/types/screener';

interface FilterControlsProps {
  filters: FilterCriteria;
  onFilterChange: (filters: FilterCriteria) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  onSearch: (searchTerm: string) => void;
  loading?: boolean;
  searchLoading?: boolean;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  onSearch,
  loading = false,
  searchLoading = false,
}) => {
  const handleInputChange = (field: keyof FilterCriteria, value: string | number | undefined) => {
    const newFilters = {
      ...filters,
      [field]: value === '' ? undefined : value,
    };
    onFilterChange(newFilters);
  };

  const handleSearchChange = (value: string) => {
    handleInputChange('search', value);
    onSearch(value);
  };

  const sectors = [
    'Technology',
    'Healthcare',
    'Financial Services',
    'Consumer Cyclical',
    'Communication Services',
    'Industrials',
    'Consumer Defensive',
    'Energy',
    'Utilities',
    'Real Estate',
    'Basic Materials',
  ];

  const exchanges = [
    'NASDAQ',
    'NYSE',
    'NYSE American',
    'NYSE Arca',
    'OTC Markets',
  ];

  return (
    <div className="bg-card border border-border rounded-lg shadow-md p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Filter className="w-5 h-5 text-foreground" />
          Filters
        </h2>
        <button
          onClick={onClearFilters}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          Clear All
        </button>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Search by Symbol or Company
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="e.g., AAPL or Apple"
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground placeholder:text-muted-foreground"
            disabled={searchLoading}
          />
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Price Range ($)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.priceMin || ''}
            onChange={(e) => handleInputChange('priceMin', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground placeholder:text-muted-foreground"
            min="0"
            step="0.01"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.priceMax || ''}
            onChange={(e) => handleInputChange('priceMax', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground placeholder:text-muted-foreground"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Market Cap Range */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Market Cap ($ Millions)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.marketCapMin || ''}
            onChange={(e) => handleInputChange('marketCapMin', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground placeholder:text-muted-foreground"
            min="0"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.marketCapMax || ''}
            onChange={(e) => handleInputChange('marketCapMax', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground placeholder:text-muted-foreground"
            min="0"
          />
        </div>
      </div>

      {/* Volume */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Minimum Volume
        </label>
        <input
          type="number"
          placeholder="e.g., 1000000"
          value={filters.volumeMin || ''}
          onChange={(e) => handleInputChange('volumeMin', e.target.value ? parseFloat(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground placeholder:text-muted-foreground"
          min="0"
        />
      </div>

      {/* Sector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Sector
        </label>
        <select
          value={filters.sector || ''}
          onChange={(e) => handleInputChange('sector', e.target.value || undefined)}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
        >
          <option value="">All Sectors</option>
          {sectors.map((sector) => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </select>
      </div>

      {/* Exchange */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Exchange
        </label>
        <select
          value={filters.exchange || ''}
          onChange={(e) => handleInputChange('exchange', e.target.value || undefined)}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
        >
          <option value="">All Exchanges</option>
          {exchanges.map((exchange) => (
            <option key={exchange} value={exchange}>
              {exchange}
            </option>
          ))}
        </select>
      </div>

      {/* Apply Button */}
      <button
        onClick={onApplyFilters}
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Searching...' : 'Apply Filters'}
      </button>
    </div>
  );
};

export default FilterControls;
