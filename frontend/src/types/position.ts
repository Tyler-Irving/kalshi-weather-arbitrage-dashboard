export interface EnsembleDetails {
  ensemble_forecast: number;
  individual_forecasts: Record<string, number>;
  weights: Record<string, number>;
  provider_count: number;
  noaa_age_hours: number | null;
  noaa_stale: boolean;
}

export interface Position {
  ticker: string;
  side: 'yes' | 'no';
  count: number;
  price: number;
  fair: number;
  fair_cents: number | null;
  raw_edge: number;
  adjusted_edge: number;
  confidence: number;
  city: string;
  forecast: number;
  ensemble_details: EnsembleDetails;
  trade_time: string;
  target_date: string;
  city_date: string;
}
