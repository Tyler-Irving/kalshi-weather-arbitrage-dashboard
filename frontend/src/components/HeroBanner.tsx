import useDashboardStore from '../stores/dashboardStore';

export default function HeroBanner() {
  const { status } = useDashboardStore();

  const displayStatus = status || {
    balance: 0,
    starting_balance: 10000,
    total_pnl_cents: 0,
    today_pnl_cents: 0,
    position_count: 0,
    daily_trades: 0,
    daemon_running: false,
    last_update: null,
    win_rate_today: 0,
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatPnL = (cents: number) => `${cents >= 0 ? '+' : ''}${formatCurrency(cents)}`;
  const pnlColor = (cents: number) =>
    cents > 0 ? 'text-green-500' : cents < 0 ? 'text-red-500' : 'text-zinc-400';

  return (
    <div className="mx-6 mt-4 space-y-3">
      {/* Prominent P&L Display - TICK-023 */}
      <div className="frost-card bg-gradient-to-br from-zinc-900 to-zinc-950 border-2 border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-baseline gap-3">
              <span className="text-sm text-zinc-500 uppercase tracking-wide font-mono">Total P&L</span>
              <span className={`text-6xl font-black tabular-nums font-mono ${pnlColor(displayStatus.total_pnl_cents)} drop-shadow-lg`}>
                {formatPnL(displayStatus.total_pnl_cents)}
              </span>
            </div>
            <div className="mt-2 flex gap-6 text-xs text-zinc-400 font-mono">
              <span>Started: {formatCurrency(displayStatus.starting_balance || 10000)}</span>
              <span>→</span>
              <span>Current: {formatCurrency(displayStatus.balance)}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex flex-col gap-2">
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wide">Today</span>
                <div className={`text-2xl font-bold tabular-nums ${pnlColor(displayStatus.today_pnl_cents)}`}>
                  {formatPnL(displayStatus.today_pnl_cents)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="frost-card">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 font-mono text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Positions</span>
            <span className="text-2xl font-bold tabular-nums text-zinc-50">
              {displayStatus.position_count} / 20
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Daily Trades</span>
            <span className="text-2xl font-bold tabular-nums text-zinc-50">
              {displayStatus.daily_trades} / 40
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Win Rate</span>
            <span className="text-2xl font-bold tabular-nums text-zinc-50">
              {displayStatus.win_rate_today.toFixed(0)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Daemon</span>
            <span className="text-2xl font-bold tabular-nums text-zinc-50">
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${displayStatus.daemon_running ? 'bg-green-500' : 'bg-red-500'}`} />
              {displayStatus.daemon_running ? 'Running' : 'Down'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Balance</span>
            <span className="text-2xl font-bold tabular-nums text-zinc-50">
              {formatCurrency(displayStatus.balance)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
