"use client";

import { Activity, AlertCircle, Loader2 } from "lucide-react";
import { ACTIVITY_CONFIG, DEFAULT_ACTIVITY_CONFIG } from "@/lib/historify/utils";
import { ActivityItem } from "@/lib/historify/types";

interface RecentActivityProps {
  activity: ActivityItem[];
  loading: boolean;
}

export function RecentActivity({ activity, loading }: RecentActivityProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-slate-800 text-sm font-bold text-slate-500 uppercase tracking-widest">
        Recent Activity
      </div>
      {loading ? (
        <div className="p-8 text-center">
          <Loader2 className="w-6 h-6 text-slate-600 animate-spin mx-auto" />
        </div>
      ) : activity.length === 0 ? (
        <div className="p-8 text-center">
          <AlertCircle className="w-8 h-8 text-slate-700 mx-auto mb-2" />
          <p className="text-sm text-slate-600">
            No activity yet. Start by importing symbols and syncing data.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/50">
          {activity.map((a, i) => {
            const cfg = ACTIVITY_CONFIG[a.action] ?? DEFAULT_ACTIVITY_CONFIG;
            const Icon = cfg.icon;
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30">
                <div
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
                >
                  <Icon className={`w-4 h-4 ${cfg.ic}`} />
                </div>
                <span className="text-xs text-slate-500 capitalize">
                  {a.action.replace(/_/g, " ")}
                </span>
                <span className="font-mono font-bold text-sm text-white">{a.symbol}</span>
                <span className="text-xs text-slate-500">{a.exchange}</span>
                <span className="text-xs text-slate-500">{a.interval}</span>
                <span className="ml-auto text-xs text-slate-500">
                  {a.rows_count > 0 ? `${a.rows_count.toLocaleString()} rows` : ""}
                </span>
                <span className="text-xs text-slate-600">
                  {new Date(a.createdAt * 1000).toLocaleTimeString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
