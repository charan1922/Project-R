"use client";

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Flame } from "lucide-react";
import type { AnalyticsResult } from "../types";
import { fmt } from "../utils";
import { Section, StatCard } from "./ui";

interface Props { data: AnalyticsResult }

export function StreakAnalysis({ data: { wins, losses, maxWin, maxLoss, sorted } }: Props) {
    const last60 = sorted.slice(-60).map((t, i) => ({ i: i + 1, pnl: t.total_pnl }));

    return (
        <Section title="7. Streak Analysis" icon={Flame} color="text-orange-400">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                <StatCard label="Longest Win Streak" value={`${maxWin} days`} positive={true} />
                <StatCard label="Longest Loss Streak" value={`${maxLoss} days`} positive={false} />
                <StatCard label="Total Wins" value={wins.length.toString()} positive={true} />
                <StatCard label="Total Losses" value={losses.length.toString()} positive={false} />
            </div>

            <div className="mt-5">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-2">
                    Trade-by-Trade P&L Sequence (last 60)
                </p>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={last60}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="i" tick={{ fill: "#64748b", fontSize: 10 }} />
                            <YAxis
                                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                                tick={{ fill: "#64748b", fontSize: 10 }}
                            />
                            <Tooltip
                                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}
                                formatter={(v: unknown) => [fmt(Number(v)), "P&L"]}
                            />
                            <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                                {last60.map((d, i) => (
                                    <Cell key={i} fill={d.pnl >= 0 ? "#34d399" : "#f87171"} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </Section>
    );
}
