'use client';

import { ArrowUpDown, Filter, Flame, Info, RefreshCw, Search, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { parseAsBoolean, parseAsStringLiteral, useQueryState } from 'nuqs';
import { useMemo, useState } from 'react';

import { getRegimeBadgeClass, getRFactorColor, shortDate } from '@/app/trading-lab/_lib/r-factor-ui';
import { type BoostMode, type BoostStock, useBoostData } from './_hooks/use-boost-data';
import { computeSectorStats } from './_lib/sector-stats';

type SignalFilter = 'ALL' | 'UP' | 'DOWN';
type SortField = 'rfactor' | 'symbol' | 'spread' | 'pcr' | 'pctChange';

export default function IntradayBoostPage() {
  const [tab, setTab] = useQueryState('tab', parseAsStringLiteral(['live', 'past'] as const).withDefault('past'));
  const [useOC, setUseOC] = useQueryState('oc', parseAsBoolean.withDefault(true));
  const [tfOnly, setTfOnly] = useQueryState('tf', parseAsBoolean.withDefault(true));
  const [selectedDate, setSelectedDate] = useState('');
  const data = useBoostData(tab as BoostMode, { useOC, tfOnly, date: selectedDate || undefined });
  const [searchQuery, setSearchQuery] = useState('');
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('ALL');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [sortField, setSortField] = useState<SortField>('rfactor');
  const [sortAsc, setSortAsc] = useState(false);

  const sectorStats = useMemo(() => computeSectorStats(data.stocks), [data.stocks]);

  const filteredStocks = useMemo(() => {
    return data.stocks
      .filter((s) => {
        const matchSearch = s.symbol.toLowerCase().includes(searchQuery.toLowerCase());
        const matchSector = sectorFilter === 'ALL' || s.sector === sectorFilter;
        if (!matchSearch || !matchSector) return false;
        if (signalFilter === 'UP') return (s.pctChange ?? 0) >= 0;
        if (signalFilter === 'DOWN') return (s.pctChange ?? 0) < 0;
        return true;
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
  }, [data.stocks, searchQuery, sectorFilter, signalFilter, sortField, sortAsc]);

  const stats = useMemo(() => {
    const blasts = data.stocks.filter((s) => s.isBlastTrade).length;
    const highR = data.stocks.filter((s) => s.compositeRFactor >= 2.8).length;
    const upSignals = data.stocks.filter((s) => (s.pctChange ?? 0) >= 0).length;
    return { blasts, highR, upSignals, total: data.stocks.length };
  }, [data.stocks]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Sync Required Modal */}
      {data.syncRequired && <SyncModal target={data.syncRequired} onDismiss={data.dismissSync} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Flame className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Intraday Boost
              <DataSourceBadge dataSource={data.dataSource} latestDate={data.latestDate} marketOpen={data.marketOpen} />
            </h1>
            <p className="text-sm text-slate-500">F&O stocks ranked by institutional activity (R-Factor)</p>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('live')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'live'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Live
          </button>
          <button
            type="button"
            onClick={() => setTab('past')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'past'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Past (EOD)
          </button>
        </div>

        {/* Date picker for Past tab */}
        {tab === 'past' && data.availableDates.length > 0 && (
          <select
            value={selectedDate || data.latestDate || ''}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-slate-600"
          >
            {data.availableDates.map((d) => (
              <option key={d} value={d}>
                {new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Model Info */}
      <div className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800/50">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          R-Factor &asymp; 1.56 &times; spread_ratio &mdash; cross-validated on 158 samples (Pearson 0.80, Top-10 7/10).
          Signal direction based on % price change.
        </p>
      </div>

      {/* Market Closed Banner (Live tab only, outside market hours) */}
      {tab === 'live' && data.marketOpen === false && data.stocks.length === 0 && (
        <div className="flex items-center gap-2 px-4 py-4 rounded-lg bg-slate-900 border border-slate-800 text-center">
          <Info className="w-5 h-5 text-slate-500 mx-auto" />
          <div className="flex-1">
            <p className="text-sm text-slate-400 font-medium">Market Closed</p>
            <p className="text-xs text-slate-600 mt-1">
              Live data available 9:15 AM – 3:30 PM IST. Switch to Past tab for EOD data.
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {data.lastRefresh && (
            <div className="text-right">
              <p className="text-[10px] text-slate-600">Last: {data.lastRefresh.toLocaleTimeString()}</p>
              {tab === 'live' && <p className="text-[10px] text-slate-700">Auto-refresh 60s</p>}
            </div>
          )}
          {tab === 'live' && (
            <label
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-400 cursor-pointer select-none hover:bg-slate-700 transition-colors"
              title="When ON: uses Dhan Option Chain for live PCR → full OLS model. When OFF: spread-only quadratic model."
            >
              <input
                type="checkbox"
                checked={useOC}
                onChange={(e) => setUseOC(e.target.checked)}
                className="w-3 h-3 rounded accent-sky-500"
              />
              Option Chain
            </label>
          )}
          <label
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-400 cursor-pointer select-none hover:bg-slate-700 transition-colors"
            title="ON (default): 136 TradeFinder-traded stocks. OFF: full 206 F&O universe."
          >
            <input
              type="checkbox"
              checked={!tfOnly}
              onChange={(e) => setTfOnly(!e.target.checked)}
              className="w-3 h-3 rounded accent-amber-500"
            />
            All 206 F&O
          </label>
          <button
            type="button"
            onClick={data.refresh}
            disabled={data.loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${data.loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Market Closed Banner */}
      {data.dataSource === 'bhavcopy' && data.marketOpen === false && data.latestDate && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15 text-xs text-amber-400/80">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          Market closed — showing data from {shortDate(data.latestDate)}. Live R-Factor resumes at 9:15 AM IST.
          <a
            href="/trading-lab/r-factor-history"
            className="ml-auto text-sky-400 hover:text-sky-300 font-medium whitespace-nowrap"
          >
            View History →
          </a>
        </div>
      )}

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

        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-2 mr-1" />
          {(['ALL', 'UP', 'DOWN'] as SignalFilter[]).map((f) => (
            <button
              key={f}
              type="button"
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

        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-slate-600"
        >
          <option value="ALL">All Sectors</option>
          {sectorStats.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name} · {s.activity.toFixed(2)} X
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {data.error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {data.error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="grid grid-cols-[2fr_90px_70px_1fr_1fr_1fr_70px_55px_70px] gap-2 px-5 py-3 bg-slate-800/50 text-xs text-slate-500 uppercase tracking-wider font-medium">
          <SortButton field="symbol" current={sortField} onSort={handleSort}>
            Symbol
          </SortButton>
          <span>Sector</span>
          <SortButton field="pctChange" current={sortField} onSort={handleSort}>
            %
          </SortButton>
          <SortButton field="spread" current={sortField} onSort={handleSort}>
            Spread
          </SortButton>
          <SortButton field="pcr" current={sortField} onSort={handleSort}>
            PCR
          </SortButton>
          <SortButton field="rfactor" current={sortField} onSort={handleSort}>
            R.Factor
          </SortButton>
          <span className="text-amber-400/70">TF R</span>
          <span>ADX</span>
          <span className="text-center">Signal</span>
        </div>

        {data.loading && data.stocks.length === 0 && (
          <div className="px-5 py-16 text-center">
            <RefreshCw className="w-6 h-6 text-slate-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Scanning F&O universe...</p>
          </div>
        )}

        {filteredStocks.map((stock, i) => (
          <StockRow key={stock.symbol} stock={stock} isLast={i === filteredStocks.length - 1} />
        ))}

        {!data.loading && filteredStocks.length === 0 && (
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
          <span className="text-sky-400 font-medium">Linear Spread Model</span> — R-Factor &asymp; 1.56 &times;
          spread_ratio. Cross-validated on 158 samples (Pearson 0.80, Top-10 7.5/10). Scale correction for extreme
          values. Signal direction based on % price change (green = up, red = down).
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SyncModal({ target, onDismiss }: { target: string; onDismiss: () => void }) {
  const isBhavcopy = target === 'bhavcopy';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <Info className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Sync Required</h3>
        </div>
        <p className="text-sm text-slate-400 mb-5">
          {isBhavcopy
            ? 'Bhavcopy data is not available. Please go to the Bhavcopy page and click Sync to download historical NSE data.'
            : "Master contracts haven't been synced today. Please go to the Master Contracts page and click Re-sync."}
        </p>
        <div className="flex gap-3">
          <a
            href={isBhavcopy ? '/trading-lab/bhavcopy' : '/trading-lab/master-contracts'}
            className="flex-1 text-center px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors"
          >
            {isBhavcopy ? 'Go to Bhavcopy' : 'Go to Master Contracts'}
          </a>
          <button
            type="button"
            onClick={onDismiss}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm hover:bg-slate-700 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function DataSourceBadge({
  dataSource,
  latestDate,
  marketOpen,
}: {
  dataSource: string | null;
  latestDate: string | null;
  marketOpen: boolean | null;
}) {
  if (dataSource === 'live') {
    const isPostMarket = marketOpen === false;
    return (
      <span
        className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
          isPostMarket
            ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        }`}
      >
        {isPostMarket ? 'Closing' : 'Live'} · {latestDate ? shortDate(latestDate) : 'Today'}
      </span>
    );
  }

  if (dataSource === 'bhavcopy-today' && latestDate) {
    return (
      <span
        className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-full"
        title="Today's NSE bhavcopy data (end-of-day official numbers)"
      >
        Today · EOD · {shortDate(latestDate)}
      </span>
    );
  }

  if (dataSource === 'bhavcopy' && latestDate) {
    const now = new Date();
    const istMs = now.getTime() + now.getTimezoneOffset() * 60000 + 5.5 * 3600000;
    const ist = new Date(istMs);
    const todayIST = `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}-${String(ist.getDate()).padStart(2, '0')}`;
    const daysOld = Math.round((new Date(todayIST).getTime() - new Date(latestDate).getTime()) / 86400000);
    const isStale = daysOld >= 2;
    const isClosed = marketOpen === false;
    const label = isClosed ? 'Market Closed' : 'Bhavcopy';

    return (
      <span
        className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
          !isClosed || isStale
            ? 'bg-red-500/20 text-red-400 border-red-500/30'
            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        }`}
        title={
          isClosed
            ? `Market closed. Showing data from ${latestDate}.`
            : `Dhan API issue. Showing bhavcopy from ${latestDate}.`
        }
      >
        {label} · {shortDate(latestDate)}
        {isStale ? ' ⚠' : ''}
      </span>
    );
  }

  return null;
}

function SortButton({
  field,
  current,
  onSort,
  children,
}: {
  field: SortField;
  current: SortField;
  onSort: (f: SortField) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-slate-300 text-left"
    >
      {children}
      {current === field && <ArrowUpDown className="w-3 h-3" />}
    </button>
  );
}

function StockRow({ stock, isLast }: { stock: BoostStock; isLast: boolean }) {
  const isUp = (stock.pctChange ?? 0) >= 0;
  // HOT: R-Factor > 2.0 + ADX >= 28 (strong trend) + significant move (|%| >= 1)
  const isHot = stock.compositeRFactor >= 2.0 && (stock.adx ?? 0) >= 28 && Math.abs(stock.pctChange ?? 0) >= 1;
  // Override regime when ADX confirms trend but Z-score regime says Defensive
  const effectiveRegime =
    (stock.adx ?? 0) >= 28 && stock.compositeRFactor >= 2.0 ? (isUp ? 'Cheetah' : 'Hybrid') : stock.regime;
  return (
    // biome-ignore lint/a11y/useSemanticElements: grid layout needs div not button
    <div
      className={`grid grid-cols-[2fr_90px_70px_1fr_1fr_1fr_70px_55px_70px] gap-2 px-5 py-3 items-center transition-colors hover:bg-slate-800/40 cursor-pointer ${
        isHot ? 'border-l-2 border-l-amber-400 bg-amber-500/5' : ''
      } ${!isLast ? 'border-b border-slate-800/50' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => window.open(`https://www.tradingview.com/chart/?symbol=NSE%3A${stock.symbol}`, '_blank')}
      onKeyDown={(e) => {
        if (e.key === 'Enter') window.open(`https://www.tradingview.com/chart/?symbol=NSE%3A${stock.symbol}`, '_blank');
      }}
    >
      {/* Symbol + Regime + Badges */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold hover:text-sky-400 transition-colors ${isHot ? 'text-amber-300' : 'text-white'}`}
          >
            {stock.symbol}
          </span>
          {isHot && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded animate-pulse">
              <Flame className="w-2.5 h-2.5" />
              HOT
            </span>
          )}
          {stock.isBlastTrade && !isHot && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              <Zap className="w-2.5 h-2.5" />
              Blast
            </span>
          )}
          {stock.lotValue && stock.lotValue > 1000000 && (
            <span
              className="px-1 py-0.5 text-[8px] font-medium text-orange-400/70 bg-orange-500/10 border border-orange-500/20 rounded"
              title={`Lot value: ${Math.round(stock.lotValue / 100000)}L — high margin required`}
            >
              {Math.round(stock.lotValue / 100000)}L
            </span>
          )}
        </div>
        <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded border ${getRegimeBadgeClass(effectiveRegime)}`}>
          {effectiveRegime}
        </span>
      </div>

      {/* Sector */}
      <div>
        {stock.sector ? (
          <span className="px-1.5 py-0.5 text-[9px] font-medium rounded text-slate-400 bg-slate-800/60 border border-slate-700/50 whitespace-nowrap">
            {stock.sector}
          </span>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
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

      {/* Spread */}
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
            stock.zScores.pcr > 1.5 ? 'text-amber-400' : stock.zScores.pcr > 0.7 ? 'text-slate-300' : 'text-slate-500'
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

      {/* TF R-Factor */}
      <div>
        {stock.tfRFactor != null ? (
          <span className={`text-sm font-mono ${getRFactorColor(stock.tfRFactor)}`}>{stock.tfRFactor.toFixed(2)}</span>
        ) : (
          <span className="text-xs text-slate-700">&mdash;</span>
        )}
      </div>

      {/* ADX */}
      <div>
        {stock.adx != null ? (
          <span
            className={`text-xs font-mono ${stock.adx >= 28 ? 'text-amber-400 font-bold' : stock.adx >= 20 ? 'text-slate-300' : 'text-slate-600'}`}
          >
            {stock.adx.toFixed(0)}
            {stock.adx >= 28 && <span className="text-[8px] text-amber-500 ml-0.5">T</span>}
          </span>
        ) : (
          <span className="text-xs text-slate-700">—</span>
        )}
      </div>

      {/* Signal */}
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
}
