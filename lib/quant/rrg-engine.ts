/**
 * Relative Rotation Graph (RRG) Engine
 * Pure TypeScript port of marketcalls/sector-rotation-map math.
 *
 * Pipeline:
 * 1. Price Relative = sector / benchmark × 100
 * 2. EWM smooth (span=10) on Price Relative
 * 3. RS-Ratio = Z-score of smoothed PR over 52-week rolling window → scale to 100
 * 4. RS-Momentum = rate-of-change of RS-Ratio → EWM(span=5) → Z-score → scale to 100
 * 5. Quadrant classification
 */

import { ewm, rollingMean, rollingStd, resampleWeekly } from "./math-utils";
import { getDailyPrices, type OHLCVRow } from "./data-loader";
import { SECTORS, BENCHMARKS, type SectorMeta } from "./sectors";

export type Quadrant = "Leading" | "Weakening" | "Lagging" | "Improving" | "Unknown";

export interface RRGPoint {
    date: string;
    rsRatio: number;
    rsMomentum: number;
}

export interface SectorRRG {
    symbol: string;
    name: string;
    color: string;
    tail: RRGPoint[];
    current: RRGPoint | null;
    quadrant: Quadrant;
}

export interface RRGResult {
    benchmark: string;
    benchmarkName: string;
    tailLength: number;
    latestDate: string | null;
    computedAt: string;
    sectors: Record<string, SectorRRG>;
}

// ── Constants ────────────────────────────────────────────────────────────────
const EWM_SPAN_RS = 10;        // EWM span for RS smoothing
const EWM_SPAN_MOM = 5;        // EWM span for momentum smoothing
const ROLLING_WINDOW = 52;     // 52-week lookback for Z-score
const MIN_PERIODS = 20;        // Minimum data points for rolling stats
const ZSCORE_SCALE = 2;        // Z-score scaling factor

/**
 * Compute RS-Ratio and RS-Momentum for a single sector vs benchmark.
 */
export function computeSingleRRG(
    sectorCloses: number[],
    benchmarkCloses: number[],
    dates: string[],
    tailLength = 8
): { tail: RRGPoint[]; current: RRGPoint | null; quadrant: Quadrant } | null {
    if (sectorCloses.length < MIN_PERIODS || benchmarkCloses.length < MIN_PERIODS) return null;
    if (sectorCloses.length !== benchmarkCloses.length) return null;

    // Step 1: Price Relative
    const rawRS = sectorCloses.map((s, i) =>
        benchmarkCloses[i] !== 0 ? (s / benchmarkCloses[i]) * 100 : NaN
    );

    // Step 2: EWM smooth the Price Relative
    const rsSmoothed = ewm(rawRS, EWM_SPAN_RS);

    // Step 3: RS-Ratio via Z-score normalization
    const rsMean = rollingMean(rsSmoothed, ROLLING_WINDOW, MIN_PERIODS);
    const rsStdDev = rollingStd(rsSmoothed, ROLLING_WINDOW, MIN_PERIODS);

    const rsRatio: number[] = rsSmoothed.map((val, i) => {
        if (isNaN(rsMean[i]) || isNaN(rsStdDev[i]) || rsStdDev[i] === 0) return NaN;
        return 100 + ((val - rsMean[i]) / rsStdDev[i]) * ZSCORE_SCALE;
    });

    // Step 4: RS-Momentum = rate of change of RS-Ratio → EWM → Z-score
    const rsMomentumRaw: number[] = rsRatio.map((val, i) =>
        i === 0 ? NaN : val - rsRatio[i - 1]
    );
    const momSmoothed = ewm(
        rsMomentumRaw.map(v => (isNaN(v) ? 0 : v)),
        EWM_SPAN_MOM
    );
    const momMean = rollingMean(momSmoothed, ROLLING_WINDOW, MIN_PERIODS);
    const momStd = rollingStd(momSmoothed, ROLLING_WINDOW, MIN_PERIODS);

    const rsMomentum: number[] = momSmoothed.map((val, i) => {
        if (isNaN(momMean[i]) || isNaN(momStd[i]) || momStd[i] === 0) return NaN;
        return 100 + ((val - momMean[i]) / momStd[i]) * ZSCORE_SCALE;
    });

    // Filter valid points
    const validIndices: number[] = [];
    for (let i = 0; i < rsRatio.length; i++) {
        if (!isNaN(rsRatio[i]) && !isNaN(rsMomentum[i])) {
            validIndices.push(i);
        }
    }

    if (validIndices.length === 0) return null;

    // Build tail (last N valid points)
    const n = Math.min(tailLength, validIndices.length);
    const tail: RRGPoint[] = [];
    for (let j = validIndices.length - n; j < validIndices.length; j++) {
        const idx = validIndices[j];
        tail.push({
            date: dates[idx],
            rsRatio: +rsRatio[idx].toFixed(2),
            rsMomentum: +rsMomentum[idx].toFixed(2),
        });
    }

    const current = tail.length > 0 ? tail[tail.length - 1] : null;

    let quadrant: Quadrant = "Unknown";
    if (current) {
        const { rsRatio: r, rsMomentum: m } = current;
        if (r >= 100 && m >= 100) quadrant = "Leading";
        else if (r >= 100 && m < 100) quadrant = "Weakening";
        else if (r < 100 && m >= 100) quadrant = "Improving";
        else quadrant = "Lagging";
    }

    return { tail, current, quadrant };
}

/**
 * Compute full RRG for all configured sectors against a benchmark.
 */
export async function computeFullRRG(
    benchmarkSymbol = "NIFTY",
    tailLength = 8
): Promise<RRGResult> {
    // Date range: trailing 2 years
    const endDate = new Date().toISOString().slice(0, 10);
    const start = new Date();
    start.setFullYear(start.getFullYear() - 2);
    const startDate = start.toISOString().slice(0, 10);

    // Fetch benchmark daily prices
    const benchData = await getDailyPrices(benchmarkSymbol, startDate, endDate);
    if (benchData.length === 0) {
        return {
            benchmark: benchmarkSymbol,
            benchmarkName: BENCHMARKS.find(b => b.symbol === benchmarkSymbol)?.name || benchmarkSymbol,
            tailLength,
            latestDate: null,
            computedAt: new Date().toISOString(),
            sectors: {},
        };
    }

    // Resample benchmark to weekly
    const benchWeekly = resampleWeekly(
        benchData.map(r => r.date),
        benchData.map(r => r.close)
    );

    const results: Record<string, SectorRRG> = {};

    // Process each sector
    for (const sector of SECTORS) {
        try {
            const sectorData = await getDailyPrices(sector.symbol, startDate, endDate);
            if (sectorData.length < MIN_PERIODS) continue;

            // Resample sector to weekly
            const sectorWeekly = resampleWeekly(
                sectorData.map(r => r.date),
                sectorData.map(r => r.close)
            );

            // Align dates — only keep dates present in both
            const commonDates = sectorWeekly.dates.filter(d => benchWeekly.dates.includes(d));
            if (commonDates.length < MIN_PERIODS) continue;

            const sectorAligned = commonDates.map(d => {
                const idx = sectorWeekly.dates.indexOf(d);
                return sectorWeekly.values[idx];
            });
            const benchAligned = commonDates.map(d => {
                const idx = benchWeekly.dates.indexOf(d);
                return benchWeekly.values[idx];
            });

            const rrg = computeSingleRRG(sectorAligned, benchAligned, commonDates, tailLength);
            if (rrg) {
                results[sector.symbol] = {
                    symbol: sector.symbol,
                    name: sector.name,
                    color: sector.color,
                    ...rrg,
                };
            }
        } catch (err) {
            console.error(`RRG computation failed for ${sector.symbol}:`, err);
        }
    }

    // Find latest data date
    let latestDate: string | null = null;
    for (const s of Object.values(results)) {
        if (s.tail.length > 0) {
            latestDate = s.tail[s.tail.length - 1].date;
            break;
        }
    }

    return {
        benchmark: benchmarkSymbol,
        benchmarkName: BENCHMARKS.find(b => b.symbol === benchmarkSymbol)?.name || benchmarkSymbol,
        tailLength,
        latestDate,
        computedAt: new Date().toISOString(),
        sectors: results,
    };
}
