import { useCallback, useEffect, useRef, useState } from 'react';
import type { OptionChainData, StrikeData } from '@/lib/dhan/option-chain-types';

export type StrikeCount = 'all' | 5 | 10 | 15 | 20 | 25;

export interface OptionChainState {
  data: OptionChainData | null;
  loading: boolean;
  error: string | null;
  symbol: string;
  setSymbol: (s: string) => void;
  expiry: string;
  setExpiry: (e: string) => void;
  strikesAround: StrikeCount;
  setStrikesAround: (n: StrikeCount) => void;
  filteredStrikes: StrikeData[];
  refresh: () => void;
}

export function useOptionChain(initialSymbol = 'RELIANCE'): OptionChainState {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [expiry, setExpiry] = useState('');
  const [data, setData] = useState<OptionChainData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strikesAround, setStrikesAround] = useState<StrikeCount>(10);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!symbol) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      let url = `/api/option-chain?symbol=${symbol}`;
      if (expiry) url += `&expiry=${expiry}`;
      const res = await fetch(url, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const json = await res.json();
      if (controller.signal.aborted) return;

      if (json.success) {
        setData(json);
        // Set expiry from response if not already set
        if (!expiry && json.selectedExpiry) {
          setExpiry(json.selectedExpiry);
        }
      } else {
        setError(json.error || 'Failed to fetch');
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [symbol, expiry]);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 60s during market hours
    const interval = setInterval(fetchData, 60_000);
    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchData]);

  // Filter strikes based on strikesAround selection
  const filteredStrikes = data ? filterStrikesLocal(data.strikes, data.summary.atmStrike, strikesAround) : [];

  return {
    data,
    loading,
    error,
    symbol,
    setSymbol,
    expiry,
    setExpiry,
    strikesAround,
    setStrikesAround,
    filteredStrikes,
    refresh: fetchData,
  };
}

function filterStrikesLocal(strikes: StrikeData[], atm: number, count: StrikeCount): StrikeData[] {
  if (count === 'all' || strikes.length === 0) return strikes;
  const gap = strikes.length > 1 ? strikes[1].strike - strikes[0].strike : 10;
  const min = atm - count * gap;
  const max = atm + count * gap;
  return strikes.filter((s) => s.strike >= min && s.strike <= max);
}
