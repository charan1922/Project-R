'use client';

import { History, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Decision {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  symbol: string;
  rationale: string;
  suggestedEntry: number | null;
  suggestedStopLoss: number | null;
  suggestedTarget: number | null;
  timeframe: string;
  riskRewardRatio: number | null;
  modelUsed: string;
  timestamp: string;
  approved: boolean;
  rejectReason?: string;
  positionSize: number;
  capitalRequired: number;
}

export default function TradeHistoryPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'SELL' | 'HOLD'>('ALL');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'ALL' ? '/api/ai-trading/history?limit=100' : `/api/ai-trading/history?limit=100&action=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setDecisions(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
            <History className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Trade History</h1>
            <p className="text-sm text-slate-500">Past AI trading decisions and outcomes</p>
          </div>
        </div>
        <button type="button" onClick={fetchHistory} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit">
        {(['ALL', 'BUY', 'SELL', 'HOLD'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === f
                ? f === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
                  f === 'SELL' ? 'bg-red-500/20 text-red-400' :
                  f === 'HOLD' ? 'bg-slate-700 text-slate-300' :
                  'bg-sky-500/20 text-sky-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Decisions Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
      ) : decisions.length === 0 ? (
        <div className="text-center py-16 text-slate-600">
          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No decisions yet. Start the AI Autopilot to generate trade decisions.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="grid grid-cols-[100px_80px_70px_1fr_80px_80px_80px_70px] gap-2 px-4 py-2.5 bg-slate-800/50 text-[10px] text-slate-500 uppercase tracking-wider font-medium">
            <span>Time</span>
            <span>Symbol</span>
            <span>Action</span>
            <span>Rationale</span>
            <span>Entry</span>
            <span>SL</span>
            <span>Target</span>
            <span>Conf</span>
          </div>
          {decisions.map((d, i) => {
            const Icon = d.action === 'BUY' ? TrendingUp : d.action === 'SELL' ? TrendingDown : Minus;
            const color = d.action === 'BUY' ? 'text-emerald-400' : d.action === 'SELL' ? 'text-red-400' : 'text-slate-500';
            const time = new Date(d.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <div key={`${d.symbol}-${d.timestamp}-${i}`} className="grid grid-cols-[100px_80px_70px_1fr_80px_80px_80px_70px] gap-2 px-4 py-2.5 items-center border-b border-slate-800/50 text-xs hover:bg-slate-800/30">
                <span className="text-slate-500 font-mono">{time}</span>
                <span className="text-white font-semibold">{d.symbol}</span>
                <span className={`flex items-center gap-1 font-bold ${color}`}>
                  <Icon className="w-3 h-3" /> {d.action}
                </span>
                <span className="text-slate-400 truncate">{d.rationale}</span>
                <span className="font-mono text-slate-300">{d.suggestedEntry ? `₹${d.suggestedEntry.toFixed(0)}` : '—'}</span>
                <span className="font-mono text-red-400/70">{d.suggestedStopLoss ? `₹${d.suggestedStopLoss.toFixed(0)}` : '—'}</span>
                <span className="font-mono text-emerald-400/70">{d.suggestedTarget ? `₹${d.suggestedTarget.toFixed(0)}` : '—'}</span>
                <span className={d.confidence > 0.7 ? 'text-emerald-400' : d.confidence > 0.4 ? 'text-amber-400' : 'text-slate-500'}>
                  {(d.confidence * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
