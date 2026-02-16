/**
 * ErrorBanner - Displays API fetch errors at the top of the dashboard
 * TICK-020c: Error handling and robustness improvements
 */
import { useEffect, useState } from 'react';
import useDashboardStore, { FetchError } from '../stores/dashboardStore';

export default function ErrorBanner() {
  const { errors } = useDashboardStore();
  const [visible, setVisible] = useState(true);

  // Reset visibility when errors change
  useEffect(() => {
    if (errors.length > 0) {
      setVisible(true);
    }
  }, [errors]);

  if (errors.length === 0 || !visible) {
    return null;
  }

  // Group errors by recency - only show most recent for each endpoint
  const latestErrors = errors.reduce((acc, error) => {
    const existing = acc.find((e) => e.endpoint === error.endpoint);
    if (!existing || error.timestamp > existing.timestamp) {
      return [...acc.filter((e) => e.endpoint !== error.endpoint), error];
    }
    return acc;
  }, [] as FetchError[]);

  // Format endpoint name for display
  const formatEndpoint = (endpoint: string): string => {
    return endpoint
      .replace(/^\/api\/v1\//, '')
      .replace(/\/$/, '')
      .replace(/-/g, ' ')
      .toUpperCase();
  };

  // Format timestamp for display
  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="border-b border-red-900/50 bg-red-950/30">
      <div className="px-6 py-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-400 text-lg">⚠️</span>
              <h3 className="text-red-200 font-semibold text-sm">
                API Connection Issues
              </h3>
            </div>
            
            <div className="space-y-1">
              {latestErrors.map((error) => (
                <div 
                  key={error.endpoint}
                  className="text-xs text-red-300/80 font-mono"
                >
                  <span className="text-red-400 font-semibold">
                    {formatEndpoint(error.endpoint)}
                  </span>
                  {' → '}
                  <span>{error.message}</span>
                  {' '}
                  <span className="text-red-400/60">
                    ({formatTime(error.timestamp)})
                  </span>
                </div>
              ))}
            </div>
            
            <p className="text-xs text-red-300/60 mt-2">
              Check backend status or network connectivity. Retrying automatically...
            </p>
          </div>
          
          <button
            onClick={() => setVisible(false)}
            className="ml-4 px-2 py-1 rounded hover:bg-red-900/40 transition-colors text-xs text-red-300"
            aria-label="Dismiss error banner"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
