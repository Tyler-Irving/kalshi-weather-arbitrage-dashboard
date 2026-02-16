export interface PnLBucket {
  pnl_cents: number;
  trades: number;
  wins: number;
  losses: number;
}

export interface PnLData {
  weeks: Record<string, PnLBucket>;
  daily: Record<string, PnLBucket>;
}
