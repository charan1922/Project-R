import { Zap } from 'lucide-react';
import { getRFactorColor, REGIME_BADGE } from '@/app/trading-lab/_lib/r-factor-ui';
import type { LeaderEntry } from '../_hooks/use-history-data';

const COLS = 'grid-cols-[35px_2fr_80px_65px_55px_55px_55px_55px_55px_55px_80px_50px]';

export function LeaderboardTable({ data }: { data: LeaderEntry[] }) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div
        className={`grid ${COLS} gap-1 px-4 py-2.5 bg-slate-800/50 text-[10px] text-slate-500 uppercase tracking-wider font-medium`}
      >
        <span>#</span>
        <span>Symbol</span>
        <span>Sector</span>
        <span>R-Factor</span>
        <span>Spread</span>
        <span>OI Lvl</span>
        <span>PCR</span>
        <span>FutTrn</span>
        <span>FutVol</span>
        <span>OptVol</span>
        <span>Regime</span>
        <span>Blast</span>
      </div>
      {data.map((entry, i) => (
        <LeaderRow key={entry.symbol} entry={entry} rank={i + 1} />
      ))}
    </div>
  );
}

function LeaderRow({ entry, rank }: { entry: LeaderEntry; rank: number }) {
  const z = entry.zScores;
  return (
    <div
      className={`grid ${COLS} gap-1 px-4 py-2 items-center border-b border-slate-800/50 last:border-b-0 hover:bg-slate-800/30 text-xs`}
    >
      <span className="text-slate-600 font-mono">{rank}</span>
      <span className="font-semibold text-white">{entry.symbol}</span>
      <span className="text-[9px] text-slate-500">{entry.sector ?? '—'}</span>
      <span className={`font-mono font-bold ${getRFactorColor(entry.compositeRFactor)}`}>
        {entry.compositeRFactor.toFixed(2)}
      </span>
      <ZCell value={z.spread} threshold={1.5} color="text-emerald-400" />
      <ZCell value={z.oi_level} threshold={1.15} color="text-violet-400" />
      <ZCell value={z.pcr} threshold={1.5} color="text-amber-400" />
      <ZCell value={z.fut_turnover} threshold={1} color="text-sky-400" />
      <ZCell value={z.fut_volume} threshold={1} color="text-sky-400" />
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
  return <span className={`font-mono ${value > threshold ? color : 'text-slate-500'}`}>{value.toFixed(2)}</span>;
}
