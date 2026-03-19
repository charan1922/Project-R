/**
 * EMA Crossover Strategy
 * Ported from marketcalls/vectorbt-backtesting-skills/SBIN_ema_crossover_backtest.py
 *
 * Buy when fast EMA crosses above slow EMA, sell on cross below.
 */

import { ema, atr } from '../math-utils';

export interface EMAParams {
  fastPeriod: number; // default: 10
  slowPeriod: number; // default: 20
  /** ATR period for trailing stop (0 = disabled, uses EMA crossdown exit). Default: 0 */
  atrPeriod?: number;
  /** ATR multiplier for stop distance (e.g., 2.0 = stop at close - 2×ATR). Default: 2.0 */
  atrMultiplier?: number;
}

export const DEFAULT_EMA_PARAMS: EMAParams = {
  fastPeriod: 10,
  slowPeriod: 20,
  atrPeriod: 0,
  atrMultiplier: 2.0,
};

/**
 * Generate entry/exit signals for EMA crossover strategy.
 * Returns arrays of booleans (true = signal active at that index).
 * When ATR trailing stops are enabled, also returns stopLevels array.
 */
export function emaCrossoverSignals(
  closes: number[],
  params: EMAParams = DEFAULT_EMA_PARAMS,
  highs?: number[],
  lows?: number[],
): { entries: boolean[]; exits: boolean[]; stopLevels: number[] } {
  const fastEma = ema(closes, params.fastPeriod);
  const slowEma = ema(closes, params.slowPeriod);

  const entries: boolean[] = new Array(closes.length).fill(false);
  const exits: boolean[] = new Array(closes.length).fill(false);
  const stopLevels: number[] = new Array(closes.length).fill(NaN);

  const useAtrStop = (params.atrPeriod ?? 0) > 0 && highs && lows;
  const atrValues = useAtrStop ? atr(highs, lows, closes, params.atrPeriod!) : null;
  const multiplier = params.atrMultiplier ?? 2.0;

  let inPosition = false;
  let trailingStop = 0;

  for (let i = 1; i < closes.length; i++) {
    const crossAbove = fastEma[i] > slowEma[i] && fastEma[i - 1] <= slowEma[i - 1];

    if (crossAbove && !inPosition) {
      entries[i] = true;
      inPosition = true;
      if (atrValues && !isNaN(atrValues[i])) {
        trailingStop = closes[i] - atrValues[i] * multiplier;
      }
    } else if (inPosition) {
      if (useAtrStop && atrValues && !isNaN(atrValues[i])) {
        // Trail stop upward only
        const newStop = closes[i] - atrValues[i] * multiplier;
        trailingStop = Math.max(trailingStop, newStop);
        stopLevels[i] = trailingStop;

        // Exit if price breaches trailing stop
        if (lows[i] <= trailingStop) {
          exits[i] = true;
          inPosition = false;
          trailingStop = 0;
        }
      } else {
        // Fallback: original EMA crossdown exit
        const crossBelow = fastEma[i] < slowEma[i] && fastEma[i - 1] >= slowEma[i - 1];
        if (crossBelow) {
          exits[i] = true;
          inPosition = false;
        }
      }
    }
  }

  return { entries, exits, stopLevels };
}
