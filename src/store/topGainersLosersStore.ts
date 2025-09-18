import { create } from 'zustand';
import { MarketData, MarketStatus } from '@/types/top-gainers-losers';

interface TopGainersLosersStore {
  marketData: MarketData | null;
  marketStatus: MarketStatus | null;
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  autoRefresh: boolean;
  stockCount: number;
  isLoadingMore: boolean;
  
  setMarketData: (data: MarketData) => void;
  setMarketStatus: (status: MarketStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastRefresh: (date: Date) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setStockCount: (count: number) => void;
  setLoadingMore: (loading: boolean) => void;
  clearError: () => void;
}

export const useTopGainersLosersStore = create<TopGainersLosersStore>((set) => ({
  marketData: null,
  marketStatus: null,
  isLoading: false,
  error: null,
  lastRefresh: null,
  autoRefresh: true,
  stockCount: 25,
  isLoadingMore: false,
  
  setMarketData: (data: MarketData) => set({ marketData: data }),
  setMarketStatus: (status: MarketStatus) => set({ marketStatus: status }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  setLastRefresh: (date: Date) => set({ lastRefresh: date }),
  setAutoRefresh: (enabled: boolean) => set({ autoRefresh: enabled }),
  setStockCount: (count: number) => set({ stockCount: count }),
  setLoadingMore: (loading: boolean) => set({ isLoadingMore: loading }),
  clearError: () => set({ error: null }),
}));
