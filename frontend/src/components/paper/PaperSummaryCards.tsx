import DashboardCard from '../DashboardCard';
import usePaperStore from '../../stores/paperStore';

export default function PaperSummaryCards() {
  const { trades, positions, pnl } = usePaperStore();

  // Existing metrics
  const totalTrades = pnl?.total_trades || trades.length;
  const totalExposure = pnl?.unrealized?.total_exposure_cents 
    ? pnl.unrealized.total_exposure_cents / 100 
    : (pnl?.total_cost_cents ? pnl.total_cost_cents / 100 : 0);
  const citiesActive = pnl ? Object.keys(pnl.by_city).length : 0;
  const openPositions = pnl?.unrealized?.position_count ?? positions.length;

  // New realized P&L metrics
  const realizedPnL = pnl?.realized?.total_pnl_cents ? pnl.realized.total_pnl_cents / 100 : 0;
  const wins = pnl?.realized?.wins ?? 0;
  const losses = pnl?.realized?.losses ?? 0;
  const winRate = pnl?.realized?.win_rate ?? 0;
  const avgWin = pnl?.realized?.avg_win_cents ? pnl.realized.avg_win_cents / 100 : 0;
  const avgLoss = pnl?.realized?.avg_loss_cents ? pnl.realized.avg_loss_cents / 100 : 0;

  // Determine P&L color
  const pnlColor = realizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400';
  const pnlSign = realizedPnL >= 0 ? '+' : '';

  return (
    <div className="space-y-4 mb-6">
      {/* Row 1: Primary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard className="border-l-4 border-amber-500">
          <div className="p-4">
            <div className="text-sm text-zinc-400 mb-1">Realized P&L</div>
            <div className={`text-2xl font-bold ${pnlColor}`}>
              {pnlSign}${realizedPnL.toFixed(2)}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard className="border-l-4 border-amber-500">
          <div className="p-4">
            <div className="text-sm text-zinc-400 mb-1">Win Rate</div>
            <div className="text-2xl font-bold text-amber-200">
              {wins}/{wins + losses} ({(winRate * 100).toFixed(1)}%)
            </div>
          </div>
        </DashboardCard>

        <DashboardCard className="border-l-4 border-amber-500">
          <div className="p-4">
            <div className="text-sm text-zinc-400 mb-1">Total Trades</div>
            <div className="text-2xl font-bold text-amber-200">{totalTrades}</div>
          </div>
        </DashboardCard>

        <DashboardCard className="border-l-4 border-amber-500">
          <div className="p-4">
            <div className="text-sm text-zinc-400 mb-1">Total Exposure</div>
            <div className="text-2xl font-bold text-amber-200">${totalExposure.toFixed(2)}</div>
          </div>
        </DashboardCard>
      </div>

      {/* Row 2: Secondary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard className="border-l-4 border-amber-500">
          <div className="p-4">
            <div className="text-sm text-zinc-400 mb-1">Avg Win</div>
            <div className="text-2xl font-bold text-emerald-400">${avgWin.toFixed(2)}</div>
          </div>
        </DashboardCard>

        <DashboardCard className="border-l-4 border-amber-500">
          <div className="p-4">
            <div className="text-sm text-zinc-400 mb-1">Avg Loss</div>
            <div className="text-2xl font-bold text-red-400">-${Math.abs(avgLoss).toFixed(2)}</div>
          </div>
        </DashboardCard>

        <DashboardCard className="border-l-4 border-amber-500">
          <div className="p-4">
            <div className="text-sm text-zinc-400 mb-1">Cities Active</div>
            <div className="text-2xl font-bold text-amber-200">{citiesActive}</div>
          </div>
        </DashboardCard>

        <DashboardCard className="border-l-4 border-amber-500">
          <div className="p-4">
            <div className="text-sm text-zinc-400 mb-1">Open Positions</div>
            <div className="text-2xl font-bold text-amber-200">{openPositions}</div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
