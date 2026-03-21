'use client';

import { Settings, Save, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { RiskConfig } from '@/lib/ai-trading/types';
import { DEFAULT_RISK_CONFIG } from '@/lib/ai-trading/types';

export default function StrategyConfigPage() {
  const [config, setConfig] = useState<RiskConfig>(DEFAULT_RISK_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/ai-trading/config')
      .then((r) => r.json())
      .then((d) => { if (d.success) setConfig(d.config); })
      .catch(() => {});
  }, []);

  const saveConfig = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/ai-trading/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }, [config]);

  const resetDefaults = () => setConfig(DEFAULT_RISK_CONFIG);

  const update = (key: keyof RiskConfig, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Settings className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Strategy Config</h1>
            <p className="text-sm text-slate-500">AI model, entry/exit rules, and thresholds</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={resetDefaults} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <button type="button" onClick={saveConfig} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium">
            <Save className="w-3 h-3" /> {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Entry Rules */}
        <Section title="Entry Rules">
          <Field label="Entry Window Start (IST)" value={config.entryWindowStart} onChange={(v) => update('entryWindowStart', v)} />
          <Field label="Entry Window End (IST)" value={config.entryWindowEnd} onChange={(v) => update('entryWindowEnd', v)} />
          <NumberField label="Min R-Factor" value={config.minRFactorThreshold} onChange={(v) => update('minRFactorThreshold', v)} step={0.1} />
          <NumberField label="Min ADX" value={config.minADXThreshold} onChange={(v) => update('minADXThreshold', v)} step={1} />
        </Section>

        {/* Exit Rules */}
        <Section title="Exit Rules">
          <SelectField label="Exit Mode" value={config.exitMode} options={['ai', 'fixed-profit', 'fixed-time', 'trailing-sl']} onChange={(v) => update('exitMode', v)} />
          <NumberField label="Fixed Profit Target (₹)" value={config.fixedProfitTarget} onChange={(v) => update('fixedProfitTarget', v)} step={500} />
          <Field label="Force Exit Time (IST)" value={config.fixedExitTime} onChange={(v) => update('fixedExitTime', v)} />
          <NumberField label="Trailing SL %" value={config.trailingSlPct} onChange={(v) => update('trailingSlPct', v)} step={0.1} />
        </Section>

        {/* Risk Limits */}
        <Section title="Risk Limits">
          <NumberField label="Max Capital Per Trade %" value={config.maxCapitalPerTrade} onChange={(v) => update('maxCapitalPerTrade', v)} step={0.5} />
          <NumberField label="Max Open Positions" value={config.maxOpenPositions} onChange={(v) => update('maxOpenPositions', Math.round(v))} step={1} />
          <NumberField label="Max Daily Loss %" value={config.maxDailyLoss} onChange={(v) => update('maxDailyLoss', v)} step={0.5} />
          <NumberField label="Max Sector Exposure %" value={config.maxSectorExposure} onChange={(v) => update('maxSectorExposure', v)} step={5} />
        </Section>

        {/* Trade Params */}
        <Section title="Trade Parameters">
          <NumberField label="Default Stop-Loss %" value={config.defaultStopLossPct} onChange={(v) => update('defaultStopLossPct', v)} step={0.1} />
          <NumberField label="Default Target %" value={config.defaultTargetPct} onChange={(v) => update('defaultTargetPct', v)} step={0.5} />
          <NumberField label="Min Risk:Reward" value={config.minRiskReward} onChange={(v) => update('minRiskReward', v)} step={0.1} />
          <ToggleField label="Paper Trading" value={config.paperTrading} onChange={(v) => update('paperTrading', v)} description={config.paperTrading ? 'ON — decisions logged but NOT executed' : 'OFF — REAL orders will be placed!'} />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-slate-500">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-xs font-mono text-right focus:outline-none focus:border-slate-500" />
    </div>
  );
}

function NumberField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-slate-500">{label}</label>
      <input type="number" value={value} step={step} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-xs font-mono text-right focus:outline-none focus:border-slate-500" />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-slate-500">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-32 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-slate-500">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function ToggleField({ label, value, onChange, description }: { label: string; value: boolean; onChange: (v: boolean) => void; description: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-500">{label}</label>
        <button type="button" onClick={() => onChange(!value)} className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-emerald-500' : 'bg-red-500'}`}>
          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <p className={`text-[10px] ${value ? 'text-emerald-500' : 'text-red-400 font-bold'}`}>{description}</p>
    </div>
  );
}
