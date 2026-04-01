'use client';

import { Clock } from 'lucide-react';
import type { AnalyticsResult } from '../types';
import { pct } from '../utils';
import { PnLCell, Section, Table } from './ui';

interface Props {
  data: AnalyticsResult;
}

export function TimingAnalysis({ data: { actual, timeBuckets } }: Props) {
  const verifiedCount = actual.filter((t) => t.entry_time).length;
  const estimatedCount = actual.filter((t) => !t.entry_time && t.sensibull_log_time).length;
  const noTimeCount = actual.filter((t) => !t.entry_time && !t.sensibull_log_time).length;

  const rows = Object.values(timeBuckets)
    .sort((a, b) => b.count - a.count)
    .map(({ bucket, count, totalPnl, verifiedCount: vc }) => [
      bucket,
      count,
      <PnLCell key={`${bucket}tp`} v={totalPnl} />,
      <PnLCell key={`${bucket}avg`} v={totalPnl / count} />,
      pct((count / actual.length) * 100),
      <span key={`${bucket}src`} className="text-xs text-slate-500">
        {vc} verified
      </span>,
    ]);

  return (
    <Section title="9. Trade Timing Analysis" icon={Clock} color="text-cyan-400">
      <div className="mt-2">
        <Table headers={['Time Bucket', 'Count', 'Total P&L', 'Avg P&L', '% of Trades', 'Source']} rows={rows} />
        <div className="mt-3 p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sm text-sky-200">
          <strong>{verifiedCount}</strong> trades use verified broker entry time, <strong>{estimatedCount}</strong> use
          Sensibull log time (estimated), <strong>{noTimeCount}</strong> have no time data.
        </div>
      </div>
    </Section>
  );
}
