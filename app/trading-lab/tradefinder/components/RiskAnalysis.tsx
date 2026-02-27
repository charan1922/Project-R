"use client";

import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer,
} from "recharts";
import { Shield } from "lucide-react";
import type { AnalyticsResult } from "../types";
import { fmt, pct } from "../utils";
import { Section, StatCard } from "./ui";

interface Props { data: AnalyticsResult }

export function RiskAnalysis({ data }: Props) {
    const { actual, wins, losses, grossProfit, grossLoss, maxDD, buckets } = data;

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;
    const consistency = actual.filter(t => t.total_pnl >= 10000 && t.total_pnl <= 25000).length;
    const outliers = actual.filter(t => t.total_pnl > 50000 || t.total_pnl < -5000).length;

    const distData = Object.entries(buckets).map(([range, count]) => ({ range, count }));
    const pieData = [
        { name: "Wins", value: wins.length },
        { name: "Losses", value: losses.length },
    ];

    return (
        <Section title="8. Risk Analysis" icon={Shield} color="text-rose-400">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                <StatCard
                    label="Profit Factor"
                    value={profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)}
                    positive={profitFactor >= 1.5}
                    sub="Gross Profit / Gross Loss"
                />
                <StatCard label="Max Drawdown" value={fmt(maxDD)} positive={false} sub="Peak-to-trough" />
                <StatCard
                    label="Consistency"
                    value={pct((consistency / actual.length) * 100)}
                    sub="Trades in ₹10k–₹25k range"
                />
                <StatCard
                    label="Outlier Trades"
                    value={pct((outliers / actual.length) * 100)}
                    sub=">₹50k or <−₹5k"
                />
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold mb-2">P&L Distribution</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={distData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="range" tick={{ fill: "#64748b", fontSize: 10 }} />
                            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                            <Tooltip
                                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}
                            />
                            <Bar dataKey="count" fill="#818cf8" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Win / Loss Split</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%" cy="50%"
                                outerRadius={75}
                                dataKey="value"
                                label={({ name, value }: { name?: string; value?: number }) =>
                                    `${name ?? ""}: ${value ?? 0}`
                                }
                                labelLine={{ stroke: "#475569" }}
                            >
                                <Cell fill="#34d399" />
                                <Cell fill="#f87171" />
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </Section>
    );
}
