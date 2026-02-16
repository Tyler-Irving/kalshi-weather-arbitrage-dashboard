import DashboardCard from '../DashboardCard';
import usePaperStore from '../../stores/paperStore';

export default function PaperSettlementTable() {
  const { pnl } = usePaperStore();
  const settlements = pnl?.settlements ?? [];

  // Sort newest first for display
  const sorted = [...settlements].reverse();

  if (sorted.length === 0) {
    return (
      <DashboardCard>
        <div className="p-4">
          <h3 className="text-amber-300 font-semibold mb-3">Settlement History</h3>
          <p className="text-zinc-400 text-sm">No settlements yet. Positions will settle when markets close.</p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard>
      <div className="p-4">
        <h3 className="text-amber-300 font-semibold mb-3">Settlement History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-700">
                <th className="text-left py-2 px-2">Date</th>
                <th className="text-left py-2 px-2">City</th>
                <th className="text-left py-2 px-2">Ticker</th>
                <th className="text-left py-2 px-2">Side</th>
                <th className="text-right py-2 px-2">Qty</th>
                <th className="text-right py-2 px-2">Price</th>
                <th className="text-left py-2 px-2">Result</th>
                <th className="text-right py-2 px-2">P&L</th>
                <th className="text-right py-2 px-2">Actual</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => {
                const rowBg = s.won ? 'bg-emerald-900/10' : 'bg-red-900/10';
                const pnlColor = s.pnl_cents >= 0 ? 'text-emerald-400' : 'text-red-400';
                const resultBadge = s.won 
                  ? <span className="text-emerald-400">✅ WIN</span>
                  : <span className="text-red-400">❌ LOSS</span>;

                return (
                  <tr key={i} className={`${rowBg} border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors`}>
                    <td className="py-2 px-2 text-zinc-300">{s.ts?.slice(0, 10)}</td>
                    <td className="py-2 px-2 text-amber-200 font-semibold">{s.city || '—'}</td>
                    <td className="py-2 px-2 font-mono text-xs text-zinc-400">{s.ticker}</td>
                    <td className="py-2 px-2 text-zinc-300 uppercase">{s.side}</td>
                    <td className="py-2 px-2 text-right text-zinc-300">{s.count}</td>
                    <td className="py-2 px-2 text-right text-zinc-300">{s.price_cents}¢</td>
                    <td className="py-2 px-2">{resultBadge}</td>
                    <td className={`py-2 px-2 text-right font-bold ${pnlColor}`}>
                      ${(s.pnl_cents / 100).toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-zinc-300">
                      {s.actual_temp ? `${s.actual_temp}°F` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sorted.length >= 50 && (
          <div className="mt-3 text-xs text-zinc-500 text-center">
            Showing last 50 settlements
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
