"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { fmt } from "../utils";

// ─── Collapsible Section ──────────────────────────────────────────────────────
export function Section({
    title,
    icon: Icon,
    color = "text-sky-400",
    children,
    defaultOpen = true,
}: {
    title: string;
    icon: React.ElementType;
    color?: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-800/40 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <span className="text-base font-semibold text-slate-100">{title}</span>
                </div>
                {open
                    ? <ChevronUp className="w-4 h-4 text-slate-500" />
                    : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {open && <div className="px-5 pb-5">{children}</div>}
        </div>
    );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
export function StatCard({
    label,
    value,
    sub,
    positive,
}: {
    label: string;
    value: string;
    sub?: string;
    positive?: boolean;
}) {
    const valueColor =
        positive === undefined
            ? "text-slate-100"
            : positive
                ? "text-emerald-400"
                : "text-red-400";

    return (
        <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/50">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</div>
            <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
            {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
        </div>
    );
}

// ─── Data Table ───────────────────────────────────────────────────────────────
export function Table({
    headers,
    rows,
}: {
    headers: string[];
    rows: (string | number | React.ReactNode)[][];
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-700/60">
                        {headers.map(h => (
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
                    {rows.map((row, i) => (
                        <tr
                            key={i}
                            className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors"
                        >
                            {row.map((cell, j) => (
                                <td key={j} className="py-2 px-3 text-slate-300 whitespace-nowrap">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Coloured P&L Cell ────────────────────────────────────────────────────────
export function PnLCell({ v }: { v: number }) {
    return (
        <span className={`font-semibold ${v >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {fmt(v)}
        </span>
    );
}

// ─── Horizontal progress bar row ─────────────────────────────────────────────
export function ProgressRow({
    label,
    value,
    total,
    color,
}: {
    label: string;
    value: number;
    total: number;
    color: string;
}) {
    const widthPct = total > 0 ? (value / total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{label}</span>
                <span className="text-white font-semibold">
                    {value} ({total > 0 ? widthPct.toFixed(1) : 0}%)
                </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full">
                <div
                    className={`h-1.5 rounded-full ${color}`}
                    style={{ width: `${widthPct}%` }}
                />
            </div>
        </div>
    );
}
