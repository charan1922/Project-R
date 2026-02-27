"use client";

import { useState, useMemo } from "react";
import { Filter, Search, TrendingUp } from "lucide-react";
import type { StockStats } from "../types";
import { fmt, pct } from "../utils";
import { Section, PnLCell } from "./ui";

interface Props { stockList: StockStats[] }

const TIERS = ["All", "A+", "A", "B", "C", "D"] as const;
type TierFilter = (typeof TIERS)[number];

const TIER_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; desc: string }> = {
    "A+": { label: "A+", bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", desc: "Score ≥80: Elite — consistently profitable, high confidence" },
    "A": { label: "A", bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/30", desc: "Score 65–79: Strong — good win rate and average return" },
    "B": { label: "B", bg: "bg-indigo-500/15", text: "text-indigo-400", border: "border-indigo-500/30", desc: "Score 50–64: Decent — tradeable, needs bigger sample" },
    "C": { label: "C", bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", desc: "Score 35–49: Marginal — low win rate or small sample" },
    "D": { label: "D", bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", desc: "Score <35: Avoid — consistent losses or very low win rate" },
};

function TierBadge({ tier }: { tier: StockStats["tier"] }) {
    const cfg = TIER_CONFIG[tier];
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
            {cfg.label}
        </span>
    );
}

function ScoreBar({ score }: { score: number }) {
    const color =
        score >= 80 ? "bg-emerald-500" :
            score >= 65 ? "bg-sky-500" :
                score >= 50 ? "bg-indigo-500" :
                    score >= 35 ? "bg-amber-500" : "bg-red-500";
    return (
        <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-slate-700 rounded-full">
                <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
            </div>
            <span className="text-xs text-slate-300 font-mono w-6 text-right">{score}</span>
        </div>
    );
}

export function StockFilter({ stockList }: Props) {
    const [tierFilter, setTierFilter] = useState<TierFilter>("All");
    const [search, setSearch] = useState("");
    const [minTrades, setMinTrades] = useState(1);
    const [sortBy, setSortBy] = useState<"score" | "pnl" | "winRate" | "count">("score");

    const filtered = useMemo(() => {
        const q = search.toUpperCase().trim();
        return stockList
            .filter(s =>
                (tierFilter === "All" || s.tier === tierFilter) &&
                s.count >= minTrades &&
                (q === "" || s.name.toUpperCase().includes(q))
            )
            .sort((a, b) => {
                if (sortBy === "score") return b.compositeScore - a.compositeScore;
                if (sortBy === "pnl") return b.pnl - a.pnl;
                if (sortBy === "winRate") return b.winRate - a.winRate;
                return b.count - a.count;
            });
    }, [stockList, tierFilter, search, minTrades, sortBy]);

    const tierCounts = useMemo(() => {
        const counts: Record<string, number> = { "A+": 0, A: 0, B: 0, C: 0, D: 0 };
        stockList.filter(s => s.count >= minTrades).forEach(s => counts[s.tier]++);
        return counts;
    }, [stockList, minTrades]);

    return (
        <Section
            title="0. F&O Stock Filter — Tradefinder Scored Universe"
            icon={Filter}
            color="text-violet-400"
        >
            {/* Purpose banner */}
            <div className="mt-2 mb-4 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
                    <div className="text-sm text-slate-300">
                        <span className="text-violet-300 font-semibold">Mission:</span>{" "}
                        Filter the F&O universe (240+ stocks) using Tradefinder_02's real verified trade
                        history. Each stock gets a{" "}
                        <span className="text-white font-semibold">composite score 0–100</span> based on
                        win rate (40%), average P&L (30%), sample size confidence (20%), and loss safety (10%).
                        Focus trading on <span className="text-emerald-400 font-semibold">A+ and A</span> tier stocks.
                    </div>
                </div>
            </div>

            {/* Tier Summary */}
            <div className="grid grid-cols-5 gap-2 mb-4">
                {(["A+", "A", "B", "C", "D"] as const).map(t => {
                    const cfg = TIER_CONFIG[t];
                    const count = tierCounts[t] ?? 0;
                    return (
                        <button
                            key={t}
                            onClick={() => setTierFilter(tierFilter === t ? "All" : t)}
                            className={`rounded-lg p-3 text-center border transition-all ${cfg.bg} ${cfg.border} hover:opacity-90 ${tierFilter === t ? "ring-2 ring-offset-1 ring-offset-slate-900 " + cfg.text.replace("text-", "ring-") : ""}`}
                            title={cfg.desc}
                        >
                            <div className={`text-lg font-bold ${cfg.text}`}>{t}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{count} stocks</div>
                        </button>
                    );
                })}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-36">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search stock..."
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                    />
                </div>

                <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-violet-500"
                >
                    <option value="score">Sort: Score</option>
                    <option value="pnl">Sort: Total P&L</option>
                    <option value="winRate">Sort: Win Rate</option>
                    <option value="count">Sort: Trade Count</option>
                </select>

                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg">
                    <span className="text-xs text-slate-500 whitespace-nowrap">Min trades:</span>
                    <input
                        type="number"
                        min={1}
                        max={20}
                        value={minTrades}
                        onChange={e => setMinTrades(Math.max(1, Number(e.target.value)))}
                        className="w-10 bg-transparent text-sm text-slate-200 focus:outline-none text-center"
                    />
                </div>
            </div>

            {/* Count */}
            <p className="text-xs text-slate-500 mb-3">
                Showing <span className="text-white font-semibold">{filtered.length}</span> stocks
                {tierFilter !== "All" && <> in tier <TierBadge tier={tierFilter as StockStats["tier"]} /></>}
                {search && <> matching "<span className="text-sky-400">{search}</span>"</>}
                {minTrades > 1 && <> with ≥{minTrades} trades</>}
            </p>

            {/* Table */}
            <div className="overflow-x-auto max-h-[540px] overflow-y-auto rounded-lg border border-slate-800">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                        <tr className="border-b border-slate-700/60">
                            {["Rank", "Stock", "Tier", "Score", "Trades", "Win Rate", "Avg P&L", "Total P&L", "Best Day"].map(h => (
                                <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((s, i) => (
                            <tr key={s.name} className="border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors">
                                <td className="py-2 px-3 text-slate-500 text-xs font-mono">#{i + 1}</td>
                                <td className="py-2 px-3">
                                    <span className="text-slate-100 font-mono text-xs font-semibold">{s.name}</span>
                                </td>
                                <td className="py-2 px-3"><TierBadge tier={s.tier} /></td>
                                <td className="py-2 px-3"><ScoreBar score={s.compositeScore} /></td>
                                <td className="py-2 px-3 text-slate-300 text-xs">{s.count}</td>
                                <td className="py-2 px-3">
                                    <span className={`font-semibold text-xs ${s.winRate >= 80 ? "text-emerald-400" :
                                            s.winRate >= 60 ? "text-sky-400" :
                                                s.winRate >= 40 ? "text-amber-400" : "text-red-400"
                                        }`}>{pct(s.winRate)}</span>
                                </td>
                                <td className="py-2 px-3"><PnLCell v={s.avgPnl} /></td>
                                <td className="py-2 px-3"><PnLCell v={s.pnl} /></td>
                                <td className="py-2 px-3"><PnLCell v={s.maxPnl} /></td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={9} className="py-8 text-center text-slate-500 text-sm">
                                    No stocks match the current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Tier legend */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                {(["A+", "A", "B", "C", "D"] as const).map(t => {
                    const cfg = TIER_CONFIG[t];
                    return (
                        <div key={t} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${cfg.bg} border ${cfg.border}`}>
                            <span className={`text-xs font-bold ${cfg.text} w-5`}>{t}</span>
                            <span className="text-xs text-slate-400">{cfg.desc}</span>
                        </div>
                    );
                })}
            </div>
        </Section>
    );
}
