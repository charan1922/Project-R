import { useCallback, useEffect, useRef, useState } from 'react';

export interface BoostStock {
  symbol: string;
  compositeRFactor: number;
  regime: 'Elephant' | 'Cheetah' | 'Hybrid' | 'Defensive';
  isBlastTrade: boolean;
  zScores: {
    fut_turnover: number;
    fut_volume: number;
    opt_volume: number;
    eq_trade_size: number;
    oi_change: number;
    spread: number;
    pcr: number;
  };
  pctChange?: number;
  sector?: string;
  lotValue?: number;
  timestamp: string;
  modelUsed?: string;
  confidence?: number;
  adx?: number;
  plusDI?: number;
  minusDI?: number;
  tfRFactor?: number | null;
  bhavRFactor?: number | null;
}

export interface BoostData {
  stocks: BoostStock[];
  loading: boolean;
  error: string | null;
  syncRequired: string | false;
  dataSource: 'live' | 'bhavcopy' | 'bhavcopy-today' | null;
  latestDate: string | null;
  marketOpen: boolean | null;
  hasTfData: boolean;
  lastRefresh: Date | null;
  availableDates: string[];
  refresh: () => void;
  dismissSync: () => void;
}

export type BoostMode = 'live' | 'past' | 'dhan-daily';

/**
 * Data hook for Intraday Boost — split into Live (Dhan) and Past (bhavcopy) modes.
 * Each mode uses a single data source — no mixing, no caching complexity.
 */
export type EnginePreset = 'sq-dominant' | 'balanced';

export function useBoostData(
  mode: BoostMode,
  opts: { useOC?: boolean; tfOnly?: boolean; date?: string; preset?: EnginePreset; robust?: boolean } = {},
): BoostData {
  const [stocks, setStocks] = useState<BoostStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncRequired, setSyncRequired] = useState<string | false>(false);
  const [dataSource, setDataSource] = useState<BoostData['dataSource']>(null);
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [marketOpen, setMarketOpen] = useState<boolean | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [hasTfData, setHasTfData] = useState(false);

  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // Refs for stable fetch
  const modeRef = useRef(mode);
  const optsRef = useRef(opts);
  modeRef.current = mode;
  optsRef.current = opts;

  const doFetch = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    try {
      const m = modeRef.current;
      const o = optsRef.current;

      let url = `/api/r-factor?mode=${m}`;
      if (m === 'live' && !o.useOC) url += '&useOC=false';
      if (o.tfOnly) url += '&stockList=tf';
      if (m === 'past' && o.date) url += `&date=${o.date}`;
      if (o.preset) url += `&preset=${o.preset}`;
      if (o.robust === true) url += '&robust=true';
      if (o.robust === false) url += '&robust=false';

      const res = await fetch(url, { signal: controller.signal });
      if (!mountedRef.current || controller.signal.aborted) return;
      const result = await res.json();
      if (!mountedRef.current || controller.signal.aborted) return;

      if (result.code === 'SYNC_REQUIRED') {
        setSyncRequired(result.syncTarget || 'master-contracts');
      } else if (result.success) {
        setSyncRequired(false);
        setStocks(result.data);
        setDataSource(result.dataSource || 'bhavcopy');
        setLatestDate(result.latestDate || null);
        setMarketOpen(result.marketOpen ?? null);
        setHasTfData(result.hasTfData ?? false);
        setLastRefresh(new Date());
        if (result.availableDates) setAvailableDates(result.availableDates);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (mountedRef.current) setError('Network error. Is the server running?');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Mount + auto-refresh (Live: 60s, Past: no auto-refresh)
  useEffect(() => {
    mountedRef.current = true;
    doFetch();
    const interval = mode === 'live' ? setInterval(doFetch, 60_000) : null;
    return () => {
      mountedRef.current = false;
      if (interval) clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [doFetch, mode]);

  // Re-fetch on param changes (skip initial)
  const isInitial = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: triggers re-fetch on param change
  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    setLoading(true);
    doFetch();
  }, [mode, opts.useOC, opts.tfOnly, opts.date, opts.preset, opts.robust]);

  return {
    stocks,
    loading,
    error,
    syncRequired,
    dataSource,
    latestDate,
    marketOpen,
    hasTfData,
    lastRefresh,
    availableDates,
    refresh: doFetch,
    dismissSync: () => setSyncRequired(false),
  };
}
