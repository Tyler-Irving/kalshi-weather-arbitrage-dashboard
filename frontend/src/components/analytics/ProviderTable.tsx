/**
 * ProviderTable - Per-provider accuracy + staleness impact
 * TICK-011 - Provider reliability analysis
 */
import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface ProviderStats {
  correct: number;
  total: number;
  accuracy: number;
}

interface StalenessImpact {
  count: number;
  win_rate: number | null;
}

interface DropoutImpact {
  count: number;
  win_rate: number | null;
}

export default function ProviderTable() {
  const [providers, setProviders] = useState<Record<string, ProviderStats>>({});
  const [staleness, setStaleness] = useState<{ stale: StalenessImpact; fresh: StalenessImpact } | null>(null);
  const [dropout, setDropout] = useState<{ full_ensemble: DropoutImpact; partial_ensemble: DropoutImpact } | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = days ? `?days=${days}&min_trades=5` : '?min_trades=5';
      
      const [accuracyRes, stalenessRes, dropoutRes] = await Promise.all([
        apiClient.get(`/api/v1/providers/accuracy/${params}`),
        apiClient.get(`/api/v1/providers/staleness/${params}`),
        apiClient.get(`/api/v1/providers/dropout/${params}`),
      ]);
      
      setProviders(accuracyRes.data.providers || {});
      setStaleness(stalenessRes.data.staleness_impact || null);
      setDropout(dropoutRes.data.dropout_impact || null);
    } catch (error) {
      console.error('Failed to fetch provider data:', error);
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

  const providerEntries = Object.entries(providers).sort((a, b) => b[1].accuracy - a[1].accuracy);

  return (
    <div className="bg-surface rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Provider Reliability</h3>
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

      {/* Provider Accuracy Table */}
      {providerEntries.length > 0 ? (
        <div className="bg-surface-hover rounded-lg p-4 mb-6">
          <h4 className="text-sm font-semibold mb-3 text-text-secondary">Provider Accuracy</h4>
          <div className="space-y-2">
            {providerEntries.map(([provider, stats]) => (
              <div key={provider} className="flex justify-between items-center text-sm">
                <span className="font-medium">{provider}</span>
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-text-muted">
                    {stats.correct}/{stats.total}
                  </span>
                  <span className={`font-semibold ${stats.accuracy >= 60 ? 'text-green-400' : stats.accuracy >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {stats.accuracy.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-surface-hover rounded-lg p-4 mb-6">
          <p className="text-sm text-text-muted">No provider data available yet.</p>
        </div>
      )}

      {/* NOAA Staleness Impact */}
      {staleness && (
        <div className="bg-surface-hover rounded-lg p-4 mb-6">
          <h4 className="text-sm font-semibold mb-3 text-text-secondary">NOAA Staleness Impact</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-text-muted mb-1">Fresh Data</div>
              <div className="text-xl font-bold text-green-400">
                {staleness.fresh.win_rate !== null ? `${staleness.fresh.win_rate.toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-xs text-text-muted">{staleness.fresh.count} trades</div>
            </div>
            <div>
              <div className="text-xs text-text-muted mb-1">Stale Data</div>
              <div className={`text-xl font-bold ${staleness.stale.win_rate && staleness.stale.win_rate < (staleness.fresh.win_rate || 0) ? 'text-red-400' : 'text-amber-400'}`}>
                {staleness.stale.win_rate !== null ? `${staleness.stale.win_rate.toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-xs text-text-muted">{staleness.stale.count} trades</div>
            </div>
          </div>
        </div>
      )}

      {/* Provider Dropout Impact */}
      {dropout && (
        <div className="bg-surface-hover rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-3 text-text-secondary">Ensemble Completeness</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-text-muted mb-1">Full Ensemble (4 providers)</div>
              <div className="text-xl font-bold text-green-400">
                {dropout.full_ensemble.win_rate !== null ? `${dropout.full_ensemble.win_rate.toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-xs text-text-muted">{dropout.full_ensemble.count} trades</div>
            </div>
            <div>
              <div className="text-xs text-text-muted mb-1">Partial Ensemble (&lt;4)</div>
              <div className={`text-xl font-bold ${dropout.partial_ensemble.win_rate && dropout.partial_ensemble.win_rate < (dropout.full_ensemble.win_rate || 0) ? 'text-amber-400' : 'text-green-400'}`}>
                {dropout.partial_ensemble.win_rate !== null ? `${dropout.partial_ensemble.win_rate.toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-xs text-text-muted">{dropout.partial_ensemble.count} trades</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
