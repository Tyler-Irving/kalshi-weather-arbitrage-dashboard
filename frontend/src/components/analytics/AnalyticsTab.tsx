/**
 * AnalyticsTab - Container with sub-tab navigation for analytics panels
 * TICK-011 - Main analytics container
 */
import { useState } from 'react';
import ReliabilityPanel from './ReliabilityPanel';
import CostPanel from './CostPanel';
import CalibrationChart from './CalibrationChart';
import ConfidenceChart from './ConfidenceChart';
import ProviderTable from './ProviderTable';

type TabType = 'reliability' | 'cost' | 'edge' | 'providers';

export default function AnalyticsTab() {
  const [activeTab, setActiveTab] = useState<TabType>('reliability');

  const tabs = [
    { id: 'reliability' as TabType, label: 'Trade Reliability', icon: '📊' },
    { id: 'cost' as TabType, label: 'Cost & ROI', icon: '💰' },
    { id: 'edge' as TabType, label: 'Edge Accuracy', icon: '🎯' },
    { id: 'providers' as TabType, label: 'Provider Reliability', icon: '🌤️' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="frost-card">
        <h2 className="text-2xl font-bold mb-2">Analytics Dashboard</h2>
        <p className="text-text-secondary text-sm">
          Deep-dive analysis of trade reliability, cost-effectiveness, edge calibration, and provider performance.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="frost-card p-2">
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-accent-blue text-white'
                  : 'bg-bg-primary text-text-secondary hover:bg-zinc-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'reliability' && (
          <div className="space-y-6">
            <ReliabilityPanel />
          </div>
        )}

        {activeTab === 'cost' && (
          <div className="space-y-6">
            <CostPanel />
          </div>
        )}

        {activeTab === 'edge' && (
          <div className="space-y-6">
            <CalibrationChart />
            <ConfidenceChart />
          </div>
        )}

        {activeTab === 'providers' && (
          <div className="space-y-6">
            <ProviderTable />
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="frost-card p-4 text-xs text-text-secondary">
        <p className="mb-2">
          <strong>Data Source:</strong> All analytics are computed from the settlement log (kalshi_settlement_log.jsonl).
        </p>
        <p className="mb-2">
          <strong>Filters:</strong> Use the time range selectors in each panel to analyze specific periods.
          Minimum trade thresholds prevent noisy metrics from low-sample buckets.
        </p>
        <p>
          <strong>Note:</strong> If you see "insufficient data" messages, wait for more trades to settle.
          Most metrics require at least 5-10 trades per bucket for reliability.
        </p>
      </div>
    </div>
  );
}
