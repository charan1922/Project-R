import { useCallback, useEffect, useState } from 'react';

interface SourceData {
  eqHigh: number;
  eqLow: number;
  eqClose: number;
  eqVolume: number;
  eqTurnover: number;
  futVolume: number;
  futOi: number;
  futOiChange: number;
  futTurnover: number;
  optVolume: number;
  optOi: number;
  optTurnover: number;
  ceVolume: number;
  peVolume: number;
  rFactor: number;
}

export interface CompareStock {
  symbol: string;
  bhav: SourceData | null;
  dhan: SourceData | null;
}

interface Metrics {
  matched: number;
  spearman: number;
  top10: number;
  top20: number;
  rmse: number;
}

interface SyncResult {
  mode?: string;
  processedDates?: number;
  computed: number;
  failed: number;
  errors: string[];
}

export interface CompareData {
  stocks: CompareStock[];
  availableDates: string[];
  date: string | null;
  hasBhav: boolean;
  hasDhan: boolean;
  dhanCached: boolean;
  bhavCount: number;
  dhanCount: number;
  metrics: Metrics | null;
  loading: boolean;
  syncingAction: string | null;
  syncResult: SyncResult | null;
  refresh: () => void;
  computeDhan: () => void;
  computeRange: (fromDate?: string, toDate?: string) => void;
  computeMissing: (fromDate?: string, toDate?: string) => void;
}

export function useCompareData(selectedDate?: string): CompareData {
  const [stocks, setStocks] = useState<CompareStock[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [hasBhav, setHasBhav] = useState(false);
  const [hasDhan, setHasDhan] = useState(false);
  const [dhanCached, setDhanCached] = useState(false);
  const [bhavCount, setBhavCount] = useState(0);
  const [dhanCount, setDhanCount] = useState(0);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingAction, setSyncingAction] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let targetDate = selectedDate;
      if (!targetDate) {
        const listRes = await fetch('/api/bhav-dhan-compare');
        const listData = await listRes.json();
        if (listData.success && listData.availableDates?.length) {
          setAvailableDates(listData.availableDates);
          targetDate = listData.availableDates[0];
        }
      }
      if (!targetDate) {
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/bhav-dhan-compare?date=${targetDate}`);
      const d = await res.json();
      if (d.success) {
        setAvailableDates(d.availableDates ?? []);
        setStocks(d.stocks ?? []);
        setDate(d.date ?? targetDate);
        setHasBhav(d.hasBhav ?? false);
        setHasDhan(d.hasDhan ?? false);
        setDhanCached(d.dhanCached ?? false);
        setBhavCount(d.bhavCount ?? 0);
        setDhanCount(d.dhanCount ?? 0);
        setMetrics(d.metrics ?? null);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runSync = useCallback(
    async (body: Record<string, unknown>, label: string) => {
      setSyncingAction(label);
      setSyncResult(null);
      try {
        const res = await fetch('/api/bhav-dhan-compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const d = await res.json();
        setSyncResult(
          d.success
            ? {
                mode: d.mode,
                processedDates: d.processedDates,
                computed: d.computed ?? 0,
                failed: d.failed ?? 0,
                errors: d.errors ?? [],
              }
            : { computed: 0, failed: 0, errors: [d.error ?? 'Unknown error'] },
        );
        await fetchData();
      } catch (e) {
        setSyncResult({ computed: 0, failed: 0, errors: [(e as Error).message] });
      } finally {
        setSyncingAction(null);
      }
    },
    [fetchData],
  );

  const computeDhan = useCallback(async () => {
    if (!date) return;
    await runSync({ action: 'compute-dhan', date }, 'selected');
  }, [date, runSync]);

  const computeRange = useCallback(
    async (fromDate?: string, toDate?: string) => {
      await runSync({ action: 'compute-dhan-range', fromDate, toDate }, 'range');
    },
    [runSync],
  );

  const computeMissing = useCallback(
    async (fromDate?: string, toDate?: string) => {
      await runSync({ action: 'compute-dhan-missing', fromDate, toDate }, 'missing');
    },
    [runSync],
  );

  return {
    stocks,
    availableDates,
    date,
    hasBhav,
    hasDhan,
    dhanCached,
    bhavCount,
    dhanCount,
    metrics,
    loading,
    syncingAction,
    syncResult,
    refresh: fetchData,
    computeDhan,
    computeRange,
    computeMissing,
  };
}
