/**
 * RSI Accumulation Strategy
 * Ported from marketcalls/vectorbt-backtesting-skills/niftybees_rsi_accumulation_backtest.py
 *
 * Slab-wise buying when RSI drops into oversold zones:
 *   RSI 50-68 → buy 5% of capital
 *   RSI 30-50 → buy 10% of capital
 *   RSI < 30  → buy 20% of capital
 */

import { rsi as calcRSI } from "../math-utils";

export interface RSIAccParams {
    rsiPeriod: number;     // default: 14
    slabs: { upper: number; lower: number; allocation: number }[];
}

export const DEFAULT_RSI_ACC_PARAMS: RSIAccParams = {
    rsiPeriod: 14,
    slabs: [
        { upper: 68, lower: 50, allocation: 0.05 },   // 5%
        { upper: 50, lower: 30, allocation: 0.10 },   // 10%
        { upper: 30, lower: 0, allocation: 0.20 },   // 20%
    ],
};

export interface RSIAccSignal {
    index: number;
    date: string;
    rsiValue: number;
    allocation: number;  // fraction of initial capital to deploy
    slab: string;
}

/**
 * Generate RSI accumulation signals.
 * Returns buy signals with the allocation percentage for each slab trigger.
 */
export function rsiAccumulationSignals(
    closes: number[],
    dates: string[],
    params: RSIAccParams = DEFAULT_RSI_ACC_PARAMS
): RSIAccSignal[] {
    const rsiValues = calcRSI(closes, params.rsiPeriod);
    const signals: RSIAccSignal[] = [];

    // Track which slabs have been triggered (reset when RSI goes above 68)
    let triggeredSlabs = new Set<string>();

    for (let i = params.rsiPeriod + 1; i < closes.length; i++) {
        const r = rsiValues[i];
        if (isNaN(r)) continue;

        // Reset when RSI recovers above the highest slab
        if (r > params.slabs[0].upper) {
            triggeredSlabs = new Set();
            continue;
        }

        for (const slab of params.slabs) {
            const slabKey = `${slab.lower}-${slab.upper}`;
            if (r >= slab.lower && r < slab.upper && !triggeredSlabs.has(slabKey)) {
                triggeredSlabs.add(slabKey);
                signals.push({
                    index: i,
                    date: dates[i],
                    rsiValue: +r.toFixed(2),
                    allocation: slab.allocation,
                    slab: slabKey,
                });
            }
        }
    }

    return signals;
}
