/**
 * Indian Market Transaction Cost Model
 * Matches the 4-segment fee structure from marketcalls/vectorbt-backtesting-skills
 */

export type TradingSegment = 'equity_delivery' | 'equity_intraday' | 'futures' | 'options';

/** Total impact cost per segment (brokerage + STT + exchange + GST) */
export const SEGMENT_FEES: Record<TradingSegment, number> = {
    equity_delivery: 0.00111,   // 0.111%
    equity_intraday: 0.000225,  // 0.0225%
    futures: 0.00018,   // 0.018%
    options: 0.00098,   // 0.098%
};

/** SEBI revised lot sizes (effective Dec 31, 2025) */
export const LOT_SIZES: Record<string, number> = {
    NIFTY: 65,
    BANKNIFTY: 30,
    FINNIFTY: 65,
    MIDCPNIFTY: 120,
};

/** Calculate round-trip fee for a given trade value and segment */
export function calcFees(tradeValue: number, segment: TradingSegment): number {
    return tradeValue * SEGMENT_FEES[segment] * 2; // buy + sell
}

/** Infer segment from interval string */
export function inferSegment(interval: string): TradingSegment {
    const lower = interval.toLowerCase();
    if (lower === 'daily' || lower === 'd' || lower === '1d') return 'equity_delivery';
    return 'equity_intraday';
}
