import { Position } from '../types/position';

interface PositionDetailCardProps {
  position: Position;
}

export default function PositionDetailCard({ position }: PositionDetailCardProps) {
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

  const formatTimeHeld = (time: string) => {
    const now = new Date();
    const then = new Date(time);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24);
      return `${days}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m`;
    } else {
      return `${diffMins}m`;
    }
  };

  const totalCost = (position.count * position.price) / 100;
  const potentialWin = (position.count * (100 - position.price)) / 100;

  return (
    <div className="bg-bg-secondary border border-gray-700 rounded-lg p-4 hover:border-accent-blue transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-lg font-bold text-text-primary">{position.city}</div>
          <div className="text-xs text-text-secondary font-mono truncate max-w-[200px]">
            {position.ticker}
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-bold ${
            position.side === 'yes'
              ? 'bg-accent-green text-black'
              : 'bg-accent-red text-white'
          }`}
        >
          {position.side.toUpperCase()}
        </span>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
        <div>
          <div className="text-text-secondary uppercase mb-1">Position</div>
          <div className="text-text-primary font-semibold font-mono">
            {position.count}x @ {position.price}¢
          </div>
        </div>

        <div>
          <div className="text-text-secondary uppercase mb-1">Cost</div>
          <div className="text-text-primary font-semibold">
            ${totalCost.toFixed(2)}
          </div>
        </div>

        <div>
          <div className="text-text-secondary uppercase mb-1">Adj. Edge</div>
          <div className={`font-bold ${edgeColor(position.adjusted_edge)}`}>
            {position.adjusted_edge.toFixed(1)}¢
          </div>
        </div>

        <div>
          <div className="text-text-secondary uppercase mb-1">Confidence</div>
          <div className={`font-bold ${confidenceColor(position.confidence)}`}>
            {(position.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Forecast Info */}
      <div className="mb-3 pb-3 border-b border-gray-700">
        <div className="text-xs text-text-secondary uppercase mb-1">Forecast / Strike</div>
        <div className="text-text-primary">
          <span className="font-semibold">{position.forecast.toFixed(1)}°F</span>
          <span className="text-text-secondary mx-1">/</span>
          <span className="text-text-secondary">
            {position.ticker.includes('HIGH') ? '>' : '<'}{' '}
            {position.ticker.match(/T(\d+)/)?.[1] || '?'}°F
          </span>
        </div>
      </div>

      {/* Ensemble Summary */}
      <div className="mb-3 pb-3 border-b border-gray-700">
        <div className="text-xs text-text-secondary uppercase mb-2">Ensemble</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-text-secondary">Providers:</span>
            <span
              className={`ml-1 font-semibold ${
                position.ensemble_details.provider_count < 3
                  ? 'text-accent-red'
                  : 'text-text-primary'
              }`}
            >
              {position.ensemble_details.provider_count}/5
            </span>
          </div>
          <div>
            <span className="text-text-secondary">NOAA Age:</span>
            <span
              className={`ml-1 font-semibold ${
                position.ensemble_details.noaa_stale
                  ? 'text-accent-red'
                  : 'text-text-primary'
              }`}
            >
              {position.ensemble_details.noaa_age_hours !== null
                ? `${position.ensemble_details.noaa_age_hours.toFixed(1)}h`
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Potential Win/Loss */}
      <div className="mb-3 text-xs">
        <div className="flex justify-between mb-1">
          <span className="text-text-secondary">Potential Win:</span>
          <span className="text-accent-green font-semibold">+${potentialWin.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Potential Loss:</span>
          <span className="text-accent-red font-semibold">-${totalCost.toFixed(2)}</span>
        </div>
      </div>

      {/* Time & Warnings */}
      <div className="flex items-center justify-between text-xs">
        <div className="text-text-secondary">
          Held: <span className="text-text-primary font-mono">{formatTimeHeld(position.trade_time)}</span>
        </div>
        <div className="flex gap-1">
          {position.ensemble_details.noaa_stale && (
            <span title="NOAA data stale" className="text-accent-yellow">
              ⚠️
            </span>
          )}
          {position.ensemble_details.provider_count < 3 && (
            <span title="Low provider count" className="text-accent-red">
              ⚠️
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
