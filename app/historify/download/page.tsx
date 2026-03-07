"use client";

import { useState, useEffect } from "react";
import { HardDrive, Play, Pause, RefreshCw, CheckCircle2, XCircle, Clock, Loader2, Inbox } from "lucide-react";

type DownloadJob = {
    id: string; symbol: string; exchange: string; interval: string;
    progress: number; rows: number; status: "queued" | "downloading" | "complete" | "failed"; eta: string;
};

type HistoryItem = { symbol: string; interval: string; rows: number; status: "success" | "failed"; time: string };

export default function DownloadPage() {
    const [mode, setMode] = useState<"fresh" | "continue">("continue");
    const [watchlist, setWatchlist] = useState<{ symbol: string; exchange: string }[]>([]);
    const [jobs, setJobs] = useState<DownloadJob[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        fetch("/api/historify/watchlist").then(r => r.json()).then(d => setWatchlist(Array.isArray(d) ? d : [])).catch(() => { });
        fetch("/api/historify/activity").then(r => r.json()).then((data: any[]) => {
            if (!Array.isArray(data)) return;
            setHistory(data.slice(0, 10).map(a => ({
                symbol: a.symbol,
                interval: a.interval,
                rows: a.rows_count,
                status: a.status === "success" ? "success" : "failed",
                time: new Date(a.createdAt * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST",
            })));
        }).catch(() => { });
    }, []);

    const startDownload = async () => {
        if (watchlist.length === 0) return;
        setDownloading(true);
        const newJobs: DownloadJob[] = watchlist.map((w, i) => ({
            id: `dl-${Date.now()}-${i}`,
            symbol: w.symbol,
            exchange: w.exchange,
            interval: "Daily",
            progress: 0,
            rows: 0,
            status: "queued",
            eta: "—",
        }));
        setJobs(newJobs);
        setDownloading(false);

        // Process sequentially to respect rate limits
        for (const job of newJobs) {
            setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "downloading", eta: "Syncing...", progress: 50 } : j));
            try {
                const res = await fetch("/api/historify/sync", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        symbol: job.symbol,
                        exchange: job.exchange,
                        interval: job.interval
                    })
                });
                const data = await res.json();

                if (data.results && data.results[0] && data.results[0].status === "success") {
                    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, progress: 100, status: "complete", rows: data.results[0].rows, eta: "—" } : j));
                } else if (data.results && data.results[0] && data.results[0].status === "up_to_date") {
                    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, progress: 100, status: "complete", rows: 0, eta: "—" } : j));
                } else {
                    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, progress: 100, status: "failed", eta: "—" } : j));
                }
            } catch (err) {
                setJobs(prev => prev.map(j => j.id === job.id ? { ...j, progress: 100, status: "failed", eta: "—" } : j));
            }
        }

        // Refresh history
        fetch("/api/historify/activity").then(r => r.json()).then((data: any[]) => {
            if (!Array.isArray(data)) return;
            setHistory(data.slice(0, 10).map(a => ({
                symbol: a.symbol,
                interval: a.interval,
                rows: a.rows_count,
                status: a.status === "success" ? "success" : "failed",
                time: new Date(a.createdAt * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST",
            })));
        }).catch(() => { });
    };

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
                            <p className="text-sm text-slate-500">Download historical OHLCV data for watchlist symbols</p>
                        </div>
                    </div>
                    <button onClick={startDownload} disabled={watchlist.length === 0 || downloading}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-medium">
                        <Play className="w-4 h-4" /> Download All Watchlist ({watchlist.length})
                    </button>
                </div>
            </div>

            <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
                <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit">
                    <button onClick={() => setMode("continue")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === "continue" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}>Continue (Incremental)</button>
                    <button onClick={() => setMode("fresh")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === "fresh" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}>Fresh Download</button>
                </div>

                {watchlist.length === 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-400">
                        <Inbox className="w-4 h-4 flex-shrink-0" />
                        Watchlist is empty. Add symbols in the <a href="/historify/watchlist" className="underline">Watchlist Manager</a> first.
                    </div>
                )}

                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Active Downloads</span>
                        <span className="text-xs text-slate-500">{jobs.filter(j => j.status === "downloading").length} active</span>
                    </div>
                    {jobs.length === 0 ? (
                        <div className="p-10 text-center">
                            <Inbox className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                            <p className="text-sm text-slate-600">No active downloads. Click "Download All Watchlist" to start.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800/50">
                            {jobs.map(d => (
                                <div key={d.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-bold text-white text-sm">{d.symbol}</span>
                                            <span className="text-xs text-slate-500">{d.exchange}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {d.status === "complete" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
                                                d.status === "downloading" ? <Loader2 className="w-4 h-4 text-sky-400 animate-spin" /> :
                                                    d.status === "failed" ? <XCircle className="w-4 h-4 text-red-400" /> :
                                                        <Clock className="w-4 h-4 text-slate-500" />}
                                            <span className={`text-xs font-medium ${d.status === "complete" ? "text-emerald-400" : d.status === "downloading" ? "text-sky-400" : d.status === "failed" ? "text-red-400" : "text-slate-500"}`}>
                                                {d.status === "complete" ? "Done" : d.status === "downloading" ? `${d.progress}%` : d.status === "failed" ? "Failed" : "Queued"}
                                            </span>
                                            {d.status === "downloading" && <span className="text-xs text-slate-500">ETA: {d.eta}</span>}
                                            {d.status === "failed" && <button onClick={() => { }} className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-sky-400" title="Retry"><RefreshCw className="w-3.5 h-3.5" /></button>}
                                            {d.status === "downloading" && <button onClick={() => setJobs(prev => prev.map(j => j.id === d.id ? { ...j, status: "queued" } : j))} className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-amber-400" title="Pause"><Pause className="w-3.5 h-3.5" /></button>}
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
