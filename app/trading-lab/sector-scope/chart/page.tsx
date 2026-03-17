'use client';

import { Compass, Info, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface HeatmapSector {
  id: string;
  name: string;
  color: string;
  avgChange: number;
  gainers: number;
  losers: number;
  stocks: { symbol: string; pctChange: number }[];
  totalWeight: number;
}

interface HeatmapData {
  sectors: HeatmapSector[];
  marketSummary: {
    totalStocks: number;
    totalGainers: number;
    totalLosers: number;
    avgChange: number;
    niftyChange: number;
    niftyPrice: number;
    isMarketOpen: boolean;
    timestamp: string;
  };
}

function getChangeTextColor(pct: number): string {
  if (pct > 0.01) return 'text-emerald-400';
  if (pct < -0.01) return 'text-red-400';
  return 'text-slate-500';
}

export default function SectorChartPage() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncRequired, setSyncRequired] = useState<string | false>(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = async () => {
    if (data) setLoading(false);
    setError(null);
    try {
      const res = await fetch('/api/sector-scope');
      const result = await res.json();
      if (result.code === 'SYNC_REQUIRED') {
        setSyncRequired(result.syncTarget || 'master-contracts');
        setLoading(false);
        return;
      }
      if (result.success) {
        setSyncRequired(false);
        setData(result.data);
        setLastRefresh(new Date());
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchData intentionally excluded
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    return [...data.sectors]
      .sort((a, b) => b.avgChange - a.avgChange)
      .map((s) => ({
        name: s.name.toUpperCase(),
        change: parseFloat(s.avgChange.toFixed(2)),
        gainers: s.gainers,
        losers: s.losers,
        total: s.stocks.length,
      }));
  }, [data]);

  const summary = data?.marketSummary;

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      {/* Sync Required Modal */}
      {syncRequired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Info className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Sync Required</h3>
            </div>
            <p className="text-sm text-slate-400 mb-5">
              Master contracts haven't been synced today. Please go to the Master Contracts page and click Re-sync.
            </p>
            <div className="flex gap-3">
              <a
                href="/trading-lab/master-contracts"
                className="flex-1 text-center px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors"
              >
                Go to Master Contracts
              </a>
              <button
                type="button"
                onClick={() => setSyncRequired(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm hover:bg-slate-700 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Compass className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Sector Scope
              {summary?.isMarketOpen && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  Live
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500">Sector performance ranked by % change</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {summary && summary.niftyPrice > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-slate-600">NIFTY 50</p>
              <p className={`text-sm font-bold font-mono ${getChangeTextColor(summary.niftyChange)}`}>
                {summary.niftyChange > 0 ? '+' : ''}
                {summary.niftyChange.toFixed(2)}%
              </p>
            </div>
          )}
          {lastRefresh && (
            <div className="text-right">
              <p className="text-[10px] text-slate-600">Last: {lastRefresh.toLocaleTimeString()}</p>
              <p className="text-[10px] text-slate-700">Auto-refresh 60s</p>
            </div>
          )}
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="px-5 py-16 text-center">
          <RefreshCw className="w-6 h-6 text-slate-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading sector data...</p>
        </div>
      )}

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Sector Performance</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                Positive
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                Negative
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                angle={-45}
                textAnchor="end"
                interval={0}
                height={80}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}
                formatter={(value: number | undefined) => {
                  const v = value ?? 0;
                  return [`${v > 0 ? '+' : ''}${v.toFixed(2)}%`, 'Change'];
                }}
              />
              <Bar dataKey="change" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.change >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sector Summary Table */}
      {chartData.length > 0 && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-5 py-2.5 bg-slate-800/30 text-[10px] text-slate-500 uppercase tracking-wider font-medium">
            <span>Sector</span>
            <span className="text-right">Change %</span>
            <span className="text-right">Gainers</span>
            <span className="text-right">Losers</span>
          </div>
          {chartData.map((sector, i) => (
            <div
              key={sector.name}
              className={`grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-5 py-3 items-center hover:bg-slate-800/30 transition-colors ${
                i !== chartData.length - 1 ? 'border-b border-slate-800/40' : ''
              }`}
            >
              <span className="text-sm font-semibold text-white">{sector.name}</span>
              <span className={`text-sm font-mono font-medium text-right ${getChangeTextColor(sector.change)}`}>
                {sector.change > 0 ? '+' : ''}
                {sector.change.toFixed(2)}%
              </span>
              <span className="text-sm font-mono text-emerald-400 text-right">{sector.gainers}</span>
              <span className="text-sm font-mono text-red-400 text-right">{sector.losers}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
