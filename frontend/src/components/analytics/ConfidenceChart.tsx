/**
 * ConfidenceChart - Confidence calibration with 45° reference line
 * TICK-011 - Edge accuracy tracking
 */
import { useEffect, useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import apiClient from '../../api/client';

interface ConfidencePoint {
  confidence_min: number;
  confidence_max: number;
  win_rate: number;
  count: number;
}

export default function ConfidenceChart() {
  const [data, setData] = useState<ConfidencePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = days ? `?days=${days}&min_trades=3` : '?min_trades=3';
      const response = await apiClient.get(`/api/v1/edge/confidence-calibration/${params}`);
      setData(response.data.calibration || []);
    } catch (error) {
      console.error('Failed to fetch confidence calibration:', error);
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
        <h3 className="text-xl font-bold mb-4">Confidence Calibration</h3>
        <p className="text-text-muted">Insufficient data for calibration curve. Need more settled trades.</p>
      </div>
    );
  }

  // Format data for scatter chart
  const chartData = data.map(point => ({
    confidence: ((point.confidence_min + point.confidence_max) / 2) * 100,
    winRate: point.win_rate,
    count: point.count,
    label: `${(point.confidence_min * 100).toFixed(0)}-${(point.confidence_max * 100).toFixed(0)}%`,
  }));

  // Generate ideal line data (45° diagonal)
  const idealLine = [
    { confidence: 60, winRate: 60 },
    { confidence: 100, winRate: 100 },
  ];

  return (
    <div className="bg-surface rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold">Confidence Calibration</h3>
          <p className="text-sm text-text-muted">Predicted confidence should match actual win rate</p>
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
        <ScatterChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            type="number"
            dataKey="confidence" 
            name="Confidence"
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            label={{ value: 'Predicted Confidence (%)', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
            domain={[60, 100]}
          />
          <YAxis 
            type="number"
            dataKey="winRate"
            name="Win Rate"
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            label={{ value: 'Actual Win Rate (%)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#9CA3AF' }}
            cursor={{ strokeDasharray: '3 3' }}
            formatter={((value: any, name: any, props: any) => {
              if (value === undefined) return ['', ''];
              if (name === 'Win Rate') {
                return [`${value.toFixed(1)}% (${props.payload.count} trades)`, 'Win Rate'];
              }
              return [`${value.toFixed(1)}%`, name];
            }) as any}
          />
          <Legend 
            wrapperStyle={{ color: '#9CA3AF' }}
          />
          {/* Ideal calibration line (45 degrees) */}
          <ReferenceLine 
            segment={idealLine.map(p => ({ x: p.confidence, y: p.winRate })) as any}
            stroke="#EF4444" 
            strokeDasharray="3 3"
            label={{ value: 'Perfect Calibration', fill: '#EF4444', fontSize: 11, position: 'top' }}
          />
          <Scatter 
            name="Actual Performance" 
            data={chartData} 
            fill="#10B981"
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>

      <div className="mt-4 text-xs text-text-muted">
        <p>• Perfect calibration: points lie on the diagonal line</p>
        <p>• Points above line = model underconfident; below line = overconfident</p>
      </div>
    </div>
  );
}
