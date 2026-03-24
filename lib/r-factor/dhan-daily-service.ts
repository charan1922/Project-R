/**
 * Dhan Daily Data Service
 *
 * Fetches daily OHLCV + OI data from Dhan's /charts/historical API
 * and builds DailyStockData[] — the same structure bhavcopy produces.
 *
 * This enables a parallel R-Factor computation path:
 *   Bhavcopy path: NSE bhavcopy CSV → DailyStockData → FactorData → engine
 *   Dhan daily path: Dhan historical API → DailyStockData → FactorData → engine
 *
 * Both paths feed the same transformToFactorData() → engine.calculateSignal().
 */

import { dhanRequest } from '@/lib/dhan/rate-limiter';
import { batchResolveFutures, resolveSymbol } from '@/lib/historify/master-contracts';
import type { DailyStockData } from './types';

interface ChartResponse {
  open?: number[];
  high?: number[];
  low?: number[];
  close?: number[];
  volume?: number[];
  timestamp?: number[];
  open_interest?: number[];
}

/** Convert Dhan historical timestamp to IST date string */
function tsToDate(ts: number): string {
  // Dhan historical uses seconds since 1980-01-01 (Dhan epoch)
  // But /charts/historical may use different epoch — check empirically
  // Safe approach: try both and pick the one that gives a reasonable year
  const DHAN_EPOCH = 315532800; // 1980-01-01 UTC in Unix
  let unix = ts;
  // If year < 2000, it's likely Dhan epoch
  const d1 = new Date(ts * 1000);
  if (d1.getFullYear() < 2000) unix = ts + DHAN_EPOCH;
  const istMs = (unix + 5.5 * 3600) * 1000;
  return new Date(istMs).toISOString().split('T')[0];
}

/**
 * Fetch daily OHLCV from Dhan /charts/historical for a given security.
 * Returns Map<date, {open, high, low, close, volume, oi}>.
 */
async function fetchDailyChart(
  securityId: number,
  segment: string,
  instrument: string,
  fromDate: string,
  toDate: string,
  withOI = false,
): Promise<Map<string, { open: number; high: number; low: number; close: number; volume: number; oi: number }>> {
  const data = (await dhanRequest('/v2/charts/historical', {
    securityId: String(securityId),
    exchangeSegment: segment,
    instrument,
    expiryCode: 0,
    fromDate,
    toDate,
    ...(withOI ? { oi: true } : {}),
  })) as ChartResponse;

  const map = new Map<string, { open: number; high: number; low: number; close: number; volume: number; oi: number }>();
  if (!data.open || data.open.length === 0) return map;

  for (let i = 0; i < data.open.length; i++) {
    const date = tsToDate(data.timestamp?.[i] ?? 0);
    map.set(date, {
      open: data.open[i],
      high: data.high![i],
      low: data.low![i],
      close: data.close![i],
      volume: data.volume?.[i] ?? 0,
      oi: data.open_interest?.[i] ?? 0,
    });
  }
  return map;
}

/**
 * Fetch daily data for a symbol from Dhan historical API.
 * Returns DailyStockData[] (same structure as bhavcopy).
 *
 * Fetches equity OHLCV + futures OHLCV with OI.
 * Options data is zero-filled (would need optionchain which is rate-limited).
 */
export async function getDhanDailyData(symbol: string, days = 30): Promise<DailyStockData[]> {
  // Resolve security IDs
  const eqEntry = await resolveSymbol(symbol, 'NSE');
  if (!eqEntry) throw new Error(`Equity not found: ${symbol}`);
  const eqId = parseInt(eqEntry.securityId, 10);

  const futMap = await batchResolveFutures([symbol]);
  const fut = futMap.get(symbol);

  // Date range: go back extra days to have enough history
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - Math.round(days * 1.5)); // extra buffer for weekends/holidays
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  // Fetch equity then futures — sequential to respect Dhan rate limits (no parallel calls)
  const eqChart = await fetchDailyChart(eqId, 'NSE_EQ', 'EQUITY', fromStr, toStr);
  const futChart = fut
    ? await fetchDailyChart(parseInt(fut.securityId, 10), 'NSE_FNO', 'FUTSTK', fromStr, toStr, true)
    : new Map();

  // Merge by date — use equity dates as the base
  const dates = [...eqChart.keys()].sort();
  const result: DailyStockData[] = [];
  let prevOi = 0;

  for (const date of dates) {
    const eq = eqChart.get(date);
    const f = futChart.get(date);
    if (!eq) continue;

    const futOi = f?.oi ?? 0;
    const futOiChange = prevOi > 0 ? futOi - prevOi : 0;
    prevOi = futOi;

    // Lot size for volume conversion (Dhan futures volume is in shares)
    const lotSize = fut?.lotSize ?? 1;
    const futVolumeContracts = f ? Math.round(f.volume / lotSize) : 0;

    result.push({
      eq_volume: eq.volume,
      eq_turnover: eq.volume * eq.close, // Approximation: volume × close
      eq_high: eq.high,
      eq_low: eq.low,
      eq_close: eq.close,
      fut_volume: futVolumeContracts,
      fut_oi: futOi,
      fut_oi_change: futOiChange,
      fut_turnover: f ? f.volume * f.close : 0, // Approximation: shares × close
      opt_volume: 0, // Not available from historical API (would need optionchain)
      opt_oi: 0,
      opt_turnover: 0,
      ce_volume: 0,
      pe_volume: 0,
    });
  }

  // Return last N days
  return result.slice(-days);
}

/**
 * Batch fetch Dhan daily data for multiple symbols.
 * Returns Map<symbol, DailyStockData[]>.
 */
export async function batchGetDhanDaily(
  symbols: string[],
  days = 30,
): Promise<{ data: Map<string, DailyStockData[]>; failures: string[] }> {
  const data = new Map<string, DailyStockData[]>();
  const failures: string[] = [];
  // Process sequentially to respect rate limits (2 API calls per symbol)
  for (const sym of symbols) {
    try {
      const d = await getDhanDailyData(sym, days);
      if (d.length >= 15) data.set(sym, d);
      else failures.push(`${sym}: only ${d.length} days (need 15+)`);
    } catch (e) {
      failures.push(`${sym}: ${(e as Error).message}`);
    }
  }
  return { data, failures };
}
