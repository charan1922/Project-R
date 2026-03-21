'use client';

import { Bot, Play, Square, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExecutableDecision, RiskConfig, TradeSignal } from '@/lib/ai-trading/types';
import { DEFAULT_RISK_CONFIG } from '@/lib/ai-trading/types';

interface AnalysisResult {
  signal: TradeSignal;
  decision: ExecutableDecision;
}

export default function AIAutopilotPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config] = useState<RiskConfig>(DEFAULT_RISK_CONFIG);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-trading/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topN: 10 }),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.results);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (e) {
      setError(`Network error: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const startAutopilot = () => {
    setIsRunning(true);
    runAnalysis();
    intervalRef.current = setInterval(runAnalysis, 60_000); // Every 60s
  };

  const stopAutopilot = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const actionableResults = results.filter((r) => r.decision.action !== 'HOLD');
  const holdResults = results.filter((r) => r.decision.action === 'HOLD');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Bot className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              AI Autopilot
              {config.paperTrading && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
                  Paper Mode
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500">
              AI-powered trading decisions using R-Factor + ADX signals via DeepSeek
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={isRunning ? stopAutopilot : startAutopilot}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
            isRunning
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
          }`}
        >
          {isRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isRunning ? 'Stop' : 'Start'}
        </button>
      </div>

      {/* Config Summary */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Entry Window', value: `${config.entryWindowStart} - ${config.entryWindowEnd}` },
          { label: 'Exit Mode', value: config.exitMode === 'fixed-profit' ? `₹${config.fixedProfitTarget.toLocaleString()} profit` : config.exitMode },
          { label: 'Min R-Factor', value: config.minRFactorThreshold.toFixed(1) },
          { label: 'Min ADX', value: `${config.minADXThreshold}+` },
          { label: 'Max Positions', value: config.maxOpenPositions.toString() },
        ].map((item) => (
          <div key={item.label} className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-500 uppercase">{item.label}</div>
            <div className="text-sm font-mono text-white mt-0.5">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-slate-500 text-sm">
          Analyzing top stocks with AI...
        </div>
      )}

      {/* Actionable Decisions */}
      {actionableResults.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-emerald-400 uppercase tracking-wider">
            Actionable ({actionableResults.length})
          </h2>
          {actionableResults.map((r) => (
            <DecisionCard key={r.signal.symbol} result={r} />
          ))}
        </div>
      )}

      {/* Hold Decisions */}
      {holdResults.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
            Hold / Monitoring ({holdResults.length})
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {holdResults.map((r) => (
              <div
                key={r.signal.symbol}
                className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800/50 text-xs"
              >
                <span className="font-semibold text-slate-400">{r.signal.symbol}</span>
                <span className="text-slate-600 ml-2">R={r.signal.rFactor.toFixed(2)}</span>
                <span className="text-slate-600 ml-2">ADX={r.signal.adx ?? '—'}</span>
                <p className="text-slate-600 mt-1 truncate">{r.decision.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && !error && (
        <div className="text-center py-16 text-slate-600">
          <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Click Start to begin AI analysis of top R-Factor stocks</p>
          <p className="text-xs text-slate-700 mt-1">
            Uses DeepSeek via Vercel AI Gateway. Requires AI_GATEWAY_API_KEY in .env.local
          </p>
        </div>
      )}
    </div>
  );
}

function DecisionCard({ result }: { result: AnalysisResult }) {
  const { signal, decision } = result;
  const isBuy = decision.action === 'BUY';
  const isSell = decision.action === 'SELL';
  const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;
  const color = isBuy ? 'emerald' : isSell ? 'red' : 'slate';

  return (
    <div className={`rounded-xl bg-slate-900 border border-${color}-500/20 overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-md bg-${color}-500/10`}>
            <Icon className={`w-5 h-5 text-${color}-400`} />
          </div>
          <div>
            <span className="text-white font-bold">{signal.symbol}</span>
            <span className="text-slate-500 text-xs ml-2">{signal.sector}</span>
          </div>
          <span className={`px-2 py-0.5 text-xs font-bold rounded bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`}>
            {decision.action}
          </span>
          <span className="text-xs text-slate-500">
            Confidence: <span className={decision.confidence > 0.7 ? 'text-emerald-400' : 'text-amber-400'}>{(decision.confidence * 100).toFixed(0)}%</span>
          </span>
        </div>
        <div className="text-right text-xs">
          <div className="text-slate-500">{decision.timeframe}</div>
          {decision.approved && !decision.rejectReason?.includes('PAPER') && (
            <span className="text-emerald-400 font-bold">APPROVED</span>
          )}
          {decision.rejectReason?.includes('PAPER') && (
            <span className="text-amber-400">PAPER MODE</span>
          )}
          {!decision.approved && !decision.rejectReason?.includes('PAPER') && (
            <span className="text-red-400">{decision.rejectReason}</span>
          )}
        </div>
      </div>

      <div className="px-4 py-3 grid grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-500 block">R-Factor</span>
          <span className="text-white font-mono">{signal.rFactor.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-slate-500 block">ADX</span>
          <span className={`font-mono ${(signal.adx ?? 0) >= 28 ? 'text-amber-400 font-bold' : 'text-white'}`}>
            {signal.adx?.toFixed(0) ?? '—'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">OI Level</span>
          <span className={`font-mono ${signal.oiLevel > 1.15 ? 'text-violet-400' : 'text-white'}`}>
            {signal.oiLevel.toFixed(3)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Regime</span>
          <span className="text-white">{signal.regime}</span>
        </div>
      </div>

      {(decision.suggestedEntry || decision.suggestedStopLoss || decision.suggestedTarget) && (
        <div className="px-4 py-2 bg-slate-800/30 border-t border-slate-800/50 flex gap-6 text-xs">
          {decision.suggestedEntry && (
            <span>Entry: <span className="text-white font-mono">₹{decision.suggestedEntry.toFixed(1)}</span></span>
          )}
          {decision.suggestedStopLoss && (
            <span>SL: <span className="text-red-400 font-mono">₹{decision.suggestedStopLoss.toFixed(1)}</span></span>
          )}
          {decision.suggestedTarget && (
            <span>Target: <span className="text-emerald-400 font-mono">₹{decision.suggestedTarget.toFixed(1)}</span></span>
          )}
          {decision.riskRewardRatio && (
            <span>R:R <span className="text-white font-mono">{decision.riskRewardRatio.toFixed(1)}</span></span>
          )}
        </div>
      )}

      <div className="px-4 py-2 border-t border-slate-800/50 text-xs text-slate-500">
        {decision.rationale}
      </div>
    </div>
  );
}
