import { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { usePolling } from '../hooks/usePolling';
import type { PnLData } from '../types/pnl';

interface CityStats {
  city: string;
  trades: number;
  pnl_cents: number;
}

const formatCurrency = (value: number): string => {
  return `$${(value / 100).toFixed(2)}`;
};

const formatPercent = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

function PnLChart() {
  const { data: pnlData, loading, error } = usePolling<PnLData>('/pnl', 60000);

  // Calculate cumulative P&L from daily data
  const cumulativePnLData = useMemo(() => {
    if (!pnlData) return [];
    
    const dailyEntries = Object.entries(pnlData.daily).sort((a, b) => a[0].localeCompare(b[0]));
    let cumulative = 0;
    
    return dailyEntries.map(([date, data]) => {
      cumulative += data.pnl_cents;
      return {
        date,
        cumulative_cents: cumulative,
        daily_cents: data.pnl_cents,
      };
    });
  }, [pnlData]);

  // Calculate 7-day rolling win rate
  const winRateData = useMemo(() => {
    if (!pnlData) return [];
    
    const dailyEntries = Object.entries(pnlData.daily).sort((a, b) => a[0].localeCompare(b[0]));
    const result = [];
    
    for (let i = 0; i < dailyEntries.length; i++) {
      const window = dailyEntries.slice(Math.max(0, i - 6), i + 1);
      const totalTrades = window.reduce((sum, [, data]) => sum + data.trades, 0);
      const totalWins = window.reduce((sum, [, data]) => sum + data.wins, 0);
      const winRate = totalTrades > 0 ? totalWins / totalTrades : 0;
      
      result.push({
        date: dailyEntries[i][0],
        win_rate: winRate,
      });
    }
    
    return result;
  }, [pnlData]);

  // Fetch city P&L data from backend endpoint
  const { data: cityPnLData } = usePolling<CityStats[]>('/pnl/by-city/', 60000);
  
  const cityData = useMemo((): CityStats[] => {
    if (!cityPnLData) return [];
    // Sort by P&L descending
    return [...cityPnLData].sort((a, b) => b.pnl_cents - a.pnl_cents);
  }, [cityPnLData]);

  if (loading) {
    return (
      <div className="bg-bg-secondary border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-text-primary">P&L Charts</h2>
        <div className="text-text-secondary text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-bg-secondary border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-text-primary">P&L Charts</h2>
        <div className="text-red-500 text-sm">Error: {error}</div>
      </div>
    );
  }

  if (!pnlData) {
    return null;
  }

  const hasData = cumulativePnLData.length > 0;

  return (
    <div className="bg-bg-secondary border border-gray-700 rounded-lg p-6 space-y-8">
      <h2 className="text-xl font-semibold text-text-primary">P&L Charts</h2>

      {!hasData ? (
        <div className="text-text-secondary text-sm text-center py-8">
          No P&L data available yet. Charts will appear once trades are settled.
        </div>
      ) : (
        <>
          {/* Cumulative P&L Chart */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-3">Cumulative P&L</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cumulativePnLData}>
                <defs>
                  <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPnLNegative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: '#e5e7eb',
                  }}
                  formatter={(value) => {
                    if (value === undefined || typeof value !== 'number') return ['', ''];
                    return [formatCurrency(value), 'Cumulative P&L'];
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="cumulative_cents"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#colorPnL)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Win Rate Trend */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-3">
              Win Rate Trend (7-day rolling)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={winRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => formatPercent(value)}
                  domain={[0, 1]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: '#e5e7eb',
                  }}
                  formatter={(value) => {
                    if (value === undefined || typeof value !== 'number') return ['', ''];
                    return [formatPercent(value), 'Win Rate'];
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <ReferenceLine 
                  y={0.5} 
                  stroke="#f59e0b" 
                  strokeDasharray="3 3"
                  label={{ value: 'Break-even', fill: '#f59e0b', fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="win_rate"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Trades per City Bar Chart */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-3">
              Trades per City
            </h3>
            {cityData.length === 0 ? (
              <div className="text-text-secondary text-sm text-center py-8 bg-bg-primary border border-gray-700 rounded">
                City-level performance data will be available after implementing the backend aggregation endpoint.
                <br />
                <span className="text-xs mt-2 block">
                  (Backend needs to provide <code className="text-amber-500">/api/v1/pnl/by-city</code>)
                </span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={cityData} 
                  layout="horizontal"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis 
                    type="category" 
                    dataKey="city" 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      color: '#e5e7eb',
                    }}
                    formatter={(value, name) => {
                      if (value === undefined || typeof value !== 'number') return ['', ''];
                      if (name === 'trades') return [value, 'Trades'];
                      if (name === 'pnl_cents') return [formatCurrency(value), 'Net P&L'];
                      return [value, name];
                    }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Bar 
                    dataKey="trades" 
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default PnLChart;
