import { create } from 'zustand';
import { Position } from '../types/position';
import { PnLData } from '../types/pnl';
import apiClient from '../api/client';

export interface DaemonStatus {
  balance: number;
  starting_balance: number;
  total_pnl_cents: number;
  today_pnl_cents: number;
  position_count: number;
  daily_trades: number;
  daemon_running: boolean;
  last_update: string | null;
  win_rate_today: number;
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  dismissible: boolean;
}

export interface FetchError {
  endpoint: string;
  message: string;
  timestamp: number;
}

interface DashboardState {
  status: DaemonStatus | null;
  positions: Position[];
  pnl: PnLData | null;
  alerts: Alert[];
  errors: FetchError[];
  
  // Actions
  fetchStatus: () => Promise<void>;
  fetchPositions: () => Promise<void>;
  fetchPnL: () => Promise<void>;
  dismissAlert: (id: string) => void;
  clearError: (endpoint: string) => void;
  deriveAlerts: () => void;
}

const useDashboardStore = create<DashboardState>((set, get) => ({
  status: null,
  positions: [],
  pnl: null,
  alerts: [],
  errors: [],

  fetchStatus: async () => {
    const endpoint = '/status/';
    try {
      const response = await apiClient.get<DaemonStatus>(endpoint);
      set({ status: response.data });
      get().clearError(endpoint);
      get().deriveAlerts();
    } catch (error) {
      console.error('Failed to fetch status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set((state) => ({
        errors: [
          ...state.errors.filter((e) => e.endpoint !== endpoint),
          { endpoint, message: errorMessage, timestamp: Date.now() }
        ]
      }));
    }
  },

  fetchPositions: async () => {
    const endpoint = '/positions/';
    try {
      const response = await apiClient.get<{ positions: Position[] }>(endpoint);
      set({ positions: response.data.positions });
      get().clearError(endpoint);
      get().deriveAlerts();
    } catch (error) {
      console.error('Failed to fetch positions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set((state) => ({
        errors: [
          ...state.errors.filter((e) => e.endpoint !== endpoint),
          { endpoint, message: errorMessage, timestamp: Date.now() }
        ]
      }));
    }
  },

  fetchPnL: async () => {
    const endpoint = '/pnl/';
    try {
      const response = await apiClient.get<PnLData>(endpoint);
      set({ pnl: response.data });
      get().clearError(endpoint);
    } catch (error) {
      console.error('Failed to fetch P&L:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set((state) => ({
        errors: [
          ...state.errors.filter((e) => e.endpoint !== endpoint),
          { endpoint, message: errorMessage, timestamp: Date.now() }
        ]
      }));
    }
  },

  dismissAlert: (id: string) => {
    set((state) => ({
      alerts: state.alerts.filter((alert) => alert.id !== id),
    }));
  },

  clearError: (endpoint: string) => {
    set((state) => ({
      errors: state.errors.filter((e) => e.endpoint !== endpoint),
    }));
  },

  deriveAlerts: () => {
    const { status, positions } = get();
    const newAlerts: Alert[] = [];

    if (!status) {
      return;
    }

    // Check daemon status
    if (!status.daemon_running) {
      newAlerts.push({
        id: 'daemon-down',
        type: 'error',
        message: 'Daemon not running or state file stale',
        dismissible: false,
      });
    }

    // Check position limit (20 max)
    if (status.position_count >= 18) {
      newAlerts.push({
        id: 'position-limit',
        type: 'warning',
        message: `Position limit approaching: ${status.position_count}/20`,
        dismissible: true,
      });
    }

    // Check daily trade limit (40 max)
    if (status.daily_trades >= 35) {
      newAlerts.push({
        id: 'trade-limit',
        type: 'warning',
        message: `Daily trade limit approaching: ${status.daily_trades}/40`,
        dismissible: true,
      });
    }

    // Check daily loss threshold
    if (status.today_pnl_cents < -500) {
      newAlerts.push({
        id: 'daily-loss',
        type: 'error',
        message: `Daily loss exceeds $5.00: ${(status.today_pnl_cents / 100).toFixed(2)}`,
        dismissible: true,
      });
    }

    // Check for stale NOAA data in positions
    const stalePositions = positions.filter(
      (p) => p.ensemble_details.noaa_stale
    );
    if (stalePositions.length > 0) {
      newAlerts.push({
        id: 'noaa-stale',
        type: 'warning',
        message: `${stalePositions.length} position(s) have stale NOAA data`,
        dismissible: true,
      });
    }

    set({ alerts: newAlerts });
  },
}));

export default useDashboardStore;
