"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Target } from "lucide-react";
import type { AnalyticsResult } from "../types";
import type { RawTrade } from "../types";
import { fmt, pct } from "../utils";
import { Section } from "./ui";

interface Props { data: AnalyticsResult }

function InstrumentCard({
    label, trades, color, bg, border,
}: {
    label: string; trades: RawTrade[]; color: string; bg: string; border: string;
}) {
    const pnl = trades.reduce((s, t) => s + t.total_pnl, 0);
    const wins = trades.filter(t => t.total_pnl > 0).length;
    return (
        <div className={`${bg} ${border} border rounded-lg p-3`}>
            <div className={`text-sm font-semibold ${color} mb-2`}>{label}</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
                <div><span className="text-slate-500">Count</span><br />
                    <span className="text-white font-semibold">{trades.length}</span></div>
                <div><span className="text-slate-500">Total P&L</span><br />
                    <span className={pnl >= 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>{fmt(pnl)}</span></div>
                <div><span className="text-slate-500">Win Rate</span><br />
                    <span className="text-white font-semibold">{trades.length ? pct((wins / trades.length) * 100) : "—"}</span></div>
            </div>
            <div className="mt-1 text-xs text-slate-400">
                Avg P&L: <span className={pnl >= 0 ? "text-emerald-400" : "text-red-400"}>{fmt(pnl / (trades.length || 1))}</span>
            </div>
        </div>
    );
}

export function InstrumentAnalysis({ data: { ceT, peT } }: Props) {
    const pieData = [
        { name: `CE (${ceT.length})`, value: ceT.length },
        { name: `PE (${peT.length})`, value: peT.length },
    ];

    return (
        <Section title="3. Instrument Analysis (CE vs PE)" icon={Target} color="text-pink-400">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%" cy="50%"
                                innerRadius={50} outerRadius={80}
                                dataKey="value"
                                label={({ name, percent }: { name?: string; percent?: number }) =>
                                    `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                                }
                                labelLine={{ stroke: "#475569" }}
                            >
                                <Cell fill="#38bdf8" />
                                <Cell fill="#f472b6" />
                            </Pie>
                            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                    <InstrumentCard label="Call Options (CE)" trades={ceT}
                        color="text-sky-400" bg="bg-sky-500/10" border="border-sky-500/20" />
                    <InstrumentCard label="Put Options (PE)" trades={peT}
                        color="text-pink-400" bg="bg-pink-500/10" border="border-pink-500/20" />
                </div>
            </div>
        </Section>
    );
}
