"use client";

import { Activity } from "lucide-react";
import { LiveTick } from "@/lib/historify/live-store";

interface LiveHeaderProps {
    connectionStatus: string;
    activeSymbol: string | null;
    latestTick: LiveTick | null;
}

export function LiveHeader({ connectionStatus, activeSymbol, latestTick }: LiveHeaderProps) {
    return (
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
    );
}
