"use client";

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { AnalyticsResult } from "../types";
import { fmt } from "../utils";
import { Section } from "./ui";

interface Props { data: AnalyticsResult }

export function EquityCurve({ data: { equity } }: Props) {
    return (
        <Section title="9. Equity Curve (Cumulative P&L)" icon={TrendingUp} color="text-emerald-400">
            <div className="mt-2 h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equity} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
                        <defs>
                            <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: "#64748b", fontSize: 10 }}
                            interval={Math.max(1, Math.floor(equity.length / 8))}
                        />
                        <YAxis
                            tickFormatter={(v: number) => `₹${(v / 100000).toFixed(1)}L`}
                            tick={{ fill: "#64748b", fontSize: 11 }}
                        />
                        <Tooltip
                            contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}
                            formatter={(v: unknown) => [fmt(Number(v)), "Cumulative P&L"]}
                            labelStyle={{ color: "#94a3b8" }}
                        />
                        <Area
                            type="monotone"
                            dataKey="pnl"
                            stroke="#34d399"
                            strokeWidth={2}
                            fill="url(#pnlGrad)"
                            dot={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Section>
    );
}
