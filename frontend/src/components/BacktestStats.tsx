import { useState } from 'react';
import { usePolling } from '../hooks/usePolling';

interface BacktestStatsData {
  date: string;
  scanned: number;
  traded: number;
  skipped: number;
  skip_reasons: Record<string, number>;
}

const BacktestStats = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const { data, loading, error } = usePolling<BacktestStatsData>(
    `/backtest/stats/?date=${selectedDate}`,
    60000 // Poll every 60s
  );

  if (loading && !data) {
    return (
      <div className="bg-bg-secondary border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-text-primary">
          Backtest Stats
        </h2>
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-bg-secondary border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-text-primary">
          Backtest Stats
        </h2>
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (!data) return null;

  // Calculate percentages for funnel
  const tradedPercent = data.scanned > 0 ? (data.traded / data.scanned) * 100 : 0;
  const skippedPercent = data.scanned > 0 ? (data.skipped / data.scanned) * 100 : 0;

  // Parse skip reasons for display
  const skipReasonDisplay = (reason: string): string => {
    if (!reason || reason === 'unknown') return 'Unknown';
    
    // Parse patterns like "edge_low=4.2" or "spread_wide=35"
    const match = reason.match(/(.+?)=(.+)/);
    if (match) {
      const [, type, value] = match;
      switch (type) {
        case 'edge_low':
          return `Edge too low (${value}¢ < 10¢)`;
        case 'edge_capped':
          return `Edge capped (${value}¢ > 60¢, stale data)`;
        case 'spread_wide':
          return `Illiquid (spread ${value}¢ > 30¢)`;
        case 'confidence_low':
          return `Low confidence (${value} < 0.6)`;
        default:
          return reason;
      }
    }
    return reason;
  };

  return (
    <div className="bg-bg-secondary border border-gray-700 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-text-primary">
          Backtest Stats
        </h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-bg-primary border border-gray-600 rounded px-3 py-1 text-text-primary text-sm"
        />
      </div>

      {/* Summary Numbers */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-400">{data.scanned}</div>
          <div className="text-sm text-text-secondary mt-1">Markets Evaluated</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-400">{data.traded}</div>
          <div className="text-sm text-text-secondary mt-1">Opportunities Found</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-400">{data.skipped}</div>
          <div className="text-sm text-text-secondary mt-1">Skipped</div>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-text-secondary mb-3">
          Opportunity Funnel
        </h3>
        
        {/* Scanned Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-text-secondary mb-1">
            <span>Scanned</span>
            <span>{data.scanned} (100%)</span>
          </div>
          <div className="h-8 bg-blue-500 rounded"></div>
        </div>

        {/* Traded Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-text-secondary mb-1">
            <span>Traded</span>
            <span>{data.traded} ({tradedPercent.toFixed(1)}%)</span>
          </div>
          <div 
            className="h-8 bg-green-500 rounded"
            style={{ width: `${tradedPercent}%`, minWidth: '2%' }}
          ></div>
        </div>

        {/* Skipped Bar */}
        <div>
          <div className="flex justify-between text-xs text-text-secondary mb-1">
            <span>Skipped</span>
            <span>{data.skipped} ({skippedPercent.toFixed(1)}%)</span>
          </div>
          <div 
            className="h-8 bg-gray-500 rounded"
            style={{ width: `${skippedPercent}%`, minWidth: '2%' }}
          ></div>
        </div>
      </div>

      {/* Skip Reasons Breakdown */}
      {data.skipped > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-secondary mb-3">
            Skip Reasons
          </h3>
          <div className="space-y-2">
            {Object.entries(data.skip_reasons)
              .sort((a, b) => b[1] - a[1])
              .map(([reason, count]) => (
                <div 
                  key={reason}
                  className="flex justify-between text-sm bg-bg-primary rounded px-3 py-2"
                >
                  <span className="text-text-primary">
                    {skipReasonDisplay(reason)}
                  </span>
                  <span className="text-text-secondary font-mono">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.scanned === 0 && (
        <div className="text-center text-text-secondary py-8">
          No backtest data for {selectedDate}
        </div>
      )}
    </div>
  );
};

export default BacktestStats;
