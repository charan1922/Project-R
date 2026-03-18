import { getRFactorColor, REGIME_BADGE } from '@/app/trading-lab/_lib/r-factor-ui';
import type { Summary } from '../_hooks/use-history-data';

export function SummaryCards({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-5 gap-3">
      <Card label="Avg R" value={summary.avgR.toFixed(2)} className={getRFactorColor(summary.avgR)} />
      <Card label="Max R" value={summary.maxR.toFixed(2)} className={getRFactorColor(summary.maxR)} />
      <Card
        label="Blast Days"
        value={`${summary.blastDays}/${summary.totalDays}`}
        className="text-emerald-400"
        border="border-emerald-500/20"
      />
      <Card label="Avg Spread" value={`${summary.avgSpread.toFixed(2)}x`} className="text-slate-300" />
      <Card
        label="Regime"
        value={summary.dominantRegime}
        className={
          REGIME_BADGE[summary.dominantRegime]?.includes('amber')
            ? 'text-amber-400'
            : REGIME_BADGE[summary.dominantRegime]?.includes('sky')
              ? 'text-sky-400'
              : 'text-slate-400'
        }
        small
      />
    </div>
  );
}

function Card({
  label,
  value,
  className,
  border,
  small,
}: {
  label: string;
  value: string;
  className: string;
  border?: string;
  small?: boolean;
}) {
  return (
    <div className={`px-3 py-2.5 rounded-lg bg-slate-900 border ${border ?? 'border-slate-800'}`}>
      <p className="text-[10px] text-slate-500 uppercase">{label}</p>
      <p className={`${small ? 'text-sm' : 'text-lg'} font-bold font-mono ${className}`}>{value}</p>
    </div>
  );
}
