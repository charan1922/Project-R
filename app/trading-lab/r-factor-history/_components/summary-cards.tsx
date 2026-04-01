import { getRFactorColor } from '@/app/trading-lab/_lib/r-factor-ui';
import type { StockHistoryEntry, Summary } from '../_hooks/use-history-data';

export function SummaryCards({ summary, history }: { summary: Summary; history?: StockHistoryEntry[] }) {
  // Count HOT days from history
  const hotDays = history
    ? history.filter((d) => d.compositeRFactor >= 2.0 && (d.adx ?? 0) >= 28 && Math.abs(d.pctChange ?? 0) >= 1).length
    : 0;

  // Best day
  const bestDay = history?.reduce(
    (best, d) => (d.compositeRFactor > (best?.compositeRFactor ?? 0) ? d : best),
    history[0],
  );

  return (
    <div className="grid grid-cols-6 gap-3">
      <Card label="Avg R" value={summary.avgR.toFixed(2)} className={getRFactorColor(summary.avgR)} />
      <Card label="Max R" value={summary.maxR.toFixed(2)} className={getRFactorColor(summary.maxR)} />
      <Card
        label="Blast Days"
        value={`${summary.blastDays}/${summary.totalDays}`}
        className="text-emerald-400"
        border="border-emerald-500/20"
      />
      <Card
        label="HOT Days"
        value={`${hotDays}/${summary.totalDays}`}
        className={hotDays > 0 ? 'text-amber-400' : 'text-slate-500'}
        border={hotDays > 0 ? 'border-amber-500/20' : undefined}
      />
      <Card label="Avg Spread" value={`${summary.avgSpread.toFixed(2)}x`} className="text-slate-300" />
      <Card
        label="Best Day"
        value={bestDay ? `${bestDay.compositeRFactor.toFixed(1)}` : '—'}
        className={bestDay ? getRFactorColor(bestDay.compositeRFactor) : 'text-slate-500'}
        sub={bestDay ? bestDay.date.slice(5) : undefined}
      />
    </div>
  );
}

function Card({
  label,
  value,
  className,
  border,
  sub,
}: {
  label: string;
  value: string;
  className: string;
  border?: string;
  sub?: string;
}) {
  return (
    <div className={`px-3 py-2.5 rounded-lg bg-slate-900 border ${border ?? 'border-slate-800'}`}>
      <p className="text-[10px] text-slate-500 uppercase">{label}</p>
      <p className={`text-lg font-bold font-mono ${className}`}>{value}</p>
      {sub && <p className="text-[9px] text-slate-600 font-mono">{sub}</p>}
    </div>
  );
}
