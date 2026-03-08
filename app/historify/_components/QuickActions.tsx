"use client";

import Link from "next/link";
import { Upload, Download, HardDrive, BarChart2, Clock, List } from "lucide-react";

const QUICK_ACTIONS = [
  { label: "Import Symbols", href: "/historify/import", icon: Upload },
  { label: "Bulk Download", href: "/historify/download", icon: Download },
  { label: "Export Data", href: "/historify/export", icon: HardDrive },
  { label: "View Charts", href: "/historify/charts", icon: BarChart2 },
  { label: "Manage Scheduler", href: "/historify/scheduler", icon: Clock },
  { label: "View Watchlist", href: "/historify/watchlist", icon: List },
];

export function QuickActions() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
      <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
        QUICK ACTIONS
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-slate-500 group-hover:text-teal-400" />
              {label}
            </div>
            <span className="text-slate-600 group-hover:text-slate-400">↗</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
