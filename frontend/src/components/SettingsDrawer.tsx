import { useEffect, useRef } from 'react';
import useSettingsStore from '../hooks/useSettings';

const REFRESH_OPTIONS = [
  { label: '15s', value: 15000 },
  { label: '30s', value: 30000 },
  { label: '60s', value: 60000 },
  { label: '5m', value: 300000 },
  { label: 'Off', value: 0 },
];

const TOAST_DURATION_OPTIONS = [
  { label: '3s', value: 3000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: 'Never', value: 0 },
];

const PANEL_LABELS: Record<string, string> = {
  positions: 'Positions',
  cityHeatmap: 'City Heatmap',
  pnlSummary: 'P&L Summary',
  pnlChart: 'P&L Charts',
  cityPerformance: 'City Performance',
};

export default function SettingsDrawer() {
  const { settings, settingsOpen, updateSettings, setSettingsOpen } = useSettingsStore();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false);
    };
    if (settingsOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [settingsOpen, setSettingsOpen]);

  if (!settingsOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
        onClick={() => setSettingsOpen(false)}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 h-full w-80 bg-bg-secondary border-l border-zinc-700/50 z-[70] shadow-2xl overflow-y-auto animate-slide-in-right"
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
            <button
              onClick={() => setSettingsOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Display Section */}
          <section className="mb-6">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Display</h3>

            {/* Visible Panels */}
            <div className="space-y-1">
              <div className="text-xs text-zinc-500 mb-2">Visible Panels</div>
              {Object.entries(PANEL_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 py-1.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={settings.visiblePanels[key as keyof typeof settings.visiblePanels]}
                    onChange={(e) =>
                      updateSettings({
                        visiblePanels: {
                          ...settings.visiblePanels,
                          [key]: e.target.checked,
                        },
                      })
                    }
                    className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">{label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Data Section */}
          <section className="mb-6">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Data</h3>
            <div className="text-xs text-zinc-500 mb-2">Auto-refresh Interval</div>
            <div className="flex flex-wrap gap-2">
              {REFRESH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateSettings({ refreshInterval: opt.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    settings.refreshInterval === opt.value
                      ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Notifications Section */}
          <section className="mb-6">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Notifications</h3>

            <label className="flex items-center justify-between py-2 cursor-pointer group">
              <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Enable Toasts</span>
              <button
                onClick={() => updateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                  settings.notificationsEnabled ? 'bg-blue-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                    settings.notificationsEnabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </label>

            <div className="mt-3">
              <div className="text-xs text-zinc-500 mb-2">Auto-dismiss</div>
              <div className="flex flex-wrap gap-2">
                {TOAST_DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateSettings({ toastDuration: opt.value })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      settings.toastDuration === opt.value
                        ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
