'use client';

import { ArrowDown, ArrowUp, Clock, Minus, Search, TrendingUp } from 'lucide-react';
import { useState } from 'react';

import { shortDate } from '@/app/trading-lab/_lib/r-factor-ui';
import { HistoryChart } from './_components/history-chart';
import { LeaderboardTable } from './_components/leaderboard-table';
import { SummaryCards } from './_components/summary-cards';
import { ZScoreTable } from './_components/zscore-table';
import { useLeaderboard, useStockHistory } from './_hooks/use-history-data';

type ActiveTab = 'stock' | 'leaderboard';

export default function RFactorHistoryPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('stock');
  const [symbolInput, setSymbolInput] = useState('');
  const stock = useStockHistory();
  const leader = useLeaderboard();

  const handleSymbolSearch = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const sym = symbolInput.trim().toUpperCase();
    if (sym) stock.search(sym);
  };

  const TrendIcon =
    stock.summary?.trendDirection === 'up' ? ArrowUp : stock.summary?.trendDirection === 'down' ? ArrowDown : Minus;
  const trendColor =
    stock.summary?.trendDirection === 'up'
      ? 'text-emerald-400'
      : stock.summary?.trendDirection === 'down'
        ? 'text-red-400'
        : 'text-slate-500';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
          <Clock className="w-6 h-6 text-sky-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">R-Factor History</h1>
          <p className="text-sm text-slate-500">Track institutional activity signals across dates</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit">
        {(['stock', 'leaderboard'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab === 'stock' ? 'Stock History' : 'Daily Leaderboard'}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Stock History ── */}
      {activeTab === 'stock' && (
        <div className="space-y-5">
          <form onSubmit={handleSymbolSearch} className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="e.g. RELIANCE"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                className="pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-slate-600 w-48"
              />
            </div>
            <button
              type="submit"
              disabled={stock.loading || !symbolInput.trim()}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {stock.loading ? 'Loading...' : 'Analyze'}
            </button>
          </form>

          {stock.error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {stock.error}
            </div>
          )}

          {stock.summary && stock.history.length > 0 && (
            <>
              {/* Symbol header */}
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-white">{stock.activeSymbol}</span>
                {stock.sector && (
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-800/60 border border-slate-700/50 text-slate-400">
                    {stock.sector}
                  </span>
                )}
                <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                <span className="text-sm text-slate-500">
                  {stock.summary.totalDays} days ·{' '}
                  {stock.summary.trendDirection === 'up'
                    ? 'trending up'
                    : stock.summary.trendDirection === 'down'
                      ? 'trending down'
                      : 'flat'}
                </span>
              </div>

              <SummaryCards summary={stock.summary} />
              <HistoryChart data={stock.history} />
              <ZScoreTable data={stock.history} />
            </>
          )}

          {!stock.loading && stock.history.length === 0 && !stock.error && (
            <div className="px-5 py-16 text-center rounded-xl bg-slate-900 border border-slate-800">
              <Search className="w-6 h-6 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Enter a symbol to view its R-Factor history</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Daily Leaderboard ── */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <select
              value={leader.selectedDate}
              onChange={(e) => leader.setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-slate-600"
            >
              {leader.availableDates.map((d) => (
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
            <select
              value={leader.sectorFilter}
              onChange={(e) => leader.setSectorFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-slate-600"
            >
              <option value="ALL">All Sectors</option>
              {leader.sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {leader.loading && <span className="text-xs text-slate-500">Computing...</span>}
          </div>

          {leader.error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {leader.error}
            </div>
          )}

          {leader.filtered.length > 0 && <LeaderboardTable data={leader.filtered} />}

          {!leader.loading && leader.filtered.length === 0 && !leader.error && leader.selectedDate && (
            <div className="px-5 py-16 text-center rounded-xl bg-slate-900 border border-slate-800">
              <TrendingUp className="w-6 h-6 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No leaderboard data for {shortDate(leader.selectedDate)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
