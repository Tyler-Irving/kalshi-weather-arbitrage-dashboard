import usePaperStore from '../../stores/paperStore';

export default function PaperBanner() {
  const pnl = usePaperStore((s) => s.pnl);
  
  const paperBalance = pnl?.paper_balance_cents 
    ? (pnl.paper_balance_cents / 100).toFixed(2) 
    : '100.00';
  
  return (
    <div className="bg-amber-900/30 border border-amber-700/50 text-amber-200 px-6 py-3 mb-6 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-lg">📝</span>
          <span>PAPER TRADING — Simulated orders, not real money</span>
        </div>
        <div className="text-amber-200 font-semibold">
          Paper Balance: ${paperBalance}
        </div>
      </div>
    </div>
  );
}
