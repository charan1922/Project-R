/**
 * Buy & Hold 75/25 Strategy
 * Ported from marketcalls/vectorbt-backtesting-skills/buy_hold_75_25_backtest.py
 *
 * 75% equity (NIFTYBEES) + 25% gold (GOLDBEES), annual rebalance.
 */

export interface BuyHoldParams {
    equityWeight: number;   // default: 0.75
    goldWeight: number;     // default: 0.25
    rebalanceDays: number;  // default: 252 (annual)
}

export const DEFAULT_BUY_HOLD_PARAMS: BuyHoldParams = {
    equityWeight: 0.75,
    goldWeight: 0.25,
    rebalanceDays: 252,
};

export interface BuyHoldRebalance {
    index: number;
    date: string;
    equityWeight: number;
    goldWeight: number;
}

/**
 * Generate annual rebalance events for buy-hold strategy.
 */
export function buyHoldRebalances(
    dates: string[],
    params: BuyHoldParams = DEFAULT_BUY_HOLD_PARAMS
): BuyHoldRebalance[] {
    const rebalances: BuyHoldRebalance[] = [];

    // Initial allocation at day 0
    rebalances.push({
        index: 0,
        date: dates[0],
        equityWeight: params.equityWeight,
        goldWeight: params.goldWeight,
    });

    // Rebalance every N trading days
    for (let i = params.rebalanceDays; i < dates.length; i += params.rebalanceDays) {
        rebalances.push({
            index: i,
            date: dates[i],
            equityWeight: params.equityWeight,
            goldWeight: params.goldWeight,
        });
    }

    return rebalances;
}

/**
 * Simulate buy-hold portfolio value over time.
 */
export function simulateBuyHold(
    equityCloses: number[],
    goldCloses: number[],
    dates: string[],
    initialCash: number,
    params: BuyHoldParams = DEFAULT_BUY_HOLD_PARAMS
): { equityCurve: { date: string; value: number }[]; totalReturn: number; cagr: number } {
    const rebalances = buyHoldRebalances(dates, params);
    const curve: { date: string; value: number }[] = [];

    let equityUnits = 0;
    let goldUnits = 0;
    let cash = initialCash;

    let rebalIdx = 0;

    for (let i = 0; i < dates.length; i++) {
        // Check if rebalance needed
        if (rebalIdx < rebalances.length && i === rebalances[rebalIdx].index) {
            // Sell everything
            cash = equityUnits * equityCloses[i] + goldUnits * goldCloses[i] + (i === 0 ? initialCash : 0);
            if (i > 0) cash = equityUnits * equityCloses[i] + goldUnits * goldCloses[i];

            // Reallocate
            const equityCash = cash * params.equityWeight;
            const goldCash = cash * params.goldWeight;
            equityUnits = equityCash / equityCloses[i];
            goldUnits = goldCash / goldCloses[i];
            cash = 0;
            rebalIdx++;
        }

        const portfolioValue = equityUnits * equityCloses[i] + goldUnits * goldCloses[i];
        curve.push({ date: dates[i], value: +portfolioValue.toFixed(2) });
    }

    const finalValue = curve[curve.length - 1].value;
    const totalReturn = ((finalValue - initialCash) / initialCash) * 100;
    const years = dates.length / 252;
    const cagr = years > 0 ? (Math.pow(finalValue / initialCash, 1 / years) - 1) * 100 : 0;

    return { equityCurve: curve, totalReturn: +totalReturn.toFixed(2), cagr: +cagr.toFixed(2) };
}
