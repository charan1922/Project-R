import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Regime } from '@/app/trading-lab/_lib/r-factor-ui';

export interface ZScores {
  spread: number;
  pcr: number;
  fut_turnover: number;
  fut_volume: number;
  opt_volume: number;
  eq_trade_size: number;
  oi_change: number;
  oi_level: number;
}

export interface RawData {
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
  optOi: number;
}

export interface StockHistoryEntry {
  date: string;
  compositeRFactor: number;
  rawRFactor?: number;
  scaledRFactor?: number;
  confidence?: number;
  delta: number | null;
  zScores: ZScores;
  regime: Regime;
  isBlastTrade: boolean;
  modelUsed: string;
  raw: RawData;
}

export interface Summary {
  avgR: number;
  maxR: number;
  minR: number;
  blastDays: number;
  totalDays: number;
  dominantRegime: string;
  regimeCounts: Record<string, number>;
  trendDirection: 'up' | 'down' | 'flat';
  avgSpread: number;
  maxSpread: number;
}

export interface LeaderEntry {
  symbol: string;
  sector: string | null;
  compositeRFactor: number;
  rawRFactor?: number;
  scaledRFactor?: number;
  confidence?: number;
  zScores: ZScores;
  regime: Regime;
  isBlastTrade: boolean;
  modelUsed?: string;
}

export interface StockHistoryData {
  activeSymbol: string;
  sector: string | null;
  summary: Summary | null;
  history: StockHistoryEntry[];
  loading: boolean;
  error: string | null;
  search: (sym: string) => void;
}

export interface LeaderboardData {
  availableDates: string[];
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  entries: LeaderEntry[];
  loading: boolean;
  error: string | null;
  sectors: string[];
  sectorFilter: string;
  setSectorFilter: (s: string) => void;
  filtered: LeaderEntry[];
}

export function useStockHistory(): StockHistoryData {
  const [activeSymbol, setActiveSymbol] = useState('');
  const [sector, setSector] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<StockHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (sym: string) => {
    if (!sym) return;
    setLoading(true);
    setError(null);
    setHistory([]);
    setSummary(null);
    setSector(null);
    try {
      const res = await fetch(`/api/r-factor-history?symbol=${sym}&days=25`);
      const json = await res.json();
      if (json.success) {
        setHistory(json.data);
        setActiveSymbol(sym);
        setSummary(json.summary);
        setSector(json.sector);
      } else {
        setError(json.error || 'No data found');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  return { activeSymbol, sector, summary, history, loading, error, search };
}

export function useLeaderboard(): LeaderboardData {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState('ALL');

  useEffect(() => {
    fetch('/api/r-factor-history?dates=true')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.dates.length > 0) {
          setAvailableDates(d.dates);
          setSelectedDate(d.dates[0]);
        }
      })
      .catch(() => {});
  }, []);

  const fetchLeaderboard = useCallback(async (date: string) => {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/r-factor-history?date=${date}&limit=50`);
      const json = await res.json();
      if (json.success) setEntries(json.data);
      else setError(json.error || 'No data');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) fetchLeaderboard(selectedDate);
  }, [selectedDate, fetchLeaderboard]);

  const sectors = useMemo(() => {
    const set = new Set(entries.map((e) => e.sector).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [entries]);

  const filtered = useMemo(() => {
    if (sectorFilter === 'ALL') return entries;
    return entries.filter((e) => e.sector === sectorFilter);
  }, [entries, sectorFilter]);

  return {
    availableDates,
    selectedDate,
    setSelectedDate,
    entries,
    loading,
    error,
    sectors,
    sectorFilter,
    setSectorFilter,
    filtered,
  };
}
