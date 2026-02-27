"use client";

/**
 * Tradefinder_02 · Trade Journal
 * ─────────────────────────────────────────────────────────────────────────────
 * Architecture
 *   page.tsx          ← this file — thin orchestrator, no business logic
 *   analytics.ts      ← pure computation engine
 *   types.ts          ← shared TypeScript types
 *   utils.ts          ← formatting + classification helpers
 *   components/
 *     ui.tsx                ← shared primitives (Section, StatCard, Table…)
 *     OverallPerformance    ← section 1
 *     MonthlyBreakdown      ← section 2
 *     InstrumentAnalysis    ← section 3
 *     StockAnalysis         ← section 4
 *     ExpiryBehavior        ← section 5
 *     TimingAnalysis        ← section 6
 *     StreakAnalysis         ← section 7
 *     RiskAnalysis          ← section 8
 *     EquityCurve           ← section 9
 *     StockFrequency        ← section 10
 */

import { useMemo } from "react";
import { Activity } from "lucide-react";
import { AlertTriangle } from "lucide-react";

import tradesRaw from "@/tradefinder_platform_trades.json";
import { computeAnalytics } from "./analytics";
import type { RawTrade } from "./types";
import { pct } from "./utils";

import { OverallPerformance } from "./components/OverallPerformance";
import { MonthlyBreakdown } from "./components/MonthlyBreakdown";
import { InstrumentAnalysis } from "./components/InstrumentAnalysis";
import { StockAnalysis } from "./components/StockAnalysis";
import { ExpiryBehavior } from "./components/ExpiryBehavior";
import { TimingAnalysis } from "./components/TimingAnalysis";
import { StreakAnalysis } from "./components/StreakAnalysis";
import { RiskAnalysis } from "./components/RiskAnalysis";
import { EquityCurve } from "./components/EquityCurve";
import { StockFrequency } from "./components/StockFrequency";
import { StockFilter } from "./components/StockFilter";

export default function TradeJournalPage() {
    const trades = (tradesRaw as { trades: RawTrade[] }).trades;

    // All heavy computation is isolated in the analytics engine.
    // useMemo ensures it only runs once per mount.
    const data = useMemo(() => computeAnalytics(trades), [trades]);

    const stocksByCount = useMemo(
        () => [...data.stockList].sort((a, b) => b.count - a.count),
        [data.stockList],
    );

    const profitFactor = data.grossLoss > 0
        ? data.grossProfit / data.grossLoss
        : Infinity;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            {/* ── Page Header ───────────────────────────────────────────────────────── */}
            <div className="px-6 pt-8 pb-6 border-b border-slate-800/60">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-600/20 border border-sky-500/30 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-sky-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            Tradefinder_02 · Trade Journal
                        </h1>
                        <p className="text-sm text-slate-500">
                            Sensibull · Upstox · Dec 2024 – Feb 2026 ·{" "}
                            {data.actual.length} trades analysed
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Sections ──────────────────────────────────────────────────────────── */}
            <div className="px-6 py-6 space-y-5 max-w-7xl mx-auto">
                <StockFilter stockList={data.stockList} />
                <OverallPerformance data={data} sortedStocksByCount={stocksByCount} />
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
                            Win rate{" "}
                            <span className="text-white font-semibold">
                                {pct((data.wins.length / data.actual.length) * 100)}
                            </span>{" "}
                            across{" "}
                            <span className="text-white font-semibold">{data.actual.length}</span> trades.
                            Profit factor{" "}
                            <span className="text-white font-semibold">
                                {profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)}
                            </span>
                            {profitFactor > 2
                                ? " — excellent risk-adjusted returns."
                                : profitFactor > 1.5
                                    ? " — solid performance."
                                    : " — marginal edge."}
                            {" "}Longest win streak:{" "}
                            <span className="text-emerald-400 font-semibold">{data.maxWin}</span>, longest loss streak:{" "}
                            <span className="text-red-400 font-semibold">{data.maxLoss}</span>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
