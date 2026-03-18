'use client';

import { Clock, Search, TrendingUp, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { getRFactorColor, REGIME_BADGE, type Regime, shortDate } from '@/app/trading-lab/_lib/r-factor-ui';

interface StockHistoryEntry {
  date: string;
  compositeRFactor: number;
  spread: number;
  pcr: number;
  regime: Regime;
  isBlastTrade: boolean;
}

interface LeaderEntry extends StockHistoryEntry {
  symbol: string;
}

type ActiveTab = 'stock' | 'leaderboard';

export default function RFactorHistoryPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('stock');

  // Stock history state
  const [symbolInput, setSymbolInput] = useState('');
  const [activeSymbol, setActiveSymbol] = useState('');
  const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  // Daily leaderboard state
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [leaderLoading, setLeaderLoading] = useState(false);
  const [leaderError, setLeaderError] = useState<string | null>(null);

  // Load available dates on mount
  useEffect(() => {
    fetch('/api/r-factor-history?dates=true')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.dates.length > 0) {
          setAvailableDates(d.dates);
          setSelectedDate(d.dates[0]); // Default to most recent
        }
      })
      .catch(() => {});
  }, []);

  const fetchStockHistory = useCallback(async (sym: string) => {
    if (!sym) return;
    setStockLoading(true);
    setStockError(null);
    setStockHistory([]);
    try {
      const res = await fetch(`/api/r-factor-history?symbol=${sym}&days=25`);
      const json = await res.json();
      if (json.success) {
        setStockHistory(json.data);
        setActiveSymbol(sym);
      } else {
        setStockError(json.error || 'No data found');
      }
    } catch {
      setStockError('Network error');
    } finally {
      setStockLoading(false);
    }
  }, []);

  const fetchLeaderboard = useCallback(async (date: string) => {
    if (!date) return;
    setLeaderLoading(true);
    setLeaderError(null);
    try {
      const res = await fetch(`/api/r-factor-history?date=${date}&limit=20`);
      const json = await res.json();
      if (json.success) {
        setLeaderboard(json.data);
      } else {
        setLeaderError(json.error || 'No data');
      }
    } catch {
      setLeaderError('Network error');
    } finally {
      setLeaderLoading(false);
    }
  }, []);

  // Auto-fetch leaderboard when date changes
  useEffect(() => {
    if (selectedDate) fetchLeaderboard(selectedDate);
  }, [selectedDate, fetchLeaderboard]);

  const handleSymbolSearch = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const sym = symbolInput.trim().toUpperCase();
    if (sym) fetchStockHistory(sym);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
          <Clock className="w-6 h-6 text-sky-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">R-Factor History</h1>
          <p className="text-sm text-slate-500">Track institutional activity signals across dates</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'stock' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Stock History
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'leaderboard' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Daily Leaderboard
        </button>
      </div>

      {/* ── Tab 1: Stock History ── */}
      {activeTab === 'stock' && (
        <div className="space-y-5">
          {/* Symbol search */}
          <form onSubmit={handleSymbolSearch} className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="e.g. RELIANCE"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                className="pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-slate-600 w-48"
              />
            </div>
            <button
              type="submit"
              disabled={stockLoading || !symbolInput.trim()}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {stockLoading ? 'Loading…' : 'Show History'}
            </button>
          </form>

          {stockError && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {stockError}
            </div>
          )}

          {stockHistory.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{activeSymbol}</span>
                <span className="text-sm text-slate-500">— last {stockHistory.length} trading days</span>
              </div>

              {/* Line chart */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">R-Factor Over Time</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stockHistory} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                      labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                      itemStyle={{ color: '#38bdf8' }}
                      labelFormatter={(label) => shortDate(String(label))}
                      formatter={(v) => [typeof v === 'number' ? v.toFixed(3) : v, 'R-Factor']}
                    />
                    {/* Reference line at 2.8 (blast threshold) */}
                    <Line
                      type="monotone"
                      dataKey="compositeRFactor"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#38bdf8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
                <div className="grid grid-cols-[120px_1fr_1fr_1fr_100px_80px] gap-2 px-5 py-3 bg-slate-800/50 text-xs text-slate-500 uppercase tracking-wider font-medium">
                  <span>Date</span>
                  <span>R-Factor</span>
                  <span>Spread Z</span>
                  <span>PCR Z</span>
                  <span>Regime</span>
                  <span>Blast</span>
                </div>
                {[...stockHistory].reverse().map((entry) => (
                  <div
                    key={entry.date}
                    className="grid grid-cols-[120px_1fr_1fr_1fr_100px_80px] gap-2 px-5 py-3 items-center border-b border-slate-800/50 last:border-b-0 hover:bg-slate-800/30 transition-colors"
                  >
                    <span className="text-sm text-slate-400 font-mono">{shortDate(entry.date)}</span>
                    <span className={`text-sm font-mono font-bold ${getRFactorColor(entry.compositeRFactor)}`}>
                      {entry.compositeRFactor.toFixed(3)}
                    </span>
                    <span className={`text-sm font-mono ${entry.spread > 1.5 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {entry.spread.toFixed(2)}
                    </span>
                    <span className={`text-sm font-mono ${entry.pcr > 1.5 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {entry.pcr.toFixed(2)}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-medium rounded border w-fit ${REGIME_BADGE[entry.regime] ?? REGIME_BADGE.Defensive}`}
                    >
                      {entry.regime}
                    </span>
                    <span>
                      {entry.isBlastTrade ? (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded w-fit">
                          <Zap className="w-2.5 h-2.5" />
                          Blast
                        </span>
                      ) : (
                        <span className="text-xs text-slate-700">—</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {!stockLoading && stockHistory.length === 0 && !stockError && (
            <div className="px-5 py-16 text-center rounded-xl bg-slate-900 border border-slate-800">
              <Search className="w-6 h-6 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Enter a symbol to view its R-Factor history</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Daily Leaderboard ── */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-5">
          {/* Date selector */}
          <div className="flex items-center gap-3">
            <label htmlFor="date-select" className="text-sm text-slate-400">
              Select date:
            </label>
            <select
              id="date-select"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-slate-600"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </option>
              ))}
            </select>
            {leaderLoading && <span className="text-xs text-slate-500">Loading…</span>}
          </div>

          {leaderError && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {leaderError}
            </div>
          )}

          {leaderboard.length > 0 && (
            <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_100px_80px] gap-2 px-5 py-3 bg-slate-800/50 text-xs text-slate-500 uppercase tracking-wider font-medium">
                <span>#</span>
                <span>Symbol</span>
                <span>R-Factor</span>
                <span>Spread Z</span>
                <span>PCR Z</span>
                <span>Regime</span>
                <span>Blast</span>
              </div>
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.symbol}
                  className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_100px_80px] gap-2 px-5 py-3 items-center border-b border-slate-800/50 last:border-b-0 hover:bg-slate-800/30 transition-colors"
                >
                  <span className="text-sm text-slate-600 font-mono">{i + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{entry.symbol}</span>
                  </div>
                  <span className={`text-sm font-mono font-bold ${getRFactorColor(entry.compositeRFactor)}`}>
                    {entry.compositeRFactor.toFixed(3)}
                  </span>
                  <span className={`text-sm font-mono ${entry.spread > 1.5 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {entry.spread.toFixed(2)}
                  </span>
                  <span className={`text-sm font-mono ${entry.pcr > 1.5 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {entry.pcr.toFixed(2)}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-[9px] font-medium rounded border w-fit ${REGIME_BADGE[entry.regime] ?? REGIME_BADGE.Defensive}`}
                  >
                    {entry.regime}
                  </span>
                  <span>
                    {entry.isBlastTrade ? (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded w-fit">
                        <Zap className="w-2.5 h-2.5" />
                        Blast
                      </span>
                    ) : (
                      <span className="text-xs text-slate-700">—</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!leaderLoading && leaderboard.length === 0 && !leaderError && selectedDate && (
            <div className="px-5 py-16 text-center rounded-xl bg-slate-900 border border-slate-800">
              <TrendingUp className="w-6 h-6 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No leaderboard data for {shortDate(selectedDate)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
