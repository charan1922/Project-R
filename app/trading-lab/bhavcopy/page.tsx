'use client';

import { BarChart2, ChevronDown, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface BhavcopyRow {
  id: number;
  date: string;
  symbol: string;
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
}

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
      const res = await fetch('/api/bhavcopy/sync?days=25', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setSyncResult(`Synced ${json.dates} dates, ${json.rows} rows in ${json.elapsed}`);
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

  const pcr = (row: BhavcopyRow) => (row.ceVolume > 0 ? (row.peVolume / row.ceVolume).toFixed(2) : '—');

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-amber-400" />
          <div>
            <h1 className="text-xl font-bold">Bhavcopy Data</h1>
            <p className="text-xs text-slate-500">
              {dateRange ? `${dateRange.from} → ${dateRange.to}` : 'No data'} &middot; {dates.length} days &middot;{' '}
              {total.toLocaleString()} rows
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Bhavcopy (25 days)'}
        </button>
      </div>

      {syncResult && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
          {syncResult}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Days', value: dates.length },
          { label: 'Total Rows', value: total },
          { label: 'Latest', value: dateRange?.to ?? '—' },
          { label: 'Showing', value: rows.length },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500">{stat.label}</div>
            <div className="text-lg font-semibold text-slate-200">
              {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </div>
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
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
          />
        </div>
        <div className="relative">
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300 focus:outline-none focus:border-slate-600"
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

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[90px_1.5fr_80px_80px_80px_90px_90px_80px_60px] gap-2 px-4 py-2 border-b border-slate-800 text-xs text-slate-500 font-medium">
          <span>Date</span>
          <span>Symbol</span>
          <span>High</span>
          <span>Low</span>
          <span>Close</span>
          <span>Fut Vol</span>
          <span>Fut OI</span>
          <span>OI Chg</span>
          <span>PCR</span>
        </div>

        {loading && rows.length === 0 && (
          <div className="px-5 py-16 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-slate-600" />
            <p className="text-sm text-slate-500">Loading bhavcopy data...</p>
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="px-5 py-16 text-center">
            <Search className="w-6 h-6 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {total === 0
                ? 'No data synced yet. Click "Sync Bhavcopy" to download from NSE.'
                : 'No rows match your filters.'}
            </p>
          </div>
        )}

        {rows.map((r, i) => (
          <div
            key={r.id}
            className={`grid grid-cols-[90px_1.5fr_80px_80px_80px_90px_90px_80px_60px] gap-2 px-4 py-1.5 text-sm hover:bg-slate-800/40 transition-colors ${i !== rows.length - 1 ? 'border-b border-slate-800/50' : ''}`}
          >
            <div className="text-slate-500 text-xs font-mono">{r.date}</div>
            <div className="text-white font-medium truncate">{r.symbol}</div>
            <div className="text-slate-300 font-mono">{r.eqHigh.toFixed(1)}</div>
            <div className="text-slate-300 font-mono">{r.eqLow.toFixed(1)}</div>
            <div className="text-slate-300 font-mono">{r.eqClose.toFixed(1)}</div>
            <div className="text-slate-400 font-mono">{(r.futVolume / 1000).toFixed(0)}K</div>
            <div className="text-slate-400 font-mono">{(r.futOi / 1000000).toFixed(1)}M</div>
            <div
              className={`font-mono ${r.futOiChange > 0 ? 'text-emerald-400' : r.futOiChange < 0 ? 'text-red-400' : 'text-slate-500'}`}
            >
              {(r.futOiChange / 1000).toFixed(0)}K
            </div>
            <div className="text-slate-400 font-mono">{pcr(r)}</div>
          </div>
        ))}
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
