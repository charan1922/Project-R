'use client';

/**
 * Tradefinder_02 · Trade Journal
 * ─────────────────────────────────────────────────────────────────────────────
 * Architecture
 *   page.tsx          ← this file — thin orchestrator, no business logic
 *   analytics.ts      ← pure computation engine
 *   types.ts          ← shared TypeScript types
 *   utils.ts          ← formatting + classification helpers
 *   components/       ← section components (1–13)
 *
 * Data is fetched from /api/tradefinder/trades (reads JSON from disk).
 * Update the JSON file → refresh page → new data.
 */

import { Activity, AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { computeAnalytics } from './analytics';
import { CapitalROI } from './components/CapitalROI';
import { EquityCurve } from './components/EquityCurve';
import { ExpiryBehavior } from './components/ExpiryBehavior';
import { HoldingTime } from './components/HoldingTime';
import { InstrumentAnalysis } from './components/InstrumentAnalysis';
import { MonthlyBreakdown } from './components/MonthlyBreakdown';
import { OverallPerformance } from './components/OverallPerformance';
import { PositionSizing } from './components/PositionSizing';
import { RiskAnalysis } from './components/RiskAnalysis';
import { StockAnalysis } from './components/StockAnalysis';
import { StockFilter } from './components/StockFilter';
import { StockFrequency } from './components/StockFrequency';
import { StreakAnalysis } from './components/StreakAnalysis';
import { TimingAnalysis } from './components/TimingAnalysis';
import type { RawTrade } from './types';
import { fmtROI, pct } from './utils';

export default function TradeJournalPage() {
  const [trades, setTrades] = useState<RawTrade[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/tradefinder/trades')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const arr: RawTrade[] = d.data.trades ?? d.data;
          setTrades(arr);
        } else {
          setError(d.error ?? 'Failed to load trades');
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  const data = useMemo(() => (trades ? computeAnalytics(trades) : null), [trades]);

  const stocksByCount = useMemo(() => (data ? [...data.stockList].sort((a, b) => b.count - a.count) : []), [data]);

  // Loading state
  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        {error ? (
          <div className="text-center">
            <p className="text-red-400 text-lg font-semibold">Failed to load trades</p>
            <p className="text-slate-500 text-sm mt-2">{error}</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading trade data...</span>
          </div>
        )}
      </div>
    );
  }

  const profitFactor = data.grossLoss > 0 ? data.grossProfit / data.grossLoss : Infinity;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="px-6 pt-8 pb-6 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-600/20 border border-sky-500/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Tradefinder_02 · Trade Journal</h1>
            <p className="text-sm text-slate-500">
              {data.humanReviewedCount > 0 && `${data.humanReviewedCount} trades verified · `}
              {data.actual.length} trades analysed
            </p>
          </div>
        </div>
      </div>

      {/* ── Sections ──────────────────────────────────────────────────────────── */}
      <div className="px-6 py-6 space-y-5 max-w-7xl mx-auto">
        <StockFilter stockList={data.stockList} />
        <OverallPerformance data={data} sortedStocksByCount={stocksByCount} />
        <CapitalROI data={data} />
        <HoldingTime data={data} />
        <PositionSizing data={data} />
        <MonthlyBreakdown data={data} />
        <InstrumentAnalysis data={data} />
        <StockAnalysis stockList={data.stockList} />
        <ExpiryBehavior data={data} />
        <TimingAnalysis data={data} />
        <StreakAnalysis data={data} />
        <RiskAnalysis data={data} />
        <EquityCurve data={data} />
        <StockFrequency stockList={data.stockList} />

        {/* ── Insight Footer ────────────────────────────────────────────────── */}
        <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-slate-400">
              <span className="text-amber-400 font-semibold">Key Insights: </span>
              Win rate{' '}
              <span className="text-white font-semibold">{pct((data.wins.length / data.actual.length) * 100)}</span>{' '}
              across <span className="text-white font-semibold">{data.actual.length}</span> trades. Avg ROI{' '}
              <span className="text-emerald-400 font-semibold">{fmtROI(data.capitalAnalysis.avgROIPerTrade)}</span> per
              trade on{' '}
              <span className="text-white font-semibold">
                {Math.round(data.capitalAnalysis.avgCapitalPerTrade / 1000)}K
              </span>{' '}
              avg capital. Profit factor{' '}
              <span className="text-white font-semibold">
                {profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}
              </span>
              {profitFactor > 2
                ? ' — excellent risk-adjusted returns.'
                : profitFactor > 1.5
                  ? ' — solid performance.'
                  : ' — marginal edge.'}{' '}
              Longest win streak: <span className="text-emerald-400 font-semibold">{data.maxWin}</span>, longest loss
              streak: <span className="text-red-400 font-semibold">{data.maxLoss}</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
