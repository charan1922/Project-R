"use client";

import { List, Activity, Clock, CheckCircle2 } from "lucide-react";
import { formatNumber, formatTimestamp } from "@/lib/historify/utils";
import { Stats, WatchlistItem } from "@/lib/historify/types";

interface StatsCardsProps {
  stats: Stats | null;
  watchlist: WatchlistItem[];
  loading: boolean;
}

export function StatsCards({ stats, watchlist, loading }: StatsCardsProps) {
  const syncedCount = watchlist.filter((w) => w.status === "synced").length;
  const qualityPct =
    watchlist.length > 0
      ? Math.round((syncedCount / watchlist.length) * 100)
      : 0;

  const statCards = [
    {
      label: "WATCHLIST SYMBOLS",
      value: loading ? "—" : String(stats?.watchlistCount ?? 0),
      sub: "Across exchanges",
      icon: List,
      color: "text-slate-300",
    },
    {
      label: "TOTAL CANDLES",
      value: loading ? "—" : formatNumber(stats?.totalCandles ?? 0),
      sub: "OHLCV records",
      icon: Activity,
      color: "text-teal-400",
    },
    {
      label: "LAST SYNC",
      value: loading ? "—" : formatTimestamp(stats?.lastSyncTs ?? null),
      sub: "Market close",
      icon: Clock,
      color: "text-sky-400",
    },
    {
      label: "DATA QUALITY",
      value: loading ? "—" : `${qualityPct}%`,
      sub: `${syncedCount}/${watchlist.length} synced`,
      icon: CheckCircle2,
      color: "text-emerald-400",
      progressBar: qualityPct,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map(({ label, value, sub, icon: Icon, color, progressBar }) => (
        <div key={label} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              {label}
            </span>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
          <p className="text-xs text-slate-600 mt-1">{sub}</p>
          {progressBar !== undefined && !loading && (
            <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${progressBar}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
