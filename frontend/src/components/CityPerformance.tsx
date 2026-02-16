import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { usePolling } from '../hooks/usePolling';

interface CityPerformanceData {
  city: string;
  trades: number;
  wins: number;
  losses: number;
  pnl_cents: number;
  avg_edge_cents?: number;
}

type SortField = 'city' | 'trades' | 'pnl_cents' | 'win_rate';
type SortDirection = 'asc' | 'desc';

const formatCurrency = (cents: number): string => {
  const dollars = cents / 100;
  const sign = dollars >= 0 ? '+' : '';
  return `${sign}$${dollars.toFixed(2)}`;
};

const formatPercent = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

function CityPerformance() {
  const { data, loading, error } = usePolling<CityPerformanceData[]>('/pnl/by-city/', 60000);
  const [sortField, setSortField] = useState<SortField>('pnl_cents');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = useMemo(() => {
    if (!data) return [];

    const sorted = [...data].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortField === 'win_rate') {
        aVal = a.trades > 0 ? a.wins / a.trades : 0;
        bVal = b.trades > 0 ? b.wins / b.trades : 0;
      } else {
        aVal = a[sortField];
        bVal = b[sortField];
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const numA = typeof aVal === 'number' ? aVal : 0;
      const numB = typeof bVal === 'number' ? bVal : 0;
      
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });

    return sorted;
  }, [data, sortField, sortDirection]);

  // Prepare data for bar chart
  const chartData = useMemo(() => {
    return sortedData.map(city => ({
      ...city,
      win_rate: city.trades > 0 ? city.wins / city.trades : 0,
    }));
  }, [sortedData]);

  // Find best and worst performing cities
  const bestCity = useMemo(() => {
    if (!sortedData.length) return null;
    return sortedData.reduce((best, city) => 
      city.pnl_cents > best.pnl_cents ? city : best
    );
  }, [sortedData]);

  const worstCity = useMemo(() => {
    if (!sortedData.length) return null;
    return sortedData.reduce((worst, city) => 
      city.pnl_cents < worst.pnl_cents ? city : worst
    );
  }, [sortedData]);

  if (loading) {
    return (
      <div className="bg-bg-secondary border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-text-primary">City Performance</h2>
        <div className="text-text-secondary text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-bg-secondary border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-text-primary">City Performance</h2>
        <div className="text-amber-500 text-sm bg-bg-primary border border-amber-900 rounded p-4">
          <p className="font-semibold mb-2">⚠️ Backend endpoint not yet implemented</p>
          <p className="text-xs">
            The dashboard is ready, but the backend needs to provide city-aggregated P&L data at:
          </p>
          <code className="block mt-2 text-xs bg-gray-900 p-2 rounded">
            GET /api/v1/pnl/by-city
          </code>
          <p className="text-xs mt-2 text-text-secondary">
            This endpoint should aggregate settlements and positions by city from the daemon's state/PnL files.
          </p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-bg-secondary border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-text-primary">City Performance</h2>
        <div className="text-text-secondary text-sm text-center py-8">
          No city performance data available yet.
        </div>
      </div>
    );
  }

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-600 ml-1">↕</span>;
    return <span className="text-blue-400 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="bg-bg-secondary border border-gray-700 rounded-lg p-4 lg:p-5 space-y-4 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h2 className="text-lg font-semibold text-text-primary whitespace-nowrap">City Performance</h2>
        {bestCity && worstCity && (
          <div className="text-[10px] text-text-secondary flex gap-2 min-w-0 truncate">
            <span className="text-green-500 font-mono">
              ▲ {bestCity.city} {formatCurrency(bestCity.pnl_cents)}
            </span>
            <span className="text-red-500 font-mono">
              ▼ {worstCity.city} {formatCurrency(worstCity.pnl_cents)}
            </span>
          </div>
        )}
      </div>

      {/* Bar Chart - Net P&L by City */}
      <div>
        <h3 className="text-xs font-semibold text-text-secondary mb-2 uppercase">
          Net P&L by City
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="city" 
              stroke="#9ca3af"
              style={{ fontSize: '10px' }}
              interval={0}
            />
            <YAxis 
              stroke="#9ca3af"
              style={{ fontSize: '10px' }}
              tickFormatter={(value) => formatCurrency(value)}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#e5e7eb',
                fontSize: '12px',
              }}
              formatter={(value) => {
                if (value === undefined || typeof value !== 'number') return ['', ''];
                return [formatCurrency(value), 'Net P&L'];
              }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Bar dataKey="pnl_cents" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.pnl_cents >= 0 ? '#10b981' : '#ef4444'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Table - compact responsive */}
      <div>
        <h3 className="text-xs font-semibold text-text-secondary mb-2 uppercase">
          Detailed Breakdown
        </h3>
        <div className="overflow-x-auto -mx-4 px-4 lg:-mx-5 lg:px-5">
          <table className="w-full text-xs font-mono min-w-0">
            <thead className="border-b border-gray-700">
              <tr className="text-text-secondary text-[10px]">
                <th 
                  className="text-left py-1.5 px-1.5 cursor-pointer hover:text-blue-400"
                  onClick={() => handleSort('city')}
                >
                  City <SortIndicator field="city" />
                </th>
                <th 
                  className="text-right py-1.5 px-1.5 cursor-pointer hover:text-blue-400"
                  onClick={() => handleSort('trades')}
                >
                  Trd <SortIndicator field="trades" />
                </th>
                <th className="text-right py-1.5 px-1.5">W</th>
                <th className="text-right py-1.5 px-1.5">L</th>
                <th 
                  className="text-right py-1.5 px-1.5 cursor-pointer hover:text-blue-400"
                  onClick={() => handleSort('win_rate')}
                >
                  WR% <SortIndicator field="win_rate" />
                </th>
                <th 
                  className="text-right py-1.5 px-1.5 cursor-pointer hover:text-blue-400"
                  onClick={() => handleSort('pnl_cents')}
                >
                  P&L <SortIndicator field="pnl_cents" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((city) => {
                const winRate = city.trades > 0 ? city.wins / city.trades : 0;
                const isBest = bestCity?.city === city.city;
                const isWorst = worstCity?.city === city.city;
                
                return (
                  <tr 
                    key={city.city} 
                    className={`border-b border-gray-800 hover:bg-bg-primary ${
                      isBest ? 'bg-green-900/20' : isWorst ? 'bg-red-900/20' : ''
                    }`}
                  >
                    <td className="py-1.5 px-1.5 text-text-primary font-semibold whitespace-nowrap">
                      {city.city}
                      {isBest && <span className="ml-1 text-green-500">🏆</span>}
                      {isWorst && <span className="ml-1 text-red-500">⚠️</span>}
                    </td>
                    <td className="py-1.5 px-1.5 text-right text-text-primary">
                      {city.trades}
                    </td>
                    <td className="py-1.5 px-1.5 text-right text-green-400">
                      {city.wins}
                    </td>
                    <td className="py-1.5 px-1.5 text-right text-red-400">
                      {city.losses}
                    </td>
                    <td className={`py-1.5 px-1.5 text-right ${
                      winRate >= 0.5 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatPercent(winRate)}
                    </td>
                    <td className={`py-1.5 px-1.5 text-right font-semibold whitespace-nowrap ${
                      city.pnl_cents >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {formatCurrency(city.pnl_cents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CityPerformance;
