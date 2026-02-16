import usePaperStore from '../../stores/paperStore';
import DashboardCard from '../DashboardCard';

export default function PaperTradeLog() {
  const { trades } = usePaperStore();

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const truncateOrderId = (orderId: string | null) => {
    if (!orderId) return '—';
    if (orderId.length <= 20) return orderId;
    return `${orderId.substring(0, 17)}...`;
  };

  if (trades.length === 0) {
    return (
      <DashboardCard className="border-l-4 border-amber-500">
        <h2 className="text-xl font-semibold mb-4 text-amber-200">Paper Trade Log</h2>
        <div className="text-center text-zinc-500 py-12">
          <svg className="w-10 h-10 mx-auto mb-3 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">No paper trades yet</p>
        </div>
      </DashboardCard>
    );
  }

  // Sort trades by timestamp descending (newest first)
  const sortedTrades = [...trades].sort((a, b) => {
    const timeA = a.ts ? new Date(a.ts).getTime() : 0;
    const timeB = b.ts ? new Date(b.ts).getTime() : 0;
    return timeB - timeA;
  });

  return (
    <DashboardCard className="border-l-4 border-amber-500">
      <h2 className="text-xl font-semibold mb-4 text-amber-200">
        Paper Trade Log ({trades.length})
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm font-mono">
          <thead className="text-xs text-zinc-400 uppercase border-b border-zinc-700">
            <tr>
              <th className="px-2 py-2 text-left">Time</th>
              <th className="px-2 py-2 text-left">Ticker</th>
              <th className="px-2 py-2 text-center">Side</th>
              <th className="px-2 py-2 text-right">Qty × Price</th>
              <th className="px-2 py-2 text-right">Cost</th>
              <th className="px-2 py-2 text-left">Order ID</th>
            </tr>
          </thead>
          <tbody>
            {sortedTrades.map((trade, idx) => (
              <tr
                key={`${trade.ts || 'unknown'}-${idx}`}
                className="border-b border-zinc-800 hover:bg-bg-primary transition-colors"
              >
                {/* Time */}
                <td className="px-2 py-3 text-zinc-400 text-xs">
                  {trade.ts ? formatTime(trade.ts) : '—'}
                </td>

                {/* Ticker */}
                <td className="px-2 py-3 text-zinc-300 text-xs max-w-[180px] truncate">
                  {trade.ticker || '—'}
                </td>

                {/* Side Badge */}
                <td className="px-2 py-3 text-center">
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-bold ${
                      trade.side === 'yes'
                        ? 'bg-accent-green text-black'
                        : 'bg-accent-red text-white'
                    }`}
                  >
                    {trade.side?.toUpperCase() || '—'}
                  </span>
                </td>

                {/* Qty × Price */}
                <td className="px-2 py-3 text-right text-zinc-300">
                  {trade.count || 0} × {trade.price_cents || 0}¢
                </td>

                {/* Cost */}
                <td className="px-2 py-3 text-right text-amber-200 font-semibold">
                  ${((trade.cost_cents || 0) / 100).toFixed(2)}
                </td>

                {/* Order ID */}
                <td className="px-2 py-3 text-zinc-500 text-xs">
                  {truncateOrderId(trade.order_id || null)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}
