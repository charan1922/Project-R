"use client";

import { useState, useEffect, useCallback } from "react";
import {
    HardDrive, Play, Pause, RefreshCw, CheckCircle2, XCircle, Clock, Loader2, Inbox
} from "lucide-react";

type DownloadJob = {
    id: string; symbol: string; exchange: string; interval: string;
    progress: number; rows: number; status: "queued" | "downloading" | "complete" | "failed"; eta: string;
};
type HistoryItem = { symbol: string; interval: string; rows: number; status: "success" | "failed"; time: string };
type WatchlistItem = { symbol: string; exchange: string };

const INTERVALS = ["1min", "5min", "15min", "30min", "1hour", "Daily"];
const DATE_PRESETS: [string, string][] = [
    ["5d", "Last 5 Days"], ["30d", "Last 30 Days"], ["90d", "Last 90 Days"],
    ["1y", "Last 1 Year"], ["2y", "Last 2 Years"], ["5y", "Last 5 Years"],
    ["today", "Today"], ["custom", "Custom Range"],
];

function computeDates(preset: string, customFrom: string, customTo: string): { fromDate: string; toDate: string } {
    const today = new Date().toISOString().split("T")[0];
    if (preset === "custom") return { fromDate: customFrom || today, toDate: customTo || today };
    if (preset === "today") return { fromDate: today, toDate: today };
    const map: Record<string, number> = { "5d": 5, "30d": 30, "90d": 90, "1y": 365, "2y": 730, "5y": 1825 };
    const d = new Date();
    d.setDate(d.getDate() - (map[preset] ?? 30));
    return { fromDate: d.toISOString().split("T")[0], toDate: today };
}

export default function DownloadPage() {
    const [mode, setMode] = useState<"fresh" | "continue">("continue");
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [checkedSymbols, setCheckedSymbols] = useState<Set<string>>(new Set());
    const [interval, setInterval] = useState("Daily");
    const [datePreset, setDatePreset] = useState("30d");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [jobs, setJobs] = useState<DownloadJob[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);

    const refreshHistory = useCallback(() => {
        fetch("/api/historify/activity").then(r => r.json()).then((data: any[]) => {
            if (!Array.isArray(data)) return;
            setHistory(data.slice(0, 10).map(a => ({
                symbol: a.symbol, interval: a.interval,
                rows: a.rows_count,
                status: a.status === "success" ? "success" : "failed",
                time: new Date(a.createdAt * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST",
            })));
        }).catch(() => { });
    }, []);

    useEffect(() => {
        fetch("/api/historify/watchlist").then(r => r.json()).then(d => {
            const wl = Array.isArray(d) ? d : [];
            setWatchlist(wl);
            setCheckedSymbols(new Set(wl.map((w: WatchlistItem) => w.symbol)));
        }).catch(() => { });
        refreshHistory();
    }, [refreshHistory]);

    const toggleAll = () => setCheckedSymbols(
        checkedSymbols.size === watchlist.length ? new Set() : new Set(watchlist.map(w => w.symbol))
    );

    const startDownload = async () => {
        const selected = watchlist.filter(w => checkedSymbols.has(w.symbol));
        if (selected.length === 0) return;
        setLoading(true);
        const { fromDate, toDate } = computeDates(datePreset, customFrom, customTo);
        const newJobs: DownloadJob[] = selected.map((w, i) => ({
            id: `dl-${Date.now()}-${i}`, symbol: w.symbol, exchange: w.exchange,
            interval, progress: 0, rows: 0, status: "queued", eta: "—",
        }));
        setJobs(newJobs);
        setLoading(false);

        for (const job of newJobs) {
            setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "downloading", eta: "Syncing…", progress: 50 } : j));
            try {
                const res = await fetch("/api/historify/sync", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ symbol: job.symbol, exchange: job.exchange, interval: job.interval, fromDate, toDate }),
                });
                const data = await res.json();
                const r = data.results?.[0];
                const rows = r?.rows ?? 0;
                const ok = r?.status === "success" || r?.status === "up_to_date";
                setJobs(prev => prev.map(j => j.id === job.id ? { ...j, progress: 100, status: ok ? "complete" : "failed", rows, eta: "—" } : j));
            } catch {
                setJobs(prev => prev.map(j => j.id === job.id ? { ...j, progress: 100, status: "failed", eta: "—" } : j));
            }
        }
        refreshHistory();
    };

    const inputCls = "w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500";

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="px-6 pt-8 pb-6 border-b border-slate-800/60">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30 flex items-center justify-center">
                            <HardDrive className="w-5 h-5 text-sky-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Bulk Download</h1>
                            <p className="text-sm text-slate-500">Fetch OHLCV data via Dhan V2 API</p>
                        </div>
                    </div>
                    <button onClick={startDownload} disabled={checkedSymbols.size === 0 || loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-medium">
                        <Play className="w-4 h-4" /> Download Selected ({checkedSymbols.size})
                    </button>
                </div>
            </div>

            <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
                {/* Controls */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-5">
                    {/* Mode toggle */}
                    <div className="flex gap-1 p-1 bg-slate-800 border border-slate-700 rounded-lg w-fit">
                        {(["continue", "fresh"] as const).map(m => (
                            <button key={m} onClick={() => setMode(m)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${mode === m ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}>
                                {m === "continue" ? "Continue (Incremental)" : "Fresh Download"}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Symbol Checkboxes */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Select Symbols</span>
                                <button onClick={toggleAll} className="text-xs text-sky-400 hover:text-sky-300">
                                    {checkedSymbols.size === watchlist.length ? "Deselect All" : "Select All"}
                                </button>
                            </div>
                            {watchlist.length === 0 ? (
                                <div className="flex items-center gap-2 px-3 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-400">
                                    <Inbox className="w-4 h-4 flex-shrink-0" />
                                    <span>Watchlist empty. <a href="/historify/watchlist" className="underline">Add symbols</a> first.</span>
                                </div>
                            ) : (
                                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 max-h-48 overflow-y-auto space-y-0.5">
                                    {watchlist.map(w => (
                                        <label key={w.symbol} className="flex items-center gap-3 cursor-pointer hover:bg-slate-700/30 rounded-md px-2 py-1.5">
                                            <input type="checkbox" checked={checkedSymbols.has(w.symbol)}
                                                onChange={() => setCheckedSymbols(prev => {
                                                    const s = new Set(prev);
                                                    s.has(w.symbol) ? s.delete(w.symbol) : s.add(w.symbol);
                                                    return s;
                                                })}
                                                className="rounded border-slate-600 accent-sky-500" />
                                            <span className="font-mono font-semibold text-sm text-white">{w.symbol}</span>
                                            <span className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">{w.exchange}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Interval + Date Range */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block font-medium">Data Interval</label>
                                <select value={interval} onChange={e => setInterval(e.target.value)} className={inputCls}>
                                    {INTERVALS.map(i => <option key={i}>{i}</option>)}
                                </select>
                                {interval !== "Daily" && (
                                    <p className="text-xs text-amber-400 mt-1">⚠ Intraday uses 90-day chunking via Dhan API</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block font-medium">Date Range</label>
                                <select value={datePreset} onChange={e => setDatePreset(e.target.value)} className={inputCls}>
                                    {DATE_PRESETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                            </div>
                            {datePreset === "custom" && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Start Date</label>
                                        <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">End Date</label>
                                        <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className={inputCls} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Active Downloads */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Active Downloads</span>
                        <span className="text-xs text-slate-500">{jobs.filter(j => j.status === "downloading").length} active</span>
                    </div>
                    {jobs.length === 0 ? (
                        <div className="p-10 text-center">
                            <Inbox className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                            <p className="text-sm text-slate-600">Select symbols and click "Download Selected" to start.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800/50">
                            {jobs.map(d => (
                                <div key={d.id} className="p-4 hover:bg-slate-800/30">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-bold text-white text-sm">{d.symbol}</span>
                                            <span className="text-xs text-slate-500">{d.exchange}</span>
                                            <span className="text-xs px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">{d.interval}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {d.status === "complete" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
                                                d.status === "downloading" ? <Loader2 className="w-4 h-4 text-sky-400 animate-spin" /> :
                                                    d.status === "failed" ? <XCircle className="w-4 h-4 text-red-400" /> :
                                                        <Clock className="w-4 h-4 text-slate-500" />}
                                            <span className={`text-xs font-medium ${d.status === "complete" ? "text-emerald-400" : d.status === "downloading" ? "text-sky-400" : d.status === "failed" ? "text-red-400" : "text-slate-500"}`}>
                                                {d.status === "complete" ? "Done" : d.status === "downloading" ? "Syncing…" : d.status === "failed" ? "Failed" : "Queued"}
                                            </span>
                                            {d.status === "failed" && <button className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-sky-400" title="Retry"><RefreshCw className="w-3.5 h-3.5" /></button>}
                                            {d.status === "downloading" && <button className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-amber-400" title="Pause"><Pause className="w-3.5 h-3.5" /></button>}
                                        </div>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${d.status === "complete" ? "bg-emerald-500" : d.status === "failed" ? "bg-red-500" : "bg-sky-500"}`} style={{ width: `${d.progress}%` }} />
                                    </div>
                                    {d.rows > 0 && <p className="text-xs text-slate-500 mt-1">{d.rows.toLocaleString()} rows fetched</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Download History */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-slate-800 text-sm font-bold text-slate-300 uppercase tracking-wider">Download History</div>
                    {history.length === 0 ? (
                        <div className="p-8 text-center"><p className="text-sm text-slate-600">No download history yet.</p></div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-slate-800 text-slate-500 text-xs uppercase"><th className="p-3 text-left">Symbol</th><th className="p-3 text-left">Interval</th><th className="p-3 text-right">Rows</th><th className="p-3 text-center">Status</th><th className="p-3 text-right">Time</th></tr></thead>
                            <tbody>
                                {history.map((h, i) => (
                                    <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                                        <td className="p-3 font-mono font-bold text-white">{h.symbol}</td>
                                        <td className="p-3 text-slate-400">{h.interval}</td>
                                        <td className="p-3 text-right font-mono text-slate-300">{h.rows > 0 ? h.rows.toLocaleString() : "—"}</td>
                                        <td className="p-3 text-center">{h.status === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /> : <XCircle className="w-4 h-4 text-red-400 mx-auto" />}</td>
                                        <td className="p-3 text-right text-xs text-slate-500">{h.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
