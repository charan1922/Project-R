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

export function useBoostData(): BoostData {
  const [stocks, setStocks] = useState<BoostStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncRequired, setSyncRequired] = useState<string | false>(false);
  const [dataSource, setDataSource] = useState<'live' | 'bhavcopy' | 'bhavcopy-today' | null>(null);
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [marketOpen, setMarketOpen] = useState<boolean | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const mountedRef = useRef(true);

  const fetchBoostData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/r-factor?limit=206');
      if (!mountedRef.current) return;
      const result = await res.json();
      if (!mountedRef.current) return;
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
    } catch {
      if (mountedRef.current) setError('Network error. Is the server running?');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchBoostData is stable via useCallback with empty deps
  useEffect(() => {
    mountedRef.current = true;
    fetchBoostData();
    const interval = setInterval(fetchBoostData, 60_000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  return {
    stocks,
    loading,
    error,
    syncRequired,
    dataSource,
    latestDate,
    marketOpen,
    lastRefresh,
    refresh: fetchBoostData,
    dismissSync: () => setSyncRequired(false),
  };
}
