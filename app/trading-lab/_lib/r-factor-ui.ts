/** Shared R-Factor display types and helpers — used by Intraday Boost + History pages */

export type Regime = 'Elephant' | 'Cheetah' | 'Hybrid' | 'Defensive';

export const REGIME_BADGE: Record<string, string> = {
  Cheetah: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Elephant: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  Hybrid: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Defensive: 'bg-slate-800/50 text-slate-500 border-slate-700/50',
};

export function getRFactorColor(r: number): string {
  if (r >= 2.8) return 'text-emerald-400 font-bold';
  if (r >= 2.2) return 'text-sky-400';
  if (r >= 1.8) return 'text-slate-300';
  return 'text-slate-500';
}

export function getRegimeBadgeClass(regime: string): string {
  return REGIME_BADGE[regime] ?? REGIME_BADGE.Defensive;
}

export function shortDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export function fullDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
