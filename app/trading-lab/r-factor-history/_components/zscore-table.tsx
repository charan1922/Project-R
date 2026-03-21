import { Flame } from 'lucide-react';
import { getRFactorColor, getRegimeBadgeClass, shortDate } from '@/app/trading-lab/_lib/r-factor-ui';
import type { StockHistoryEntry } from '../_hooks/use-history-data';

const COLS = 'grid-cols-[80px_65px_60px_50px_45px_50px_50px_50px_65px_40px]';

export function ZScoreTable({ data, symbol }: { data: StockHistoryEntry[]; symbol?: string }) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div
        className={`grid ${COLS} gap-1 px-4 py-2.5 bg-slate-800/50 text-[10px] text-slate-500 uppercase tracking-wider font-medium`}
      >
        <span>Date</span>
        <span>R-Factor</span>
        <span>% Chg</span>
        <span>Spread</span>
        <span>ADX</span>
        <span>OI Lvl</span>
        <span>PCR</span>
        <span>OptVol</span>
        <span>Regime</span>
        <span>Conf</span>
      </div>
      {[...data].reverse().map((entry) => (
        <ZScoreRow key={entry.date} entry={entry} symbol={symbol} />
      ))}
    </div>
  );
}

function ZScoreRow({ entry, symbol }: { entry: StockHistoryEntry; symbol?: string }) {
  const z = entry.zScores;
  const adx = entry.adx ?? 0;
  const pct = entry.pctChange ?? 0;
  const isUp = pct >= 0;

  // HOT: R >= 2.0 + ADX >= 28 + |%| >= 1
  const isHot = entry.compositeRFactor >= 2.0 && adx >= 28 && Math.abs(pct) >= 1;

  // Regime override when ADX confirms trend
  const effectiveRegime = adx >= 28 && entry.compositeRFactor >= 2.0
    ? (isUp ? 'Cheetah' : 'Hybrid')
    : entry.regime;

  return (
    <div
      className={`grid ${COLS} gap-1 px-4 py-2 items-center border-b border-slate-800/50 last:border-b-0 hover:bg-slate-800/30 text-xs font-mono cursor-pointer ${
        isHot ? 'border-l-2 border-l-amber-400 bg-amber-500/5' : ''
      }`}
      onClick={() => symbol && window.open(`https://www.tradingview.com/chart/?symbol=NSE%3A${symbol}`, '_blank')}
    >
      {/* Date + HOT */}
      <span className="flex items-center gap-1">
        <span className="text-slate-400">{shortDate(entry.date)}</span>
        {isHot && <Flame className="w-3 h-3 text-amber-400" />}
      </span>

      {/* R-Factor + delta */}
      <span className="flex items-center gap-1">
        <span className={`font-bold ${getRFactorColor(entry.compositeRFactor)}`}>
          {entry.compositeRFactor.toFixed(2)}
        </span>
        {entry.delta !== null && (
          <span className={`text-[9px] ${entry.delta > 0 ? 'text-emerald-400/60' : entry.delta < 0 ? 'text-red-400/60' : 'text-slate-600'}`}>
            {entry.delta > 0 ? '+' : ''}{entry.delta.toFixed(1)}
          </span>
        )}
      </span>

      {/* % Change */}
      <span className={`font-medium ${pct > 0 ? 'text-emerald-400' : pct < 0 ? 'text-red-400' : 'text-slate-500'}`}>
        {pct !== 0 ? `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}
      </span>

      {/* Spread */}
      <ZCell value={z.spread} threshold={1.5} color="text-emerald-400" />

      {/* ADX */}
      <span className={`${adx >= 28 ? 'text-amber-400 font-bold' : adx >= 20 ? 'text-slate-300' : 'text-slate-600'}`}>
        {adx > 0 ? adx.toFixed(0) : '—'}
      </span>

      {/* OI Level */}
      <ZCell value={z.oi_level} threshold={1.15} color="text-violet-400" />

      {/* PCR */}
      <ZCell value={z.pcr} threshold={1.5} color="text-amber-400" />

      {/* OptVol */}
      <ZCell value={z.opt_volume} threshold={1} color="text-amber-400" />

      {/* Regime */}
      <span className={`text-[9px] px-1 py-0.5 rounded border w-fit ${getRegimeBadgeClass(effectiveRegime)}`}>
        {effectiveRegime}
      </span>

      {/* Confidence */}
      <span className={`text-[9px] ${(entry.confidence ?? 0) > 0.7 ? 'text-emerald-400' : (entry.confidence ?? 0) > 0.5 ? 'text-amber-400' : 'text-slate-500'}`}>
        {entry.confidence != null ? `${(entry.confidence * 100).toFixed(0)}%` : '—'}
      </span>
    </div>
  );
}

function ZCell({ value, threshold, color }: { value: number; threshold: number; color: string }) {
  return <span className={value > threshold ? color : 'text-slate-500'}>{value.toFixed(2)}</span>;
}
