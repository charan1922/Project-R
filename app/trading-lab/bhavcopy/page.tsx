'use client';

import {
  Activity,
  BarChart2,
  ChevronDown,
  LayoutGrid,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface BhavcopyRow {
  id: number;
  date: string;
  symbol: string;
  eqOpen: number;
  eqHigh: number;
  eqLow: number;
  eqClose: number;
  eqVolume: number;
  eqTurnover: number;
  eqTrades: number;
  eqDeliveryQty: number;
  eqDeliveryPct: number;
  futVolume: number;
  futOi: number;
  futOiChange: number;
  futTurnover: number;
  futTrades: number;
  optVolume: number;
  optOi: number;
  optTurnover: number;
  optTrades: number;
  ceVolume: number;
  peVolume: number;
  ceTrades: number;
  peTrades: number;
}

function fmt(n: number, decimals = 0) {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toFixed(decimals);
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

function avgTradeSize(turnover: number, trades: number) {
  if (trades === 0) return 0;
  return turnover / trades;
}

// Institutional signal: big avg trade = big players
function institutionalScore(avgSize: number, turnover: number): { label: string; color: string; isWhale: boolean } {
  const isWhale = avgSize > 10_00_000 || (turnover > 50_00_00_000 && avgSize > 5_00_000);
  if (isWhale) return { label: 'Whale', color: 'text-violet-400', isWhale: true };
  if (avgSize > 5_00_000) return { label: 'Institutional', color: 'text-purple-400', isWhale: false };
  if (avgSize > 1_00_000) return { label: 'HNI/Pro', color: 'text-blue-400', isWhale: false };
  if (avgSize > 50_000) return { label: 'Mixed', color: 'text-amber-400', isWhale: false };
  return { label: 'Retail', color: 'text-slate-400', isWhale: false };
}

type TabType = 'summary' | 'equity' | 'futures' | 'options' | 'delivery';

const TABS: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: 'summary', label: 'Summary', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { key: 'equity', label: 'Equity', icon: <BarChart2 className="w-3.5 h-3.5" /> },
  { key: 'futures', label: 'Futures', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { key: 'options', label: 'Options', icon: <Activity className="w-3.5 h-3.5" /> },
  { key: 'delivery', label: 'Delivery', icon: <Users className="w-3.5 h-3.5" /> },
];

export default function BhavcopyPage() {
  const [rows, setRows] = useState<BhavcopyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [dates, setDates] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [offset, setOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const LIMIT = 100;

  const fetchData = useCallback(
    async (reset = false) => {
      setError(null);
      if (reset) setLoading(true);
      const currentOffset = reset ? 0 : offset;
      try {
        const params = new URLSearchParams({ limit: String(LIMIT), offset: String(currentOffset) });
        if (search) params.set('symbol', search);
        if (selectedDate) params.set('date', selectedDate);

        const res = await fetch(`/api/bhavcopy?${params}`);
        const json = await res.json();
        if (json.success) {
          if (reset || currentOffset === 0) {
            setRows(json.data);
          } else {
            setRows((prev) => [...prev, ...json.data]);
          }
          setTotal(json.total);
          if (json.dates) setDates(json.dates);
          if (json.dateRange) setDateRange(json.dateRange);
          if (reset) setOffset(0);
        } else {
          setError(json.error);
        }
      } catch {
        setError('Failed to fetch bhavcopy data');
      } finally {
        setLoading(false);
      }
    },
    [search, selectedDate, offset],
  );

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const loadMore = () => setOffset((prev) => prev + LIMIT);
  useEffect(() => {
    if (offset > 0) fetchData(false);
  }, [offset, fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const res = await fetch('/api/bhavcopy/sync?days=60', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setSyncResult(`✅ Synced ${json.dates} dates, ${json.rows} rows in ${json.elapsed}`);
        setOffset(0);
        fetchData(true);
      } else {
        setError(json.error);
      }
    } catch {
      setError('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const pcr = (r: BhavcopyRow) => {
    if (r.ceVolume === 0) return null;
    return r.peVolume / r.ceVolume;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-bold tracking-tight">NSE Bhavcopy Intelligence</h1>
          </div>
          <p className="text-xs text-slate-500">
            {dateRange ? `${dateRange.from} → ${dateRange.to}` : 'No data synced'} &middot;{' '}
            {dates.length} trading days &middot; {total.toLocaleString()} records
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing NSE...' : 'Sync 60 Days'}
        </button>
      </div>

      {syncResult && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
          {syncResult}
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Trading Days', value: dates.length, color: 'text-slate-200' },
          { label: 'Total Records', value: total.toLocaleString(), color: 'text-slate-200' },
          { label: 'Latest Date', value: dateRange?.to ?? '—', color: 'text-amber-400' },
          { label: 'Showing', value: `${rows.length.toLocaleString()} / ${total.toLocaleString()}`, color: 'text-slate-200' },
        ].map((s) => (
          <div key={s.label} className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
            <div className="text-[11px] text-slate-500 mb-1">{s.label}</div>
            <div className={`text-base font-semibold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            placeholder="Search symbol..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="relative">
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300 focus:outline-none focus:border-amber-500/50"
          >
            <option value="">All Dates</option>
            {dates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 bg-slate-900/50 rounded-lg p-1 w-fit border border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === t.key
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
        {/* Summary Tab (Before Staged Changes) */}
        {activeTab === 'summary' && (
          <>
            <div className="grid grid-cols-[85px_120px_80px_100px_100px_100px_100px_100px_80px_100px] gap-2 px-4 py-2.5 border-b border-slate-800 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              <span>Date</span>
              <span>Symbol</span>
              <span>Close</span>
              <span>Eq Vol</span>
              <span>Fut Vol</span>
              <span>Fut OI</span>
              <span>OI Chg</span>
              <span>Opt Vol</span>
              <span>PCR</span>
              <span>Spread</span>
            </div>
            {loading && rows.length === 0 && (
              <div className="px-5 py-16 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-slate-600" />
                <p className="text-sm text-slate-500">Loading...</p>
              </div>
            )}
            {!loading && rows.length === 0 && (
              <div className="px-5 py-16 text-center">
                <p className="text-sm text-slate-500">
                  {total === 0 ? 'No data. Click "Sync 60 Days" to download from NSE.' : 'No rows match filters.'}
                </p>
              </div>
            )}
            {rows.map((r, i) => {
              const ratio = pcr(r);
              const spread = r.eqClose > 0 ? (r.eqHigh - r.eqLow) / r.eqClose : 0;
              const oiUp = r.futOiChange > 0;
              return (
                <div
                  key={r.id}
                  className={`grid grid-cols-[85px_120px_80px_100px_100px_100px_100px_100px_80px_100px] gap-2 px-4 py-2 text-sm hover:bg-slate-800/40 transition-colors ${i !== rows.length - 1 ? 'border-b border-slate-800/40' : ''}`}
                >
                  <div className="text-slate-500 text-[10px] font-mono whitespace-nowrap">{r.date}</div>
                  <div className="text-white font-semibold truncate">{r.symbol}</div>
                  <div className="text-white font-mono text-xs">{r.eqClose.toFixed(1)}</div>
                  <div className="text-slate-300 font-mono text-xs">{fmt(r.eqVolume)}</div>
                  <div className="text-slate-300 font-mono text-xs">{fmt(r.futVolume)}</div>
                  <div className="text-slate-300 font-mono text-xs">{fmt(r.futOi)}</div>
                  <div className={`font-mono text-xs flex items-center gap-0.5 ${oiUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {oiUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {fmt(Math.abs(r.futOiChange))}
                  </div>
                  <div className="text-slate-300 font-mono text-xs">{fmt(r.optVolume)}</div>
                  <div className="text-slate-300 font-mono text-xs">{ratio !== null ? ratio.toFixed(2) : '—'}</div>
                  <div className="text-amber-400 font-mono text-xs">{(spread * 100).toFixed(2)}%</div>
                </div>
              );
            })}
          </>
        )}

        {/* Equity Tab */}
        {activeTab === 'equity' && (
          <>
            <div className="grid grid-cols-[85px_120px_70px_70px_70px_70px_90px_90px_80px_100px] gap-2 px-4 py-2.5 border-b border-slate-800 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              <span>Date</span>
              <span>Symbol</span>
              <span>Open</span>
              <span>High</span>
              <span>Low</span>
              <span>Close</span>
              <span>Volume</span>
              <span>Turnover</span>
              <span>Trades</span>
              <span>Institutional</span>
            </div>
            {rows.map((r, i) => {
              const avgEq = avgTradeSize(r.eqTurnover, r.eqTrades);
              const sig = institutionalScore(avgEq, r.eqTurnover);
              return (
                <div
                  key={r.id}
                  className={`grid grid-cols-[85px_120px_70px_70px_70px_70px_90px_90px_80px_100px] gap-2 px-4 py-2 text-sm hover:bg-slate-800/40 transition-colors ${i !== rows.length - 1 ? 'border-b border-slate-800/40' : ''}`}
                >
                  <div className="text-slate-500 text-[10px] font-mono whitespace-nowrap">{r.date}</div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-white font-semibold truncate">{r.symbol}</span>
                    {sig.isWhale && (
                      <span className="px-1 py-0.5 rounded-[4px] bg-violet-500/20 border border-violet-500/30 text-[9px] text-violet-400 font-bold uppercase tracking-tighter">
                        Whale
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400 font-mono text-xs">{(r.eqOpen ?? 0).toFixed(1)}</div>
                  <div className="text-emerald-400 font-mono text-xs">{(r.eqHigh ?? 0).toFixed(1)}</div>
                  <div className="text-red-400 font-mono text-xs">{(r.eqLow ?? 0).toFixed(1)}</div>
                  <div className="text-white font-mono text-xs font-medium">{(r.eqClose ?? 0).toFixed(1)}</div>
                  <div className="text-slate-300 font-mono text-xs">{fmt(r.eqVolume)}</div>
                  <div className="text-slate-300 font-mono text-xs">₹{fmt(r.eqTurnover)}</div>
                  <div className="text-slate-400 font-mono text-xs">{r.eqTrades > 0 ? fmt(r.eqTrades) : '—'}</div>
                  <div className={`font-mono text-xs font-medium ${sig.color}`}>
                    {r.eqTrades > 0 ? sig.label : '—'}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Futures Tab */}
        {activeTab === 'futures' && (
          <>
            <div className="grid grid-cols-[85px_120px_70px_70px_90px_90px_90px_80px_80px] gap-2 px-4 py-2.5 border-b border-slate-800 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              <span>Date</span>
              <span>Symbol</span>
              <span>Close</span>
              <span>FutOI</span>
              <span>OI Chg</span>
              <span>Fut Vol</span>
              <span>Turnover</span>
              <span>Trades</span>
              <span>Institutional</span>
              <span>Bias</span>
            </div>
            {rows.map((r, i) => {
              const avgFut = avgTradeSize(r.futTurnover, r.futTrades);
              const sig = institutionalScore(avgFut, r.futTurnover);
              const oiUp = r.futOiChange > 0;
              const priceUp = r.eqClose > r.eqOpen;
              
              let bias = 'Neutral';
              let biasColor = 'text-slate-500';
              if (priceUp && oiUp) { bias = 'Long Buildup'; biasColor = 'text-emerald-400'; }
              else if (!priceUp && oiUp) { bias = 'Short Buildup'; biasColor = 'text-red-400'; }
              else if (priceUp && !oiUp) { bias = 'Short Covering'; biasColor = 'text-blue-400'; }
              else if (!priceUp && !oiUp) { bias = 'Unwinding'; biasColor = 'text-amber-400'; }

              return (
                <div
                  key={r.id}
                  className={`grid grid-cols-[85px_120px_70px_70px_90px_90px_90px_80px_80px] gap-2 px-4 py-2 text-sm hover:bg-slate-800/40 ${i !== rows.length - 1 ? 'border-b border-slate-800/40' : ''}`}
                >
                  <div className="text-slate-500 text-[10px] font-mono whitespace-nowrap">{r.date}</div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-white font-semibold truncate">{r.symbol}</span>
                    {sig.isWhale && (
                      <span className="px-1 py-0.5 rounded-[4px] bg-violet-500/20 border border-violet-500/30 text-[9px] text-violet-400 font-bold uppercase tracking-tighter">
                        Whale
                      </span>
                    )}
                  </div>
                  <div className="text-white font-mono text-xs">{r.eqClose.toFixed(1)}</div>
                  <div className="text-slate-300 font-mono text-xs">{fmt(r.futOi)}</div>
                  <div className={`font-mono text-xs flex items-center gap-0.5 ${oiUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {oiUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {fmt(Math.abs(r.futOiChange))}
                  </div>
                  <div className="text-slate-300 font-mono text-xs">{fmt(r.futVolume)}</div>
                  <div className="text-slate-300 font-mono text-xs">₹{fmt(r.futTurnover)}</div>
                  <div className="text-slate-400 font-mono text-xs">{r.futTrades > 0 ? fmt(r.futTrades) : '—'}</div>
                  <div className={`font-mono text-xs font-medium ${sig.color}`}>
                    {r.futTrades > 0 ? `${sig.label}` : '—'}
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-tight ${biasColor}`}>
                    {bias}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Options Tab */}
        {activeTab === 'options' && (
          <>
            <div className="grid grid-cols-[85px_120px_70px_70px_70px_60px_70px_70px_90px_60px] gap-2 px-4 py-2.5 border-b border-slate-800 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              <span>Date</span>
              <span>Symbol</span>
              <span>Close</span>
              <span>CE Vol</span>
              <span>PE Vol</span>
              <span>PCR</span>
              <span>CE Trades</span>
              <span>PE Trades</span>
              <span>Institutional</span>
              <span>Bias</span>
            </div>
            {rows.map((r, i) => {
              const ratio = pcr(r);
              const isBullish = ratio !== null && ratio < 0.8;
              const isBearish = ratio !== null && ratio > 1.2;
              
              const avgOpt = avgTradeSize(r.optTurnover, r.optTrades);
              const sig = institutionalScore(avgOpt, r.optTurnover);

              // Put-heavy trades vs call-heavy = bearish bias from institutional side
              const tradesBias =
                r.ceTrades + r.peTrades > 0
                  ? r.peTrades / (r.ceTrades + r.peTrades)
                  : null;
              return (
                <div
                  key={r.id}
                  className={`grid grid-cols-[85px_120px_70px_70px_70px_60px_70px_70px_90px_60px] gap-2 px-4 py-2 text-sm hover:bg-slate-800/40 ${i !== rows.length - 1 ? 'border-b border-slate-800/40' : ''}`}
                >
                  <div className="text-slate-500 text-[10px] font-mono whitespace-nowrap">{r.date}</div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-white font-semibold truncate">{r.symbol}</span>
                    {sig.isWhale && (
                      <span className="px-1 py-0.5 rounded-[4px] bg-violet-500/20 border border-violet-500/30 text-[9px] text-violet-400 font-bold uppercase tracking-tighter">
                        Whale
                      </span>
                    )}
                  </div>
                  <div className="text-white font-mono text-xs">{r.eqClose.toFixed(1)}</div>
                  <div className="text-emerald-400 font-mono text-xs">{fmt(r.ceVolume)}</div>
                  <div className="text-red-400 font-mono text-xs">{fmt(r.peVolume)}</div>
                  <div className={`font-mono text-xs font-semibold ${isBullish ? 'text-emerald-400' : isBearish ? 'text-red-400' : 'text-slate-300'}`}>
                    {ratio !== null ? ratio.toFixed(2) : '—'}
                  </div>
                  <div className="text-emerald-400/70 font-mono text-xs">{r.ceTrades > 0 ? fmt(r.ceTrades) : '—'}</div>
                  <div className="text-red-400/70 font-mono text-xs">{r.peTrades > 0 ? fmt(r.peTrades) : '—'}</div>
                  <div className={`font-mono text-xs font-medium ${sig.color}`}>
                    {r.optTrades > 0 ? sig.label : '—'}
                  </div>
                  <div className={`font-mono text-xs font-medium ${tradesBias !== null && tradesBias > 0.55 ? 'text-red-400' : tradesBias !== null && tradesBias < 0.45 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {tradesBias !== null ? (tradesBias > 0.55 ? 'Bearish' : tradesBias < 0.45 ? 'Bullish' : 'Neutral') : '—'}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Delivery Tab */}
        {activeTab === 'delivery' && (
          <>
            <div className="grid grid-cols-[85px_120px_70px_90px_90px_80px_90px_90px_100px] gap-2 px-4 py-2.5 border-b border-slate-800 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              <span>Date</span>
              <span>Symbol</span>
              <span>Close</span>
              <span>Volume</span>
              <span>Del Qty</span>
              <span>Del %</span>
              <span>Trades</span>
              <span>Avg Trade</span>
              <span>Player Type</span>
            </div>
            {rows.map((r, i) => {
              const avgEq = avgTradeSize(r.eqTurnover, r.eqTrades);
              const sig = institutionalScore(avgEq, r.eqTurnover);
              const delHigh = r.eqDeliveryPct > 60;
              const delLow = r.eqDeliveryPct < 25;
              return (
                <div
                  key={r.id}
                  className={`grid grid-cols-[85px_120px_70px_90px_90px_80px_90px_90px_100px] gap-2 px-4 py-2 text-sm hover:bg-slate-800/40 ${i !== rows.length - 1 ? 'border-b border-slate-800/40' : ''}`}
                >
                  <div className="text-slate-500 text-[10px] font-mono whitespace-nowrap">{r.date}</div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-white font-semibold truncate">{r.symbol}</span>
                    {sig.isWhale && (
                      <span className="px-1 py-0.5 rounded-[4px] bg-violet-500/20 border border-violet-500/30 text-[9px] text-violet-400 font-bold uppercase tracking-tighter">
                        Whale
                      </span>
                    )}
                  </div>
                  <div className="text-white font-mono text-xs">{r.eqClose.toFixed(1)}</div>
                  <div className="text-slate-300 font-mono text-xs">{fmt(r.eqVolume)}</div>
                  <div className="text-slate-300 font-mono text-xs">{fmt(r.eqDeliveryQty)}</div>
                  <div className={`font-mono text-xs font-semibold ${delHigh ? 'text-emerald-400' : delLow ? 'text-red-400' : 'text-amber-400'}`}>
                    {r.eqDeliveryPct > 0 ? fmtPct(r.eqDeliveryPct) : '—'}
                  </div>
                  <div className="text-slate-400 font-mono text-xs">{r.eqTrades > 0 ? fmt(r.eqTrades) : '—'}</div>
                  <div className="text-slate-300 font-mono text-xs">
                    {r.eqTrades > 0 ? `₹${fmt(avgEq)}` : '—'}
                  </div>
                  <div className={`font-mono text-xs font-semibold ${sig.color}`}>
                    {r.eqTrades > 0 ? sig.label : '—'}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {rows.length < total && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={loadMore}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Load more ({rows.length.toLocaleString()} / {total.toLocaleString()})
          </button>
        </div>
      )}
    </div>
  );
}
