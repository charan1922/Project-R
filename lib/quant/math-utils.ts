/**
 * Quantitative Math Utilities
 * Pure TypeScript implementations of EWM, rolling statistics, and Z-score normalization.
 */

/** Exponential Weighted Moving Average (equivalent to pandas ewm(span=N).mean()) */
export function ewm(data: number[], span: number): number[] {
    if (data.length === 0) return [];
    const alpha = 2 / (span + 1);
    const result = [data[0]];
    for (let i = 1; i < data.length; i++) {
        result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
    }
    return result;
}

/** Exponential Moving Average (alias for ewm — same math) */
export function ema(data: number[], period: number): number[] {
    return ewm(data, period);
}

/** Simple Moving Average over a rolling window */
export function sma(data: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < window - 1) {
            result.push(NaN);
        } else {
            let sum = 0;
            for (let j = i - window + 1; j <= i; j++) sum += data[j];
            result.push(sum / window);
        }
    }
    return result;
}

/** Rolling mean over a window, with configurable min_periods */
export function rollingMean(data: number[], window: number, minPeriods = 1): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - window + 1);
        const slice = data.slice(start, i + 1).filter(v => !isNaN(v));
        if (slice.length < minPeriods) {
            result.push(NaN);
        } else {
            result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
        }
    }
    return result;
}

/** Rolling standard deviation over a window, with configurable min_periods */
export function rollingStd(data: number[], window: number, minPeriods = 1): number[] {
    const means = rollingMean(data, window, minPeriods);
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
        if (isNaN(means[i])) {
            result.push(NaN);
            continue;
        }
        const start = Math.max(0, i - window + 1);
        const slice = data.slice(start, i + 1).filter(v => !isNaN(v));
        if (slice.length < minPeriods) {
            result.push(NaN);
        } else {
            const mean = means[i];
            const variance = slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / slice.length;
            result.push(Math.sqrt(variance));
        }
    }
    return result;
}

/** RSI (Wilder smoothing, 14-period default) */
export function rsi(closes: number[], period = 14): number[] {
    const result: number[] = new Array(period).fill(NaN);
    if (closes.length <= period) return result;

    let avgGain = 0, avgLoss = 0;
    for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) avgGain += diff; else avgLoss += Math.abs(diff);
    }
    avgGain /= period;
    avgLoss /= period;

    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

    for (let i = period + 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        const gain = diff >= 0 ? diff : 0;
        const loss = diff < 0 ? Math.abs(diff) : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
    }
    return result;
}

/** Resample daily data to weekly (last value per Friday-ending week) */
export function resampleWeekly(
    dates: string[],
    values: number[]
): { dates: string[]; values: number[] } {
    const weekMap = new Map<string, { date: string; value: number }>();
    for (let i = 0; i < dates.length; i++) {
        const d = new Date(dates[i]);
        // Get the Friday of this week
        const day = d.getDay();
        const diff = day <= 5 ? 5 - day : 5 - day + 7;
        const friday = new Date(d);
        friday.setDate(d.getDate() + diff);
        const key = friday.toISOString().slice(0, 10);
        // Keep the latest value in the week
        weekMap.set(key, { date: dates[i], value: values[i] });
    }
    const sorted = [...weekMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return {
        dates: sorted.map(([k]) => k),
        values: sorted.map(([, v]) => v.value),
    };
}
