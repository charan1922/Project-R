"use client";

import { useEffect, useState } from "react";
import { Activity, Shield, TrendingUp, TrendingDown, RefreshCw, Zap } from "lucide-react";
import { useLiveTradingStore, LiveTick } from "@/lib/historify/live-store";
import RealtimeChart from "../components/RealtimeChart";
import fnoData from "@/lib/data/fno_stocks_list.json";

interface WatchlistItem {
    id: number;
    symbol: string;
    added_at: string;
}

export default function LiveTradingPage() {
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [fnoSearch, setFnoSearch] = useState("");

    const activeSymbol = useLiveTradingStore((state) => state.activeSymbol);
    const setActiveSymbol = useLiveTradingStore((state) => state.setActiveSymbol);
    const setConnectionStatus = useLiveTradingStore((state) => state.setConnectionStatus);
    const setLatestTick = useLiveTradingStore((state) => state.setLatestTick);
    const connectionStatus = useLiveTradingStore((state) => state.connectionStatus);
    const latestTick = useLiveTradingStore((state) => state.latestTick);

    // 1. Fetch user's existing Watchlist
    useEffect(() => {
        fetch("/api/historify/watchlist")
            .then(res => res.json())
            .then(data => {
                if (data.watchlist) setWatchlist(data.watchlist);
            })
            .catch(console.error);
    }, []);

    // 2. Manage Server-Sent Events (SSE) Stream
    useEffect(() => {
        setConnectionStatus("connecting");
        const eventSource = new EventSource("/api/historify/live-stream");

        eventSource.onopen = () => {
            setConnectionStatus("connected");
        };

        eventSource.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);

                // Dhan's Feed Response provides 'quote' packets mapped to OHLCV
                if (parsed.event === 'quote') {
                    const data = parsed.data;
                    const tick: LiveTick = {
                        time: Date.now(), // Lightweight Charts expects milliseconds for parsing into its Unix Time format
                        open: data.open,
                        high: data.high,
                        low: data.low,
                        close: data.close,
                        volume: data.volume,
                    };
                    setLatestTick(tick);
                }
                else if (parsed.event === 'ticker') {
                    // Ticker is just LTP updates. 
                    // Usually we rely on Quotes for complete OHLCV candlestick plotting, 
                    // but we can fast-update the Close price if needed.
                }

            } catch (e) {
                console.error("SSE Parse Error", e);
            }
        };

        eventSource.onerror = (e) => {
            console.error("SSE Connection Error", e);
            setConnectionStatus("error");
            // The browser EventSource will auto-reconnect automatically.
        };

        return () => {
            eventSource.close();
            setConnectionStatus("disconnected");
        };
    }, [setConnectionStatus, setLatestTick]);

    // 3. Handle Symbol Subscription Changes
    const handleSelectSymbol = async (symbol: string) => {
        if (activeSymbol === symbol) return;

        // Unsubscribe old symbol
        if (activeSymbol) {
            await fetch('/api/historify/live-feed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'unsubscribe', symbol: activeSymbol })
            });
        }

        setActiveSymbol(symbol);

        // Subscribe new symbol
        await fetch('/api/historify/live-feed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'subscribe', symbol })
        });
    };

    // Component unmount logic (unsubscribe active)
    useEffect(() => {
        return () => {
            if (activeSymbol) {
                fetch('/api/historify/live-feed', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    keepalive: true, // Fire and forget during unmount
                    body: JSON.stringify({ action: 'unsubscribe', symbol: activeSymbol })
                }).catch(console.error);
            }
        };
    }, [activeSymbol]);

    // Derived F&O search
    const filteredFno = fnoData.stocks.filter(s => s.toLowerCase().includes(fnoSearch.toLowerCase())).slice(0, 50);

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden">
            {/* Header */}
            <header className="flex-none p-4 flex items-center justify-between border-b border-white/5 bg-slate-900/50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-orange-400">
                            Live Trading
                        </h1>
                        <p className="text-xs font-mono text-slate-500 flex items-center gap-2">
                            <span className="flex h-2 w-2 relative">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            </span>
                            {connectionStatus.toUpperCase()} WEBSOCKET
                        </p>
                    </div>
                </div>

                {activeSymbol && latestTick && (
                    <div className="flex items-center gap-6 text-sm font-mono border border-white/10 rounded-lg px-4 py-2 bg-slate-900/80">
                        <div className="flex flex-col">
                            <span className="text-slate-500 text-[10px] uppercase">LTP</span>
                            <span className={`font-bold text-lg ${latestTick.close >= latestTick.open ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ₹{latestTick.close.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-slate-500 text-[10px] uppercase">Volume</span>
                            <span className="font-semibold text-slate-300">
                                {latestTick.volume ? latestTick.volume.toLocaleString() : '-'}
                            </span>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content Layout */}
            <main className="flex-1 flex overflow-hidden">

                {/* Watchlist Sidebar */}
                <aside className="w-64 flex-none border-r border-white/5 bg-slate-900/30 overflow-y-auto">
                    <div className="p-4 border-b border-white/5 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-sm">Target Watchlist</span>
                    </div>

                    <ul className="p-2 space-y-1">
                        {watchlist.length === 0 ? (
                            <li className="text-xs text-slate-500 p-2 text-center">No symbols in Watchlist. Save them in Historify to stream live.</li>
                        ) : (
                            watchlist.map((item) => (
                                <li key={item.id}>
                                    <button
                                        onClick={() => handleSelectSymbol(item.symbol)}
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
                        <span className="text-[10px] text-slate-500 font-mono bg-slate-900 px-1.5 py-0.5 rounded">{fnoData.stocks.length}</span>
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
                                    onClick={() => handleSelectSymbol(symbol)}
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
                        {fnoSearch === "" && fnoData.stocks.length > 50 && (
                            <li className="text-[10px] text-slate-500 text-center pt-2">Showing top 50. Use search.</li>
                        )}
                    </ul>
                </aside>

                {/* Interactive Chart Canvas Area */}
                <section className="flex-1 relative bg-[#020617] p-1">
                    <RealtimeChart />
                </section>
            </main>
        </div>
    );
}
