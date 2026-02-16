import { useState, useMemo } from 'react';
import { usePolling } from '../hooks/usePolling';
import type { PnLData } from '../types/pnl';

interface PnLSummary {
  total_pnl_cents: number;
  total_trades: number;
  total_wins: number;
  total_losses: number;
  win_rate: number;
  best_day: { date: string; pnl_cents: number } | null;
  worst_day: { date: string; pnl_cents: number } | null;
}

type DateRange = '7d' | '30d' | '90d' | 'all';

const formatCurrency = (cents: number): string => {
  const dollars = cents / 100;
  return `${dollars >= 0 ? '+' : ''}$${dollars.toFixed(2)}`;
};

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

const dateRanges: { id: DateRange; label: string }[] = [
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: '90d', label: '90d' },
  { id: 'all', label: 'All' },
];

function filterByRange<T>(entries: [string, T][], range: DateRange): [string, T][] {
  if (range === 'all') return entries;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return entries.filter(([date]) => date >= cutoffStr);
}

function PnLPanel() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [weeklyExpanded, setWeeklyExpanded] = useState(false);

  const { data: pnlData, loading: pnlLoading, error: pnlError } = usePolling<PnLData>('/pnl/', 60000);
  const { data: summaryData, loading: summaryLoading, error: summaryError } = usePolling<PnLSummary>('/pnl/summary/', 60000);

  const dailyEntries = useMemo(() => {
    if (!pnlData?.daily) return [];
    const entries = Object.entries(pnlData.daily).sort((a, b) => b[0].localeCompare(a[0]));
    return filterByRange(entries, dateRange);
  }, [pnlData, dateRange]);

  const weeklyEntries = useMemo(() => {
    if (!pnlData?.weeks) return [];
    const entries = Object.entries(pnlData.weeks).sort((a, b) => b[0].localeCompare(a[0]));
    return filterByRange(entries, dateRange);
  }, [pnlData, dateRange]);

  // Loading skeleton
  if (pnlLoading || summaryLoading) {
    return (
      <div className="frost-card space-y-4">
        <h2 className="text-xl font-semibold text-text-primary">P&L Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-zinc-800/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (pnlError || summaryError) {
    return (
      <div className="frost-card">
        <h2 className="text-xl font-semibold mb-4 text-text-primary">P&L Summary</h2>
        <div className="text-red-400 text-sm">Error: {pnlError || summaryError}</div>
      </div>
    );
  }

  if (!pnlData || !summaryData) {
    return (
      <div className="frost-card">
        <h2 className="text-xl font-semibold mb-4 text-text-primary">P&L Summary</h2>
        <p className="text-zinc-500 text-sm text-center py-8">No trading data yet</p>
      </div>
    );
  }

  const summaryCards = [
    {
      label: 'Total P&L',
      value: formatCurrency(summaryData.total_pnl_cents),
      color: summaryData.total_pnl_cents >= 0 ? 'text-green-500' : 'text-red-500',
    },
    {
      label: 'Total Trades',
      value: `${summaryData.total_trades}`,
      sub: `W: ${summaryData.total_wins} / L: ${summaryData.total_losses}`,
      color: 'text-zinc-50',
    },
    {
      label: 'Win Rate',
      value: formatPercent(summaryData.win_rate),
      color: summaryData.win_rate >= 50 ? 'text-green-500' : 'text-red-500',
    },
    {
      label: 'Best / Worst Day',
      value: summaryData.best_day ? formatCurrency(summaryData.best_day.pnl_cents) : '—',
      sub: summaryData.worst_day ? formatCurrency(summaryData.worst_day.pnl_cents) : '—',
      color: 'text-green-500',
      subColor: 'text-red-500',
    },
  ];

  return (
    <div className="frost-card space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">P&L Summary</h2>

        {/* Date Range Pills */}
        <div className="flex gap-1">
          {dateRanges.map((r) => (
            <button
              key={r.id}
              onClick={() => setDateRange(r.id)}
              className={`px-3 py-1 rounded-full text-sm transition-colors duration-150 ${
                dateRange === r.id
                  ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats - Auto-fill grid for responsive spacing */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-zinc-800/50 rounded-lg p-4 hover:bg-zinc-800 transition-colors duration-150">
            <div className="text-xs text-zinc-500 mb-1">{card.label}</div>
            <div className={`text-lg font-mono font-semibold tabular-nums ${card.color}`}>
              {card.value}
            </div>
            {card.sub && (
              <div className={`text-xs font-mono ${card.subColor || 'text-zinc-500'}`}>
                {card.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Daily P&L Table */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">Daily P&L</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead className="border-b border-zinc-700/50">
              <tr className="text-zinc-500 text-xs uppercase">
                <th className="text-left py-2 px-3">Date</th>
                <th className="text-right py-2 px-3">P&L</th>
                <th className="text-right py-2 px-3">Trades</th>
                <th className="text-right py-2 px-3">Wins</th>
                <th className="text-right py-2 px-3">Losses</th>
                <th className="text-right py-2 px-3">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {dailyEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-zinc-500">
                    No daily data available
                  </td>
                </tr>
              ) : (
                dailyEntries.map(([date, data]) => {
                  const winRate = data.trades > 0 ? data.wins / data.trades : 0;
                  return (
                    <tr key={date} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="py-2 px-3 text-zinc-300">{date}</td>
                      <td className={`py-2 px-3 text-right font-semibold tabular-nums ${
                        data.pnl_cents >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {formatCurrency(data.pnl_cents)}
                      </td>
                      <td className="py-2 px-3 text-right text-zinc-300 tabular-nums">{data.trades}</td>
                      <td className="py-2 px-3 text-right text-green-400 tabular-nums">{data.wins}</td>
                      <td className="py-2 px-3 text-right text-red-400 tabular-nums">{data.losses}</td>
                      <td className={`py-2 px-3 text-right tabular-nums ${
                        winRate >= 0.5 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatPercent(winRate)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly P&L - Collapsible */}
      <div>
        <button
          onClick={() => setWeeklyExpanded(!weeklyExpanded)}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors mb-2"
        >
          <span className={`inline-block transition-transform duration-200 ${weeklyExpanded ? 'rotate-90' : ''}`}>›</span>
          Weekly P&L
        </button>
        <div className={`overflow-hidden transition-all duration-200 ${
          weeklyExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead className="border-b border-zinc-700/50">
                <tr className="text-zinc-500 text-xs uppercase">
                  <th className="text-left py-2 px-3">Week</th>
                  <th className="text-right py-2 px-3">P&L</th>
                  <th className="text-right py-2 px-3">Trades</th>
                  <th className="text-right py-2 px-3">Wins</th>
                  <th className="text-right py-2 px-3">Losses</th>
                  <th className="text-right py-2 px-3">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {weeklyEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-zinc-500">
                      No weekly data available
                    </td>
                  </tr>
                ) : (
                  weeklyEntries.map(([week, data]) => {
                    const winRate = data.trades > 0 ? data.wins / data.trades : 0;
                    return (
                      <tr key={week} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="py-2 px-3 text-zinc-300">{week}</td>
                        <td className={`py-2 px-3 text-right font-semibold tabular-nums ${
                          data.pnl_cents >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {formatCurrency(data.pnl_cents)}
                        </td>
                        <td className="py-2 px-3 text-right text-zinc-300 tabular-nums">{data.trades}</td>
                        <td className="py-2 px-3 text-right text-green-400 tabular-nums">{data.wins}</td>
                        <td className="py-2 px-3 text-right text-red-400 tabular-nums">{data.losses}</td>
                        <td className={`py-2 px-3 text-right tabular-nums ${
                          winRate >= 0.5 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatPercent(winRate)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PnLPanel;
