import React, { useState, useMemo } from 'react';
import useDashboardStore from '../stores/dashboardStore';
import { Position } from '../types/position';
import EnsembleDetail from './EnsembleDetail';

type SortField = 'adjusted_edge' | 'city' | 'time' | 'confidence';
type GroupBy = 'none' | 'city' | 'date';

export default function PositionsTable() {
  const { positions } = useDashboardStore();
  
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('adjusted_edge');
  const [sortDesc, setSortDesc] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  // Sort positions
  const sortedPositions = useMemo(() => {
    const sorted = [...positions].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case 'adjusted_edge':
          aVal = a.adjusted_edge;
          bVal = b.adjusted_edge;
          break;
        case 'confidence':
          aVal = a.confidence;
          bVal = b.confidence;
          break;
        case 'city':
          aVal = a.city;
          bVal = b.city;
          break;
        case 'time':
          aVal = new Date(a.trade_time).getTime();
          bVal = new Date(b.trade_time).getTime();
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }

      return sortDesc ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });

    return sorted;
  }, [positions, sortField, sortDesc]);

  // Group positions if needed
  const groupedPositions = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Positions': sortedPositions };
    }

    const groups: Record<string, Position[]> = {};

    sortedPositions.forEach((position) => {
      let key: string;
      
      if (groupBy === 'city') {
        key = position.city;
      } else if (groupBy === 'date') {
        key = new Date(position.trade_time).toLocaleDateString();
      } else {
        key = 'All Positions';
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(position);
    });

    return groups;
  }, [sortedPositions, groupBy]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  const toggleExpand = (ticker: string) => {
    setExpandedRow(expandedRow === ticker ? null : ticker);
  };

  const formatTimeHeld = (tradeTime: string) => {
    const now = new Date();
    const then = new Date(tradeTime);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24);
      return `${days}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return `${diffMins}m ago`;
    }
  };

  const confidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-accent-green';
    if (confidence >= 0.6) return 'text-accent-yellow';
    return 'text-accent-red';
  };

  const edgeColor = (edge: number) => {
    if (edge >= 20) return 'text-accent-green';
    if (edge >= 10) return 'text-accent-yellow';
    return 'text-text-secondary';
  };

  if (positions.length === 0) {
    return (
      <div className="frost-card">
        <h2 className="text-xl font-semibold mb-4 text-text-primary">Active Positions</h2>
        <div className="text-center text-zinc-500 py-12">
          <svg className="w-10 h-10 mx-auto mb-3 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          <p className="text-sm">No open positions</p>
          <p className="text-xs text-zinc-600 mt-1">The scanner will find opportunities automatically</p>
        </div>
      </div>
    );
  }

  return (
    <div className="frost-card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-text-primary">
          Active Positions ({positions.length})
        </h2>
        
        <div className="flex gap-2 text-xs">
          <label className="text-text-secondary">Group by:</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="bg-bg-primary border border-gray-700 text-text-primary px-2 py-1 rounded"
          >
            <option value="none">None</option>
            <option value="city">City</option>
            <option value="date">Date</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        {Object.entries(groupedPositions).map(([groupName, groupPositions]) => (
          <div key={groupName} className="mb-6 last:mb-0">
            {groupBy !== 'none' && (
              <h3 className="text-sm font-semibold text-text-secondary uppercase mb-2 px-2">
                {groupName} ({groupPositions.length})
              </h3>
            )}
            
            <table className="w-full text-sm font-mono">
              <thead className="text-xs text-text-secondary uppercase border-b border-gray-700">
                <tr>
                  <th className="px-2 py-2 text-left">City / Ticker</th>
                  <th className="px-2 py-2 text-center">Side</th>
                  <th className="px-2 py-2 text-right">Position</th>
                  <th className="px-2 py-2 text-right">Cost</th>
                  <th
                    className="px-2 py-2 text-right cursor-pointer hover:text-accent-blue"
                    onClick={() => handleSort('adjusted_edge')}
                  >
                    Edge {sortField === 'adjusted_edge' && (sortDesc ? '▼' : '▲')}
                  </th>
                  <th
                    className="px-2 py-2 text-right cursor-pointer hover:text-accent-blue"
                    onClick={() => handleSort('confidence')}
                  >
                    Conf {sortField === 'confidence' && (sortDesc ? '▼' : '▲')}
                  </th>
                  <th className="px-2 py-2 text-left">Forecast / Strike</th>
                  <th className="px-2 py-2 text-left">Target Date</th>
                  <th className="px-2 py-2 text-center">Status</th>
                  <th
                    className="px-2 py-2 text-right cursor-pointer hover:text-accent-blue"
                    onClick={() => handleSort('time')}
                  >
                    Held {sortField === 'time' && (sortDesc ? '▼' : '▲')}
                  </th>
                  <th className="px-2 py-2 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {groupPositions.map((position) => (
                  <React.Fragment key={position.ticker}>
                    <tr
                      className="border-b border-gray-800 hover:bg-bg-primary transition-colors cursor-pointer"
                      onClick={() => toggleExpand(position.ticker)}
                    >
                      {/* City / Ticker */}
                      <td className="px-2 py-3">
                        <div className="font-semibold text-text-primary">{position.city}</div>
                        <div className="text-xs text-text-secondary truncate max-w-[180px]">
                          {position.ticker}
                        </div>
                      </td>

                      {/* Side Badge */}
                      <td className="px-2 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-bold ${
                            position.side === 'yes'
                              ? 'bg-accent-green text-black'
                              : 'bg-accent-red text-white'
                          }`}
                        >
                          {position.side.toUpperCase()}
                        </span>
                      </td>

                      {/* Position */}
                      <td className="px-2 py-3 text-right text-text-primary">
                        {position.count}x @ {position.price}¢
                      </td>

                      {/* Cost */}
                      <td className="px-2 py-3 text-right text-text-primary">
                        ${((position.count * position.price) / 100).toFixed(2)}
                      </td>

                      {/* Edge */}
                      <td className={`px-2 py-3 text-right font-semibold ${edgeColor(position.adjusted_edge)}`}>
                        {position.adjusted_edge.toFixed(1)}¢
                      </td>

                      {/* Confidence */}
                      <td className={`px-2 py-3 text-right font-semibold ${confidenceColor(position.confidence)}`}>
                        {(position.confidence * 100).toFixed(0)}%
                      </td>

                      {/* Forecast / Strike */}
                      <td className="px-2 py-3 text-text-primary">
                        <div>Fcst: {position.forecast.toFixed(1)}°F</div>
                        <div className="text-xs text-text-secondary">
                          Strike: {position.ticker.includes('HIGH') ? 'above' : 'below'}{' '}
                          {position.ticker.match(/T(\d+)/)?.[1] || '?'}°F
                        </div>
                      </td>

                      {/* Target Date */}
                      <td className="px-2 py-3 text-text-secondary text-xs">
                        {position.target_date}
                      </td>

                      {/* Status Indicators */}
                      <td className="px-2 py-3 text-center">
                        {position.ensemble_details.noaa_stale && (
                          <span title="NOAA data stale" className="text-accent-yellow">
                            ⚠️
                          </span>
                        )}
                        {position.ensemble_details.provider_count < 3 && (
                          <span title="Low provider count" className="text-accent-red ml-1">
                            ⚠️
                          </span>
                        )}
                      </td>

                      {/* Time Held */}
                      <td className="px-2 py-3 text-right text-text-secondary text-xs">
                        {formatTimeHeld(position.trade_time)}
                      </td>

                      {/* Expand Arrow */}
                      <td className="px-2 py-3 text-center text-zinc-500">
                        <span className={`inline-block transition-transform duration-200 ${expandedRow === position.ticker ? 'rotate-90' : ''}`}>›</span>
                      </td>
                    </tr>

                    {/* Expandable Row */}
                    {expandedRow === position.ticker && (
                      <tr className="bg-bg-primary">
                        <td colSpan={11} className="px-2 py-4">
                          <EnsembleDetail position={position} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
