'use client';

import { Database, Download, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DownloadProgress } from './_components/download-progress';
import { TradeList } from './_components/symbol-table';
import { useDataStatus } from './_hooks/use-data-status';
import { useDownloadStream } from './_hooks/use-download-stream';

export default function BacktestDataPage() {
  const { trades, summary, loading, refresh } = useDataStatus();
  const stream = useDownloadStream(refresh);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'partial' | 'missing'>('all');

  const filtered = useMemo(() => {
    let list = trades;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.symbol.toLowerCase().includes(q) || t.date.includes(q));
    }
    if (statusFilter !== 'all') {
      list = list.filter((t) => t.status === statusFilter);
    }
    return list;
  }, [trades, search, statusFilter]);

  const missingTrades = useMemo(() => trades.filter((t) => t.status !== 'ready'), [trades]);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-violet-400" />
          <h1 className="text-lg font-bold text-white">TradeFinder 5-min Data</h1>
          {summary && (
            <div className="flex items-center gap-2 text-xs ml-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                {summary.readyCount} ready
              </span>
              {summary.partialCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  {summary.partialCount} partial
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400/70 border border-red-500/20 font-mono">
                {summary.missingCount} missing
              </span>
              <span className="text-slate-600">of {summary.totalTrades} trades</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-500 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search symbol or date..."
          className="flex-1 max-w-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300 focus:outline-none focus:border-violet-500"
        >
          <option value="all">All</option>
          <option value="ready">Ready</option>
          <option value="partial">Partial</option>
          <option value="missing">Missing</option>
        </select>
        {missingTrades.length > 0 && !stream.isDownloading && (
          <>
            <button
              type="button"
              onClick={() => stream.start(missingTrades.slice(0, 10))}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/30 text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Download Next 10
            </button>
            {missingTrades.length > 10 && (
              <button
                type="button"
                onClick={() => stream.start(missingTrades)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
              >
                All {missingTrades.length}
              </button>
            )}
          </>
        )}
        <span className="text-[10px] text-slate-600 ml-auto">
          {filtered.length} of {trades.length} trades
        </span>
      </div>

      {/* Download Progress */}
      <DownloadProgress {...stream} onCancel={stream.cancel} />

      {/* Trade List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading trade data status...</div>
      ) : (
        <TradeList trades={filtered} disableActions={stream.isDownloading} onRefresh={refresh} />
      )}
    </div>
  );
}
