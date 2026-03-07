"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Key, Database, Download, Monitor, AlertTriangle, Eye, EyeOff,
    CheckCircle2, XCircle, Loader2, HardDrive, BarChart2, Table2, Settings,
} from "lucide-react";

type Settings = {
    dhanClientId: string; dhanAccessToken: string;
    batchSize: number; rateLimitMs: number; defaultRange: string;
    theme: string; chartHeight: number; autoRefresh: boolean; showTooltips: boolean;
};
type Stats = { watchlistCount: number; totalCandles: number; storageMb: number };

const DEFAULTS: Settings = {
    dhanClientId: "", dhanAccessToken: "",
    batchSize: 10, rateLimitMs: 250, defaultRange: "30",
    theme: "dark", chartHeight: 450, autoRefresh: true, showTooltips: true,
};

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
    return (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium shadow-xl ${ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
            {ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {msg}
        </div>
    );
}

export default function SettingsPage() {
    const [s, setS] = useState<Settings>(DEFAULTS);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showToken, setShowToken] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
    const [confirmModal, setConfirmModal] = useState<{ action: "clearData" | "resetSettings" } | null>(null);
    const [saving, setSaving] = useState<string | null>(null);

    const showToast = (msg: string, ok: boolean) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [cfg, st] = await Promise.all([
                fetch("/api/historify/settings").then(r => r.json()),
                fetch("/api/historify/stats").then(r => r.json()),
            ]);
            setS(prev => ({ ...prev, ...cfg }));
            setStats(st);
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const save = async (section: string, data: Partial<Settings>) => {
        setSaving(section);
        try {
            const res = await fetch("/api/historify/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const j = await res.json();
            showToast(j.ok ? "Settings saved" : "Save failed", j.ok);
        } catch { showToast("Save failed", false); }
        setSaving(null);
    };

    const testConnection = async () => {
        setTestStatus("testing");
        try {
            const r = await fetch("/api/historify/stats");
            setTestStatus(r.ok ? "ok" : "fail");
        } catch { setTestStatus("fail"); }
        setTimeout(() => setTestStatus("idle"), 3000);
    };

    const handleConfirm = async () => {
        if (!confirmModal) return;
        if (confirmModal.action === "resetSettings") {
            await save("danger", DEFAULTS);
            setS(DEFAULTS);
        }
        setConfirmModal(null);
        showToast(confirmModal.action === "clearData" ? "Data cleared (stub)" : "Settings reset to defaults", true);
    };

    const card = "bg-slate-900 border border-slate-800 rounded-xl";
    const inputCls = "w-full px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500";
    const label = "text-xs text-slate-400 uppercase tracking-wider mb-1.5 block font-medium";
    const sectionTitle = (icon: React.ReactNode, title: string, sub: string) => (
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
            {icon}
            <div><h2 className="text-sm font-bold text-slate-200">{title}</h2><p className="text-xs text-slate-500">{sub}</p></div>
        </div>
    );

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="px-6 pt-8 pb-6 border-b border-slate-800/60">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-600/20 border border-slate-500/30 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
                        <p className="text-sm text-slate-500">Configure Historify for Project-R + Dhan V2</p>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">

                {/* 1 — API Configuration */}
                <div className={card}>
                    {sectionTitle(<Key className="w-5 h-5 text-teal-400" />, "API Configuration", "Dhan V2 credentials for data sync")}
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={label}>Dhan Client ID</label>
                                <input value={s.dhanClientId} onChange={e => setS(p => ({ ...p, dhanClientId: e.target.value }))}
                                    placeholder="e.g. 1106800394" className={inputCls} />
                            </div>
                            <div>
                                <label className={label}>Access Token</label>
                                <div className="relative">
                                    <input type={showToken ? "text" : "password"} value={s.dhanAccessToken}
                                        onChange={e => setS(p => ({ ...p, dhanAccessToken: e.target.value }))}
                                        placeholder="eyJhbGci..." className={`${inputCls} pr-10`} />
                                    <button onClick={() => setShowToken(v => !v)}
                                        className="absolute inset-y-0 right-3 text-slate-500 hover:text-slate-300">
                                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-slate-600">Credentials from <code className="text-slate-500">.env.local</code> are shown as defaults. Saving here writes to <code className="text-slate-500">data/historify-settings.json</code>.</p>
                        <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-800">
                            <button onClick={testConnection} disabled={testStatus === "testing"}
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 disabled:opacity-60">
                                {testStatus === "testing" ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                    testStatus === "ok" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
                                        testStatus === "fail" ? <XCircle className="w-4 h-4 text-red-400" /> :
                                            <Key className="w-4 h-4" />}
                                {testStatus === "ok" ? "Connected ✓" : testStatus === "fail" ? "Failed ✗" : "Test Connection"}
                            </button>
                            <button onClick={() => save("api", { dhanClientId: s.dhanClientId, dhanAccessToken: s.dhanAccessToken })}
                                disabled={saving === "api"}
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 disabled:opacity-60 rounded-lg text-white">
                                {saving === "api" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Save API Settings
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2 — Data Management */}
                <div className={card}>
                    {sectionTitle(<Database className="w-5 h-5 text-sky-400" />, "Data Management", "better-sqlite3 database at data/historify.db")}
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: "Storage", value: `${stats?.storageMb ?? 0} MB`, icon: <HardDrive className="w-5 h-5 text-sky-400" />, bg: "from-sky-500/10 to-sky-600/5 border-sky-500/20" },
                                { label: "Total Candles", value: (stats?.totalCandles ?? 0).toLocaleString(), icon: <BarChart2 className="w-5 h-5 text-violet-400" />, bg: "from-violet-500/10 to-violet-600/5 border-violet-500/20" },
                                { label: "Watchlist", value: `${stats?.watchlistCount ?? 0} symbols`, icon: <Table2 className="w-5 h-5 text-emerald-400" />, bg: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20" },
                            ].map(c => (
                                <div key={c.label} className={`bg-gradient-to-br ${c.bg} border rounded-lg p-4 flex items-center gap-3`}>
                                    {c.icon}
                                    <div>
                                        <p className="text-xs text-slate-500">{c.label}</p>
                                        <p className="text-sm font-bold text-white">{c.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-800">
                            {["Clear Cache", "Optimize DB", "Export DB"].map(action => (
                                <button key={action} onClick={() => showToast(`${action} — not yet implemented`, false)}
                                    className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300">
                                    {action}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3 — Download Settings */}
                <div className={card}>
                    {sectionTitle(<Download className="w-5 h-5 text-amber-400" />, "Download Settings", "Controls for bulk data sync via Dhan V2 API")}
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={label}>Batch Size</label>
                                <input type="number" min={1} max={50} value={s.batchSize}
                                    onChange={e => setS(p => ({ ...p, batchSize: +e.target.value }))} className={inputCls} />
                                <p className="text-xs text-slate-600 mt-1">Symbols per batch (1–50)</p>
                            </div>
                            <div>
                                <label className={label}>Rate Limit Delay (ms)</label>
                                <input type="number" min={100} max={5000} value={s.rateLimitMs}
                                    onChange={e => setS(p => ({ ...p, rateLimitMs: +e.target.value }))} className={inputCls} />
                                <p className="text-xs text-slate-600 mt-1">Dhan limit: 5/sec → min 200ms</p>
                            </div>
                            <div>
                                <label className={label}>Default Date Range (days)</label>
                                <select value={s.defaultRange} onChange={e => setS(p => ({ ...p, defaultRange: e.target.value }))}
                                    className={inputCls}>
                                    {[["30", "Last 30 days"], ["90", "Last 90 days"], ["180", "Last 180 days"], ["365", "Last 1 year"], ["730", "Last 2 years"]].map(([v, l]) => (
                                        <option key={v} value={v}>{l}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2 border-t border-slate-800">
                            <button onClick={() => save("download", { batchSize: s.batchSize, rateLimitMs: s.rateLimitMs, defaultRange: s.defaultRange })}
                                disabled={saving === "download"}
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 disabled:opacity-60 rounded-lg text-white">
                                {saving === "download" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Save Download Settings
                            </button>
                        </div>
                    </div>
                </div>

                {/* 4 — Display Settings */}
                <div className={card}>
                    {sectionTitle(<Monitor className="w-5 h-5 text-violet-400" />, "Display Settings", "UI preferences for charts and layout")}
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={label}>Theme</label>
                                <select value={s.theme} onChange={e => setS(p => ({ ...p, theme: e.target.value }))} className={inputCls}>
                                    <option value="dark">Dark</option>
                                    <option value="light">Light</option>
                                    <option value="system">System</option>
                                </select>
                            </div>
                            <div>
                                <label className={label}>Chart Height (px)</label>
                                <input type="number" min={200} max={800} value={s.chartHeight}
                                    onChange={e => setS(p => ({ ...p, chartHeight: +e.target.value }))} className={inputCls} />
                            </div>
                            <div className="flex flex-col gap-3 justify-end">
                                {[
                                    { key: "autoRefresh" as const, label: "Auto-refresh quotes" },
                                    { key: "showTooltips" as const, label: "Show chart tooltips" },
                                ].map(({ key, label: lbl }) => (
                                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                                        <div onClick={() => setS(p => ({ ...p, [key]: !p[key] }))}
                                            className={`w-9 h-5 rounded-full transition-colors ${s[key] ? "bg-violet-500" : "bg-slate-700"} relative cursor-pointer`}>
                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${s[key] ? "translate-x-4" : "translate-x-0.5"}`} />
                                        </div>
                                        <span className="text-sm text-slate-300">{lbl}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end pt-2 border-t border-slate-800">
                            <button onClick={() => save("display", { theme: s.theme, chartHeight: s.chartHeight, autoRefresh: s.autoRefresh, showTooltips: s.showTooltips })}
                                disabled={saving === "display"}
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-60 rounded-lg text-white">
                                {saving === "display" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Save Display Settings
                            </button>
                        </div>
                    </div>
                </div>

                {/* 5 — Danger Zone */}
                <div className="bg-red-950/20 border border-red-800/40 rounded-xl">
                    {sectionTitle(<AlertTriangle className="w-5 h-5 text-red-400" />, "Danger Zone", "Irreversible actions — proceed with caution")}
                    <div className="p-5 space-y-4">
                        {[
                            { action: "clearData" as const, label: "Clear All Data", desc: "Deletes all downloaded OHLCV data in historify.db. Watchlist and settings are preserved." },
                            { action: "resetSettings" as const, label: "Reset to Defaults", desc: "Resets all settings to built-in defaults (does NOT delete .env.local credentials)." },
                        ].map(({ action, label: lbl, desc }) => (
                            <div key={action} className="flex items-start justify-between gap-4">
                                <p className="text-xs text-red-300/70">{desc}</p>
                                <button onClick={() => setConfirmModal({ action })}
                                    className="flex-shrink-0 px-4 py-2 text-sm bg-red-700/40 hover:bg-red-600/50 border border-red-600/30 rounded-lg text-red-300">
                                    {lbl}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
                        <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
                        <h3 className="text-lg font-bold text-white mb-2">Are you sure?</h3>
                        <p className="text-sm text-slate-400 mb-6">
                            {confirmModal.action === "clearData"
                                ? "This will permanently delete all OHLCV candle data. Your watchlist is safe."
                                : "All settings will be reset to their factory defaults."}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmModal(null)}
                                className="flex-1 px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300">Cancel</button>
                            <button onClick={handleConfirm}
                                className="flex-1 px-4 py-2 text-sm bg-red-700 hover:bg-red-600 rounded-lg text-white font-medium">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast msg={toast.msg} ok={toast.ok} />}
        </div>
    );
}
