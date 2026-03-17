'use client';

import { ArrowUpDown, Filter, Flame, Info, RefreshCw, Search, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface BoostStock {
  symbol: string;
  compositeRFactor: number;
  regime: 'Elephant' | 'Cheetah' | 'Hybrid' | 'Defensive';
  isBlastTrade: boolean;
  zScores: {
    fut_turnover: number;
    fut_volume: number;
    opt_volume: number;
    eq_trade_size: number;
    oi_change: number;
    spread: number;
    pcr: number;
  };
  pctChange?: number;
  timestamp: string;
}

type SignalFilter = 'ALL' | 'UP' | 'DOWN';
type SortField = 'rfactor' | 'symbol' | 'spread' | 'pcr' | 'pctChange';

export default function IntradayBoostPage() {
  const [stocks, setStocks] = useState<BoostStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncRequired, setSyncRequired] = useState<string | false>(false); // false or 'master-contracts' or 'bhavcopy'
  const [searchQuery, setSearchQuery] = useState('');
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('ALL');
  const [sortField, setSortField] = useState<SortField>('rfactor');
  const [sortAsc, setSortAsc] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<'live' | 'bhavcopy' | null>(null);

  const mountedRef = useRef(true);

  const fetchBoostData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/r-factor?limit=206');
      if (!mountedRef.current) return;
      const result = await res.json();
      if (!mountedRef.current) return;
      if (result.code === 'SYNC_REQUIRED') {
        setSyncRequired(result.syncTarget || 'master-contracts');
      } else if (result.success) {
        setSyncRequired(false);
        setStocks(result.data);
        setDataSource(result.dataSource || 'bhavcopy');
        setLastRefresh(new Date());
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch {
      if (mountedRef.current) setError('Network error. Is the server running?');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchBoostData is stable via useCallback with empty deps
  useEffect(() => {
    mountedRef.current = true;
    fetchBoostData();
    const interval = setInterval(fetchBoostData, 60_000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const filteredStocks = useMemo(() => {
    return stocks
      .filter((s) => {
        const matchSearch = s.symbol.toLowerCase().includes(searchQuery.toLowerCase());
        if (signalFilter === 'UP') return matchSearch && s.zScores.spread > 1.2;
        if (signalFilter === 'DOWN') return matchSearch && s.zScores.spread <= 1.2;
        return matchSearch;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'rfactor') cmp = a.compositeRFactor - b.compositeRFactor;
        else if (sortField === 'symbol') cmp = a.symbol.localeCompare(b.symbol);
        else if (sortField === 'spread') cmp = a.zScores.spread - b.zScores.spread;
        else if (sortField === 'pcr') cmp = a.zScores.pcr - b.zScores.pcr;
        else if (sortField === 'pctChange') cmp = (a.pctChange ?? 0) - (b.pctChange ?? 0);
        return sortAsc ? cmp : -cmp;
      });
  }, [stocks, searchQuery, signalFilter, sortField, sortAsc]);

  const stats = useMemo(() => {
    const blasts = stocks.filter((s) => s.isBlastTrade).length;
    const highR = stocks.filter((s) => s.compositeRFactor >= 2.8).length;
    const upSignals = stocks.filter((s) => s.zScores.spread > 1.2).length;
    return { blasts, highR, upSignals, total: stocks.length };
  }, [stocks]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getSignal = (stock: BoostStock) => {
    return stock.zScores.spread > 1.2;
  };

  const getRFactorColor = (r: number) => {
    if (r >= 2.8) return 'text-emerald-400 font-bold';
    if (r >= 2.2) return 'text-sky-400';
    if (r >= 1.8) return 'text-slate-300';
    return 'text-slate-500';
  };

  const getRegimeBadge = (regime: string) => {
    switch (regime) {
      case 'Cheetah':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'Elephant':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'Hybrid':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-800/50 text-slate-500 border-slate-700/50';
    }
  };

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
              {syncRequired === 'bhavcopy'
                ? 'Bhavcopy data is not available. Please go to the Bhavcopy page and click Sync to download historical NSE data.'
                : "Master contracts haven't been synced today. Please go to the Master Contracts page and click Re-sync."}
            </p>
            <div className="flex gap-3">
              <a
                href={syncRequired === 'bhavcopy' ? '/trading-lab/bhavcopy' : '/trading-lab/master-contracts'}
                className="flex-1 text-center px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors"
              >
                {syncRequired === 'bhavcopy' ? 'Go to Bhavcopy' : 'Go to Master Contracts'}
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
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Flame className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Intraday Boost
              {dataSource === 'live' ? (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  Live
                </span>
              ) : dataSource === 'bhavcopy' ? (
                <span
                  className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full"
                  title="Dhan API unavailable. Showing bhavcopy data. Check your token."
                >
                  Stale
                </span>
              ) : null}
            </h1>
            <p className="text-sm text-slate-500">F&O stocks ranked by institutional activity (R-Factor)</p>
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
            onClick={fetchBoostData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3">
        <div className="px-4 py-3 rounded-lg bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Stocks</p>
          <p className="text-xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="px-4 py-3 rounded-lg bg-slate-900 border border-emerald-500/20">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Blast Trades</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{stats.blasts}</p>
        </div>
        <div className="px-4 py-3 rounded-lg bg-slate-900 border border-sky-500/20">
          <p className="text-xs text-slate-500 uppercase tracking-wide">High R (&ge;2.8)</p>
          <p className="text-xl font-bold text-sky-400 mt-1">{stats.highR}</p>
        </div>
        <div className="px-4 py-3 rounded-lg bg-slate-900 border border-amber-500/20">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Spread Spike</p>
          <p className="text-xl font-bold text-amber-400 mt-1">{stats.upSignals}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
          />
        </div>

        {/* Signal Filter */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-2 mr-1" />
          {(['ALL', 'UP', 'DOWN'] as SignalFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setSignalFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                signalFilter === f ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f === 'UP' && <TrendingUp className="w-3 h-3 inline mr-1 text-emerald-400" />}
              {f === 'DOWN' && <TrendingDown className="w-3 h-3 inline mr-1 text-red-400" />}
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_80px_1fr_1fr_1fr_80px] gap-2 px-5 py-3 bg-slate-800/50 text-xs text-slate-500 uppercase tracking-wider font-medium">
          <button
            onClick={() => handleSort('symbol')}
            className="flex items-center gap-1 hover:text-slate-300 text-left"
          >
            Symbol
            {sortField === 'symbol' && <ArrowUpDown className="w-3 h-3" />}
          </button>
          <button onClick={() => handleSort('pctChange')} className="flex items-center gap-1 hover:text-slate-300">
            %{sortField === 'pctChange' && <ArrowUpDown className="w-3 h-3" />}
          </button>
          <button onClick={() => handleSort('spread')} className="flex items-center gap-1 hover:text-slate-300">
            Spread
            {sortField === 'spread' && <ArrowUpDown className="w-3 h-3" />}
          </button>
          <button onClick={() => handleSort('pcr')} className="flex items-center gap-1 hover:text-slate-300">
            PCR
            {sortField === 'pcr' && <ArrowUpDown className="w-3 h-3" />}
          </button>
          <button onClick={() => handleSort('rfactor')} className="flex items-center gap-1 hover:text-slate-300">
            R.Factor
            {sortField === 'rfactor' && <ArrowUpDown className="w-3 h-3" />}
          </button>
          <span className="text-center">Signal</span>
        </div>

        {/* Loading State */}
        {loading && stocks.length === 0 && (
          <div className="px-5 py-16 text-center">
            <RefreshCw className="w-6 h-6 text-slate-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Scanning F&O universe...</p>
            <p className="text-xs text-slate-600 mt-1">Downloading NSE bhavcopy data for all stocks</p>
          </div>
        )}

        {/* Stock Rows */}
        {filteredStocks.map((stock, i) => {
          const isUp = getSignal(stock);
          return (
            <div
              key={stock.symbol}
              className={`grid grid-cols-[2fr_80px_1fr_1fr_1fr_80px] gap-2 px-5 py-3 items-center transition-colors hover:bg-slate-800/40 ${
                i !== filteredStocks.length - 1 ? 'border-b border-slate-800/50' : ''
              }`}
            >
              {/* Symbol + Regime */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{stock.symbol}</span>
                  {stock.isBlastTrade && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                      <Zap className="w-2.5 h-2.5" />
                      Blast
                    </span>
                  )}
                </div>
                <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded border ${getRegimeBadge(stock.regime)}`}>
                  {stock.regime}
                </span>
              </div>

              {/* % Change */}
              <div>
                {stock.pctChange != null ? (
                  <span
                    className={`text-sm font-mono font-medium ${
                      stock.pctChange > 0 ? 'text-emerald-400' : stock.pctChange < 0 ? 'text-red-400' : 'text-slate-500'
                    }`}
                  >
                    {stock.pctChange > 0 ? '+' : ''}
                    {stock.pctChange.toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">—</span>
                )}
              </div>

              {/* Spread Ratio */}
              <div>
                <span
                  className={`text-sm font-mono ${
                    stock.zScores.spread > 1.5
                      ? 'text-emerald-400'
                      : stock.zScores.spread > 1.0
                        ? 'text-slate-300'
                        : 'text-slate-500'
                  }`}
                >
                  {stock.zScores.spread.toFixed(2)}
                </span>
              </div>

              {/* PCR */}
              <div>
                <span
                  className={`text-sm font-mono ${
                    stock.zScores.pcr > 1.5
                      ? 'text-amber-400'
                      : stock.zScores.pcr > 0.7
                        ? 'text-slate-300'
                        : 'text-slate-500'
                  }`}
                >
                  {stock.zScores.pcr.toFixed(2)}
                </span>
              </div>

              {/* R-Factor */}
              <div>
                <span className={`text-sm font-bold font-mono ${getRFactorColor(stock.compositeRFactor)}`}>
                  {stock.compositeRFactor.toFixed(2)}
                </span>
              </div>

              {/* Signal Arrow */}
              <div className="flex justify-center">
                {isUp ? (
                  <div className="p-1.5 rounded-md bg-emerald-500/10">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                ) : (
                  <div className="p-1.5 rounded-md bg-red-500/10">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {!loading && filteredStocks.length === 0 && (
          <div className="px-5 py-16 text-center">
            <Search className="w-6 h-6 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No stocks match filters</p>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-sky-500/5 border border-sky-500/15 text-xs text-slate-500">
        <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-sky-400 font-medium">7-Factor OLS Model</span> — R-Factor = 1.11 +
          0.63&times;spread_ratio + 0.08&times;pcr_z + 0.23&times;(spread&times;fut_turn) + 1.41&times;fut_turn_z
          &minus; 1.73&times;fut_vol_z. Validated against 80 stocks (Pearson 0.67, Top-10 overlap 7/10). Signal UP when
          spread ratio &gt; 1.2&times; 20d average. Data from NSE F&O bhavcopy.
        </div>
      </div>
    </div>
  );
}
