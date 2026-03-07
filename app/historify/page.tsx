"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Database, Activity, RefreshCw, Upload, Download, HardDrive, Clock,
    List, BarChart2, AlertCircle, Loader2,
} from "lucide-react";

type Stats = { watchlistCount: number; totalCandles: number; lastSyncTs: number | null; storageMb: number };
type ActivityItem = { symbol: string; exchange: string; interval: string; action: string; rows_count: number; status: string; createdAt: number };

const fmtNum = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);
const fmtTs = (ts: number | null) => ts ? new Date(ts * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST" : "Never";

export default function HistorifyDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const [s, a] = await Promise.all([
                fetch("/api/historify/stats").then(r => r.json()),
                fetch("/api/historify/activity").then(r => r.json()),
            ]);
            setStats(s);
            setActivity(Array.isArray(a) ? a : []);
        } catch { /* DB not ready, keep showing skeleton */ }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const QUICK_ACTIONS = [
        { label: "Import Symbols", href: "/historify/import", icon: Upload },
        { label: "Bulk Download", href: "/historify/download", icon: Download },
        { label: "Export Data", href: "/historify/export", icon: HardDrive },
        { label: "View Charts", href: "/historify/charts", icon: BarChart2 },
        { label: "Manage Scheduler", href: "/historify/scheduler", icon: Clock },
        { label: "View Watchlist", href: "/historify/watchlist", icon: List },
    ];

    const statCards = [
        { label: "WATCHLIST SYMBOLS", value: loading ? "—" : String(stats?.watchlistCount ?? 0), sub: "Across exchanges", icon: List, color: "text-slate-300" },
        { label: "TOTAL CANDLES", value: loading ? "—" : fmtNum(stats?.totalCandles ?? 0), sub: "OHLCV records", icon: Activity, color: "text-teal-400" },
        { label: "LAST SYNC", value: loading ? "—" : fmtTs(stats?.lastSyncTs ?? null), sub: "Market close", icon: Clock, color: "text-sky-400" },
        { label: "STORAGE", value: loading ? "—" : `${stats?.storageMb ?? 0} MB`, sub: "SQLite columnar", icon: HardDrive, color: "text-violet-400" },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="px-6 pt-8 pb-6 border-b border-slate-800/60">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-600/20 border border-teal-500/30 flex items-center justify-center">
                            <Database className="w-5 h-5 text-teal-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Historify Dashboard</h1>
                            <p className="text-sm text-slate-500">Historical data management &amp; visualization platform</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700">
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                        </button>
                        <Link href="/historify/download" className="flex items-center gap-2 px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-medium">
                            <Download className="w-4 h-4" /> Sync All
                        </Link>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6 space-y-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map(({ label, value, sub, icon: Icon, color }) => (
                        <div key={label} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</span>
                                <Icon className={`w-4 h-4 ${color}`} />
                            </div>
                            <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
                            <p className="text-xs text-slate-600 mt-1">{sub}</p>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">QUICK ACTIONS</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
                            <Link key={href} href={href} className="flex items-center justify-between px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white transition-colors group">
                                <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-slate-500 group-hover:text-teal-400" />{label}</div>
                                <span className="text-slate-600 group-hover:text-slate-400">↗</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-slate-800 text-sm font-bold text-slate-500 uppercase tracking-widest">Recent Activity</div>
                    {loading ? (
                        <div className="p-8 text-center"><Loader2 className="w-6 h-6 text-slate-600 animate-spin mx-auto" /></div>
                    ) : activity.length === 0 ? (
                        <div className="p-8 text-center">
                            <AlertCircle className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                            <p className="text-sm text-slate-600">No activity yet. Start by importing symbols and syncing data.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800/50">
                            {activity.map((a, i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30">
                                    <span className={`w-2 h-2 rounded-full ${a.status === "success" ? "bg-emerald-400" : "bg-red-400"}`} />
                                    <span className="text-xs text-slate-500 capitalize">{a.action}</span>
                                    <span className="font-mono font-bold text-sm text-white">{a.symbol}</span>
                                    <span className="text-xs text-slate-500">{a.exchange}</span>
                                    <span className="text-xs text-slate-500">{a.interval}</span>
                                    <span className="ml-auto text-xs text-slate-500">{a.rows_count > 0 ? `${a.rows_count.toLocaleString()} rows` : ""}</span>
                                    <span className="text-xs text-slate-600">{new Date(a.createdAt * 1000).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
