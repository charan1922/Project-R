import { useCallback, useEffect, useState } from 'react';

interface SourceData {
  eqHigh: number;
  eqLow: number;
  eqClose: number;
  eqVolume: number;
  futVolume: number;
  futOi: number;
  futOiChange: number;
  futTurnover: number;
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
  computing: boolean;
  computeResult: { computed: number; failed: number; errors: string[] } | null;
  refresh: () => void;
  computeDhan: () => void;
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
  const [computing, setComputing] = useState(false);
  const [computeResult, setComputeResult] = useState<{ computed: number; failed: number; errors: string[] } | null>(
    null,
  );

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

  const computeDhan = useCallback(async () => {
    if (!date) return;
    setComputing(true);
    setComputeResult(null);
    try {
      const res = await fetch('/api/bhav-dhan-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'compute-dhan', date }),
      });
      const d = await res.json();
      setComputeResult(
        d.success
          ? { computed: d.computed ?? 0, failed: d.failed ?? 0, errors: d.errors ?? [] }
          : { computed: 0, failed: 0, errors: [d.error ?? 'Unknown error'] },
      );
      await fetchData();
    } catch (e) {
      setComputeResult({ computed: 0, failed: 0, errors: [(e as Error).message] });
    } finally {
      setComputing(false);
    }
  }, [date, fetchData]);

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
    computing,
    computeResult,
    refresh: fetchData,
    computeDhan,
  };
}
