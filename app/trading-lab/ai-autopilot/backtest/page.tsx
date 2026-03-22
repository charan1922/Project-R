'use client';

import { Database, ExternalLink, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { TradeDetailSection } from './_components/trade-detail';
import type { DataStatus } from './_lib/types';

export default function BacktestPage() {
  const [status, setStatus] = useState<DataStatus | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/backtest/tf-validate');
      const data = await res.json();
      if (data.success) setStatus(data.data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-3">
      {/* Compact Header */}
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
          <a
            href="/trading-lab/ai-autopilot/backtest/data"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 text-[11px] font-medium"
          >
            <ExternalLink className="w-3 h-3" /> Manage Data
          </a>
          <button
            type="button"
            onClick={fetchStatus}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-500"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Trade Detail Section */}
      <TradeDetailSection />
    </div>
  );
}
