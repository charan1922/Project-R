'use client';

import { Database, Download, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { TradeDetailSection } from './_components/trade-detail';
import type { DataStatus } from './_lib/types';

export default function BacktestPage() {
  const [status, setStatus] = useState<DataStatus | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [allTfInfo, setAllTfInfo] = useState<{
    totalSymbols: number;
    downloadedSymbols: number;
    missingSymbols: number;
  } | null>(null);
  const [downloadLog, setDownloadLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/backtest/tf-validate');
      const data = await res.json();
      if (data.success) setStatus(data.data);
    } catch {
      /* ignore */
    }
  }, []);

  const loadAllTfInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/backtest/tf-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'all-tf-trades' }),
      });
      const data = await res.json();
      if (data.success) {
        setAllTfInfo({
          totalSymbols: data.totalSymbols,
          downloadedSymbols: data.downloadedSymbols,
          missingSymbols: data.missingSymbols,
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    loadAllTfInfo();
  }, [fetchStatus, loadAllTfInfo]);

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
      if (data.success) {
        setDownloadLog(data.logs || []);
        fetchStatus();
        loadAllTfInfo();
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-3">
      {/* Compact Header + Status + Actions — single row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <Database className="w-5 h-5 text-violet-400" />
          <h1 className="text-lg font-bold text-white">TF Backtest</h1>
        </div>
        {status && (
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-500">
              EQ <span className="text-white">{status.equityRows.toLocaleString()}</span>
            </span>
            <span className="text-slate-500">
              FUT <span className="text-white">{status.futuresRows.toLocaleString()}</span>
            </span>
            <span className="text-slate-500">
              OPT <span className="text-white">{status.optionsRows.toLocaleString()}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-bold">{status.totalRows.toLocaleString()}</span>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] text-slate-600">
            {allTfInfo ? `${allTfInfo.downloadedSymbols}/${allTfInfo.totalSymbols} symbols` : '...'}
          </span>
          {allTfInfo && allTfInfo.missingSymbols > 0 && (
            <button
              type="button"
              onClick={downloadAllTF}
              disabled={downloadingAll}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 text-[11px] font-medium disabled:opacity-50"
            >
              <Download className="w-3 h-3" />
              {downloadingAll ? '...' : `${allTfInfo.missingSymbols} missing`}
            </button>
          )}
          <button
            type="button"
            onClick={fetchStatus}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-500"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>
      )}

      {/* Trade Detail Section */}
      <TradeDetailSection />

      {/* Download Log */}
      {downloadLog.length > 0 && (
        <details className="rounded-xl bg-slate-900 border border-slate-800">
          <summary className="px-4 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer">
            Download Log ({downloadLog.length} lines)
          </summary>
          <div className="px-4 py-3 max-h-48 overflow-y-auto text-xs font-mono text-slate-500 space-y-0.5">
            {downloadLog.map((line) => (
              <div key={line} className={line.includes('ERROR') ? 'text-red-400' : ''}>
                {line}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
