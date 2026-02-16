/**
 * CostPanel - ROI, avg cost/profit, break-even comparison
 * TICK-011 - Cost & ROI analytics
 */
import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface CostSummary {
  avg_cost_cents: number;
  avg_profit_cents: number;
  avg_roi: number;
  breakeven_win_rate: number | null;
  total_trades: number;
}

interface EdgeBucket {
  edge_bucket: string;
  roi: number;
  avg_pnl: number;
  count: number;
}

export default function CostPanel() {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [edgeBuckets, setEdgeBuckets] = useState<EdgeBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = days ? `?days=${days}` : '';
      
      const [summaryRes, bucketsRes] = await Promise.all([
        apiClient.get(`/api/v1/cost/summary/${params}`),
        apiClient.get(`/api/v1/cost/by-edge-bucket/${params}&min_trades=3`),
      ]);
      
      setSummary(summaryRes.data);
      setEdgeBuckets(bucketsRes.data.edge_buckets || []);
    } catch (error) {
      console.error('Failed to fetch cost data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-surface-hover rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-surface-hover rounded"></div>
            <div className="h-4 bg-surface-hover rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-surface rounded-lg shadow-md p-6">
        <p className="text-text-muted">No cost data available.</p>
      </div>
    );
  }

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="bg-surface rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Cost & ROI Analysis</h3>
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

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-hover rounded-lg p-4">
          <div className="text-xs text-text-muted mb-1">Avg Cost per Trade</div>
          <div className="text-xl font-bold">{formatCents(summary.avg_cost_cents)}</div>
        </div>
        
        <div className="bg-surface-hover rounded-lg p-4">
          <div className="text-xs text-text-muted mb-1">Avg Profit per Trade</div>
          <div className={`text-xl font-bold ${summary.avg_profit_cents >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCents(summary.avg_profit_cents)}
          </div>
        </div>
        
        <div className="bg-surface-hover rounded-lg p-4">
          <div className="text-xs text-text-muted mb-1">Avg ROI</div>
          <div className={`text-xl font-bold ${summary.avg_roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {summary.avg_roi.toFixed(1)}%
          </div>
        </div>
        
        <div className="bg-surface-hover rounded-lg p-4">
          <div className="text-xs text-text-muted mb-1">Total Trades</div>
          <div className="text-xl font-bold">{summary.total_trades}</div>
        </div>
      </div>

      {/* Break-Even Comparison */}
      {summary.breakeven_win_rate !== null && (
        <div className="bg-surface-hover rounded-lg p-4 mb-6">
          <h4 className="text-sm font-semibold mb-3 text-text-secondary">Break-Even Analysis</h4>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-text-muted">Required Win Rate</div>
              <div className="text-2xl font-bold text-amber-400">
                {summary.breakeven_win_rate.toFixed(1)}%
              </div>
            </div>
            <div className="text-3xl text-text-muted">→</div>
            <div>
              <div className="text-xs text-text-muted">Actual Win Rate</div>
              <div className="text-2xl font-bold text-green-400">
                {summary.total_trades > 0 ? ((summary.avg_profit_cents / summary.avg_cost_cents + 1) * summary.breakeven_win_rate).toFixed(1) : '0.0'}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROI by Edge Bucket */}
      {edgeBuckets.length > 0 && (
        <div className="bg-surface-hover rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-3 text-text-secondary">ROI by Edge Bracket</h4>
          <div className="space-y-2">
            {edgeBuckets.map((bucket) => (
              <div key={bucket.edge_bucket} className="flex justify-between items-center text-sm">
                <span className="font-medium">{bucket.edge_bucket}¢</span>
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-text-muted">{bucket.count} trades</span>
                  <span className={`font-semibold ${bucket.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {bucket.roi.toFixed(1)}% ROI
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
