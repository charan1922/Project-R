'use client';

import { Database, Download, Play, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface DataStatus {
  equityRows: number;
  futuresRows: number;
  optionsRows: number;
  totalRows: number;
  hasData: boolean;
}

interface BacktestResult {
  date: string;
  tfStock: string; tfCePe: string; tfStrike: number; tfPnl: number;
  ourTopStock: string; ourRank: number; ourSpread: number;
  ourDirection: string; ourADX: number;
  stockMatch: boolean; directionMatch: boolean; tfInTop10: boolean;
  entryTime: string; entryPrice: number;
  exitTime: string; exitPrice: number; exitReason: string;
  lotSize: number; grossPnl: number; charges: number; netPnl: number;
  profitable: boolean;
}

interface BacktestSummary {
  totalTrades: number;
  stockMatchCount: number; directionMatchCount: number; tfInTop10Count: number;
  ourWins: number; ourLosses: number;
  ourTotalPnl: number; ourAvgWin: number; ourAvgLoss: number;
  tfTotalPnl: number; tfWinRate: number;
}

export default function BacktestPage() {
  const [status, setStatus] = useState<DataStatus | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [backtesting, setBacktesting] = useState(false);
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [summary, setSummary] = useState<BacktestSummary | null>(null);
  const [downloadLog, setDownloadLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/backtest/tf-validate');
      const data = await res.json();
      if (data.success) setStatus(data.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const startDownload = async () => {
    setDownloading(true);
    setDownloadLog([]);
    setError(null);
    try {
      const res = await fetch('/api/backtest/tf-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download' }),
      });
      const data = await res.json();
      if (data.success) { setDownloadLog(data.logs || []); fetchStatus(); }
      else setError(data.error);
    } catch (e) { setError((e as Error).message); }
    finally { setDownloading(false); }
  };

  const [downloadingAll, setDownloadingAll] = useState(false);
  const [allTfInfo, setAllTfInfo] = useState<{ totalSymbols: number; downloadedSymbols: number; missingSymbols: number } | null>(null);

  const loadAllTfInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/backtest/tf-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'all-tf-trades' }),
      });
      const data = await res.json();
      if (data.success) setAllTfInfo({ totalSymbols: data.totalSymbols, downloadedSymbols: data.downloadedSymbols, missingSymbols: data.missingSymbols });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadAllTfInfo(); }, [loadAllTfInfo]);

  const downloadAllTF = async () => {
    setDownloadingAll(true);
    setError(null);
    try {
      const res = await fetch('/api/backtest/tf-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download-all-tf' }),
      });
      const data = await res.json();
      if (data.success) { setDownloadLog(data.logs || []); fetchStatus(); loadAllTfInfo(); }
      else setError(data.error);
    } catch (e) { setError((e as Error).message); }
    finally { setDownloadingAll(false); }
  };

  const runBacktest = async () => {
    setBacktesting(true);
    setError(null);
    try {
      const res = await fetch('/api/backtest/tf-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backtest' }),
      });
      const data = await res.json();
      if (data.success) { setResults(data.results); setSummary(data.summary); }
      else setError(data.error);
    } catch (e) { setError((e as Error).message); }
    finally { setBacktesting(false); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Database className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">TF Trade Backtest</h1>
            <p className="text-sm text-slate-500">Replay 5-min data and validate signals against TradeFinder's 20 trades</p>
          </div>
        </div>
        <button type="button" onClick={fetchStatus} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Data Status */}
      {status && (
        <div className="grid grid-cols-4 gap-3">
          <StatusCard label="Equity 5-min" value={status.equityRows.toLocaleString()} />
          <StatusCard label="Futures 5-min" value={status.futuresRows.toLocaleString()} />
          <StatusCard label="Options 5-min" value={status.optionsRows.toLocaleString()} />
          <StatusCard label="Total" value={status.totalRows.toLocaleString()} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" onClick={startDownload} disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-sm font-medium disabled:opacity-50">
          <Download className="w-4 h-4" /> {downloading ? 'Downloading...' : 'Download Top 20'}
        </button>
        <button type="button" onClick={downloadAllTF} disabled={downloadingAll}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 text-sm font-medium disabled:opacity-50">
          <Download className="w-4 h-4" /> {downloadingAll ? 'Downloading All...' : `Download All TF (${allTfInfo ? `${allTfInfo.missingSymbols} missing` : '...'})`}
        </button>
        <button type="button" onClick={runBacktest} disabled={backtesting || !status?.hasData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/30 text-sm font-medium disabled:opacity-50">
          <Play className="w-4 h-4" /> {backtesting ? 'Running...' : 'Run Backtest'}
        </button>
        {allTfInfo && (
          <span className="text-xs text-slate-600">
            {allTfInfo.downloadedSymbols}/{allTfInfo.totalSymbols} symbols downloaded
          </span>
        )}
      </div>

      {error && <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-6 gap-3">
          <SummaryCard label="Our Total P&L" value={`₹${summary.ourTotalPnl.toLocaleString()}`} color={summary.ourTotalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'} />
          <SummaryCard label="TF Total P&L" value={`₹${summary.tfTotalPnl.toLocaleString()}`} color="text-emerald-400" />
          <SummaryCard label="Our Win Rate" value={`${summary.ourWins}/${summary.totalTrades}`} color={summary.ourWins > summary.ourLosses ? 'text-emerald-400' : 'text-amber-400'} />
          <SummaryCard label="Stock Match" value={`${summary.stockMatchCount}/${summary.totalTrades}`} color="text-sky-400" />
          <SummaryCard label="Dir Match" value={`${summary.directionMatchCount}/${summary.totalTrades}`} color="text-sky-400" />
          <SummaryCard label="TF in Top 10" value={`${summary.tfInTop10Count}/${summary.totalTrades}`} color="text-violet-400" />
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden overflow-x-auto">
          <div className="grid grid-cols-[90px_100px_50px_70px_100px_50px_60px_55px_55px_55px_65px_70px] gap-1 px-4 py-2 bg-slate-800/50 text-[9px] text-slate-500 uppercase tracking-wider font-medium min-w-[900px]">
            <span>Date</span>
            <span>TF Stock</span>
            <span>TF</span>
            <span>TF P&L</span>
            <span>Our #1</span>
            <span>Dir</span>
            <span>Match</span>
            <span>Entry</span>
            <span>Exit</span>
            <span>Reason</span>
            <span>Our P&L</span>
            <span>Net P&L</span>
          </div>
          {results.map((r) => (
            <div key={r.date} className={`grid grid-cols-[90px_100px_50px_70px_100px_50px_60px_55px_55px_55px_65px_70px] gap-1 px-4 py-2 items-center border-b border-slate-800/50 text-xs min-w-[900px] ${r.profitable ? '' : 'bg-red-500/5'}`}>
              <span className="text-slate-400 font-mono">{r.date.slice(5)}</span>
              <span className="text-white font-semibold">{r.tfStock}</span>
              <span className={r.tfCePe === 'CE' ? 'text-emerald-400' : 'text-red-400'}>{r.tfCePe}</span>
              <span className={`font-mono ${r.tfPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{r.tfPnl >= 0 ? '+' : ''}{(r.tfPnl / 1000).toFixed(1)}K</span>
              <span className={`${r.stockMatch ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                {r.ourTopStock} <span className="text-slate-600 text-[9px]">#{r.ourRank}</span>
              </span>
              <span className={r.directionMatch ? 'text-emerald-400' : 'text-red-400'}>{r.ourDirection}</span>
              <span>
                {r.stockMatch && <span className="text-emerald-400 text-[9px]">STOCK </span>}
                {r.directionMatch && <span className="text-sky-400 text-[9px]">DIR </span>}
                {r.tfInTop10 && <span className="text-violet-400 text-[9px]">T10</span>}
              </span>
              <span className="font-mono text-slate-300">{r.entryPrice > 0 ? `₹${r.entryPrice.toFixed(0)}` : '—'}</span>
              <span className="font-mono text-slate-300">{r.exitPrice > 0 ? `₹${r.exitPrice.toFixed(0)}` : '—'}</span>
              <span className="text-[9px] text-slate-500">{r.exitReason}</span>
              <span className={`font-mono ${r.grossPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{r.grossPnl >= 0 ? '+' : ''}{(r.grossPnl / 1000).toFixed(1)}K</span>
              <span className={`font-mono font-bold ${r.netPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{r.netPnl >= 0 ? '+' : ''}{(r.netPnl / 1000).toFixed(1)}K</span>
            </div>
          ))}
        </div>
      )}

      {/* Download Log */}
      {downloadLog.length > 0 && (
        <details className="rounded-xl bg-slate-900 border border-slate-800">
          <summary className="px-4 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer">
            Download Log ({downloadLog.length} lines)
          </summary>
          <div className="px-4 py-3 max-h-48 overflow-y-auto text-xs font-mono text-slate-500 space-y-0.5">
            {downloadLog.map((line, i) => (
              <div key={i} className={line.includes('ERROR') ? 'text-red-400' : ''}>{line}</div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-center">
      <div className="text-[10px] text-slate-500 uppercase">{label}</div>
      <div className="text-sm font-bold font-mono text-white mt-0.5">{value}</div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-center">
      <div className="text-[10px] text-slate-500 uppercase">{label}</div>
      <div className={`text-lg font-bold font-mono mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}
