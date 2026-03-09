"use client";

import { useMemo, useState } from "react";
import { Search, Filter, CheckCircle2, Circle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import fnoData from "../../../lib/data/fno_stocks_list.json";
import tradesRaw from "@/tradefinder_platform_trades.json";
import type { RawTrade } from "@/app/trading-lab/tradefinder/types";
import { computeAnalytics } from "@/app/trading-lab/tradefinder/analytics";
import { fmt, pct } from "@/app/trading-lab/tradefinder/utils";
import { PnLCell } from "@/app/trading-lab/tradefinder/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "all" | "traded" | "untraded";

const TIER_CONFIG = {
    "A+": { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
    "A": { bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/30" },
    "B": { bg: "bg-indigo-500/15", text: "text-indigo-400", border: "border-indigo-500/30" },
    "C": { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
    "D": { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" },
} as const;

function getReason(stats: any) {
    if (stats.tier === "A+") return `Elite: ${stats.winRate.toFixed(0)}% win rate across ${stats.count} trades with strong avg return.`;
    if (stats.tier === "A") return `Strong: Solid ${stats.winRate.toFixed(0)}% win rate and positive expectancy.`;
    if (stats.tier === "B") return `Decent: ${stats.count} trades logged. Acceptable metrics but needs larger sample.`;
    if (stats.tier === "C") return `Marginal: Low win rate (${stats.winRate.toFixed(0)}%) or very small sample.`;
    return `Avoid: Consistent losses or sub-40% win rate.`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FnOUniversePage() {
    const [tab, setTab] = useState<Tab>("all");
    const [search, setSearch] = useState("");
    const [tierFilter, setTierFilter] = useState<string>("All");

    const trades = (tradesRaw as { trades: RawTrade[] }).trades;
    const analytics = useMemo(() => computeAnalytics(trades), [trades]);

    // Build a lookup: NSE symbol → StockStats (from Tradefinder data)
    const tradedMap = useMemo(() => {
        const m = new Map(analytics.stockList.map(s => [s.name.toUpperCase(), s]));
        return m;
    }, [analytics.stockList]);

    // Full universe with enrichment — optimized with pre-caching
    const universe = useMemo(() => {
        // De-duplicate the raw F&O list to prevent React key rendering bugs
        const uniqueFnoStocks = Array.from(new Set(fnoData.stocks.map(s => s.toUpperCase())));

        const all = uniqueFnoStocks.map(symbol => {
            const stats = tradedMap.get(symbol) ?? null;
            return { symbol, symbolUpper: symbol, stats, traded: stats !== null, isLegacy: false };
        });

        // Also add stocks from Tradefinder that aren't in the official F&O list
        const inList = new Set(uniqueFnoStocks);
        analytics.stockList.forEach(s => {
            const symUpper = s.name.toUpperCase();
            if (!inList.has(symUpper)) {
                all.push({ symbol: s.name, symbolUpper: symUpper, stats: s, traded: true, isLegacy: true });
            }
        });
        return all;
    }, [tradedMap, analytics.stockList]);

    // Apply filters — optimized O(N) string search using cached upper symbols
    const filtered = useMemo(() => {
        const q = search.toUpperCase().trim();
        return universe.filter(u => {
            if (tab === "traded" && !u.traded) return false;
            if (tab === "untraded" && u.traded) return false;
            if (q && !u.symbolUpper.includes(q)) return false;
            if (tierFilter !== "All") {
                if (!u.stats || u.stats.tier !== tierFilter) return false;
            }
            return true;
        });
    }, [universe, tab, search, tierFilter]);

    const totalFno = universe.length;
    const traded = universe.filter(u => u.traded).length;
    const untraded = totalFno - traded;
    const coverage = totalFno > 0 ? (traded / totalFno) * 100 : 0;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            {/* Header */}
            <div className="px-6 pt-8 pb-6 border-b border-slate-800/60">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-violet-500/30 flex items-center justify-center">
                        <Filter className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">F&O Universe · Stock Browser</h1>
                        <p className="text-sm text-slate-500">
                            All NSE F&O eligible stocks · Filtered through Tradefinder_02's verified trade history
                        </p>
                    </div>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">F&O Universe</div>
                        <div className="text-2xl font-bold text-white">{totalFno}</div>
                        <div className="text-xs text-slate-500">eligible stocks</div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                        <div className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Traded by TF02</div>
                        <div className="text-2xl font-bold text-emerald-400">{traded}</div>
                        <div className="text-xs text-slate-500">{pct(coverage)} of universe</div>
                    </div>
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
                        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Not Yet Traded</div>
                        <div className="text-2xl font-bold text-slate-300">{untraded}</div>
                        <div className="text-xs text-slate-500">unexplored stocks</div>
                    </div>
                    <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3">
                        <div className="text-xs text-sky-400 uppercase tracking-wider mb-1">Total P&L</div>
                        <div className="text-xl font-bold text-emerald-400">{fmt(analytics.totalPnl)}</div>
                        <div className="text-xs text-slate-500">across {analytics.actual.length} trades</div>
                    </div>
                </div>
            </div>

            <div className="px-6 py-5 max-w-7xl mx-auto">
                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit mb-5">
                    {([
                        { key: "all", label: `All (${totalFno})` },
                        { key: "traded", label: `Traded (${traded})` },
                        { key: "untraded", label: `Not Traded (${untraded})` },
                    ] as { key: Tab; label: string }[]).map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t.key
                                ? "bg-slate-700 text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-200"
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-3 mb-4">
                    <div className="relative flex-1 min-w-44">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search symbol..."
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                        />
                    </div>
                    {tab !== "untraded" && (
                        <select
                            value={tierFilter}
                            onChange={e => setTierFilter(e.target.value)}
                            className="px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-violet-500"
                        >
                            <option value="All">All Tiers</option>
                            <option value="A+">A+ (Elite)</option>
                            <option value="A">A (Strong)</option>
                            <option value="B">B (Decent)</option>
                            <option value="C">C (Marginal)</option>
                            <option value="D">D (Avoid)</option>
                        </select>
                    )}
                </div>

                <p className="text-xs text-slate-500 mb-3">
                    Showing <span className="text-white font-semibold">{filtered.length}</span> stocks
                </p>

                {/* Stock Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filtered.map(({ symbol, stats, traded: isTr, isLegacy }) => {
                        if (!isTr) {
                            return (
                                <div key={symbol} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center gap-3 hover:border-slate-700 transition-colors">
                                    <Circle className="w-4 h-4 text-slate-700 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-mono font-semibold text-slate-400 truncate">{symbol}</div>
                                        <div className="text-xs text-slate-600 mt-0.5">Not yet traded</div>
                                    </div>
                                </div>
                            );
                        }

                        if (!stats) return null;
                        const cfg = TIER_CONFIG[stats.tier];

                        return (
                            <div
                                key={symbol}
                                className={`${cfg.bg} border ${cfg.border} rounded-lg p-3 hover:opacity-90 transition-all`}
                            >
                                {/* Header row */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <CheckCircle2 className={`w-4 h-4 ${cfg.text} shrink-0`} />
                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                            <span className="text-sm font-mono font-bold text-white truncate">{symbol}</span>
                                            {isLegacy && (
                                                <span className="px-1 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[9px] font-bold shrink-0 leading-none">
                                                    LEGACY/INDEX
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${cfg.bg} ${cfg.text} border ${cfg.border} shrink-0`}>
                                        {stats.tier}
                                    </span>
                                </div>

                                {/* Score bar */}
                                <div className="flex items-center gap-2 mb-2.5">
                                    <div className="flex-1 h-1 bg-slate-700/50 rounded-full">
                                        <div
                                            className={`h-1 rounded-full ${stats.compositeScore >= 80 ? "bg-emerald-500" :
                                                stats.compositeScore >= 65 ? "bg-sky-500" :
                                                    stats.compositeScore >= 50 ? "bg-indigo-500" :
                                                        stats.compositeScore >= 35 ? "bg-amber-500" : "bg-red-500"
                                                }`}
                                            style={{ width: `${stats.compositeScore}%` }}
                                        />
                                    </div>
                                    <span className={`text-xs font-bold ${cfg.text}`}>{stats.compositeScore}</span>
                                </div>

                                {/* Stats grid */}
                                <div className="grid grid-cols-3 gap-1 text-xs">
                                    <div>
                                        <div className="text-slate-500">Trades</div>
                                        <div className="text-white font-semibold">{stats.count}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-500">Win%</div>
                                        <div className={`font-semibold ${stats.winRate >= 70 ? "text-emerald-400" : stats.winRate >= 50 ? "text-amber-400" : "text-red-400"}`}>
                                            {pct(stats.winRate)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-slate-500">Avg P&L</div>
                                        <div>
                                            <PnLCell v={stats.avgPnl} />
                                        </div>
                                    </div>
                                </div>

                                {/* Reason summary */}
                                <div className="mt-3 bg-slate-900/50 rounded p-2 border border-slate-700/30">
                                    <p className="text-[10px] text-slate-400 leading-snug">{getReason(stats)}</p>
                                </div>

                                {/* Instrument preference */}
                                <div className="mt-2 pt-2 border-t border-slate-700/30 flex items-center justify-between text-xs">
                                    <PnLCell v={stats.pnl} />
                                    <div className="flex gap-1">
                                        {stats.winRate === 100 && (
                                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                                PERFECT
                                            </span>
                                        )}
                                        {stats.pnl > 50000 && (
                                            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-bold">
                                                HIGH ₹
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {filtered.length === 0 && (
                        <div className="col-span-full py-16 text-center text-slate-500">
                            No stocks match the current filters.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
