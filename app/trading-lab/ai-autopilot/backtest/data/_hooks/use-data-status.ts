import { useCallback, useEffect, useState } from 'react';
import type { DataSummary, TradeDataStatus } from '../_lib/types';

export function useDataStatus() {
  const [trades, setTrades] = useState<TradeDataStatus[]>([]);
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/backtest/tf-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'symbol-status' }),
      });
      const data = await res.json();
      if (data.success) {
        setTrades(data.trades);
        setSummary(data.summary);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { trades, summary, loading, refresh };
}
