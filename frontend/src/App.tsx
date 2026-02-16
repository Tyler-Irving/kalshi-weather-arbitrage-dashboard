import { useState, useEffect, useCallback } from 'react';
import NavBar, { TabId } from './components/layout/NavBar';
import HeroBanner from './components/HeroBanner';
import ErrorBanner from './components/ErrorBanner';
import PositionsTable from './components/PositionsTable';
import CityHeatmap from './components/CityHeatmap';
import { LogFeed } from './components/LogFeed';
import BacktestTable from './components/BacktestTable';
import BacktestStats from './components/BacktestStats';
import PnLPanel from './components/PnLPanel';
import PnLChart from './components/PnLChart';
import CityPerformance from './components/CityPerformance';
import AnalyticsTab from './components/analytics/AnalyticsTab';
import PaperTab from './components/paper/PaperTab';
import SettingsDrawer from './components/SettingsDrawer';
import DashboardCard from './components/DashboardCard';
import { NotificationProvider } from './components/NotificationProvider';
import useDashboardStore from './stores/dashboardStore';
import useSettingsStore from './hooks/useSettings';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [logsExpanded, setLogsExpanded] = useState(false);
  const { fetchStatus, fetchPositions, fetchPnL } = useDashboardStore();
  const { settings } = useSettingsStore();

  const refreshAll = useCallback(() => {
    fetchStatus();
    fetchPositions();
    fetchPnL();
  }, [fetchStatus, fetchPositions, fetchPnL]);

  useEffect(() => {
    refreshAll();

    if (settings.refreshInterval === 0) return;

    const intervalId = setInterval(refreshAll, settings.refreshInterval);
    return () => clearInterval(intervalId);
  }, [refreshAll, settings.refreshInterval]);

  const v = settings.visiblePanels;

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-bg-primary text-text-primary">
        <NavBar activeTab={activeTab} onTabChange={setActiveTab} />
        <HeroBanner />
        <ErrorBanner />
        <SettingsDrawer />

        <main className="container mx-auto px-6 py-4">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-6 w-full">
              {/* Vertical Stack - All Cards Full Width */}
              {v.positions && (
                <DashboardCard>
                  <PositionsTable />
                </DashboardCard>
              )}
              {v.cityHeatmap && (
                <DashboardCard>
                  <CityHeatmap />
                </DashboardCard>
              )}
              {v.cityPerformance && (
                <DashboardCard>
                  <CityPerformance />
                </DashboardCard>
              )}
              {v.pnlSummary && (
                <DashboardCard>
                  <PnLPanel />
                </DashboardCard>
              )}
              {v.pnlChart && (
                <DashboardCard>
                  <PnLChart />
                </DashboardCard>
              )}

              {/* Collapsible Log Feed */}
              <div className="frost-card !p-0 overflow-hidden">
                <button
                  onClick={() => setLogsExpanded(!logsExpanded)}
                  className="w-full flex items-center justify-between px-5 py-3 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <span className="font-medium">System Logs</span>
                  <span className={`transition-transform duration-200 ${logsExpanded ? 'rotate-90' : ''}`}>
                    ›
                  </span>
                </button>
                <div
                  className={`transition-all duration-300 overflow-hidden ${
                    logsExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-5 pb-5" style={{ height: '450px' }}>
                    <LogFeed />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && <AnalyticsTab />}

          {/* Backtest Tab */}
          {activeTab === 'backtest' && (
            <div className="space-y-6">
              <BacktestStats />
              <BacktestTable />
            </div>
          )}

          {/* Paper Trading Tab */}
          {activeTab === 'paper' && <PaperTab />}
        </main>
      </div>
    </NotificationProvider>
  );
}

export default App;
