'use client';

import { BarChart2, Loader2, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CompareStats } from './_components/compare-stats';
import { CompareTable } from './_components/compare-table';
import { useCompareData } from './_hooks/use-compare-data';

export default function BhavDhanComparePage() {
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const data = useCompareData(selectedDate);

  const filtered = useMemo(() => {
    if (!search) return data.stocks;
    const q = search.toLowerCase();
    return data.stocks.filter((s) => s.symbol.toLowerCase().includes(q));
  }, [data.stocks, search]);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-sky-400" />
          <div>
            <h1 className="text-xl font-bold">Bhav vs Dhan Compare</h1>
            <p className="text-xs text-slate-500">
              {data.date ?? 'No date'} &middot; Bhav: {data.bhavCount} &middot; Dhan: {data.dhanCount}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.date && !data.dhanCached && !data.computing && (
            <button
              type="button"
              onClick={data.computeDhan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/30 text-sm font-medium"
            >
              Compute Dhan (~60s)
            </button>
          )}
          {data.computing && (
            <span className="flex items-center gap-1.5 text-xs text-violet-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Computing...
            </span>
          )}
          <button
            type="button"
            onClick={data.refresh}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-500"
          >
            <RefreshCw className={`w-4 h-4 ${data.loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Errors */}
      {data.computeResult && data.computeResult.errors.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          Computed: {data.computeResult.computed} | Failed: {data.computeResult.failed}
          <details className="mt-1">
            <summary className="text-xs cursor-pointer opacity-70">Show errors</summary>
            <div className="mt-1 text-xs font-mono max-h-24 overflow-y-auto opacity-70">
              {data.computeResult.errors.map((e) => (
                <div key={e}>{e}</div>
              ))}
            </div>
            {data.computeResult.errors[0]?.includes('Master contracts') && (
              <a href="/trading-lab/master-contracts" className="inline-block mt-1 text-xs text-violet-400 underline">
                Sync Master Contracts first
              </a>
            )}
          </details>
        </div>
      )}

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
        {data.availableDates.length > 0 && (
          <select
            value={selectedDate ?? data.date ?? ''}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300 focus:outline-none"
          >
            {data.availableDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-2 text-[10px]">
          <span
            className={`px-2 py-1 rounded border font-mono ${data.hasBhav ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-slate-800 text-slate-600 border-slate-700'}`}
          >
            Bhav {data.hasBhav ? `\u2713 ${data.bhavCount}` : '\u2717'}
          </span>
          <span
            className={`px-2 py-1 rounded border font-mono ${data.hasDhan ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : 'bg-slate-800 text-slate-600 border-slate-700'}`}
          >
            Dhan {data.hasDhan ? `\u2713 ${data.dhanCount}` : 'not cached'}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="mb-4">
        <CompareStats metrics={data.metrics} />
      </div>

      {/* Table */}
      {data.loading ? (
        <div className="px-5 py-16 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-slate-600" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-16 text-center text-sm text-slate-500">
          {data.stocks.length === 0 ? 'No data for this date' : 'No stocks match'}
        </div>
      ) : (
        <CompareTable stocks={filtered} hasDhan={data.hasDhan} />
      )}
    </div>
  );
}
