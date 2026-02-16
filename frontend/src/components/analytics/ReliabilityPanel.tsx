/**
 * ReliabilityPanel - Win rate tables by city/side/bracket + streak badges
 * TICK-011 - Trade Reliability panel
 */
import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface WinRateData {
  wins: number;
  total: number;
  win_rate: number;
}

interface StreakData {
  current_streak: number;
  current_type: 'win' | 'loss' | null;
  longest_win_streak: number;
  longest_loss_streak: number;
}

interface ReliabilitySummary {
  by_city: Record<string, WinRateData>;
  by_side: Record<string, WinRateData>;
  by_confidence: Record<string, WinRateData>;
  by_edge: Record<string, WinRateData>;
  streaks: StreakData;
}

export default function ReliabilityPanel() {
  const [data, setData] = useState<ReliabilitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = days ? `?days=${days}` : '';
      const response = await apiClient.get(`/reliability/summary/${params}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch reliability data:', error);
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

  if (!data) {
    return (
      <div className="bg-surface rounded-lg shadow-md p-6">
        <p className="text-text-muted">No reliability data available.</p>
      </div>
    );
  }

  const { streaks } = data;

  const StreakBadge = () => {
    if (!streaks.current_type || streaks.current_streak === 0) {
      return null;
    }

    const isWin = streaks.current_type === 'win';
    const emoji = isWin ? '🔥' : '❄️';
    const color = isWin ? 'text-green-400' : 'text-red-400';
    const label = isWin ? 'W' : 'L';

    return (
      <div className={`inline-flex items-center space-x-1 text-xl font-bold ${color}`}>
        <span>{emoji}</span>
        <span>{label}{streaks.current_streak}</span>
      </div>
    );
  };

  const renderWinRateTable = (title: string, dataObj: Record<string, WinRateData>) => {
    const entries = Object.entries(dataObj).sort((a, b) => b[1].win_rate - a[1].win_rate);

    if (entries.length === 0) {
      return (
        <div className="bg-surface-hover rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-2 text-text-secondary">{title}</h4>
          <p className="text-xs text-text-muted">No data</p>
        </div>
      );
    }

    return (
      <div className="bg-surface-hover rounded-lg p-4">
        <h4 className="text-sm font-semibold mb-3 text-text-secondary">{title}</h4>
        <div className="space-y-2">
          {entries.map(([key, stats]) => (
            <div key={key} className="flex justify-between items-center text-sm">
              <span className="font-medium">{key}</span>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-text-muted">
                  {stats.wins}/{stats.total}
                </span>
                <span className={`font-semibold ${stats.win_rate >= 55 ? 'text-green-400' : stats.win_rate >= 45 ? 'text-amber-400' : 'text-red-400'}`}>
                  {stats.win_rate.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-surface rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Trade Reliability</h3>
        <div className="flex items-center space-x-4">
          <StreakBadge />
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
      </div>

      {/* Streak Stats Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface-hover rounded-lg p-4">
          <div className="text-xs text-text-muted mb-1">Longest Win Streak</div>
          <div className="text-2xl font-bold text-green-400">🔥 {streaks.longest_win_streak}</div>
        </div>
        <div className="bg-surface-hover rounded-lg p-4">
          <div className="text-xs text-text-muted mb-1">Longest Loss Streak</div>
          <div className="text-2xl font-bold text-red-400">❄️ {streaks.longest_loss_streak}</div>
        </div>
      </div>

      {/* Win Rate Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderWinRateTable('Win Rate by City', data.by_city)}
        {renderWinRateTable('Win Rate by Side', data.by_side)}
        {renderWinRateTable('Win Rate by Confidence', data.by_confidence)}
        {renderWinRateTable('Win Rate by Edge', data.by_edge)}
      </div>
    </div>
  );
}
