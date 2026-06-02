'use client';

import { Activity, AlertTriangle, Circle } from 'lucide-react';
import { useEffect, useState } from 'react';
import DepthLadder from './_components/DepthLadder';
import QuotePanel from './_components/QuotePanel';
import ReplayControls from './_components/ReplayControls';
import SimChart, { type SeriesVisibility } from './_components/SimChart';
import SymbolBar from './_components/SymbolBar';
import { useSimulator, useThrottledQuote } from './_hooks/use-simulator';

const TOGGLES: { key: keyof SeriesVisibility; label: string; dot: string; fnoOnly?: boolean }[] = [
  { key: 'vwap', label: 'VWAP', dot: 'bg-blue-400' },
  { key: 'ema9', label: 'EMA 9', dot: 'bg-cyan-400' },
  { key: 'ema20', label: 'EMA 20', dot: 'bg-purple-400' },
  { key: 'volume', label: 'Vol', dot: 'bg-slate-400' },
  { key: 'oi', label: 'OI', dot: 'bg-amber-400', fnoOnly: true },
];

const STATE_LABEL: Record<string, string> = {
  idle: 'Idle',
  loading: 'Loading…',
  ready: 'Ready',
  playing: 'Replaying',
  paused: 'Paused',
  finished: 'Finished',
};

const num = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${(n / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `${(n / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
}

export default function SimulatorPage() {
  const sim = useSimulator();
  const quote = useThrottledQuote(sim.onQuote);
  const { status, meta } = sim;
  const isFno = (status.instrumentKind ?? meta?.instrumentKind) !== 'EQUITY';
  const ready = status.totalTicks > 0;
  const [vis, setVis] = useState<SeriesVisibility>({ volume: true, oi: true, vwap: true, ema9: true, ema20: true });

  // Keyboard transport: Space = play/pause, → = step, R = reset (TradingView-style).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) return;
      if (!ready) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (status.state === 'playing') sim.pause();
        else sim.play();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        sim.step();
      } else if (e.key.toLowerCase() === 'r') {
        sim.reset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ready, status.state, sim]);

  return (
    <div className="flex h-[calc(100vh-1px)] flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-primary" />
          <h1 className="text-sm font-semibold">Market Simulator</h1>
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-400">
            Replay
          </span>
          {status.symbol && (
            <span className="ml-2 text-sm text-slate-400">
              {status.symbol}
              <span className="ml-1 text-xs text-slate-600">
                {status.instrumentKind} · {status.interval}m
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Circle
              className={`size-2 ${
                status.state === 'playing'
                  ? 'fill-emerald-400 text-emerald-400'
                  : sim.connected
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-slate-600 text-slate-600'
              }`}
            />
            {STATE_LABEL[status.state] ?? status.state}
          </span>
        </div>
      </header>

      <SymbolBar sim={sim} />

      {sim.error && (
        <div className="flex items-center gap-2 border-b border-red-900/50 bg-red-950/40 px-4 py-1.5 text-xs text-red-300">
          <AlertTriangle className="size-3.5" />
          {sim.error}
        </div>
      )}

      {/* Main */}
      <div className="flex min-h-0 flex-1">
        {/* Chart + transport */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            {/* Faint symbol watermark */}
            {status.symbol && (
              <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
                <span className="select-none text-7xl font-black tracking-tighter text-slate-500/[0.04]">
                  {status.symbol}
                </span>
              </div>
            )}
            {/* TradingView-style OHLC legend + series toggles */}
            {quote && (
              <div className="absolute left-3 top-2 z-20 flex flex-col gap-1">
                <div className="pointer-events-none flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px]">
                  <span className="font-semibold text-slate-200">
                    {status.symbol} · {status.interval}m
                  </span>
                  {(['open', 'high', 'low', 'close'] as const).map((k) => (
                    <span key={k} className="text-slate-500">
                      {k[0].toUpperCase()}
                      <span className={`ml-0.5 ${quote.close >= quote.open ? 'text-emerald-400' : 'text-red-400'}`}>
                        {num(quote[k])}
                      </span>
                    </span>
                  ))}
                  <span className={quote.change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {quote.change >= 0 ? '+' : ''}
                    {num(quote.change)} ({num(quote.changePct)}%)
                  </span>
                  <span className="text-slate-500">
                    Vol<span className="ml-0.5 text-slate-300">{compact(quote.volume)}</span>
                  </span>
                  {isFno && (
                    <span className="text-slate-500">
                      OI<span className="ml-0.5 text-amber-400">{compact(quote.oi)}</span>
                    </span>
                  )}
                </div>
                {/* Series visibility chips */}
                <div className="pointer-events-auto flex flex-wrap items-center gap-1">
                  {TOGGLES.filter((t) => !t.fnoOnly || isFno).map((t) => {
                    const on = vis[t.key];
                    return (
                      <button
                        type="button"
                        key={t.key}
                        onClick={() => setVis((v) => ({ ...v, [t.key]: !v[t.key] }))}
                        className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                          on ? 'bg-slate-800/80 text-slate-200' : 'text-slate-600 hover:bg-slate-800/40'
                        }`}
                      >
                        <span className={`size-1.5 rounded-full ${t.dot} ${on ? '' : 'opacity-30'}`} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {status.totalTicks === 0 && (
              <div className="pointer-events-none absolute inset-0 z-10 flex max-w-md flex-col items-center justify-center gap-1 text-center text-slate-600">
                <p className="text-sm">
                  Pick an F&amp;O stock + date, hit Download Data to pull the exact real candles, then Load Replay.
                </p>
                <p className="text-xs text-slate-700">
                  Every closed bar is the real downloaded OHLCV — built for backtesting.
                </p>
              </div>
            )}
            <SimChart sim={sim} showOi={isFno} visibility={vis} />
          </div>
          <ReplayControls sim={sim} />
        </div>

        {/* Right rail: quote + depth */}
        <aside className="flex w-72 flex-col overflow-y-auto border-l border-slate-800 bg-slate-900/20">
          <QuotePanel quote={quote} />
          <div className="mt-2 border-t border-slate-800 pt-1">
            <div className="flex items-baseline justify-between px-3 py-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Market Depth</span>
              <span
                className="text-[9px] text-slate-600"
                title="5-min candles carry no L2 data; this book is reconstructed"
              >
                indicative
              </span>
            </div>
            <DepthLadder quote={quote} />
          </div>
        </aside>
      </div>
    </div>
  );
}
