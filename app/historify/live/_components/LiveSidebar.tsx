"use client";

import { useState, useEffect } from "react";
import { Shield, Zap, RefreshCw } from "lucide-react";
import fnoData from "@/lib/data/fno_stocks_list.json";

interface WatchlistItem {
    id: number;
    symbol: string;
    added_at: string;
}

interface LiveSidebarProps {
    activeSymbol: string | null;
    onSelectSymbol: (symbol: string) => void;
}

export function LiveSidebar({ activeSymbol, onSelectSymbol }: LiveSidebarProps) {
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [fnoSearch, setFnoSearch] = useState("");

    // 1. Fetch user's existing Watchlist
    useEffect(() => {
        fetch("/api/historify/watchlist")
            .then(res => res.json())
            .then(data => {
                if (data.watchlist) setWatchlist(data.watchlist);
            })
            .catch(console.error);
    }, []);

    const filteredFno = fnoData.stocks
        .filter(s => s.toLowerCase().includes(fnoSearch.toLowerCase()))
        .slice(0, 50);

    return (
        <aside className="w-64 flex-none border-r border-white/5 bg-slate-900/30 overflow-y-auto">
            <div className="p-4 border-b border-white/5 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-sm">Target Watchlist</span>
            </div>

            <ul className="p-2 space-y-1">
                {watchlist.length === 0 ? (
                    <li className="text-xs text-slate-500 p-2 text-center">
                        No symbols in Watchlist. Save them in Historify to stream live.
                    </li>
                ) : (
                    watchlist.map((item) => (
                        <li key={item.id}>
                            <button
                                onClick={() => onSelectSymbol(item.symbol)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                    ${activeSymbol === item.symbol
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'}
                                `}
                            >
                                <div className="flex justify-between items-center">
                                    <span>{item.symbol}</span>
                                    {activeSymbol === item.symbol && (
                                        <RefreshCw className="w-3 h-3 animate-spin text-rose-400" />
                                    )}
                                </div>
                            </button>
                        </li>
                    ))
                )}
            </ul>

            <div className="p-4 border-b border-t border-white/5 flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-sky-400" />
                    <span className="font-semibold text-sm">F&O Universe</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono bg-slate-900 px-1.5 py-0.5 rounded">
                    {fnoData.stocks.length}
                </span>
            </div>

            <div className="px-3 py-2">
                <input
                    type="text"
                    placeholder="Search Options..."
                    value={fnoSearch}
                    onChange={(e) => setFnoSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-md px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500/50"
                />
            </div>

            <ul className="p-2 space-y-1 pb-20">
                {filteredFno.map((symbol) => (
                    <li key={`fno-${symbol}`}>
                        <button
                            onClick={() => onSelectSymbol(symbol)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                 ${activeSymbol === symbol
                                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.1)]'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'}
                             `}
                        >
                            <div className="flex justify-between items-center">
                                <span>{symbol}</span>
                                {activeSymbol === symbol && (
                                    <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                                )}
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        </aside>
    );
}
