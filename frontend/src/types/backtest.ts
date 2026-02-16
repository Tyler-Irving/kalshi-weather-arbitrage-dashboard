export interface BacktestEntry {
  ts: string;
  ticker: string;
  city: string;
  forecast: number;
  confidence: number;
  fair_cents: number;
  market_yes_ask: number;
  market_yes_bid: number;
  adjusted_edge: number;
  side: 'yes' | 'no';
  action: 'trade' | 'skip';
  skip_reason: string | null;
}
