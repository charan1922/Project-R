"use client";

import { useLiveSession } from "./_hooks/use-live-session";
import { LiveHeader } from "./_components/LiveHeader";
import { LiveSidebar } from "./_components/LiveSidebar";
import RealtimeChart from "../components/RealtimeChart";

export default function LiveTradingPage() {
    const { 
        activeSymbol, 
        connectionStatus, 
        latestTick, 
        selectSymbol 
    } = useLiveSession();

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden">
            <LiveHeader 
                connectionStatus={connectionStatus}
                activeSymbol={activeSymbol}
                latestTick={latestTick}
            />

            <main className="flex-1 flex overflow-hidden">
                <LiveSidebar 
                    activeSymbol={activeSymbol}
                    onSelectSymbol={selectSymbol}
                />

                <section className="flex-1 relative bg-[#020617] p-1">
                    <RealtimeChart />
                </section>
            </main>
        </div>
    );
}
