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
 *
 * API calls per symbol: 3 (equity + futures + options via rollingoption)
 * All Data APIs (10/sec) — uses global rate limiter from lib/dhan/rate-limiter.ts
 */

import { prisma } from '@/lib/db';
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

interface RollingOptionPayload {
  volume?: number[];
  oi?: number[];
  timestamp?: number[];
}

interface RollingOptionResponse {
  data?: {
    ce?: RollingOptionPayload;
    pe?: RollingOptionPayload;
  };
}

/** Convert Dhan historical timestamp to IST date string */
function tsToDate(ts: number): string {
  const DHAN_EPOCH = 315532800; // 1980-01-01 UTC in Unix
  let unix = ts;
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
 * Fetch ATM option CE/PE volume via /charts/rollingoption.
 * Returns Map<date, { ceVolume, peVolume }>.
 * One call returns BOTH CE and PE data.
 */
async function fetchOptionVolumes(
  securityId: number,
  fromDate: string,
  toDate: string,
): Promise<Map<string, { ceVolume: number; peVolume: number }>> {
  const map = new Map<string, { ceVolume: number; peVolume: number }>();
  try {
    const resp = (await dhanRequest('/v2/charts/rollingoption', {
      securityId,
      exchangeSegment: 'NSE_FNO',
      instrument: 'OPTSTK',
      expiryFlag: 'MONTH',
      expiryCode: 1,
      strike: 'ATM',
      requiredData: ['volume', 'oi'],
      interval: '60',
      fromDate,
      toDate,
    })) as RollingOptionResponse;

    const ce = resp.data?.ce;
    const pe = resp.data?.pe;
    if (!ce?.timestamp?.length) return map;

    // Aggregate hourly volumes into daily totals
    const dailyCE = new Map<string, number>();
    const dailyPE = new Map<string, number>();

    for (let i = 0; i < ce.timestamp.length; i++) {
      const date = tsToDate(ce.timestamp[i]);
      dailyCE.set(date, (dailyCE.get(date) ?? 0) + (ce.volume?.[i] ?? 0));
    }
    if (pe?.timestamp) {
      for (let i = 0; i < pe.timestamp.length; i++) {
        const date = tsToDate(pe.timestamp[i]);
        dailyPE.set(date, (dailyPE.get(date) ?? 0) + (pe.volume?.[i] ?? 0));
      }
    }

    for (const [date, ceVol] of dailyCE) {
      map.set(date, { ceVolume: ceVol, peVolume: dailyPE.get(date) ?? 0 });
    }
  } catch {
    // rollingoption may not be available for all stocks — fail silently
  }
  return map;
}

/**
 * Fetch daily data for a symbol from Dhan historical API.
 * Returns DailyStockData[] (same structure as bhavcopy).
 * Makes 3 sequential API calls: equity + futures + options.
 */
export async function getDhanDailyData(symbol: string, days = 30, targetDate?: string): Promise<DailyStockData[]> {
  const eqEntry = await resolveSymbol(symbol, 'NSE');
  if (!eqEntry) throw new Error(`Equity not found: ${symbol}`);
  const eqId = parseInt(eqEntry.securityId, 10);

  const futMap = await batchResolveFutures([symbol], targetDate);
  const fut = futMap.get(symbol);

  // Date range: target a specific date or use today
  // Dhan's toDate is EXCLUSIVE — add 1 day to include the target date
  const to = targetDate ? new Date(targetDate) : new Date();
  const toPlus1 = new Date(to);
  toPlus1.setDate(toPlus1.getDate() + 1);
  const from = new Date(to);
  from.setDate(from.getDate() - Math.round(days * 1.5));
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = toPlus1.toISOString().slice(0, 10);

  // 3 sequential API calls (all Data APIs — 10/sec via global rate limiter)
  const eqChart = await fetchDailyChart(eqId, 'NSE_EQ', 'EQUITY', fromStr, toStr);
  const futChart = fut
    ? await fetchDailyChart(parseInt(fut.securityId, 10), 'NSE_FNO', 'FUTSTK', fromStr, toStr, true)
    : new Map();
  const optChart = await fetchOptionVolumes(eqId, fromStr, toStr);

  // Merge by date
  const dates = [...eqChart.keys()].sort();
  const result: DailyStockData[] = [];
  let prevOi = 0;

  for (const date of dates) {
    const eq = eqChart.get(date);
    const f = futChart.get(date);
    const opt = optChart.get(date);
    if (!eq) continue;

    const futOi = f?.oi ?? 0;
    const futOiChange = prevOi > 0 ? futOi - prevOi : 0;
    prevOi = futOi;

    const lotSize = fut?.lotSize ?? 1;
    const futVolumeContracts = f ? Math.round(f.volume / lotSize) : 0;
    const ceVol = opt?.ceVolume ?? 0;
    const peVol = opt?.peVolume ?? 0;

    result.push({
      eq_volume: eq.volume,
      eq_turnover: eq.volume * eq.close,
      eq_high: eq.high,
      eq_low: eq.low,
      eq_close: eq.close,
      fut_volume: futVolumeContracts,
      fut_oi: futOi,
      fut_oi_change: futOiChange,
      fut_turnover: f ? f.volume * f.close : 0,
      opt_volume: ceVol + peVol,
      opt_oi: 0,
      opt_turnover: 0,
      ce_volume: ceVol,
      pe_volume: peVol,
    });
  }

  return result.slice(-days);
}

/**
 * Batch fetch Dhan daily data for multiple symbols.
 */
export async function batchGetDhanDaily(
  symbols: string[],
  days = 30,
  targetDate?: string,
): Promise<{ data: Map<string, DailyStockData[]>; failures: string[] }> {
  const data = new Map<string, DailyStockData[]>();
  const failures: string[] = [];
  for (const sym of symbols) {
    try {
      const d = await getDhanDailyData(sym, days, targetDate);
      if (d.length >= 15) data.set(sym, d);
      else failures.push(`${sym}: only ${d.length} days (need 15+)`);
    } catch (e) {
      failures.push(`${sym}: ${(e as Error).message}`);
    }
  }
  return { data, failures };
}

// ─── DB Cache ──────────────────────────────────────────────

const ENSURE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS dhan_daily_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, symbol TEXT NOT NULL,
    eqVolume REAL DEFAULT 0, eqTurnover REAL DEFAULT 0,
    eqHigh REAL DEFAULT 0, eqLow REAL DEFAULT 0, eqClose REAL DEFAULT 0,
    futVolume REAL DEFAULT 0, futOi REAL DEFAULT 0, futOiChange REAL DEFAULT 0, futTurnover REAL DEFAULT 0,
    optVolume REAL DEFAULT 0, ceVolume REAL DEFAULT 0, peVolume REAL DEFAULT 0,
    rFactor REAL DEFAULT 0,
    UNIQUE(date, symbol)
  )
`;

async function ensureDhanTable() {
  await prisma.$executeRawUnsafe(ENSURE_TABLE_SQL);
}

/** Save Dhan daily raw data + computed R-Factor to cache */
export async function saveDhanDailyToDb(
  date: string,
  rows: { symbol: string; data: DailyStockData; rFactor: number }[],
): Promise<void> {
  await ensureDhanTable();
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const values = chunk
      .map((r) => {
        const d = r.data;
        const s = r.symbol.replace(/'/g, "''");
        return `('${date}','${s}',${d.eq_volume},${d.eq_turnover},${d.eq_high},${d.eq_low},${d.eq_close},${d.fut_volume},${d.fut_oi},${d.fut_oi_change},${d.fut_turnover},${d.opt_volume},${d.ce_volume},${d.pe_volume},${r.rFactor})`;
      })
      .join(',');
    await prisma.$executeRawUnsafe(
      `INSERT OR REPLACE INTO dhan_daily_data (date,symbol,eqVolume,eqTurnover,eqHigh,eqLow,eqClose,futVolume,futOi,futOiChange,futTurnover,optVolume,ceVolume,peVolume,rFactor) VALUES ${values}`,
    );
  }
}

/** Load cached Dhan daily data for a date */
export async function loadDhanDailyFromDb(date: string): Promise<
  {
    symbol: string;
    eqVolume: number;
    eqTurnover: number;
    eqHigh: number;
    eqLow: number;
    eqClose: number;
    futVolume: number;
    futOi: number;
    futOiChange: number;
    futTurnover: number;
    optVolume: number;
    ceVolume: number;
    peVolume: number;
    rFactor: number;
  }[]
> {
  await ensureDhanTable();
  return prisma.$queryRawUnsafe(
    `SELECT symbol, eqVolume, eqTurnover, eqHigh, eqLow, eqClose, futVolume, futOi, futOiChange, futTurnover, optVolume, ceVolume, peVolume, rFactor FROM dhan_daily_data WHERE date = '${date}' ORDER BY rFactor DESC`,
  );
}

/** Check if Dhan daily data is cached for a date */
export async function isDhanDailyCached(date: string): Promise<boolean> {
  await ensureDhanTable();
  const rows = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
    `SELECT COUNT(*) as cnt FROM dhan_daily_data WHERE date = '${date}'`,
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
}
