export interface PaperTrade {
  ts?: string;  // Format A
  timestamp?: string;  // Format B
  action?: string;  // Format A
  ticker: string;
  side: 'yes' | 'no';
  count: number;
  price?: number;  // Format B (dollars)
  price_cents?: number;  // Format A (cents)
  cost?: number;  // Format B (dollars)
  cost_cents?: number;  // Format A (cents)
  order_id?: string | null;
  forecast?: number | null;
  fair_cents?: number | null;
  edge?: number | null;
  confidence?: number | null;
  reason?: string;
  settlement_date?: string | null;
  city?: string | null;
  status?: string | null;
  description?: string | null;
}

export interface PaperPosition {
  ticker: string;
  side: 'yes' | 'no';
  count: number;
  avg_price_cents: number;  // Backend returns cents
  total_cost_cents: number;  // Backend returns cents
  city?: string | null;
  description?: string | null;
  edge?: number | null;
  confidence?: number | null;
  forecast?: number | null;
  latest_ts?: string;
}

export interface SettlementEntry {
  ts: string;
  ticker: string;
  city: string | null;
  side: string;
  count: number;
  price_cents: number;
  cost_cents: number;
  result: string;
  won: boolean;
  pnl_cents: number;
  forecast: number | null;
  actual_temp: number | null;
  confidence: number | null;
}

export interface PaperPnL {
  paper_balance_cents: number;  // Simulated paper trading balance (in cents)
  total_trades: number;
  total_cost_cents: number;  // Backend returns cents
  realized: {
    total_pnl_cents: number;
    wins: number;
    losses: number;
    win_rate: number;
    avg_win_cents: number;
    avg_loss_cents: number;
    best_trade_cents: number;
    worst_trade_cents: number;
  };
  unrealized: {
    total_exposure_cents: number;
    position_count: number;
  };
  settlements: SettlementEntry[];
  by_city: Record<string, { 
    trades: number; 
    cost_cents: number;
    pnl_cents: number;
    wins: number;
    losses: number;
  }>;
  by_date: Record<string, { 
    trades: number; 
    cost_cents: number;
    pnl_cents: number;
    wins: number;
    losses: number;
  }>;
}
