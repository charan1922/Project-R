"use client";

import Link from "next/link";
import { Database, RefreshCw, Download } from "lucide-react";
import { StatsCards } from "./_components/StatsCards";
import { QuickActions } from "./_components/QuickActions";
import { QuickDownload } from "./_components/QuickDownload";
import { RecentActivity } from "./_components/RecentActivity";
import { useHistorifyData } from "./_hooks/useHistorifyData";

export default function HistorifyDashboard() {
    const { stats, activity, watchlist, loading, refresh } = useHistorifyData();

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
                            <p className="text-sm text-slate-500">Historical data management · Dhan V2</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={refresh} 
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                        </button>
                        <Link 
                            href="/historify/download" 
                            className="flex items-center gap-2 px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-medium"
                        >
                            <Download className="w-4 h-4" /> Sync All
                        </Link>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6 space-y-6">
                <StatsCards stats={stats} watchlist={watchlist} loading={loading} />
                <QuickActions />
                <QuickDownload watchlist={watchlist} onRefresh={refresh} />
                <RecentActivity activity={activity} loading={loading} />
            </div>
        </div>
    );
}
