'use client';

import { Check, Download, ExternalLink, X } from 'lucide-react';
import { useState } from 'react';
import type { TradeDataStatus } from '../_lib/types';

interface TradeListProps {
  trades: TradeDataStatus[];
  disableActions: boolean;
  onRefresh: () => void;
}

export function TradeList({ trades, disableActions, onRefresh }: TradeListProps) {
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const downloadSingle = async (t: TradeDataStatus) => {
    const key = `${t.symbol}|${t.date}`;
    setDownloadingKey(key);
    // 45 calendar days back ≈ 30 trading sessions (excludes weekends + holidays)
    const from = new Date(t.date);
    from.setDate(from.getDate() - 45);
    try {
      await fetch('/api/backtest/tf-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'download-symbols',
          symbols: [t.symbol],
          fromDate: from.toISOString().slice(0, 10),
          toDate: t.date,
          options: t.strike > 0 ? [{ symbol: t.symbol, optionType: t.optionType, strike: t.strike }] : [],
        }),
      });
      onRefresh();
    } catch {
      /* ignore */
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-800/50">
        {trades.map((t) => {
          const key = `${t.symbol}|${t.date}`;
          const isDownloading = downloadingKey === key;
          return (
            <div
              key={key}
              className={`px-4 py-3 flex items-center gap-4 hover:bg-slate-800/30 transition-colors ${
                t.status === 'missing' ? 'opacity-60' : ''
              }`}
            >
              {/* Left: Trade info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {t.verified && (
                    <span className="text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                      VERIFIED
                    </span>
                  )}
                  <span className="text-white font-bold text-sm">{t.symbol}</span>
                  <span
                    className={`text-xs font-medium ${t.optionType === 'CE' ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {t.optionType} {t.strike}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                  <span className="font-mono">{t.date}</span>
                  {t.verified && t.entryPrice && t.exitPrice && (
                    <span className="text-slate-600">
                      {'\u20B9'}
                      {t.entryPrice} &rarr; {'\u20B9'}
                      {t.exitPrice}
                    </span>
                  )}
                </div>
              </div>

              {/* Middle: Data status checkmarks */}
              <div className="flex items-center gap-1.5 shrink-0">
                <StatusDot label="EQ" ok={t.hasEquity} />
                <StatusDot label="FUT" ok={t.hasFutures} />
                <StatusDot label="OPT" ok={t.hasOptions} />
              </div>

              {/* Right: P&L + Action */}
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-sm font-mono font-bold min-w-[70px] text-right ${
                    t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {t.pnl >= 0 ? '+' : ''}
                  {'\u20B9'}
                  {(t.pnl / 1000).toFixed(1)}K
                </span>
                {t.status === 'ready' ? (
                  <a
                    href="/trading-lab/ai-autopilot/backtest"
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] text-violet-400 hover:text-violet-300 bg-violet-500/10 rounded border border-violet-500/20"
                  >
                    <ExternalLink className="w-3 h-3" /> View
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => downloadSingle(t)}
                    disabled={disableActions || isDownloading}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] text-amber-400 hover:text-amber-300 bg-amber-500/10 rounded border border-amber-500/20 disabled:opacity-40"
                  >
                    <Download className="w-3 h-3" />
                    {isDownloading ? '...' : 'Download'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusDot({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`flex items-center gap-0.5 text-[9px] font-mono ${ok ? 'text-emerald-400' : 'text-slate-600'}`}
      title={`${label}: ${ok ? 'available' : 'missing'}`}
    >
      {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-red-400/40" />}
      {label}
    </span>
  );
}
