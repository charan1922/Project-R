/**
 * EMA Crossover Strategy
 * Ported from marketcalls/vectorbt-backtesting-skills/SBIN_ema_crossover_backtest.py
 *
 * Buy when fast EMA crosses above slow EMA, sell on cross below.
 */

import { ema } from "../math-utils";

export interface EMAParams {
    fastPeriod: number;  // default: 10
    slowPeriod: number;  // default: 20
}

export const DEFAULT_EMA_PARAMS: EMAParams = {
    fastPeriod: 10,
    slowPeriod: 20,
};

/**
 * Generate entry/exit signals for EMA crossover strategy.
 * Returns arrays of booleans (true = signal active at that index).
 */
export function emaCrossoverSignals(
    closes: number[],
    params: EMAParams = DEFAULT_EMA_PARAMS
): { entries: boolean[]; exits: boolean[] } {
    const fastEma = ema(closes, params.fastPeriod);
    const slowEma = ema(closes, params.slowPeriod);

    const entries: boolean[] = new Array(closes.length).fill(false);
    const exits: boolean[] = new Array(closes.length).fill(false);

    let inPosition = false;

    for (let i = 1; i < closes.length; i++) {
        const crossAbove = fastEma[i] > slowEma[i] && fastEma[i - 1] <= slowEma[i - 1];
        const crossBelow = fastEma[i] < slowEma[i] && fastEma[i - 1] >= slowEma[i - 1];

        if (crossAbove && !inPosition) {
            entries[i] = true;
            inPosition = true;
        } else if (crossBelow && inPosition) {
            exits[i] = true;
            inPosition = false;
        }
    }

    return { entries, exits };
}
