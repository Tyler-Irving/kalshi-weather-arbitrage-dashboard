import { create } from 'zustand';
import { PaperTrade, PaperPosition, PaperPnL } from '../types/paper';
import apiClient from '../api/client';

interface PaperState {
  trades: PaperTrade[];
  positions: PaperPosition[];
  pnl: PaperPnL | null;
  loading: boolean;
  fetchTrades: () => Promise<void>;
  fetchPositions: () => Promise<void>;
  fetchPnL: () => Promise<void>;
  fetchAll: () => Promise<void>;
}

const usePaperStore = create<PaperState>((set) => ({
  trades: [],
  positions: [],
  pnl: null,
  loading: false,

  fetchTrades: async () => {
    try {
      const res = await apiClient.get<{ trades: PaperTrade[] }>('/paper/trades/');
      set({ trades: res.data.trades });
    } catch (e) {
      console.error('Paper trades fetch failed:', e);
    }
  },

  fetchPositions: async () => {
    try {
      const res = await apiClient.get<{ positions: PaperPosition[] }>('/paper/positions/');
      set({ positions: res.data.positions });
    } catch (e) {
      console.error('Paper positions fetch failed:', e);
    }
  },

  fetchPnL: async () => {
    try {
      const res = await apiClient.get<PaperPnL>('/paper/pnl/');
      set({ pnl: res.data });
    } catch (e) {
      console.error('Paper P&L fetch failed:', e);
    }
  },

  fetchAll: async () => {
    set({ loading: true });
    await Promise.all([
      usePaperStore.getState().fetchTrades(),
      usePaperStore.getState().fetchPositions(),
      usePaperStore.getState().fetchPnL(),
    ]);
    set({ loading: false });
  },
}));

export default usePaperStore;
