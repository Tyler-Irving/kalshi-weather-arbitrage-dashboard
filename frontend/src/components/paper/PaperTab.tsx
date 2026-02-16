import { useEffect } from 'react';
import usePaperStore from '../../stores/paperStore';
import useSettingsStore from '../../hooks/useSettings';
import PaperBanner from './PaperBanner';
import PaperSummaryCards from './PaperSummaryCards';
import PaperSettlementTable from './PaperSettlementTable';
import PaperPositionsTable from './PaperPositionsTable';
import PaperTradeLog from './PaperTradeLog';

export default function PaperTab() {
  const { fetchAll } = usePaperStore();
  const { settings } = useSettingsStore();

  useEffect(() => {
    fetchAll();

    if (settings.refreshInterval === 0) return;

    const intervalId = setInterval(fetchAll, settings.refreshInterval);
    return () => clearInterval(intervalId);
  }, [fetchAll, settings.refreshInterval]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <PaperBanner />
      <PaperSummaryCards />
      <PaperSettlementTable />
      <PaperPositionsTable />
      <PaperTradeLog />
    </div>
  );
}
