/**
 * Dual Momentum ETF Rotation Strategy
 * Ported from marketcalls/vectorbt-backtesting-skills/dual_momentum_backtest.py
 *
 * Quarterly rebalance: compare trailing momentum of two ETFs,
 * invest fully in the winner for the next quarter.
 */

export interface DualMomentumParams {
    symbolA: string;      // default: "NIFTYBEES"
    symbolB: string;      // default: "GOLDBEES"
    lookbackDays: number; // momentum lookback (default: 63 = ~1 quarter)
}

export const DEFAULT_DUAL_MOMENTUM_PARAMS: DualMomentumParams = {
    symbolA: "NIFTYBEES",
    symbolB: "GOLDBEES",
    lookbackDays: 63,
};

export interface DualMomentumSignal {
    index: number;
    date: string;
    winner: "A" | "B";
    momentumA: number;
    momentumB: number;
}

/**
 * Generate quarterly rebalance signals.
 * Returns an array of rebalance events with the winning symbol.
 */
export function dualMomentumSignals(
    closesA: number[],
    closesB: number[],
    dates: string[],
    params: DualMomentumParams = DEFAULT_DUAL_MOMENTUM_PARAMS
): DualMomentumSignal[] {
    const signals: DualMomentumSignal[] = [];
    const { lookbackDays } = params;

    // Find quarterly boundaries (every ~63 trading days)
    for (let i = lookbackDays; i < closesA.length; i += lookbackDays) {
        const momA = (closesA[i] - closesA[i - lookbackDays]) / closesA[i - lookbackDays];
        const momB = (closesB[i] - closesB[i - lookbackDays]) / closesB[i - lookbackDays];

        signals.push({
            index: i,
            date: dates[i],
            winner: momA >= momB ? "A" : "B",
            momentumA: +(momA * 100).toFixed(2),
            momentumB: +(momB * 100).toFixed(2),
        });
    }

    return signals;
}

/**
 * Convert dual momentum signals into daily allocation array.
 * Each element is "A" or "B" indicating which asset to hold.
 */
export function dualMomentumAllocations(
    signals: DualMomentumSignal[],
    totalLength: number
): ("A" | "B")[] {
    const alloc: ("A" | "B")[] = new Array(totalLength).fill("A"); // default to A

    for (let s = 0; s < signals.length; s++) {
        const start = signals[s].index;
        const end = s < signals.length - 1 ? signals[s + 1].index : totalLength;
        for (let i = start; i < end; i++) {
            alloc[i] = signals[s].winner;
        }
    }

    return alloc;
}
