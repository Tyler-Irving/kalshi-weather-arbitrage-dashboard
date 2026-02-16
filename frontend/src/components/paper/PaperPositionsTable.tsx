import DashboardCard from '../DashboardCard';
import usePaperStore from '../../stores/paperStore';

export default function PaperPositionsTable() {
  const { positions } = usePaperStore();

  if (positions.length === 0) {
    return (
      <DashboardCard className="border-l-4 border-amber-500">
        <div className="p-8 text-center text-zinc-500">
          No open paper positions
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard className="border-l-4 border-amber-500">
      <div className="p-5">
        <h3 className="text-lg font-semibold mb-4 text-zinc-200">Open Paper Positions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="text-left py-2 px-3 text-zinc-400 font-medium">Badge</th>
                <th className="text-left py-2 px-3 text-zinc-400 font-medium">City</th>
                <th className="text-left py-2 px-3 text-zinc-400 font-medium">Ticker</th>
                <th className="text-left py-2 px-3 text-zinc-400 font-medium">Side</th>
                <th className="text-right py-2 px-3 text-zinc-400 font-medium">Qty</th>
                <th className="text-right py-2 px-3 text-zinc-400 font-medium">Avg Price</th>
                <th className="text-right py-2 px-3 text-zinc-400 font-medium">Cost</th>
                <th className="text-right py-2 px-3 text-zinc-400 font-medium">Edge</th>
                <th className="text-right py-2 px-3 text-zinc-400 font-medium">Confidence</th>
                <th className="text-left py-2 px-3 text-zinc-400 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position, idx) => (
                <tr key={`${position.ticker}-${position.side}-${idx}`} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                  <td className="py-3 px-3">
                    <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-amber-900/40 text-amber-300 rounded border border-amber-700/50">
                      PAPER
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-zinc-300">{position.city || 'N/A'}</td>
                  <td className="py-3 px-3 font-mono text-xs text-zinc-400">{position.ticker}</td>
                  <td className="py-3 px-3">
                    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${
                      position.side === 'yes' 
                        ? 'bg-emerald-900/40 text-emerald-300' 
                        : 'bg-rose-900/40 text-rose-300'
                    }`}>
                      {position.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-300">{position.count}</td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-300">
                    {position.avg_price_cents}¢
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-300">
                    ${(position.total_cost_cents / 100).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-300">
                    {position.edge !== undefined && position.edge !== null ? `${position.edge.toFixed(1)}%` : 'N/A'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-300">
                    {position.confidence !== undefined && position.confidence !== null ? (position.confidence * 100).toFixed(0) + '%' : 'N/A'}
                  </td>
                  <td className="py-3 px-3 text-zinc-400 text-xs">{position.description || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardCard>
  );
}
