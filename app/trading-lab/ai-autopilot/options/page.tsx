'use client';

import { Bot, Search, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type { OptionExecutableDecision } from '@/lib/ai-trading/types';
import type { ResolvedOption } from '@/lib/ai-trading/option-resolver';

interface CycleResult {
  timestamp: string;
  marketOpen: boolean;
  dailyPickLocked: boolean;
  lockedSymbol: string | null;
  candidatesScanned: number;
  pick: OptionExecutableDecision | null;
  resolvedOption: ResolvedOption | null;
  error: string | null;
}

export default function OptionTraderPage() {
  const [result, setResult] = useState<CycleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runScan = async (reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-trading/options/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capital: 500000, reset }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const pick = result?.pick;
  const option = result?.resolvedOption;
  const isBull = pick?.optionType === 'CE';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Bot className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Option Trader</h1>
            <p className="text-sm text-slate-500">
              AI picks top R-Factor stock + ATM option (CE/PE) based on ADX direction
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => runScan(true)}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
          >
            Reset Pick
          </button>
          <button
            type="button"
            onClick={() => runScan(false)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/30 text-sm font-medium"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>
      </div>

      {/* Paper Mode Banner */}
      <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 text-center">
        Paper Trading Mode — decisions are logged but NOT executed
      </div>

      {/* Error */}
      {(error || result?.error) && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error || result?.error}
        </div>
      )}

      {/* Status */}
      {result && !result.error && !pick && (
        <div className="text-center py-8 text-slate-500 text-sm">
          Scanned {result.candidatesScanned} candidates — no actionable pick found.
          {result.dailyPickLocked && ` Already picked ${result.lockedSymbol} today.`}
        </div>
      )}

      {/* Today's Pick */}
      {pick && option && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          {/* Header */}
          <div className={`px-5 py-4 ${isBull ? 'bg-emerald-500/5 border-b border-emerald-500/20' : 'bg-red-500/5 border-b border-red-500/20'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isBull ? (
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-400" />
                )}
                <div>
                  <div className="text-xl font-bold text-white">
                    {pick.symbol} {pick.optionType} {pick.strikePrice}
                  </div>
                  <div className="text-xs text-slate-500">{option.optionSymbol}</div>
                </div>
                <span className={`px-2 py-1 text-xs font-bold rounded ${isBull ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {isBull ? 'BULLISH' : 'BEARISH'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">AI Confidence</div>
                <div className={`text-lg font-bold ${pick.confidence > 0.7 ? 'text-emerald-400' : pick.confidence > 0.4 ? 'text-amber-400' : 'text-red-400'}`}>
                  {(pick.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="px-5 py-4 grid grid-cols-4 gap-4">
            <Detail label="Spot Price" value={`₹${option.spotPrice.toFixed(1)}`} />
            <Detail label="Strike" value={`${option.strikePrice} ${pick.optionType}`} />
            <Detail label="Premium" value={`₹${option.optionPrice.toFixed(1)}`} />
            <Detail label="Lot Size" value={`${option.lotSize}`} />
            <Detail label="Lots" value={`${pick.positionSize}`} />
            <Detail label="Quantity" value={`${pick.quantity}`} />
            <Detail label="Total Cost" value={`₹${pick.totalCost.toLocaleString()}`} />
            <Detail label="Est. Charges" value={`₹${pick.estimatedCharges.toFixed(0)}`} />
            <Detail label="Expiry" value={option.expiryDate} />
            <Detail label="DTE" value={`${option.dte} days`} />
            <Detail label="R-Factor" value={pick.symbol} sub={`conf ${(pick.confidence * 100).toFixed(0)}%`} />
            <Detail label="Timeframe" value={pick.timeframe} />
          </div>

          {/* Entry/SL/Target */}
          {(pick.suggestedEntry || pick.suggestedStopLoss || pick.suggestedTarget) && (
            <div className="px-5 py-3 bg-slate-800/30 border-t border-slate-800/50 flex gap-6 text-sm">
              {pick.suggestedEntry && <span className="text-slate-400">Entry: <span className="text-white font-mono">₹{pick.suggestedEntry.toFixed(1)}</span></span>}
              {pick.suggestedStopLoss && <span className="text-slate-400">SL: <span className="text-red-400 font-mono">₹{pick.suggestedStopLoss.toFixed(1)}</span></span>}
              {pick.suggestedTarget && <span className="text-slate-400">Target: <span className="text-emerald-400 font-mono">₹{pick.suggestedTarget.toFixed(1)}</span></span>}
              {pick.riskRewardRatio && <span className="text-slate-400">R:R <span className="text-white font-mono">{pick.riskRewardRatio.toFixed(1)}</span></span>}
            </div>
          )}

          {/* AI Rationale */}
          <div className="px-5 py-3 border-t border-slate-800/50 text-xs text-slate-500">
            <span className="text-slate-400 font-medium">AI:</span> {pick.rationale}
          </div>

          {/* Execute Button */}
          <div className="px-5 py-3 border-t border-slate-800/50 flex justify-end">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm font-medium cursor-not-allowed opacity-70"
              disabled
              title="Paper mode — execution coming soon"
            >
              Execute (Paper)
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !result && !error && (
        <div className="text-center py-16 text-slate-600">
          <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Click Scan Now to find today's option trade</p>
          <p className="text-xs text-slate-700 mt-2">
            Pipeline: R-Factor → ADX direction → ATM strike → AI analysis → risk check
          </p>
          <p className="text-xs text-slate-700 mt-1">
            Requires: AI_GATEWAY_API_KEY + master contracts synced (including OPTSTK)
          </p>
        </div>
      )}

      {/* How It Works */}
      <div className="rounded-lg bg-slate-900/50 border border-slate-800/50 px-4 py-3 text-[10px] text-slate-600 leading-relaxed space-y-1">
        <p><span className="text-slate-400">Strategy:</span> Buy ATM CE (bullish) or PE (bearish) on the top R-Factor stock with ADX trend confirmation.</p>
        <p><span className="text-slate-400">Selection:</span> R-Factor {'>'} 2.0 + ADX {'>'} 28 + |%change| {'>'} 1%. One stock per day.</p>
        <p><span className="text-slate-400">Direction:</span> +DI {'>'} -DI = buy CE (call). -DI {'>'} +DI = buy PE (put).</p>
        <p><span className="text-slate-400">Strike:</span> ATM (nearest to spot). Monthly expiry with 7+ DTE.</p>
        <p><span className="text-slate-400">Risk:</span> Max premium ₹500/unit. Max 2% capital per trade. Option buying = max loss is premium paid.</p>
      </div>
    </div>
  );
}

function Detail({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500 uppercase">{label}</div>
      <div className="text-sm font-mono text-white">{value}</div>
      {sub && <div className="text-[9px] text-slate-600">{sub}</div>}
    </div>
  );
}
