'use client';

import { Clock } from 'lucide-react';
import type { AnalyticsResult } from '../types';
import { fmt, fmtDuration, pct } from '../utils';
import { Section, StatCard, Table } from './ui';

interface Props {
  data: AnalyticsResult;
}

export function HoldingTime({ data }: Props) {
  const { holdingTime: ht } = data;

  const insightText = (() => {
    if (ht.tradesWithTime < 5) return null;
    if (ht.winnerAvgHold > ht.loserAvgHold * 1.5) {
      return {
        text: 'You let winners run and cut losers fast — strong discipline.',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
      };
    }
    if (ht.loserAvgHold > ht.winnerAvgHold * 1.5) {
      return {
        text: 'Losers are held longer than winners — consider tighter stop losses.',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
      };
    }
    return {
      text: 'Winner and loser hold times are similar.',
      color: 'text-slate-400',
      bg: 'bg-slate-800/50 border-slate-700/50',
    };
  })();

  const bucketRows = ht.durationBuckets
    .filter((b) => b.count > 0)
    .map((b) => [
      b.bucket,
      b.count.toString(),
      fmt(b.avgPnl),
      pct(b.winRate),
      pct((b.count / ht.tradesWithTime) * 100),
    ]);

  return (
    <Section title="3. Holding Time Patterns" icon={Clock} color="text-violet-400">
      {/* Info banner */}
      <div className="mt-2 mb-4 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
        <p className="text-sm text-slate-300">
          <span className="text-violet-300 font-semibold">{ht.tradesWithTime}</span> of{' '}
          <span className="text-white font-semibold">{ht.totalTrades}</span> trades have verified broker entry/exit
          times. Analysis below is based on verified trades only.
        </p>
      </div>

      {ht.tradesWithTime > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Avg Hold Time" value={fmtDuration(ht.avgHoldMinutes)} />
            <StatCard label="Median Hold" value={fmtDuration(ht.medianHoldMinutes)} />
            <StatCard
              label="Winner Avg Hold"
              value={ht.winnerAvgHold > 0 ? fmtDuration(ht.winnerAvgHold) : '—'}
              positive={true}
            />
            <StatCard
              label="Loser Avg Hold"
              value={ht.loserAvgHold > 0 ? fmtDuration(ht.loserAvgHold) : '—'}
              positive={false}
            />
          </div>

          {/* Discipline insight */}
          {insightText && (
            <div className={`mt-4 px-4 py-3 rounded-lg border ${insightText.bg}`}>
              <p className={`text-sm font-medium ${insightText.color}`}>{insightText.text}</p>
            </div>
          )}

          {/* Duration buckets table */}
          <div className="mt-4">
            <Table headers={['Duration', 'Trades', 'Avg P&L', 'Win Rate', '% of Total']} rows={bucketRows} />
          </div>

          {/* Extremes */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {ht.shortestHold && (
              <StatCard
                label="Shortest Hold"
                value={fmtDuration(ht.shortestHold.minutes)}
                sub={`${ht.shortestHold.trade.stock_name} · ${fmt(ht.shortestHold.trade.total_pnl)}`}
              />
            )}
            {ht.longestHold && (
              <StatCard
                label="Longest Hold"
                value={fmtDuration(ht.longestHold.minutes)}
                sub={`${ht.longestHold.trade.stock_name} · ${fmt(ht.longestHold.trade.total_pnl)}`}
              />
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500 mt-2">No trades with verified entry/exit times available.</p>
      )}
    </Section>
  );
}
