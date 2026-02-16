import { useMemo, useState } from 'react';
import useDashboardStore from '../stores/dashboardStore';
import { usePolling } from '../hooks/usePolling';

interface CityData {
  city: string;
  ensemble_forecast: number | null;
  active_positions: number;
  confidence: number | null;
  noaa_stale: boolean;
  provider_count: number;
}

interface CityHeatmapResponse {
  cities: CityData[];
}

const CITY_ORDER = ['PHX', 'SFO', 'SEA', 'DC', 'HOU', 'NOLA', 'DAL', 'BOS', 'OKC', 'ATL', 'MIN'];

type ConfidenceFilter = 'all' | 'high' | 'med' | 'low' | 'inactive';

export default function CityHeatmap() {
  const { positions } = useDashboardStore();
  const { data, loading } = usePolling<CityHeatmapResponse>('/cities/', 30000);
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all');

  // Derive city data from positions if no dedicated endpoint
  // Calculate max provider count from data for dynamic display
  const maxProviderCount = useMemo(() => {
    const allCounts = positions.map(p => p.ensemble_details.provider_count);
    return allCounts.length > 0 ? Math.max(...allCounts) : 5;
  }, [positions]);

  const cityData = useMemo((): CityData[] => {
    if (data?.cities) {
      // Sort the API data by confidence descending
      const sorted = [...data.cities].sort((a, b) => {
        const confA = a.confidence ?? 0;
        const confB = b.confidence ?? 0;
        return confB - confA;
      });
      return sorted;
    }

    // Fallback: derive from positions
    const cityMap = new Map<string, CityData>();

    // Initialize all cities
    CITY_ORDER.forEach((city) => {
      cityMap.set(city, {
        city,
        ensemble_forecast: null,
        active_positions: 0,
        confidence: null,
        noaa_stale: false,
        provider_count: 0,
      });
    });

    // Aggregate position data by city
    positions.forEach((pos) => {
      const existing = cityMap.get(pos.city);
      if (existing) {
        cityMap.set(pos.city, {
          city: pos.city,
          ensemble_forecast: pos.ensemble_details.ensemble_forecast,
          active_positions: existing.active_positions + 1,
          confidence: Math.max(existing.confidence || 0, pos.confidence),
          noaa_stale: existing.noaa_stale || pos.ensemble_details.noaa_stale,
          provider_count: Math.max(existing.provider_count, pos.ensemble_details.provider_count),
        });
      }
    });

    // Convert map to array and sort by confidence (descending)
    const cityArray = Array.from(cityMap.values());
    
    const sorted = cityArray.sort((a, b) => {
      const confA = a.confidence ?? 0;
      const confB = b.confidence ?? 0;
      return confB - confA; // Descending order (highest first)
    });
    
    return sorted;
  }, [data, positions]);

  // Apply confidence filter
  const filteredCityData = useMemo(() => {
    if (confidenceFilter === 'all') {
      return cityData;
    }
    
    const filtered = cityData.filter((city) => {
      if (confidenceFilter === 'high') return city.confidence !== null && city.confidence >= 0.7;
      if (confidenceFilter === 'med') return city.confidence !== null && city.confidence >= 0.6 && city.confidence < 0.7;
      if (confidenceFilter === 'low') return city.confidence !== null && city.confidence < 0.6;
      if (confidenceFilter === 'inactive') return city.confidence === null;
      return true;
    });
    
    // Filtered data is already sorted from cityData, but re-sort to be safe
    const sorted = filtered.sort((a, b) => {
      const confA = a.confidence ?? 0;
      const confB = b.confidence ?? 0;
      return confB - confA;
    });
    
    return sorted;
  }, [cityData, confidenceFilter]);

  const getConfidenceColor = (confidence: number | null) => {
    if (confidence === null) return 'bg-gray-800 border-gray-700';
    if (confidence >= 0.7) return 'bg-accent-green bg-opacity-20 border-accent-green';
    if (confidence >= 0.6) return 'bg-accent-yellow bg-opacity-20 border-accent-yellow';
    return 'bg-accent-red bg-opacity-20 border-accent-red';
  };

  const getConfidenceText = (confidence: number | null) => {
    if (confidence === null) return 'text-text-secondary';
    if (confidence >= 0.7) return 'text-accent-green';
    if (confidence >= 0.6) return 'text-accent-yellow';
    return 'text-accent-red';
  };

  if (loading && cityData.length === 0) {
    return (
      <div className="bg-bg-secondary border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-text-primary">City Heatmap</h2>
        <div className="text-center text-text-secondary py-12">
          <div className="animate-pulse">Loading city data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary border border-gray-700 rounded-lg p-4 lg:p-5 min-w-0 overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-text-primary">City Heatmap</h2>
        <div className="text-[10px] text-text-secondary">
          {positions.length} active
        </div>
      </div>

      {/* Grid Layout - auto-fit for responsive sizing */}
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        {filteredCityData.map((city) => (
          <div
            key={city.city}
            className={`border rounded-lg p-3 transition-all hover:shadow-lg min-w-0 ${getConfidenceColor(
              city.confidence
            )}`}
          >
            {/* City Name */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-sm font-bold text-text-primary truncate">{city.city}</div>
              {city.active_positions > 0 && (
                <span className="bg-accent-blue text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                  {city.active_positions}
                </span>
              )}
            </div>

            {/* Ensemble Forecast */}
            <div className="mb-1.5">
              <div className="text-[10px] text-text-secondary uppercase">Forecast</div>
              <div className="text-lg font-bold text-text-primary font-mono leading-tight">
                {city.ensemble_forecast !== null
                  ? `${city.ensemble_forecast.toFixed(1)}°`
                  : '—'}
              </div>
            </div>

            {/* Confidence */}
            <div className="mb-1.5">
              <div className="text-[10px] text-text-secondary uppercase">Confidence</div>
              <div className={`text-sm font-semibold ${getConfidenceText(city.confidence)}`}>
                {city.confidence !== null ? `${(city.confidence * 100).toFixed(0)}%` : '—'}
              </div>
            </div>

            {/* Provider Count */}
            <div className="flex items-center justify-between text-[10px]">
              <div className="text-text-secondary">Prov:</div>
              <div
                className={`font-semibold ${
                  city.provider_count < 3 ? 'text-accent-red' : 'text-text-primary'
                }`}
              >
                {city.provider_count > 0 ? `${city.provider_count}/${maxProviderCount}` : '—'}
              </div>
            </div>

            {/* Status Indicators */}
            {(city.noaa_stale || city.provider_count < 3) && (
              <div className="mt-1.5 pt-1.5 border-t border-gray-700 flex gap-1 flex-wrap">
                {city.noaa_stale && (
                  <span className="text-[10px] text-accent-yellow" title="NOAA data stale">
                    ⚠️ NOAA
                  </span>
                )}
                {city.provider_count < 3 && city.provider_count > 0 && (
                  <span className="text-[10px] text-accent-red" title="Low provider count">
                    ⚠️ Prov
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Confidence Filters */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-[10px] text-text-secondary uppercase mb-2">Filter by Confidence:</div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          <button
            onClick={() => setConfidenceFilter('all')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all ${
              confidenceFilter === 'all'
                ? 'bg-accent-blue text-white font-semibold'
                : 'bg-gray-800 text-text-secondary hover:bg-gray-700 hover:text-text-primary'
            }`}
          >
            <span>All</span>
          </button>
          <button
            onClick={() => setConfidenceFilter('high')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all ${
              confidenceFilter === 'high'
                ? 'bg-accent-green text-white font-semibold'
                : 'bg-gray-800 text-text-secondary hover:bg-gray-700 hover:text-text-primary'
            }`}
          >
            <div className="w-3 h-3 bg-accent-green bg-opacity-20 border border-accent-green rounded"></div>
            <span>High (≥70%)</span>
          </button>
          <button
            onClick={() => setConfidenceFilter('med')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all ${
              confidenceFilter === 'med'
                ? 'bg-accent-yellow text-white font-semibold'
                : 'bg-gray-800 text-text-secondary hover:bg-gray-700 hover:text-text-primary'
            }`}
          >
            <div className="w-3 h-3 bg-accent-yellow bg-opacity-20 border border-accent-yellow rounded"></div>
            <span>Med (60-70%)</span>
          </button>
          <button
            onClick={() => setConfidenceFilter('low')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all ${
              confidenceFilter === 'low'
                ? 'bg-accent-red text-white font-semibold'
                : 'bg-gray-800 text-text-secondary hover:bg-gray-700 hover:text-text-primary'
            }`}
          >
            <div className="w-3 h-3 bg-accent-red bg-opacity-20 border border-accent-red rounded"></div>
            <span>Low (&lt;60%)</span>
          </button>
          <button
            onClick={() => setConfidenceFilter('inactive')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all ${
              confidenceFilter === 'inactive'
                ? 'bg-gray-600 text-white font-semibold'
                : 'bg-gray-800 text-text-secondary hover:bg-gray-700 hover:text-text-primary'
            }`}
          >
            <div className="w-3 h-3 bg-gray-800 border border-gray-700 rounded"></div>
            <span>Inactive</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
        <div>
          <div className="text-text-secondary uppercase mb-0.5">Active Cities</div>
          <div className="text-text-primary text-sm font-semibold">
            {cityData.filter((c) => c.active_positions > 0).length}/{cityData.length}
          </div>
        </div>
        <div>
          <div className="text-text-secondary uppercase mb-0.5">Avg Conf</div>
          <div className="text-text-primary text-sm font-semibold">
            {cityData.filter((c) => c.confidence !== null).length > 0
              ? `${(
                  (cityData
                    .filter((c) => c.confidence !== null)
                    .reduce((sum, c) => sum + (c.confidence || 0), 0) /
                    cityData.filter((c) => c.confidence !== null).length) *
                  100
                ).toFixed(0)}%`
              : '—'}
          </div>
        </div>
        <div>
          <div className="text-text-secondary uppercase mb-0.5">NOAA Stale</div>
          <div
            className={`text-sm font-semibold ${
              cityData.filter((c) => c.noaa_stale).length > 0
                ? 'text-accent-yellow'
                : 'text-accent-green'
            }`}
          >
            {cityData.filter((c) => c.noaa_stale).length}
          </div>
        </div>
        <div>
          <div className="text-text-secondary uppercase mb-0.5">Low Prov</div>
          <div
            className={`text-sm font-semibold ${
              cityData.filter((c) => c.provider_count > 0 && c.provider_count < 3).length > 0
                ? 'text-accent-red'
                : 'text-accent-green'
            }`}
          >
            {cityData.filter((c) => c.provider_count > 0 && c.provider_count < 3).length}
          </div>
        </div>
      </div>
    </div>
  );
}
