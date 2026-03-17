'use client';

import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Compass,
  Info,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface HeatmapStock {
  symbol: string;
  name: string;
  sector: string;
  weight: number;
  lastPrice: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  pctChange: number;
}

interface HeatmapSector {
  id: string;
  name: string;
  color: string;
  stocks: HeatmapStock[];
  avgChange: number;
  gainers: number;
  losers: number;
  unchanged: number;
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

function getHeatmapColor(pct: number): string {
  const clamped = Math.max(-4, Math.min(4, pct));
  if (Math.abs(clamped) < 0.01) return 'rgb(55, 55, 60)';
  if (clamped > 0) {
    const t = clamped / 4;
    const r = Math.round(55 - 17 * t);
    const g = Math.round(55 + 111 * t);
    const b = Math.round(60 + 31 * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const t = Math.abs(clamped) / 4;
  const r = Math.round(55 + 179 * t);
  const g = Math.round(55 - 35 * t);
  const b = Math.round(60 - 40 * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function getChangeTextColor(pct: number): string {
  if (pct > 0.01) return 'text-emerald-400';
  if (pct < -0.01) return 'text-red-400';
  return 'text-slate-500';
}

function formatPrice(price: number): string {
  if (price === 0) return '—';
  if (price >= 1000) return price.toFixed(0);
  return price.toFixed(2);
}

export default function SectorScopePage() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncRequired, setSyncRequired] = useState<string | false>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
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
        // Auto-sort based on Nifty direction: red day → losers first, green day → gainers first
        const nifty = result.data.marketSummary?.niftyChange ?? 0;
        setSortOrder(nifty >= 0 ? 'desc' : 'asc');
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

  const filteredSectors = useMemo(() => {
    if (!data) return [];
    const mul = sortOrder === 'desc' ? -1 : 1;
    let sectors = data.sectors;
    if (searchQuery) {
      const q = searchQuery.toUpperCase();
      sectors = sectors
        .map((sector) => ({
          ...sector,
          stocks: sector.stocks.filter((s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q)),
        }))
        .filter((sector) => sector.stocks.length > 0);
    }
    return sectors
      .map((sector) => ({
        ...sector,
        stocks: [...sector.stocks].sort((a, b) => mul * (a.pctChange - b.pctChange)),
      }))
      .sort((a, b) => mul * (a.avgChange - b.avgChange));
  }, [data, searchQuery, sortOrder]);

  const summary = data?.marketSummary;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
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
            <p className="text-sm text-slate-500">F&O stocks grouped by sector — real-time heatmap</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

      {/* Stats Bar */}
      {summary && (
        <div className="grid grid-cols-5 gap-3">
          <div
            className={`px-4 py-3 rounded-lg bg-slate-900 border ${summary.niftyChange >= 0 ? 'border-emerald-500/30' : 'border-red-500/30'}`}
          >
            <p className="text-xs text-slate-500 uppercase tracking-wide">Nifty 50</p>
            <p className={`text-xl font-bold mt-1 ${getChangeTextColor(summary.niftyChange)}`}>
              {summary.niftyChange > 0 ? '+' : ''}
              {summary.niftyChange.toFixed(2)}%
            </p>
            {summary.niftyPrice > 0 && (
              <p className="text-[10px] text-slate-600 font-mono">{summary.niftyPrice.toFixed(0)}</p>
            )}
          </div>
          <div className="px-4 py-3 rounded-lg bg-slate-900 border border-slate-800">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Stocks</p>
            <p className="text-xl font-bold text-white mt-1">{summary.totalStocks}</p>
          </div>
          <div className="px-4 py-3 rounded-lg bg-slate-900 border border-emerald-500/20">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Gainers</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{summary.totalGainers}</p>
          </div>
          <div className="px-4 py-3 rounded-lg bg-slate-900 border border-red-500/20">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Losers</p>
            <p className="text-xl font-bold text-red-400 mt-1">{summary.totalLosers}</p>
          </div>
          <div className="px-4 py-3 rounded-lg bg-slate-900 border border-sky-500/20">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Avg Change</p>
            <p className={`text-xl font-bold mt-1 ${getChangeTextColor(summary.avgChange)}`}>
              {summary.avgChange > 0 ? '+' : ''}
              {summary.avgChange.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setSortOrder('desc')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              sortOrder === 'desc' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ArrowDownWideNarrow className="w-3.5 h-3.5" />
            Top Gainers
          </button>
          <button
            type="button"
            onClick={() => setSortOrder('asc')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              sortOrder === 'asc' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ArrowUpWideNarrow className="w-3.5 h-3.5" />
            Top Losers
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

      {/* Heatmap */}
      {filteredSectors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filteredSectors.map((sector) => {
            const sectorFlex = Math.max(sector.totalWeight, 10);
            return (
              <div
                key={sector.id}
                className="rounded-lg border border-slate-800 overflow-hidden"
                style={{ flexBasis: `${sectorFlex}%`, flexGrow: sectorFlex, minWidth: '200px' }}
              >
                {/* Sector Header */}
                <div
                  className="flex items-center justify-between px-3 py-1.5"
                  style={{ backgroundColor: `${sector.color}20`, borderBottom: `1px solid ${sector.color}40` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wide">{sector.name}</span>
                    <span className={`text-xs font-mono font-medium ${getChangeTextColor(sector.avgChange)}`}>
                      {sector.avgChange > 0 ? '+' : ''}
                      {sector.avgChange.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-emerald-400">{sector.gainers}</span>
                    <span className="text-slate-600">/</span>
                    <span className="text-red-400">{sector.losers}</span>
                  </div>
                </div>

                {/* Stock Cells */}
                <div className="flex flex-wrap">
                  {sector.stocks.map((stock) => {
                    const stockFlex = Math.max(stock.weight, 3);
                    return (
                      <div
                        key={stock.symbol}
                        className="border border-slate-800/50 p-2 flex flex-col items-center justify-center text-center cursor-default transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: getHeatmapColor(stock.pctChange),
                          flexBasis: `${(stockFlex / sector.totalWeight) * 100}%`,
                          flexGrow: stockFlex,
                          minWidth: '80px',
                          minHeight: '64px',
                        }}
                        title={`${stock.name}\nPrice: ${formatPrice(stock.lastPrice)}\nChange: ${stock.pctChange > 0 ? '+' : ''}${stock.pctChange.toFixed(2)}%\nHigh: ${formatPrice(stock.high)} | Low: ${formatPrice(stock.low)}`}
                      >
                        <span className="text-xs font-bold text-white leading-tight">{stock.symbol}</span>
                        <span className="text-[10px] text-white/70 font-mono">{formatPrice(stock.lastPrice)}</span>
                        <span
                          className={`text-[10px] font-mono font-medium ${
                            stock.pctChange > 0.01
                              ? 'text-white'
                              : stock.pctChange < -0.01
                                ? 'text-white'
                                : 'text-white/60'
                          }`}
                        >
                          {stock.pctChange > 0 ? '+' : ''}
                          {stock.pctChange.toFixed(2)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sector Summary Cards */}
      {data && filteredSectors.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredSectors.map((sector) => (
            <div key={sector.id} className="rounded-lg bg-slate-900 border border-slate-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">{sector.name}</span>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sector.color }} />
              </div>
              <div className={`text-lg font-bold font-mono ${getChangeTextColor(sector.avgChange)}`}>
                {sector.avgChange > 0 ? '+' : ''}
                {sector.avgChange.toFixed(2)}%
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  {sector.gainers}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-red-500" />
                  {sector.losers}
                </span>
                <span>{sector.stocks.length} stocks</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && data && filteredSectors.length === 0 && (
        <div className="px-5 py-16 text-center">
          <Search className="w-6 h-6 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No stocks match your search</p>
        </div>
      )}
    </div>
  );
}
