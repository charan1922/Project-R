"use client";

import { useEffect, useState, useCallback } from "react";
import { List, RefreshCw, Plus, Trash2, BarChart2, Download, Loader2, AlertCircle, Search } from "lucide-react";
import Link from "next/link";

type WatchlistItem = {
    symbol: string; exchange: string; segment: string; securityId: string | null;
    lastSyncTs: number | null; candleCount: number; status: "synced" | "stale" | "never";
};

export default function WatchlistPage() {
    const [items, setItems] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState<"all" | "synced" | "stale" | "never">("all");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [adding, setAdding] = useState(false);
    const [newSymbol, setNewSymbol] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetch("/api/historify/watchlist").then(r => r.json());
            setItems(Array.isArray(data) ? data : []);
        } catch { setItems([]); }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const addSymbol = async () => {
        if (!newSymbol.trim()) return;
        await fetch("/api/historify/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol: newSymbol.trim().toUpperCase() }),
        });
        setNewSymbol(""); setAdding(false);
        await load();
    };

    const remove = async (symbol: string, exchange: string) => {
        await fetch("/api/historify/watchlist", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol, exchange }),
        });
        setSelected(prev => { const s = new Set(prev); s.delete(symbol); return s; });
        await load();
    };

    const filtered = items
        .filter(i => tab === "all" || i.status === tab)
        .filter(i => !search || i.symbol.toLowerCase().includes(search.toLowerCase()) || i.exchange.toLowerCase().includes(search.toLowerCase()));

    const toggle = (sym: string) => setSelected(prev => { const s = new Set(prev); s.has(sym) ? s.delete(sym) : s.add(sym); return s; });
    const statusColor = (s: string) => s === "synced" ? "text-emerald-400" : s === "stale" ? "text-amber-400" : "text-red-400";
    const fmtTs = (ts: number | null) => ts ? new Date(ts * 1000).toLocaleDateString("en-IN") + " " + new Date(ts * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

    const tabs: { key: typeof tab; label: string }[] = [
        { key: "all", label: `All (${items.length})` },
        { key: "synced", label: `Synced (${items.filter(i => i.status === "synced").length})` },
        { key: "stale", label: `Stale (${items.filter(i => i.status === "stale").length})` },
        { key: "never", label: `Never (${items.filter(i => i.status === "never").length})` },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="px-6 pt-8 pb-6 border-b border-slate-800/60">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-blue-600/20 border border-teal-500/30 flex items-center justify-center">
                            <List className="w-5 h-5 text-teal-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Watchlist Manager</h1>
                            <p className="text-sm text-slate-500">Track symbols and manage automatic data synchronization</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={load} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700">
                            <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? "animate-spin" : ""}`} />
                        </button>
                        <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-medium">
                            <Plus className="w-4 h-4" /> Add Symbols
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6 space-y-4">
                {adding && (
                    <div className="flex gap-2 items-center p-4 bg-slate-900 border border-teal-500/30 rounded-lg">
                        <input autoFocus value={newSymbol} onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === "Enter" && addSymbol()}
                            placeholder="Symbol (e.g. RELIANCE)"
                            className="flex-1 px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono uppercase" />
                        <button onClick={addSymbol} className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-medium">Add</button>
                        <button onClick={() => { setAdding(false); setNewSymbol(""); }} className="px-4 py-2 text-sm bg-slate-700 rounded-lg text-slate-300">Cancel</button>
                    </div>
                )}

                <div className="flex flex-wrap gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t.key ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search symbol or exchange..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500" />
                </div>

                {selected.size > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm">
                        <span className="text-slate-400">{selected.size} selected</span>
                        <Link href="/historify/download" className="flex items-center gap-1 px-3 py-1 bg-sky-600 hover:bg-sky-500 rounded text-white text-xs font-medium"><Download className="w-3 h-3" />Download</Link>
                        <button onClick={() => setSelected(new Set())} className="ml-auto text-slate-500 hover:text-slate-300 text-xs">Clear</button>
                    </div>
                )}

                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center"><Loader2 className="w-6 h-6 text-slate-600 animate-spin mx-auto" /></div>
                    ) : filtered.length === 0 ? (
                        <div className="p-12 text-center">
                            <AlertCircle className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                            <p className="text-sm text-slate-500 mb-4">{items.length === 0 ? "No symbols in watchlist yet." : "No results match your filter."}</p>
                            {items.length === 0 && (
                                <button onClick={() => setAdding(true)} className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-medium">
                                    <Plus className="w-4 h-4 inline mr-1" />Add your first symbol
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto_auto_auto] gap-4 px-4 py-2 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                                <span />
                                <span>Symbol</span><span>Exchange</span><span>Last Synced</span><span>Candles</span><span>Status</span><span>Actions</span>
                            </div>
                            {filtered.map(item => (
                                <div key={`${item.symbol}-${item.exchange}`} className="grid grid-cols-[auto_1fr_1fr_1fr_auto_auto_auto] gap-4 items-center px-4 py-3 border-b border-slate-800/40 hover:bg-slate-800/30 last:border-0">
                                    <input type="checkbox" checked={selected.has(item.symbol)} onChange={() => toggle(item.symbol)} className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-teal-500" />
                                    <span className="font-mono font-bold text-white text-sm">{item.symbol}</span>
                                    <span className="text-xs text-slate-400">{item.exchange}</span>
                                    <span className="text-xs text-slate-500 font-mono">{fmtTs(item.lastSyncTs)}</span>
                                    <span className="text-xs font-mono text-slate-300">{item.candleCount > 0 ? item.candleCount.toLocaleString() : "—"}</span>
                                    <span className={`text-xs font-semibold capitalize ${statusColor(item.status)}`}>{item.status}</span>
                                    <div className="flex gap-1">
                                        <Link href={`/historify/charts?symbol=${item.symbol}`} className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-amber-400" title="Chart"><BarChart2 className="w-3.5 h-3.5" /></Link>
                                        <button onClick={() => remove(item.symbol, item.exchange)} className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-red-400" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
