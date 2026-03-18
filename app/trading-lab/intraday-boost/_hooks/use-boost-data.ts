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
}

export interface BoostData {
  stocks: BoostStock[];
  loading: boolean;
  error: string | null;
  syncRequired: string | false;
  dataSource: 'live' | 'bhavcopy' | 'bhavcopy-today' | null;
  latestDate: string | null;
  marketOpen: boolean | null;
  lastRefresh: Date | null;
  refresh: () => void;
  dismissSync: () => void;
}

/**
 * Data fetching hook for Intraday Boost page.
 *
 * - Debounces toggle changes (150ms) to prevent multi-fetch from nuqs re-renders
 * - AbortController cancels stale in-flight requests
 * - Keeps showing old data while new data loads (no flash-to-empty)
 * - Auto-refresh every 60s
 */
export function useBoostData(useOC = true, tfOnly = false): BoostData {
  const [stocks, setStocks] = useState<BoostStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncRequired, setSyncRequired] = useState<string | false>(false);
  const [dataSource, setDataSource] = useState<'live' | 'bhavcopy' | 'bhavcopy-today' | null>(null);
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [marketOpen, setMarketOpen] = useState<boolean | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // Build URL from current toggle state
  const buildUrl = useCallback(() => {
    let url = '/api/r-factor?limit=206';
    if (!useOC) url += '&useOC=false';
    if (tfOnly) url += '&stockList=tf';
    return url;
  }, [useOC, tfOnly]);

  const doFetch = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    // Don't setLoading(true) on toggle — keeps old data visible (no flash)
    // Only show spinner on initial load (stocks.length === 0)
    try {
      const res = await fetch(buildUrl(), { signal: controller.signal });
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
        setLastRefresh(new Date());
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (mountedRef.current) setError('Network error. Is the server running?');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [buildUrl]);

  // Debounced fetch — consolidates rapid nuqs re-renders into single API call
  // biome-ignore lint/correctness/useExhaustiveDependencies: doFetch changes when toggles change
  useEffect(() => {
    mountedRef.current = true;
    const debounce = setTimeout(() => doFetch(), 150);
    const interval = setInterval(() => doFetch(), 60_000);
    return () => {
      mountedRef.current = false;
      clearTimeout(debounce);
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [doFetch]);

  return {
    stocks,
    loading,
    error,
    syncRequired,
    dataSource,
    latestDate,
    marketOpen,
    lastRefresh,
    refresh: doFetch,
    dismissSync: () => setSyncRequired(false),
  };
}
