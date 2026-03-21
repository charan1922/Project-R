'use client';

import {
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  Clock,
  Database,
  Download,
  HardDrive,
  Loader2,
  Monitor,
  Settings,
  Shield,
  Table2,
  Wifi,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

type DisplaySettings = {
  batchSize: number;
  rateLimitMs: number;
  defaultRange: string;
  chartHeight: number;
  autoRefresh: boolean;
  showTooltips: boolean;
};

type Stats = {
  watchlistCount: number;
  masterContractsCount: number;
  bhavcopyDaysCount: number;
  storageMb: number;
  lastMasterSync: string | null;
};

type ConnectionResult = {
  ok: boolean;
  method: 'totp' | 'static' | 'none';
  clientId: string | null;
  latencyMs?: number;
  proof?: { symbol: string; lastPrice: number } | null;
  error?: string;
};

// ── Defaults ───────────────────────────────────────────────────────────────

const DEFAULTS: DisplaySettings = {
  batchSize: 10,
  rateLimitMs: 250,
  defaultRange: '30',
  chartHeight: 450,
  autoRefresh: true,
  showTooltips: true,
};

// ── Toast ──────────────────────────────────────────────────────────────────

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium shadow-xl ${ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}
    >
      {ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {msg}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULTS);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Connection test state
  const [connStatus, setConnStatus] = useState<'idle' | 'testing'>('idle');
  const [connResult, setConnResult] = useState<ConnectionResult | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load settings + stats ──────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, st] = await Promise.all([
        fetch('/api/historify/settings').then((r) => r.json()),
        fetch('/api/historify/stats').then((r) => r.json()),
      ]);
      setSettings((prev) => ({ ...prev, ...cfg }));
      setStats(st);
    } catch {
      /* silently fail — defaults shown */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Save settings ──────────────────────────────────────────────────────

  const save = async (section: string, data: Partial<DisplaySettings>) => {
    setSaving(section);
    try {
      const res = await fetch('/api/historify/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const j = await res.json();
      showToast(j.ok ? 'Settings saved' : j.error || 'Save failed', j.ok);
    } catch {
      showToast('Save failed', false);
    }
    setSaving(null);
  };

  // ── Test Dhan connection ───────────────────────────────────────────────

  const testConnection = async () => {
    setConnStatus('testing');
    setConnResult(null);
    try {
      const r = await fetch('/api/historify/test-connection');
      const data: ConnectionResult = await r.json();
      setConnResult(data);
    } catch {
      setConnResult({ ok: false, method: 'none', clientId: null, error: 'Request failed' });
    }
    setConnStatus('idle');
  };

  // ── Reset to defaults ──────────────────────────────────────────────────

  const handleReset = async () => {
    setConfirmReset(false);
    await save('reset', DEFAULTS);
    setSettings(DEFAULTS);
    showToast('Settings reset to defaults', true);
  };

  // ── Styles ─────────────────────────────────────────────────────────────

  const card = 'bg-slate-900/60 border border-slate-800 rounded-xl';
  const inputCls =
    'w-full px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30';
  const labelCls = 'text-xs text-slate-400 uppercase tracking-wider mb-1.5 block font-medium';
  const btnPrimary =
    'flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white disabled:opacity-60 transition-colors';

  const sectionHeader = (icon: React.ReactNode, title: string, sub: string) => (
    <div className="px-5 py-4 border-b border-slate-800/80 flex items-center gap-3">
      {icon}
      <div>
        <h2 className="text-sm font-bold text-slate-200">{title}</h2>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
    </div>
  );

  // ── Loading state ──────────────────────────────────────────────────────

  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
      </div>
    );

  const methodLabel =
    connResult?.method === 'totp'
      ? 'TOTP Auto-Gen'
      : connResult?.method === 'static'
        ? 'Static Token'
        : 'Not Configured';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-600/20 border border-slate-500/30 flex items-center justify-center">
            <Settings className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
            <p className="text-sm text-slate-500">Historify configuration and Dhan V2 connection</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        {/* ── 1. Dhan Connection ────────────────────────────────────── */}
        <div className={card}>
          {sectionHeader(
            <Wifi className="w-5 h-5 text-teal-400" />,
            'Dhan Connection',
            'API credentials managed via .env.local',
          )}
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Auth Method</p>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-teal-400" />
                  <span className="text-sm font-medium text-slate-200">{connResult ? methodLabel : 'Check below'}</span>
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Client ID</p>
                <p className="text-sm font-mono text-slate-300">{connResult?.clientId || '••••••••'}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Status</p>
                {connResult ? (
                  <div className="flex items-center gap-2">
                    {connResult.ok ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-emerald-400">Connected</span>
                        {connResult.latencyMs != null && (
                          <span className="text-xs text-slate-500">{connResult.latencyMs}ms</span>
                        )}
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-red-400">Failed</span>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-slate-500">Not tested</span>
                )}
              </div>
            </div>

            {/* Connection result detail */}
            {connResult && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  connResult.ok
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/5 border-red-500/20 text-red-300'
                }`}
              >
                {connResult.ok && connResult.proof ? (
                  <span>
                    Dhan API responding — {connResult.proof.symbol} LTP:{' '}
                    {connResult.proof.lastPrice.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                  </span>
                ) : connResult.error ? (
                  <span>{connResult.error}</span>
                ) : null}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={testConnection}
                disabled={connStatus === 'testing'}
                className={`${btnPrimary} bg-teal-600 hover:bg-teal-500`}
              >
                {connStatus === 'testing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : connResult?.ok ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
                {connStatus === 'testing' ? 'Testing...' : 'Test Connection'}
              </button>
              <p className="text-xs text-slate-600">Calls Dhan V2 API with your credentials to verify connectivity</p>
            </div>
          </div>
        </div>

        {/* ── 2. Data Overview ──────────────────────────────────────── */}
        <div className={card}>
          {sectionHeader(
            <Database className="w-5 h-5 text-sky-400" />,
            'Data Overview',
            'SQLite database at data/project-r.db',
          )}
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: 'DB Size',
                  value: `${stats?.storageMb ?? 0} MB`,
                  icon: <HardDrive className="w-5 h-5 text-sky-400" />,
                  color: 'from-sky-500/10 to-sky-600/5 border-sky-500/20',
                },
                {
                  label: 'Watchlist',
                  value: `${stats?.watchlistCount ?? 0}`,
                  icon: <Table2 className="w-5 h-5 text-emerald-400" />,
                  color: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
                },
                {
                  label: 'Master Contracts',
                  value: (stats?.masterContractsCount ?? 0).toLocaleString(),
                  icon: <BarChart2 className="w-5 h-5 text-violet-400" />,
                  color: 'from-violet-500/10 to-violet-600/5 border-violet-500/20',
                },
                {
                  label: 'Bhavcopy Days',
                  value: (stats?.bhavcopyDaysCount ?? 0).toLocaleString(),
                  icon: <Clock className="w-5 h-5 text-amber-400" />,
                  color: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
                },
              ].map((c) => (
                <div
                  key={c.label}
                  className={`bg-gradient-to-br ${c.color} border rounded-lg p-4 flex items-center gap-3`}
                >
                  {c.icon}
                  <div>
                    <p className="text-xs text-slate-500">{c.label}</p>
                    <p className="text-sm font-bold text-white">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
            {stats?.lastMasterSync && (
              <p className="text-xs text-slate-600 mt-3">Last master contracts sync: {stats.lastMasterSync}</p>
            )}
          </div>
        </div>

        {/* ── 3. Download Settings ─────────────────────────────────── */}
        <div className={card}>
          {sectionHeader(
            <Download className="w-5 h-5 text-amber-400" />,
            'Download Settings',
            'Controls for bulk data sync via Dhan V2 API',
          )}
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="batchSize" className={labelCls}>
                  Batch Size
                </label>
                <input
                  id="batchSize"
                  type="number"
                  min={1}
                  max={50}
                  value={settings.batchSize}
                  onChange={(e) => setSettings((p) => ({ ...p, batchSize: +e.target.value }))}
                  className={inputCls}
                />
                <p className="text-xs text-slate-600 mt-1">Symbols per batch (1-50)</p>
              </div>
              <div>
                <label htmlFor="rateLimitMs" className={labelCls}>
                  Rate Limit Delay (ms)
                </label>
                <input
                  id="rateLimitMs"
                  type="number"
                  min={100}
                  max={5000}
                  value={settings.rateLimitMs}
                  onChange={(e) => setSettings((p) => ({ ...p, rateLimitMs: +e.target.value }))}
                  className={inputCls}
                />
                <p className="text-xs text-slate-600 mt-1">Dhan limit: 5/sec, min 200ms</p>
              </div>
              <div>
                <label htmlFor="defaultRange" className={labelCls}>
                  Default Date Range
                </label>
                <select
                  id="defaultRange"
                  value={settings.defaultRange}
                  onChange={(e) => setSettings((p) => ({ ...p, defaultRange: e.target.value }))}
                  className={inputCls}
                >
                  {[
                    ['30', 'Last 30 days'],
                    ['90', 'Last 90 days'],
                    ['180', 'Last 180 days'],
                    ['365', 'Last 1 year'],
                    ['730', 'Last 2 years'],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() =>
                  save('download', {
                    batchSize: settings.batchSize,
                    rateLimitMs: settings.rateLimitMs,
                    defaultRange: settings.defaultRange,
                  })
                }
                disabled={saving === 'download'}
                className={`${btnPrimary} bg-amber-600 hover:bg-amber-500`}
              >
                {saving === 'download' && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Download Settings
              </button>
            </div>
          </div>
        </div>

        {/* ── 4. Display Settings ──────────────────────────────────── */}
        <div className={card}>
          {sectionHeader(
            <Monitor className="w-5 h-5 text-violet-400" />,
            'Display Settings',
            'Chart and UI preferences',
          )}
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="chartHeight" className={labelCls}>
                  Chart Height (px)
                </label>
                <input
                  id="chartHeight"
                  type="number"
                  min={200}
                  max={800}
                  value={settings.chartHeight}
                  onChange={(e) => setSettings((p) => ({ ...p, chartHeight: +e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-3 justify-end md:col-span-2">
                {(
                  [
                    { key: 'autoRefresh' as const, label: 'Auto-refresh quotes' },
                    { key: 'showTooltips' as const, label: 'Show chart tooltips' },
                  ] as const
                ).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => setSettings((p) => ({ ...p, [key]: !p[key] }))}
                      className={`w-9 h-5 rounded-full transition-colors ${settings[key] ? 'bg-violet-500' : 'bg-slate-700'} relative`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${settings[key] ? 'translate-x-4' : 'translate-x-0.5'}`}
                      />
                    </button>
                    <span className="text-sm text-slate-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() =>
                  save('display', {
                    chartHeight: settings.chartHeight,
                    autoRefresh: settings.autoRefresh,
                    showTooltips: settings.showTooltips,
                  })
                }
                disabled={saving === 'display'}
                className={`${btnPrimary} bg-violet-600 hover:bg-violet-500`}
              >
                {saving === 'display' && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Display Settings
              </button>
            </div>
          </div>
        </div>

        {/* ── 5. Danger Zone ───────────────────────────────────────── */}
        <div className="bg-red-950/20 border border-red-800/40 rounded-xl">
          {sectionHeader(<AlertTriangle className="w-5 h-5 text-red-400" />, 'Danger Zone', 'Irreversible actions')}
          <div className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-red-300/90 font-medium">Reset to Defaults</p>
                <p className="text-xs text-red-300/50 mt-0.5">
                  Resets all settings above to built-in defaults. Does NOT affect .env.local credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="flex-shrink-0 px-4 py-2 text-sm bg-red-700/40 hover:bg-red-600/50 border border-red-600/30 rounded-lg text-red-300 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirm Reset Modal ──────────────────────────────────────── */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">Reset all settings?</h3>
            <p className="text-sm text-slate-400 mb-6">
              Download and display settings will be reset to factory defaults. Your Dhan credentials in .env.local are
              not affected.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="flex-1 px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 px-4 py-2 text-sm bg-red-700 hover:bg-red-600 rounded-lg text-white font-medium transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  );
}
