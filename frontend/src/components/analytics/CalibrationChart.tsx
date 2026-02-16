/**
 * CalibrationChart - Edge calibration curve (Recharts line chart)
 * TICK-011 - Edge accuracy tracking
 */
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import apiClient from '../../api/client';

interface CalibrationPoint {
  edge_min: number;
  edge_max: number;
  win_rate: number;
  count: number;
}

export default function CalibrationChart() {
  const [data, setData] = useState<CalibrationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = days ? `?days=${days}&min_trades=3` : '?min_trades=3';
      const response = await apiClient.get(`/api/v1/edge/calibration/${params}`);
      setData(response.data.calibration || []);
    } catch (error) {
      console.error('Failed to fetch edge calibration:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-surface-hover rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-surface-hover rounded"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-surface rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4">Edge Calibration</h3>
        <p className="text-text-muted">Insufficient data for calibration curve. Need more settled trades.</p>
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map(point => ({
    edge: `${point.edge_min}-${point.edge_max}`,
    edgeMid: (point.edge_min + point.edge_max) / 2,
    winRate: point.win_rate,
    count: point.count,
  }));

  return (
    <div className="bg-surface rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold">Edge Calibration</h3>
          <p className="text-sm text-text-muted">Higher edge should predict higher win rate</p>
        </div>
        <select
          value={days || ''}
          onChange={(e) => setDays(e.target.value ? parseInt(e.target.value) : undefined)}
          className="bg-surface-hover border border-border rounded px-3 py-1 text-sm"
        >
          <option value="">All Time</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="edge" 
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            label={{ value: 'Edge (cents)', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
          />
          <YAxis 
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#9CA3AF' }}
            itemStyle={{ color: '#10B981' }}
            formatter={((value: any, name: any, props: any) => {
              if (value === undefined) return ['', ''];
              if (name === 'winRate') {
                return [`${value.toFixed(1)}% (${props.payload.count} trades)`, 'Win Rate'];
              }
              return [value, name];
            }) as any}
          />
          <Legend 
            wrapperStyle={{ color: '#9CA3AF' }}
            iconType="line"
          />
          <ReferenceLine y={50} stroke="#EF4444" strokeDasharray="3 3" label={{ value: '50% (random)', fill: '#EF4444', fontSize: 11 }} />
          <Line 
            type="monotone" 
            dataKey="winRate" 
            stroke="#10B981" 
            strokeWidth={2}
            dot={{ fill: '#10B981', r: 4 }}
            name="Actual Win Rate"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 text-xs text-text-muted">
        <p>• Ideal calibration: win rate increases monotonically with edge</p>
        <p>• Points below 50% suggest overestimation of edge</p>
      </div>
    </div>
  );
}
