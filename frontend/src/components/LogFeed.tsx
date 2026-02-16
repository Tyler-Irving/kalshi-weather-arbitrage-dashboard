/**
 * Real-time log feed component with WebSocket streaming.
 * TICK-009: Color-coded logs, filters, search, auto-scroll.
 * Per TICK-001 §3.5:
 * - 🟢 TRADE/SETTLED → green
 * - 🟡 WARN → amber
 * - 🔴 ERROR → red
 * - ⚪ SKIP → dim gray
 */
import { useState, useRef, useEffect } from 'react';
import { useLogStream } from '../hooks/useLogStream';

type FilterType = 'all' | 'trades' | 'errors' | 'skips';

export function LogFeed() {
  const { lines, connected, error } = useLogStream();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchText, setSearchText] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  // Detect user scrolling up to pause auto-scroll
  const handleScroll = () => {
    if (!logContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;

    setAutoScroll(isAtBottom);
  };

  // Jump to bottom button handler
  const scrollToBottom = () => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      setAutoScroll(true);
    }
  };

  // Filter lines based on current filter and search text
  const filteredLines = lines.filter((line) => {
    // Apply filter
    if (filter === 'trades' && !(line.includes('TRADE') || line.includes('SETTLED'))) {
      return false;
    }
    if (filter === 'errors' && !line.includes('ERROR')) {
      return false;
    }
    if (filter === 'skips' && !line.includes('SKIP')) {
      return false;
    }

    // Apply search
    if (searchText && !line.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }

    return true;
  });

  // Determine line color based on content
  const getLineColor = (line: string): string => {
    if (line.includes('TRADE') || line.includes('SETTLED')) {
      return 'text-green-400';
    }
    if (line.includes('WARN')) {
      return 'text-amber-400';
    }
    if (line.includes('ERROR')) {
      return 'text-red-400';
    }
    if (line.includes('SKIP')) {
      return 'text-gray-500';
    }
    return 'text-gray-300';
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-4 flex flex-col h-full">
      {/* Header with connection status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white">Live Logs</h2>
          <div className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-gray-400">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2">
          {(['all', 'trades', 'errors', 'skips'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Search box */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search logs..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-3 p-2 bg-red-900/30 border border-red-700 rounded text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Log display area */}
      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        className="flex-1 bg-black rounded p-3 overflow-y-auto font-mono text-xs leading-relaxed"
        style={{ minHeight: '300px' }}
      >
        {filteredLines.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            {lines.length === 0 ? 'Waiting for logs...' : 'No matching logs'}
          </div>
        ) : (
          filteredLines.map((line, idx) => (
            <div key={idx} className={`${getLineColor(line)} break-all`}>
              {line}
            </div>
          ))
        )}
      </div>

      {/* Jump to bottom button (shows when not auto-scrolling) */}
      {!autoScroll && (
        <button
          onClick={scrollToBottom}
          className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
        >
          ↓ Jump to Bottom
        </button>
      )}

      {/* Stats footer */}
      <div className="mt-2 text-xs text-gray-500 text-right">
        Showing {filteredLines.length} of {lines.length} lines
      </div>
    </div>
  );
}
