'use client';

import { Shield, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { RiskConfig } from '@/lib/ai-trading/types';
import { DEFAULT_RISK_CONFIG } from '@/lib/ai-trading/types';

interface PositionData {
  symbol: string;
  side: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  unrealizedPnL: number;
  pnlPct: number;
  sector: string | null;
  enteredAt: string;
}

interface Summary {
  openCount: number;
  totalUnrealizedPnL: number;
  closedPnL: number;
  totalPnL: number;
}

export default function RiskManagerPage() {
  const [config, setConfig] = useState<RiskConfig>(DEFAULT_RISK_CONFIG);
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [summary, setSummary] = useState<Summary>({ openCount: 0, totalUnrealizedPnL: 0, closedPnL: 0, totalPnL: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, posRes] = await Promise.all([
        fetch('/api/ai-trading/config'),
        fetch('/api/ai-trading/positions'),
      ]);
      const configData = await configRes.json();
      const posData = await posRes.json();
      if (configData.success) setConfig(configData.config);
      if (posData.success) {
        setPositions(posData.positions);
        setSummary(posData.summary);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Risk checks
  const totalCapital = 500000; // TODO: make configurable
  const capitalUsedPct = (positions.reduce((sum, p) => sum + p.entryPrice * p.quantity, 0) / totalCapital) * 100;
  const dailyLossPct = (Math.abs(Math.min(0, summary.totalPnL)) / totalCapital) * 100;
  const sectorExposure = new Map<string, number>();
  for (const p of positions) {
    const sec = p.sector || 'Unknown';
    sectorExposure.set(sec, (sectorExposure.get(sec) || 0) + p.entryPrice * p.quantity);
  }

  const checks = [
    {
      label: 'Paper Trading Mode',
      status: config.paperTrading ? 'safe' : 'danger',
      value: config.paperTrading ? 'ON (no real orders)' : 'OFF (REAL ORDERS!)',
    },
    {
      label: 'Open Positions',
      status:
        positions.length >= config.maxOpenPositions
          ? 'danger'
          : positions.length >= config.maxOpenPositions * 0.8
            ? 'warn'
            : 'safe',
      value: `${positions.length} / ${config.maxOpenPositions}`,
    },
    {
      label: 'Daily Loss',
      status:
        dailyLossPct >= config.maxDailyLoss ? 'danger' : dailyLossPct >= config.maxDailyLoss * 0.7 ? 'warn' : 'safe',
      value: `${dailyLossPct.toFixed(1)}% / ${config.maxDailyLoss}% max`,
    },
    {
      label: 'Capital Used',
      status: capitalUsedPct > 50 ? 'warn' : 'safe',
      value: `${capitalUsedPct.toFixed(1)}% of ₹${(totalCapital / 100000).toFixed(1)}L`,
    },
    {
      label: 'Entry Window',
      status: 'info' as const,
      value: `${config.entryWindowStart} - ${config.entryWindowEnd} IST`,
    },
    {
      label: 'Exit Strategy',
      status: 'info' as const,
      value:
        config.exitMode === 'fixed-profit'
          ? `₹${config.fixedProfitTarget.toLocaleString()} profit target`
          : config.exitMode,
    },
    {
      label: 'Min ADX Threshold',
      status: 'info' as const,
      value: `${config.minADXThreshold}+ (strong trend only)`,
    },
    {
      label: 'Force Exit Time',
      status: 'info' as const,
      value: `${config.fixedExitTime} IST`,
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <Shield className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Risk Manager</h1>
            <p className="text-sm text-slate-500">Portfolio risk status, position limits, and safety checks</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchData}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* P&L Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: 'Unrealized P&L',
            value: `₹${summary.totalUnrealizedPnL.toLocaleString()}`,
            color: summary.totalUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400',
          },
          {
            label: 'Realized P&L',
            value: `₹${summary.closedPnL.toLocaleString()}`,
            color: summary.closedPnL >= 0 ? 'text-emerald-400' : 'text-red-400',
          },
          {
            label: 'Total P&L',
            value: `₹${summary.totalPnL.toLocaleString()}`,
            color: summary.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400',
          },
          { label: 'Open Positions', value: `${summary.openCount}`, color: 'text-white' },
        ].map((item) => (
          <div key={item.label} className="px-4 py-3 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase">{item.label}</div>
            <div className={`text-lg font-bold font-mono mt-1 ${item.color}`}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Risk Checks */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 bg-slate-800/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
          Safety Checks
        </div>
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50 last:border-b-0"
          >
            <div className="flex items-center gap-2">
              {check.status === 'safe' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              {check.status === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {check.status === 'danger' && <AlertTriangle className="w-4 h-4 text-red-400" />}
              {check.status === 'info' && (
                <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[8px] text-slate-400">
                  i
                </div>
              )}
              <span className="text-sm text-slate-300">{check.label}</span>
            </div>
            <span
              className={`text-sm font-mono ${
                check.status === 'safe'
                  ? 'text-emerald-400'
                  : check.status === 'warn'
                    ? 'text-amber-400'
                    : check.status === 'danger'
                      ? 'text-red-400 font-bold'
                      : 'text-slate-400'
              }`}
            >
              {check.value}
            </span>
          </div>
        ))}
      </div>

      {/* Open Positions */}
      {positions.length > 0 && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 bg-slate-800/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Open Positions
          </div>
          {positions.map((p) => (
            <div
              key={p.symbol}
              className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50 last:border-b-0"
            >
              <div>
                <span className="text-white font-semibold text-sm">{p.symbol}</span>
                <span className="text-slate-500 text-xs ml-2">
                  {p.side} × {p.quantity}
                </span>
                <span className="text-slate-600 text-xs ml-2">{p.sector}</span>
              </div>
              <div className="text-right">
                <div className={`font-mono text-sm ${p.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ₹{p.unrealizedPnL.toLocaleString()} ({p.pnlPct >= 0 ? '+' : ''}
                  {p.pnlPct.toFixed(2)}%)
                </div>
                <div className="text-[10px] text-slate-600">
                  Entry: ₹{p.entryPrice.toFixed(1)} → Current: ₹{p.currentPrice.toFixed(1)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sector Exposure */}
      {sectorExposure.size > 0 && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 bg-slate-800/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Sector Exposure
          </div>
          {Array.from(sectorExposure.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([sector, capital]) => {
              const pct = (capital / totalCapital) * 100;
              const isOver = pct >= config.maxSectorExposure;
              return (
                <div
                  key={sector}
                  className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50 last:border-b-0"
                >
                  <span className="text-sm text-slate-300">{sector}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isOver ? 'bg-red-500' : 'bg-sky-500'}`}
                        style={{ width: `${Math.min(100, (pct / config.maxSectorExposure) * 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-mono ${isOver ? 'text-red-400' : 'text-slate-400'}`}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {loading && <div className="text-center py-4 text-slate-600 text-xs">Loading...</div>}
    </div>
  );
}
