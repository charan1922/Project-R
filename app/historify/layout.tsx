"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Database, List, Download, BarChart2, Clock, Upload, HardDrive, Settings,
} from "lucide-react";

const NAV = [
    { href: "/historify", label: "Dashboard", icon: Database, color: "text-teal-400", active: "bg-teal-500/10 border-teal-500/20 text-teal-300" },
    { href: "/historify/watchlist", label: "Watchlist", icon: List, color: "text-teal-400", active: "bg-teal-500/10 border-teal-500/20 text-teal-300" },
    { href: "/historify/download", label: "Download", icon: Download, color: "text-sky-400", active: "bg-sky-500/10 border-sky-500/20 text-sky-300" },
    { href: "/historify/charts", label: "Charts", icon: BarChart2, color: "text-amber-400", active: "bg-amber-500/10 border-amber-500/20 text-amber-300" },
    { href: "/historify/scheduler", label: "Scheduler", icon: Clock, color: "text-emerald-400", active: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" },
    { href: "/historify/import", label: "Import", icon: Upload, color: "text-teal-400", active: "bg-teal-500/10 border-teal-500/20 text-teal-300" },
    { href: "/historify/export", label: "Export", icon: HardDrive, color: "text-violet-400", active: "bg-violet-500/10 border-violet-500/20 text-violet-300" },
    { href: "/historify/settings", label: "Settings", icon: Settings, color: "text-slate-400", active: "bg-slate-500/10 border-slate-500/20 text-slate-300" },
];

function Sidebar() {
    const pathname = usePathname();
    return (
        <aside className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
            <div className="px-4 py-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-teal-400" />
                    <span className="text-sm font-bold text-white tracking-tight">Historify</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-0.5">Dhan V2 · Project-R</p>
            </div>
            <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
                {NAV.map(({ href, label, icon: Icon, color, active }) => {
                    const isActive = href === "/historify" ? pathname === href : pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${isActive ? active + " border" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-transparent"}`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? "" : color}`} />
                            {label}
                        </Link>
                    );
                })}
            </nav>
            <div className="px-4 py-3 border-t border-slate-800">
                <p className="text-[10px] text-slate-600">Dhan V2 API</p>
            </div>
        </aside>
    );
}

export default function HistorifyLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-slate-950">
            <Sidebar />
            <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
        </div>
    );
}
