'use client';

import { ChevronDown, ChevronRight, Compass, Info, RefreshCw, Search, TrendingDown, TrendingUp } from 'lucide-react';
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
    isMarketOpen: boolean;
    timestamp: string;
  };
}

function getChangeTextColor(pct: number): string {
  if (pct > 0.01) return 'text-emerald-400';
  if (pct < -0.01) return 'text-red-400';
  return 'text-slate-500';
}

function formatPrice(price: number): string {
  if (price === 0) return '—';
  return price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SectorTablesPage() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncRequired, setSyncRequired] = useState<string | false>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());
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
        // Auto-expand all sectors on first load
        if (expandedSectors.size === 0) {
          setExpandedSectors(new Set(result.data.sectors.map((s: HeatmapSector) => s.id)));
        }
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

  const toggleSector = (id: string) => {
    setExpandedSectors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredSectors = useMemo(() => {
    if (!data) return [];
    if (!searchQuery) return data.sectors;
    const q = searchQuery.toUpperCase();
    return data.sectors
      .map((sector) => ({
        ...sector,
        stocks: sector.stocks.filter((s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q)),
      }))
      .filter((sector) => sector.stocks.length > 0);
  }, [data, searchQuery]);

  const summary = data?.marketSummary;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
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
              Sector Tables
              {summary?.isMarketOpen && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  Live
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500">Detailed stock data grouped by sector</p>
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search symbol..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
        />
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

      {/* Sector Tables */}
      {filteredSectors.map((sector) => {
        const isExpanded = expandedSectors.has(sector.id);
        return (
          <div key={sector.id} className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            {/* Sector Header */}
            <button
              type="button"
              onClick={() => toggleSector(sector.id)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sector.color }} />
                <span className="text-sm font-semibold text-white">{sector.name}</span>
                <span className={`text-sm font-mono font-medium ${getChangeTextColor(sector.avgChange)}`}>
                  {sector.avgChange > 0 ? '+' : ''}
                  {sector.avgChange.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="w-3 h-3" />
                  {sector.gainers}
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <TrendingDown className="w-3 h-3" />
                  {sector.losers}
                </span>
                <span className="text-slate-600">{sector.stocks.length} stocks</span>
              </div>
            </button>

            {/* Stock Table */}
            {isExpanded && (
              <>
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-5 py-2 bg-slate-800/30 text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                  <span>Symbol</span>
                  <span className="text-right">Last Price</span>
                  <span className="text-right">Prev Close</span>
                  <span className="text-right">Change %</span>
                  <span className="text-right">High</span>
                  <span className="text-right">Low</span>
                </div>
                {sector.stocks
                  .sort((a, b) => b.pctChange - a.pctChange)
                  .map((stock, i) => (
                    <div
                      key={stock.symbol}
                      className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-5 py-2.5 items-center hover:bg-slate-800/30 transition-colors ${
                        i !== sector.stocks.length - 1 ? 'border-b border-slate-800/40' : ''
                      }`}
                    >
                      <div>
                        <span className="text-sm font-medium text-white">{stock.symbol}</span>
                        <span className="text-xs text-slate-600 ml-2">{stock.name}</span>
                      </div>
                      <span className="text-sm font-mono text-slate-300 text-right">
                        {formatPrice(stock.lastPrice)}
                      </span>
                      <span className="text-sm font-mono text-slate-500 text-right">
                        {formatPrice(stock.prevClose)}
                      </span>
                      <span
                        className={`text-sm font-mono font-medium text-right ${getChangeTextColor(stock.pctChange)}`}
                      >
                        {stock.pctChange > 0 ? '+' : ''}
                        {stock.pctChange.toFixed(2)}%
                      </span>
                      <span className="text-sm font-mono text-slate-500 text-right">{formatPrice(stock.high)}</span>
                      <span className="text-sm font-mono text-slate-500 text-right">{formatPrice(stock.low)}</span>
                    </div>
                  ))}
              </>
            )}
          </div>
        );
      })}

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
