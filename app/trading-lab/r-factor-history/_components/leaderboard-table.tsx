import { Flame } from 'lucide-react';
import { getRFactorColor, getRegimeBadgeClass } from '@/app/trading-lab/_lib/r-factor-ui';
import type { LeaderEntry } from '../_hooks/use-history-data';

const COLS = 'grid-cols-[30px_2fr_70px_60px_55px_45px_50px_50px_65px]';

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
        <span>ADX</span>
        <span>OI Lvl</span>
        <span>OptVol</span>
        <span>Regime</span>
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
      className={`grid ${COLS} gap-1 px-4 py-2 items-center border-b border-slate-800/50 last:border-b-0 hover:bg-slate-800/30 text-xs cursor-pointer`}
      onClick={() => window.open(`https://www.tradingview.com/chart/?symbol=NSE%3A${entry.symbol}`, '_blank')}
    >
      <span className="text-slate-600 font-mono">{rank}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-white">{entry.symbol}</span>
        {entry.isBlastTrade && (
          <Flame className="w-3 h-3 text-emerald-400" />
        )}
      </div>
      <span className="text-[9px] text-slate-500">{entry.sector ?? '—'}</span>
      <span className={`font-mono font-bold ${getRFactorColor(entry.compositeRFactor)}`}>
        {entry.compositeRFactor.toFixed(2)}
      </span>
      <ZCell value={z.spread} threshold={1.5} color="text-emerald-400" />
      <span className="font-mono text-slate-500">—</span>
      <ZCell value={z.oi_level} threshold={1.15} color="text-violet-400" />
      <ZCell value={z.opt_volume} threshold={1} color="text-amber-400" />
      <span className={`text-[9px] px-1 py-0.5 rounded border w-fit ${getRegimeBadgeClass(entry.regime)}`}>
        {entry.regime}
      </span>
    </div>
  );
}

function ZCell({ value, threshold, color }: { value: number; threshold: number; color: string }) {
  return <span className={`font-mono ${value > threshold ? color : 'text-slate-500'}`}>{value.toFixed(2)}</span>;
}
