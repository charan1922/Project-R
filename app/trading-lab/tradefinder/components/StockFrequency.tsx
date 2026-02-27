"use client";

import { BarChart2 } from "lucide-react";
import type { StockStats } from "../types";
import { pct } from "../utils";
import { Section, PnLCell } from "./ui";

interface Props { stockList: StockStats[] }

export function StockFrequency({ stockList }: Props) {
    const sorted = [...stockList].sort((a, b) => b.count - a.count);
    const maxCount = sorted[0]?.count ?? 1;

    return (
        <Section title="10. Stock Trade Frequency — Full Ranking" icon={BarChart2} color="text-sky-400">
            <p className="text-xs text-slate-500 mb-3 mt-1">
                All {sorted.length} unique stocks traded, ranked by frequency (high → low)
            </p>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-900 z-10">
                        <tr className="border-b border-slate-700/60">
                            {["Rank", "Stock", "Trades", "Total P&L", "Wins", "Losses", "Win %"].map(h => (
                                <th
                                    key={h}
                                    className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((s, i) => (
                            <tr
                                key={s.name}
                                className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors"
                            >
                                <td className="py-2 px-3 text-slate-500 text-xs font-mono">#{i + 1}</td>
                                <td className="py-2 px-3 text-slate-200 font-mono text-xs font-semibold">{s.name}</td>
                                <td className="py-2 px-3 text-slate-300">
                                    <div className="flex items-center gap-2">
                                        {s.count}
                                        <div
                                            className="h-1 rounded-full bg-sky-500/70"
                                            style={{ width: `${Math.max(4, (s.count / maxCount) * 60)}px` }}
                                        />
                                    </div>
                                </td>
                                <td className="py-2 px-3"><PnLCell v={s.pnl} /></td>
                                <td className="py-2 px-3 text-emerald-400">{s.wins}</td>
                                <td className="py-2 px-3 text-red-400">{s.losses}</td>
                                <td className="py-2 px-3">
                                    <span className={`font-semibold ${s.winRate >= 80 ? "text-emerald-400" :
                                            s.winRate >= 50 ? "text-amber-400" : "text-red-400"
                                        }`}>
                                        {pct(s.winRate)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Section>
    );
}
