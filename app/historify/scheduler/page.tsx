'use client';

import {
  BarChart2,
  CheckCircle2,
  Clock,
  Database,
  FlaskConical,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type JobType = 'historify' | 'bhavcopy' | 'master' | 'backtest' | 'backtest-all' | 'rfactor' | 'dhan-daily';

type Job = {
  id: string;
  name: string;
  type: 'daily' | 'interval';
  jobType: JobType;
  time?: string;
  intervalMinutes?: number;
  dataInterval?: string;
  symbols?: string[];
  enabled: boolean;
  status: 'active' | 'paused' | 'error';
  lastRun: string;
  lastResult: string;
  nextRun: string;
};

type Template = {
  name: string;
  description: string;
  config: Record<string, unknown>;
};

const JOB_TYPE_META: Record<JobType, { label: string; icon: typeof Clock; color: string }> = {
  bhavcopy: { label: 'Bhavcopy', icon: BarChart2, color: 'text-amber-400' },
  master: { label: 'Master Contracts', icon: Database, color: 'text-sky-400' },
  historify: { label: 'Historify', icon: Clock, color: 'text-teal-400' },
  backtest: { label: 'Backtest Data', icon: FlaskConical, color: 'text-violet-400' },
  'backtest-all': { label: 'All TF Stocks', icon: Database, color: 'text-orange-400' },
  rfactor: { label: 'R-Factor', icon: Zap, color: 'text-emerald-400' },
  'dhan-daily': { label: 'Dhan Daily', icon: Database, color: 'text-violet-400' },
};

export default function SchedulerPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch('/api/historify/jobs').then((r) => r.json());
      setJobs(data.jobs ?? []);
      setTemplates(data.templates ?? []);
    } catch {
      setJobs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addTemplate = async (name: string) => {
    await fetch('/api/historify/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'template', templateName: name }),
    });
    load();
  };

  const toggleJob = async (id: string) => {
    await fetch('/api/historify/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id }),
    });
    load();
  };

  const deleteJob = async (id: string) => {
    await fetch('/api/historify/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    load();
  };

  const runNow = async (id: string) => {
    setRunning(id);
    await fetch('/api/historify/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'run', id }),
    });
    setRunning(null);
    load();
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
      </div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
            <Clock className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Data Scheduler</h1>
            <p className="text-sm text-slate-500">
              Cron jobs for bhavcopy, Dhan history cache, master contracts, backtest data, historify, R-Factor
            </p>
          </div>
        </div>
        <button type="button" onClick={load} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Templates */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Templates</h2>
        <div className="grid grid-cols-3 gap-2">
          {templates.map((t) => {
            const jt = (t.config as { jobType?: JobType }).jobType ?? 'historify';
            const meta = JOB_TYPE_META[jt];
            const Icon = meta.icon;
            const alreadyExists = jobs.some((j) => j.name === t.name);
            return (
              <button
                key={t.name}
                type="button"
                onClick={() => addTemplate(t.name)}
                disabled={alreadyExists}
                className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  alreadyExists
                    ? 'bg-slate-900/30 border-slate-800/30 opacity-50 cursor-not-allowed'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                  <span className="text-xs font-medium text-white">{t.name}</span>
                  {alreadyExists && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </div>
                <p className="text-[10px] text-slate-600">{t.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Jobs */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduled Jobs ({jobs.length})</h2>

        {jobs.length === 0 && (
          <div className="text-center py-12 text-slate-600 text-sm">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
            No jobs scheduled. Click a template above to get started.
          </div>
        )}

        {jobs.map((job) => {
          const meta = JOB_TYPE_META[job.jobType] ?? JOB_TYPE_META.historify;
          const Icon = meta.icon;
          const isRunning = running === job.id;
          return (
            <div
              key={job.id}
              className={`rounded-xl border overflow-hidden ${
                job.status === 'error'
                  ? 'bg-red-950/20 border-red-800/40'
                  : job.status === 'paused'
                    ? 'bg-slate-900/50 border-slate-800/50'
                    : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${job.status === 'paused' ? 'text-slate-600' : meta.color}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${job.status === 'paused' ? 'text-slate-500' : 'text-white'}`}
                      >
                        {job.name}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${
                          job.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : job.status === 'error'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-600 mt-0.5">
                      <span>
                        {job.type === 'daily'
                          ? `Daily at ${job.time} IST`
                          : `Every ${job.intervalMinutes}min (market hours)`}
                      </span>
                      {job.nextRun && (
                        <span>
                          Next:{' '}
                          {new Date(job.nextRun).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Kolkata',
                          })}
                        </span>
                      )}
                      {job.lastRun !== 'Never' && (
                        <span>
                          Last:{' '}
                          {new Date(job.lastRun).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            timeZone: 'Asia/Kolkata',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => runNow(job.id)}
                    disabled={isRunning}
                    className="p-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-50"
                    title="Run now"
                  >
                    {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleJob(job.id)}
                    className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400"
                    title={job.status === 'active' ? 'Pause' : 'Resume'}
                  >
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteJob(job.id)}
                    className="p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {job.lastResult && (
                <div
                  className={`px-4 py-2 border-t text-[10px] ${
                    job.lastResult.startsWith('Error')
                      ? 'border-red-800/40 text-red-400'
                      : 'border-slate-800/50 text-slate-500'
                  }`}
                >
                  {job.lastResult}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-slate-700 space-y-1 px-1">
        <p>
          Jobs run via <code className="text-slate-500">node-schedule</code> cron (Mon-Fri only). In-memory — restart
          clears all jobs.
        </p>
        <p>
          Rate limits: Dhan 5 req/sec. NSE bhavcopy needs session cookie (auto-managed). Backtest download ~2 min for 20
          stocks.
        </p>
        <p>Dhan historical cache jobs trigger the scalable missing-date sync used by Bhav vs Dhan compare.</p>
      </div>
    </div>
  );
}
