'use client';

import type { CompareStock } from '../_hooks/use-compare-data';

function fmtK(v: number) {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  return `${(v / 1000).toFixed(0)}K`;
}

function pcr(ce: number, pe: number) {
  return ce > 0 ? (pe / ce).toFixed(2) : '\u2014';
}

function diffColor(bhav: number, dhan: number): string {
  if (!bhav || !dhan) return '';
  const pct = Math.abs((dhan - bhav) / bhav) * 100;
  if (pct < 1) return '';
  if (pct < 5) return 'text-amber-400';
  return 'text-red-400';
}

const GRID = 'grid grid-cols-[1.5fr_50px_70px_70px_70px_70px_75px_70px_55px_65px] gap-1 px-4';

export function CompareTable({ stocks, hasDhan }: { stocks: CompareStock[]; hasDhan: boolean }) {
  const sorted = [...stocks].sort((a, b) => {
    const ar = a.bhav?.rFactor ?? a.dhan?.rFactor ?? 0;
    const br = b.bhav?.rFactor ?? b.dhan?.rFactor ?? 0;
    return br - ar;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div
        className={`${GRID} py-2 border-b border-slate-800 text-[9px] text-slate-500 font-medium uppercase tracking-wider`}
      >
        <span>Symbol</span>
        <span>Src</span>
        <span>High</span>
        <span>Low</span>
        <span>Close</span>
        <span>Fut Vol</span>
        <span>Fut OI</span>
        <span>OI Chg</span>
        <span>PCR</span>
        <span>R-Factor</span>
      </div>

      <div className="max-h-[70vh] overflow-y-auto">
        {sorted.map((s) => (
          <div key={s.symbol} className="border-b border-slate-800/50">
            {/* Bhav row */}
            {s.bhav && (
              <div className={`${GRID} py-1.5 text-sm hover:bg-slate-800/30`}>
                <span className="text-white font-medium truncate">{s.symbol}</span>
                <span className="text-[10px] text-sky-400 font-bold">BHAV</span>
                <span className="text-slate-300 font-mono">{s.bhav.eqHigh.toFixed(1)}</span>
                <span className="text-slate-300 font-mono">{s.bhav.eqLow.toFixed(1)}</span>
                <span className="text-slate-300 font-mono">{s.bhav.eqClose.toFixed(1)}</span>
                <span className="text-slate-400 font-mono">{fmtK(s.bhav.futVolume)}</span>
                <span className="text-slate-400 font-mono">{fmtK(s.bhav.futOi)}</span>
                <OiChg v={s.bhav.futOiChange} />
                <span className="text-slate-400 font-mono">{pcr(s.bhav.ceVolume, s.bhav.peVolume)}</span>
                <span className="text-sky-400 font-mono font-bold">{s.bhav.rFactor.toFixed(2)}</span>
              </div>
            )}

            {/* Dhan row (under bhav) */}
            {hasDhan && s.dhan && s.bhav && (
              <div className={`${GRID} py-1.5 text-sm hover:bg-slate-800/30 bg-slate-800/10`}>
                <span />
                <span className="text-[10px] text-violet-400 font-bold">DHAN</span>
                <span className={`font-mono ${diffColor(s.bhav.eqHigh, s.dhan.eqHigh) || 'text-slate-300'}`}>
                  {s.dhan.eqHigh.toFixed(1)}
                </span>
                <span className={`font-mono ${diffColor(s.bhav.eqLow, s.dhan.eqLow) || 'text-slate-300'}`}>
                  {s.dhan.eqLow.toFixed(1)}
                </span>
                <span className={`font-mono ${diffColor(s.bhav.eqClose, s.dhan.eqClose) || 'text-slate-300'}`}>
                  {s.dhan.eqClose.toFixed(1)}
                </span>
                <span className={`font-mono ${diffColor(s.bhav.futVolume, s.dhan.futVolume) || 'text-slate-400'}`}>
                  {fmtK(s.dhan.futVolume)}
                </span>
                <span className={`font-mono ${diffColor(s.bhav.futOi, s.dhan.futOi) || 'text-slate-400'}`}>
                  {fmtK(s.dhan.futOi)}
                </span>
                <OiChg v={s.dhan.futOiChange} />
                <span className="text-slate-400 font-mono">{pcr(s.dhan.ceVolume, s.dhan.peVolume)}</span>
                <span className="text-violet-400 font-mono font-bold">{s.dhan.rFactor.toFixed(2)}</span>
              </div>
            )}

            {/* Only Dhan, no Bhav */}
            {!s.bhav && s.dhan && (
              <div className={`${GRID} py-1.5 text-sm hover:bg-slate-800/30`}>
                <span className="text-white font-medium truncate">{s.symbol}</span>
                <span className="text-[10px] text-violet-400 font-bold">DHAN</span>
                <span className="text-slate-300 font-mono">{s.dhan.eqHigh.toFixed(1)}</span>
                <span className="text-slate-300 font-mono">{s.dhan.eqLow.toFixed(1)}</span>
                <span className="text-slate-300 font-mono">{s.dhan.eqClose.toFixed(1)}</span>
                <span className="text-slate-400 font-mono">{fmtK(s.dhan.futVolume)}</span>
                <span className="text-slate-400 font-mono">{fmtK(s.dhan.futOi)}</span>
                <OiChg v={s.dhan.futOiChange} />
                <span className="text-slate-400 font-mono">{pcr(s.dhan.ceVolume, s.dhan.peVolume)}</span>
                <span className="text-violet-400 font-mono font-bold">{s.dhan.rFactor.toFixed(2)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OiChg({ v }: { v: number }) {
  return (
    <span className={`font-mono ${v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-slate-500'}`}>
      {fmtK(v)}
    </span>
  );
}
