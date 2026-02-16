import React, { useState, useMemo } from 'react';
import { usePolling } from '../hooks/usePolling';
import { BacktestEntry } from '../types/backtest';

interface BacktestResponse {
  entries: BacktestEntry[];
  count: number;
  date: string;
}

interface BacktestStatsData {
  date: string;
  scanned: number;
  traded: number;
  skipped: number;
  skip_reasons: Record<string, number>;
}

type SortColumn = 'ticker' | 'city' | 'fair_cents' | 'adjusted_edge' | 'confidence';
type SortDirection = 'asc' | 'desc';

const CITIES = ['PHX', 'SFO', 'SEA', 'DC', 'HOU', 'NOLA', 'DAL', 'BOS', 'OKC', 'ATL', 'MIN'];
const PAGE_SIZE = 25;

const BacktestTable = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Generate unique key for each entry
  const getEntryKey = (entry: BacktestEntry, index?: number): string => {
    return `${entry.ticker}-${entry.ts}-${entry.side || 'none'}-${index || 0}`;
  };
  const [sortColumn, setSortColumn] = useState<SortColumn>('adjusted_edge');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, loading, error } = usePolling<BacktestResponse>(
    `/backtest/?date=${selectedDate}`,
    60000
  );

  const { data: statsData } = usePolling<BacktestStatsData>(
    `/backtest/stats/?date=${selectedDate}`,
    60000
  );

  // Compute summary stats
  const summaryStats = useMemo(() => {
    if (!data?.entries) return { scanned: 0, opportunities: 0, hitRate: '0.0', avgEdge: '0.0' };
    const entries = data.entries;
    const traded = entries.filter(e => e.action === 'trade');
    const avgEdge = traded.length > 0
      ? (traded.reduce((sum, e) => sum + (e.adjusted_edge || 0), 0) / traded.length).toFixed(1)
      : '0.0';
    return {
      scanned: statsData?.scanned || entries.length,
      opportunities: traded.length,
      hitRate: entries.length > 0 ? ((traded.length / entries.length) * 100).toFixed(1) : '0.0',
      avgEdge,
    };
  }, [data, statsData]);

  // Filter and sort
  const filteredAndSortedEntries = useMemo(() => {
    if (!data?.entries) return [];
    let filtered = [...data.entries];

    if (cityFilter !== 'all') filtered = filtered.filter(e => e.city === cityFilter);
    if (actionFilter !== 'all') filtered = filtered.filter(e => e.action === actionFilter);

    filtered.sort((a, b) => {
      let aVal: number | string = a[sortColumn];
      let bVal: number | string = b[sortColumn];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      const aNum = typeof aVal === 'number' ? aVal : 0;
      const bNum = typeof bVal === 'number' ? bVal : 0;
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });

    return filtered;
  }, [data, cityFilter, actionFilter, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedEntries.length / PAGE_SIZE));
  const paginatedEntries = filteredAndSortedEntries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset page on filter change
  const handleCityFilter = (v: string) => { setCityFilter(v); setCurrentPage(1); };
  const handleActionFilter = (v: string) => { setActionFilter(v); setCurrentPage(1); };

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const toggleRow = (key: string) => {
    setExpandedRow(expandedRow === key ? null : key);
  };

  const formatSkipReason = (reason: string | null): string => {
    if (!reason) return 'N/A';
    const match = reason.match(/(.+?)=(.+)/);
    if (match) {
      const [, type, value] = match;
      switch (type) {
        case 'edge_low': return `Edge too low: ${value}¢`;
        case 'edge_capped': return `Edge capped: ${value}¢`;
        case 'spread_wide': return `Spread wide: ${value}¢`;
        case 'confidence_low': return `Low conf: ${value}`;
        default: return reason;
      }
    }
    return reason;
  };

  // Loading skeleton
  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="frost-card space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-zinc-800/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="frost-card">
        <h2 className="text-xl font-semibold mb-4 text-text-primary">Backtest</h2>
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  const summaryCards = [
    { label: 'Markets Scanned', value: summaryStats.scanned, color: 'text-blue-400' },
    { label: 'Opportunities', value: summaryStats.opportunities, color: 'text-green-400' },
    { label: 'Hit Rate', value: `${summaryStats.hitRate}%`, color: 'text-amber-400' },
    { label: 'Avg Edge', value: `${summaryStats.avgEdge}¢`, color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-zinc-800/50 rounded-lg p-4 ring-1 ring-zinc-700/30">
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{card.label}</div>
            <div className={`text-2xl font-bold font-mono tabular-nums ${card.color}`}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="frost-card">
        {/* Header with Date + Filters */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Backtest Detail</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
            className="bg-zinc-900 border border-zinc-700/50 rounded-lg px-3 py-1.5 text-text-primary text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <label className="text-zinc-500">City:</label>
            <select
              value={cityFilter}
              onChange={(e) => handleCityFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-700/50 rounded-lg px-3 py-1 text-text-primary text-sm"
            >
              <option value="all">All Cities</option>
              {CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-zinc-500">Action:</label>
            <select
              value={actionFilter}
              onChange={(e) => handleActionFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-700/50 rounded-lg px-3 py-1 text-text-primary text-sm"
            >
              <option value="all">All</option>
              <option value="trade">Traded</option>
              <option value="skip">Skipped</option>
            </select>
          </div>

          <div className="ml-auto text-sm text-zinc-500">
            {filteredAndSortedEntries.length} entries
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-lg">
          <table className="w-full text-sm font-mono">
            <thead className="sticky top-0 bg-zinc-900 z-10 text-zinc-500 text-xs uppercase">
              <tr className="border-b border-zinc-700/50">
                <th
                  className="px-3 py-2 text-left cursor-pointer hover:text-zinc-200"
                  onClick={() => handleSort('ticker')}
                >
                  Ticker {sortColumn === 'ticker' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-3 py-2 text-left cursor-pointer hover:text-zinc-200"
                  onClick={() => handleSort('city')}
                >
                  City {sortColumn === 'city' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-3 py-2 text-left">Side</th>
                <th
                  className="px-3 py-2 text-right cursor-pointer hover:text-zinc-200"
                  onClick={() => handleSort('fair_cents')}
                >
                  Fair (¢) {sortColumn === 'fair_cents' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-3 py-2 text-right">Market (¢)</th>
                <th
                  className="px-3 py-2 text-right cursor-pointer hover:text-zinc-200"
                  onClick={() => handleSort('adjusted_edge')}
                >
                  Edge {sortColumn === 'adjusted_edge' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-3 py-2 text-right cursor-pointer hover:text-zinc-200"
                  onClick={() => handleSort('confidence')}
                >
                  Conf {sortColumn === 'confidence' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-3 py-2 text-center">Action</th>
                <th className="px-3 py-2 text-left">Skip Reason</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-zinc-500">
                    No entries found
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((entry, index) => {
                  const entryKey = getEntryKey(entry, (currentPage - 1) * PAGE_SIZE + index);
                  const isTraded = entry.action === 'trade';
                  const isExpanded = expandedRow === entryKey;

                  return (
                    <React.Fragment key={entryKey}>
                      <tr
                        className={`border-b border-zinc-800/50 cursor-pointer transition-colors duration-150 ${
                          isTraded ? 'hover:bg-green-500/5' : 'hover:bg-zinc-800/50'
                        }`}
                        onClick={() => toggleRow(entryKey)}
                      >
                        <td className="px-3 py-2 text-zinc-300 truncate max-w-[200px]" title={entry.ticker}>
                          {entry.ticker.replace('KXHIGHT', '').slice(0, 18)}
                        </td>
                        <td className="px-3 py-2 text-zinc-200 font-semibold">{entry.city}</td>
                        <td className="px-3 py-2">
                          {entry.side ? (
                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                              entry.side === 'yes'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {entry.side.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-zinc-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">
                          {entry.fair_cents !== null ? entry.fair_cents : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">
                          {entry.market_yes_ask}/{entry.market_yes_bid}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-amber-400 tabular-nums">
                          {entry.adjusted_edge !== null ? `${entry.adjusted_edge.toFixed(1)}¢` : '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <span className={
                            entry.confidence >= 0.7 ? 'text-green-400'
                              : entry.confidence >= 0.6 ? 'text-amber-400'
                              : 'text-red-400'
                          }>
                            {entry.confidence.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                            isTraded
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-zinc-700/50 text-zinc-400'
                          }`}>
                            {entry.action.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-zinc-500 text-xs">
                          {isTraded ? '—' : formatSkipReason(entry.skip_reason)}
                        </td>
                      </tr>

                      {/* Animated expanded row */}
                      <tr>
                        <td colSpan={9} className="p-0">
                          <div className={`overflow-hidden transition-all duration-200 ${
                            isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                          }`}>
                            <div className="px-6 py-3 bg-zinc-800/30 text-xs space-y-1">
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <span className="text-zinc-500">Full Ticker:</span>
                                  <span className="text-zinc-300 ml-2">{entry.ticker}</span>
                                </div>
                                <div>
                                  <span className="text-zinc-500">Timestamp:</span>
                                  <span className="text-zinc-300 ml-2">
                                    {new Date(entry.ts).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-zinc-500">Forecast:</span>
                                  <span className="text-zinc-300 ml-2">{entry.forecast}°F</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredAndSortedEntries.length > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4 text-sm text-zinc-500">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredAndSortedEntries.length)} of {filteredAndSortedEntries.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-zinc-800 rounded-lg disabled:opacity-30 hover:bg-zinc-700 transition-colors"
              >
                ← Prev
              </button>
              <span className="text-zinc-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-zinc-800 rounded-lg disabled:opacity-30 hover:bg-zinc-700 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BacktestTable;
