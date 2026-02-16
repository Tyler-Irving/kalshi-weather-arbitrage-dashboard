import { Position } from '../types/position';

interface EnsembleDetailProps {
  position: Position;
}

export default function EnsembleDetail({ position }: EnsembleDetailProps) {
  const { ensemble_details } = position;

  // Calculate provider spread (max - min)
  const forecasts = Object.values(ensemble_details.individual_forecasts);
  const maxForecast = Math.max(...forecasts);
  const minForecast = Math.min(...forecasts);
  const spread = maxForecast - minForecast;

  // Determine spread warning
  const spreadWarning = spread > 5;

  // Provider names mapping for display
  const providerLabels: Record<string, string> = {
    NOAA: 'NOAA',
    OpenMeteo_GFS: 'GFS',
    OpenMeteo_ICON: 'ICON',
    OpenMeteo_ECMWF: 'ECMWF',
  };

  // Sort providers by weight (descending)
  const sortedProviders = Object.entries(ensemble_details.individual_forecasts).sort(
    ([keyA], [keyB]) => {
      const weightA = ensemble_details.weights[keyA] || 0;
      const weightB = ensemble_details.weights[keyB] || 0;
      return weightB - weightA;
    }
  );

  // Calculate bar chart percentages
  const maxTemp = Math.max(...forecasts, ensemble_details.ensemble_forecast);
  const minTemp = Math.min(...forecasts, ensemble_details.ensemble_forecast);
  const range = maxTemp - minTemp || 1;

  const getBarPosition = (temp: number) => {
    return ((temp - minTemp) / range) * 100;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-gray-700 pb-2">
        <h3 className="text-sm font-semibold text-text-primary uppercase">
          Ensemble Forecast Details
        </h3>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div>
          <div className="text-text-secondary uppercase mb-1">Ensemble Forecast</div>
          <div className="text-text-primary text-lg font-semibold">
            {ensemble_details.ensemble_forecast.toFixed(2)}°F
          </div>
        </div>

        <div>
          <div className="text-text-secondary uppercase mb-1">Provider Count</div>
          <div
            className={`text-lg font-semibold ${
              ensemble_details.provider_count < 3 ? 'text-accent-red' : 'text-accent-green'
            }`}
          >
            {ensemble_details.provider_count} / 4
          </div>
        </div>

        <div>
          <div className="text-text-secondary uppercase mb-1">Provider Spread</div>
          <div
            className={`text-lg font-semibold ${
              spreadWarning ? 'text-accent-yellow' : 'text-text-primary'
            }`}
          >
            {spread.toFixed(1)}°F {spreadWarning && '⚠️'}
          </div>
        </div>

        <div>
          <div className="text-text-secondary uppercase mb-1">NOAA Age</div>
          <div
            className={`text-lg font-semibold ${
              ensemble_details.noaa_stale ? 'text-accent-red' : 'text-text-primary'
            }`}
          >
            {ensemble_details.noaa_age_hours !== null
              ? `${ensemble_details.noaa_age_hours.toFixed(1)}h`
              : 'N/A'}
            {ensemble_details.noaa_stale && ' ⚠️'}
          </div>
        </div>
      </div>

      {/* Provider Breakdown Table */}
      <div>
        <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">
          Individual Provider Forecasts
        </h4>
        <table className="w-full text-xs font-mono">
          <thead className="text-text-secondary border-b border-gray-700">
            <tr>
              <th className="px-2 py-2 text-left">Provider</th>
              <th className="px-2 py-2 text-right">Forecast</th>
              <th className="px-2 py-2 text-right">Weight</th>
              <th className="px-2 py-2 text-right">Contribution</th>
            </tr>
          </thead>
          <tbody>
            {sortedProviders.map(([provider, forecast]) => {
              const weight = ensemble_details.weights[provider] || 0;
              const contribution = forecast * weight;
              const isStale = provider === 'NOAA' && ensemble_details.noaa_stale;

              return (
                <tr
                  key={provider}
                  className={`border-b border-gray-800 ${isStale ? 'bg-accent-red bg-opacity-10' : ''}`}
                >
                  <td className="px-2 py-2 text-text-primary">
                    {providerLabels[provider] || provider}
                    {isStale && <span className="ml-1 text-accent-yellow">⚠️</span>}
                  </td>
                  <td className="px-2 py-2 text-right text-text-primary font-semibold">
                    {forecast.toFixed(1)}°F
                  </td>
                  <td className="px-2 py-2 text-right text-text-secondary">
                    {weight.toFixed(2)}x
                  </td>
                  <td className="px-2 py-2 text-right text-text-secondary">
                    {contribution.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Visual Bar Chart */}
      <div>
        <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">
          Forecast Distribution
        </h4>
        <div className="relative h-16 bg-bg-primary rounded border border-gray-700 overflow-hidden">
          {/* Temperature scale */}
          <div className="absolute top-0 left-0 right-0 h-4 flex justify-between px-2 text-xs text-text-secondary">
            <span>{minTemp.toFixed(0)}°F</span>
            <span>{maxTemp.toFixed(0)}°F</span>
          </div>

          {/* Provider bars */}
          <div className="absolute top-6 left-0 right-0 bottom-2 px-2">
            {sortedProviders.map(([provider, forecast], index) => {
              const position = getBarPosition(forecast);
              const isStale = provider === 'NOAA' && ensemble_details.noaa_stale;

              return (
                <div
                  key={provider}
                  className="absolute h-1.5"
                  style={{
                    left: `${position}%`,
                    top: `${index * 18}%`,
                    width: '4px',
                  }}
                  title={`${providerLabels[provider]}: ${forecast.toFixed(1)}°F`}
                >
                  <div
                    className={`w-1 h-full rounded ${
                      isStale ? 'bg-accent-yellow' : 'bg-accent-blue'
                    }`}
                  />
                  <div className="text-[8px] text-text-secondary whitespace-nowrap mt-0.5">
                    {providerLabels[provider]}
                  </div>
                </div>
              );
            })}

            {/* Ensemble forecast line */}
            <div
              className="absolute h-full border-l-2 border-accent-green"
              style={{
                left: `${getBarPosition(ensemble_details.ensemble_forecast)}%`,
              }}
              title={`Ensemble: ${ensemble_details.ensemble_forecast.toFixed(2)}°F`}
            >
              <div className="absolute -top-1 left-0 transform -translate-x-1/2 text-[8px] text-accent-green font-bold whitespace-nowrap">
                ENS
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {(ensemble_details.noaa_stale || ensemble_details.provider_count < 3 || spreadWarning) && (
        <div className="bg-accent-yellow bg-opacity-10 border border-accent-yellow rounded p-3 space-y-1">
          <div className="text-xs font-semibold text-accent-yellow uppercase">⚠️ Warnings</div>
          {ensemble_details.noaa_stale && (
            <div className="text-xs text-text-primary">
              • NOAA data is stale ({ensemble_details.noaa_age_hours?.toFixed(1)}h old, threshold: 6h)
            </div>
          )}
          {ensemble_details.provider_count < 3 && (
            <div className="text-xs text-text-primary">
              • Low provider count: only {ensemble_details.provider_count} providers responding
            </div>
          )}
          {spreadWarning && (
            <div className="text-xs text-text-primary">
              • High provider disagreement: {spread.toFixed(1)}°F spread (threshold: 5°F)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
