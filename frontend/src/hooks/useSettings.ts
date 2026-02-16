import { create } from 'zustand';

export interface DashboardSettings {
  refreshInterval: number; // ms: 15000, 30000, 60000, 300000, 0=off
  visiblePanels: {
    positions: boolean;
    cityHeatmap: boolean;
    pnlSummary: boolean;
    pnlChart: boolean;
    cityPerformance: boolean;
  };
  notificationsEnabled: boolean;
  toastDuration: number; // ms
}

interface SettingsStore {
  settings: DashboardSettings;
  settingsOpen: boolean;
  updateSettings: (partial: Partial<DashboardSettings>) => void;
  setSettingsOpen: (open: boolean) => void;
}

const STORAGE_KEY = 'kalshi-dashboard-settings';

const defaultSettings: DashboardSettings = {
  refreshInterval: 60000,
  visiblePanels: {
    positions: true,
    cityHeatmap: true,
    pnlSummary: true,
    pnlChart: true,
    cityPerformance: true,
  },
  notificationsEnabled: true,
  toastDuration: 5000,
};

function loadSettings(): DashboardSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return defaultSettings;
}

function saveSettings(settings: DashboardSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: loadSettings(),
  settingsOpen: false,

  updateSettings: (partial) => {
    const newSettings = { ...get().settings, ...partial };
    saveSettings(newSettings);
    set({ settings: newSettings });
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),
}));

export default useSettingsStore;
