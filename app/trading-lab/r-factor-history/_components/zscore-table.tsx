import { Zap } from 'lucide-react';
import { getRFactorColor, REGIME_BADGE, shortDate } from '@/app/trading-lab/_lib/r-factor-ui';
import type { StockHistoryEntry } from '../_hooks/use-history-data';

const COLS = 'grid-cols-[90px_70px_55px_55px_55px_55px_55px_55px_70px_50px]';

export function ZScoreTable({ data }: { data: StockHistoryEntry[] }) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div
        className={`grid ${COLS} gap-1 px-4 py-2.5 bg-slate-800/50 text-[10px] text-slate-500 uppercase tracking-wider font-medium`}
      >
        <span>Date</span>
        <span>R-Factor</span>
        <span>Spread</span>
        <span>PCR</span>
        <span>FutTrn</span>
        <span>FutVol</span>
        <span>OI Chg</span>
        <span>OptVol</span>
        <span>Regime</span>
        <span>Blast</span>
      </div>
      {[...data].reverse().map((entry) => (
        <ZScoreRow key={entry.date} entry={entry} />
      ))}
    </div>
  );
}

function ZScoreRow({ entry }: { entry: StockHistoryEntry }) {
  const z = entry.zScores;
  return (
    <div
      className={`grid ${COLS} gap-1 px-4 py-2 items-center border-b border-slate-800/50 last:border-b-0 hover:bg-slate-800/30 text-xs font-mono`}
    >
      <span className="text-slate-400">{shortDate(entry.date)}</span>
      <span className="flex items-center gap-1">
        <span className={`font-bold ${getRFactorColor(entry.compositeRFactor)}`}>
          {entry.compositeRFactor.toFixed(2)}
        </span>
        {entry.delta !== null && (
          <span
            className={`text-[9px] ${entry.delta > 0 ? 'text-emerald-400/60' : entry.delta < 0 ? 'text-red-400/60' : 'text-slate-600'}`}
          >
            {entry.delta > 0 ? '+' : ''}
            {entry.delta.toFixed(1)}
          </span>
        )}
      </span>
      <ZCell value={z.spread} threshold={1.5} color="text-emerald-400" />
      <ZCell value={z.pcr} threshold={1.5} color="text-amber-400" />
      <ZCell value={z.fut_turnover} threshold={1} color="text-sky-400" />
      <ZCell value={z.fut_volume} threshold={1} color="text-sky-400" />
      <ZCell value={z.oi_change} threshold={1} color="text-purple-400" />
      <ZCell value={z.opt_volume} threshold={1} color="text-amber-400" />
      <span
        className={`text-[9px] px-1 py-0.5 rounded border w-fit ${REGIME_BADGE[entry.regime] ?? REGIME_BADGE.Defensive}`}
      >
        {entry.regime}
      </span>
      <span>
        {entry.isBlastTrade ? (
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <span className="text-slate-700">—</span>
        )}
      </span>
    </div>
  );
}

function ZCell({ value, threshold, color }: { value: number; threshold: number; color: string }) {
  return <span className={value > threshold ? color : 'text-slate-500'}>{value.toFixed(1)}</span>;
}
