"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Play, Pause, Trash2, Plus, CheckCircle2, AlertCircle, Loader2, Inbox } from "lucide-react";

type Job = {
    id: string; name: string; type: "daily" | "interval";
    schedule: string; interval: string; symbols: string;
    nextRun: string; lastRun: string; status: "active" | "paused";
};

type LogItem = { time: string; job: string; symbols: number; status: string; message: string };

export default function SchedulerPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [log, setLog] = useState<LogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newType, setNewType] = useState<"daily" | "interval">("daily");
    const [newName, setNewName] = useState("");
    const [newTime, setNewTime] = useState("15:35");
    const [newMinutes, setNewMinutes] = useState("5");
    const [newInterval, setNewInterval] = useState("Daily");
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetch("/api/historify/jobs").then(r => r.json());
            setJobs(Array.isArray(data) ? data : []);
        } catch { setJobs([]); }
        // Load execution log from activity API
        try {
            const activity = await fetch("/api/historify/activity").then(r => r.json());
            if (Array.isArray(activity)) {
                setLog(activity.filter((a: any) => a.action === "scheduled_sync").map((a: any) => ({
                    time: new Date(a.createdAt * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" }),
                    job: a.symbol,
                    symbols: 1,
                    status: a.status,
                    message: `${a.rows_count} candles ${a.status === "success" ? "synced" : "failed"}`,
                })));
            }
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const createJob = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        const body = {
            id: `job-${Date.now()}`,
            name: newName.trim(),
            type: newType,
            time: newType === "daily" ? newTime : undefined,
            intervalMinutes: newType === "interval" ? parseInt(newMinutes) : undefined,
            dataInterval: newInterval,
            symbols: [], // Scheduler will pull from watchlist at runtime
        };
        await fetch("/api/historify/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        setShowCreate(false); setNewName(""); setSaving(false);
        await load();
    };

    const templateJob = async (name: string, time: string) => {
        const body = { id: `job-${Date.now()}`, name, type: "daily", time, dataInterval: "Daily", symbols: [] };
        await fetch("/api/historify/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        await load();
    };

    const toggle = (id: string) => setJobs(prev => prev.map(j => j.id === id ? { ...j, status: j.status === "active" ? "paused" : "active" } : j));
    const remove = (id: string) => setJobs(prev => prev.filter(j => j.id !== id));

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="px-6 pt-8 pb-6 border-b border-slate-800/60">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-500/30 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Scheduler Manager</h1>
                            <p className="text-sm text-slate-500">Automate data downloads with IST-aware scheduling</p>
                        </div>
                    </div>
                    <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium">
                        <Plus className="w-4 h-4" /> New Schedule
                    </button>
                </div>
            </div>

            <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
                {/* Quick Templates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                        { label: "Market Close (3:35 PM IST)", desc: "Auto-sync all watchlist at market close", time: "15:35", color: "emerald" },
                        { label: "Pre-Market (8:30 AM IST)", desc: "Incremental sync before markets open", time: "08:30", color: "sky" },
                    ].map(t => (
                        <button key={t.label} onClick={() => templateJob(t.label, t.time)}
                            className={`p-4 bg-${t.color}-500/5 border border-${t.color}-500/20 rounded-lg text-left hover:bg-${t.color}-500/10 transition-colors group`}>
                            <div className={`text-sm font-semibold text-${t.color}-400 group-hover:text-${t.color}-300`}>{t.label}</div>
                            <p className="text-xs text-slate-500 mt-1">{t.desc}</p>
                        </button>
                    ))}
                </div>

                {/* Create Form */}
                {showCreate && (
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
                        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Create Schedule</h2>
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Job name (e.g. Evening Sync)"
                            className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
                        <div className="flex gap-1 p-1 bg-slate-800 rounded-lg w-fit">
                            <button onClick={() => setNewType("daily")} className={`px-4 py-1.5 rounded-md text-sm ${newType === "daily" ? "bg-slate-700 text-white" : "text-slate-400"}`}>Daily</button>
                            <button onClick={() => setNewType("interval")} className={`px-4 py-1.5 rounded-md text-sm ${newType === "interval" ? "bg-slate-700 text-white" : "text-slate-400"}`}>Interval</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {newType === "daily" ? (
                                <div>
                                    <label className="text-xs text-slate-500 uppercase mb-1 block">Time (IST)</label>
                                    <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-emerald-500" />
                                </div>
                            ) : (
                                <div>
                                    <label className="text-xs text-slate-500 uppercase mb-1 block">Every N minutes</label>
                                    <select value={newMinutes} onChange={e => setNewMinutes(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200">
                                        {["1", "5", "15", "30", "60"].map(m => <option key={m} value={m}>{m} min</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-slate-500 uppercase mb-1 block">Data Interval</label>
                                <select value={newInterval} onChange={e => setNewInterval(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200">
                                    {["1min", "5min", "15min", "30min", "1hour", "Daily"].map(i => <option key={i}>{i}</option>)}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button onClick={createJob} disabled={saving || !newName.trim()} className="w-full px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 rounded-lg text-white font-medium">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create Job"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Job List */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-slate-800 text-sm font-bold text-slate-300 uppercase tracking-wider">
                        Scheduled Jobs {loading ? "" : `(${jobs.length})`}
                    </div>
                    {loading ? (
                        <div className="p-8 text-center"><Loader2 className="w-6 h-6 text-slate-600 animate-spin mx-auto" /></div>
                    ) : jobs.length === 0 ? (
                        <div className="p-10 text-center">
                            <Inbox className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                            <p className="text-sm text-slate-600">No scheduled jobs. Use a template above or create a custom schedule.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800/50">
                            {jobs.map(job => (
                                <div key={job.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${job.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                                            <span className="text-sm font-semibold text-white">{job.name}</span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">{job.schedule}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => { }} className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-emerald-400" title="Run Now"><Play className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => toggle(job.id)} className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-amber-400">
                                                {job.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                            </button>
                                            <button onClick={() => remove(job.id)} className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                                        <span>Interval: {job.interval}</span>
                                        {job.nextRun && <span>Next: {job.nextRun}</span>}
                                        {job.lastRun && <span>Last: {job.lastRun}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Execution Log */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-slate-800 text-sm font-bold text-slate-300 uppercase tracking-wider">Execution Log</div>
                    {log.length === 0 ? (
                        <div className="p-8 text-center"><p className="text-sm text-slate-600">No scheduled executions have run yet.</p></div>
                    ) : (
                        <div className="divide-y divide-slate-800/50">
                            {log.map((l, i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30">
                                    {l.status === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
                                    <span className="font-mono text-xs text-slate-500 w-20">{l.time}</span>
                                    <span className="text-sm text-slate-300 font-medium">{l.job}</span>
                                    <span className="text-xs text-slate-400 flex-1">{l.message}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
