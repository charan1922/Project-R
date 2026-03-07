"use client";

import { useState, useEffect } from "react";
import { Download, FileArchive, FileText, Calendar, Clock, CheckCircle2, Loader2, Inbox } from "lucide-react";

// In-memory export queue — starts empty, grows as user triggers exports
type ExportJob = {
    id: string; symbols: string[]; format: string; interval: string;
    dateRange: string; status: "queued" | "processing" | "complete"; rows: number; size: string;
};

const INTERVALS = ["1min", "5min", "15min", "30min", "1hour", "Daily"];
const FORMATS = ["Individual CSV", "Combined CSV", "ZIP Archive"];
const PRESETS = ["Last 7 Days", "Last 30 Days", "Last 90 Days", "Year to Date", "Last 1 Year", "All Time"];

export default function ExportPage() {
    const [interval, setIntervalVal] = useState("Daily");
    const [format, setFormat] = useState("ZIP Archive");
    const [preset, setPreset] = useState("Last 1 Year");
    const [queue, setQueue] = useState<ExportJob[]>([]);
    const [watchlist, setWatchlist] = useState<{ symbol: string }[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Load watchlist so we know what symbols are available
    useEffect(() => {
        fetch("/api/historify/watchlist").then(r => r.json()).then(d => setWatchlist(Array.isArray(d) ? d : [])).catch(() => { });
    }, []);

    const startExport = () => {
        if (watchlist.length === 0) return;
        setSubmitting(true);
        const job: ExportJob = {
            id: `exp-${Date.now()}`,
            symbols: watchlist.map(w => w.symbol),
            format,
            interval,
            dateRange: preset,
            status: "queued",
            rows: 0,
            size: "—",
        };
        setQueue(prev => [job, ...prev]);

        // Simulate processing progression (real implementation would call a backend job)
        setTimeout(() => {
            setQueue(prev => prev.map(j => j.id === job.id ? { ...j, status: "processing" } : j));
            setSubmitting(false);
        }, 800);
        setTimeout(() => {
            setQueue(prev => prev.map(j => j.id === job.id ? { ...j, status: "complete", rows: Math.floor(Math.random() * 50000) + 5000, size: `${(Math.random() * 5 + 0.5).toFixed(1)} MB` } : j));
        }, 3500);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="px-6 pt-8 pb-6 border-b border-slate-800/60">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center">
                        <Download className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Export Data</h1>
                        <p className="text-sm text-slate-500">Export locally stored OHLCV data in CSV or ZIP format</p>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
                {/* New Export Form */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-5">
                    <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">New Export</h2>

                    {watchlist.length === 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-400">
                            <Inbox className="w-4 h-4 flex-shrink-0" />
                            No symbols in watchlist. Add symbols and sync data before exporting.
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Data Interval</label>
                            <select value={interval} onChange={e => setIntervalVal(e.target.value)} className="w-full px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-violet-500">
                                {INTERVALS.map(i => <option key={i}>{i}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Export Format</label>
                            <select value={format} onChange={e => setFormat(e.target.value)} className="w-full px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-violet-500">
                                {FORMATS.map(f => <option key={f}>{f}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Date Range Preset</label>
                        <div className="flex flex-wrap gap-2">
                            {PRESETS.map(p => (
                                <button key={p} onClick={() => setPreset(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${preset === p ? "bg-violet-500/20 text-violet-400 border-violet-500/30" : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"}`}>{p}</button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={startExport}
                        disabled={watchlist.length === 0 || submitting}
                        className="w-full px-4 py-3 text-sm bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export {watchlist.length} Symbol{watchlist.length !== 1 ? "s" : ""} · {interval} · {preset}
                    </button>
                </div>

                {/* Export Queue */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-slate-800 text-sm font-bold text-slate-300 uppercase tracking-wider">Export Queue</div>
                    {queue.length === 0 ? (
                        <div className="p-10 text-center">
                            <Inbox className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                            <p className="text-sm text-slate-600">No exports yet. Configure options above and click export.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800/50">
                            {queue.map(item => (
                                <div key={item.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            {item.format.includes("ZIP") ? <FileArchive className="w-4 h-4 text-violet-400" /> : <FileText className="w-4 h-4 text-sky-400" />}
                                            <span className="text-sm font-semibold text-white">{item.symbols.length} symbol{item.symbols.length !== 1 ? "s" : ""}</span>
                                            <span className="text-xs text-slate-500">{item.format}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {item.status === "complete" ? <><CheckCircle2 className="w-4 h-4 text-emerald-400" /><button className="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30">Download</button></> :
                                                item.status === "processing" ? <><Loader2 className="w-4 h-4 text-sky-400 animate-spin" /><span className="text-xs text-sky-400">Processing…</span></> :
                                                    <><Clock className="w-4 h-4 text-slate-500" /><span className="text-xs text-slate-500">Queued</span></>}
                                        </div>
                                    </div>
                                    <div className="flex gap-4 text-xs text-slate-500">
                                        <span><Calendar className="w-3 h-3 inline mr-1" />{item.dateRange}</span>
                                        <span>{item.interval}</span>
                                        {item.rows > 0 && <span>{item.rows.toLocaleString()} rows</span>}
                                        {item.size !== "—" && <span>{item.size}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
