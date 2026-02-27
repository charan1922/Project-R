"use client";

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { BarChart2 } from "lucide-react";
import type { AnalyticsResult } from "../types";
import { fmt, pct } from "../utils";
import { Section, Table, PnLCell } from "./ui";

interface Props { data: AnalyticsResult }

export function MonthlyBreakdown({ data: { months } }: Props) {
    const bestMonth = months.reduce((a, b) => a.pnl > b.pnl ? a : b, months[0]);
    const worstMonth = months.reduce((a, b) => a.pnl < b.pnl ? a : b, months[0]);

    return (
        <Section title="2. Monthly Breakdown" icon={BarChart2} color="text-indigo-400">
            <div className="mt-2 mb-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={months} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="shortLabel" tick={{ fill: "#64748b", fontSize: 11 }} />
                        <YAxis
                            tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                            tick={{ fill: "#64748b", fontSize: 11 }}
                        />
                        <Tooltip
                            contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}
                            formatter={(v: unknown) => [fmt(Number(v)), "P&L"]}
                            labelStyle={{ color: "#94a3b8" }}
                        />
                        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                            {months.map((m, i) => (
                                <Cell key={i} fill={m.pnl >= 0 ? "#34d399" : "#f87171"} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <Table
                headers={["Month", "Total P&L", "Trades", "Wins", "Losses", "Win %", "Avg P&L"]}
                rows={months.map(m => [
                    m.label,
                    <PnLCell key={m.label + "p"} v={m.pnl} />,
                    m.trades.length,
                    <span key="w" className="text-emerald-400">{m.wins}</span>,
                    <span key="l" className="text-red-400">{m.losses}</span>,
                    pct((m.wins / m.trades.length) * 100),
                    <PnLCell key={m.label + "a"} v={m.pnl / m.trades.length} />,
                ])}
            />

            <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                    <div className="text-xs text-emerald-400 font-semibold uppercase mb-1">Best Month</div>
                    <div className="text-white font-bold">{bestMonth?.label}</div>
                    <div className="text-emerald-400 font-semibold">{fmt(bestMonth?.pnl ?? 0)}</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <div className="text-xs text-red-400 font-semibold uppercase mb-1">Worst Month</div>
                    <div className="text-white font-bold">{worstMonth?.label}</div>
                    <div className="text-red-400 font-semibold">{fmt(worstMonth?.pnl ?? 0)}</div>
                </div>
            </div>
        </Section>
    );
}
