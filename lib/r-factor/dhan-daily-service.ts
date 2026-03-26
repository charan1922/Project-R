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
 * API calls per symbol: 3 best-effort data calls:
 *   1. Equity daily history
 *   2. Futures daily history
 *   3. Rolling option history (ATM band, scalable approximation)
 * All Data APIs (10/sec) — uses global rate limiter from lib/dhan/rate-limiter.ts
 */

import { prisma } from '@/lib/db';
import { dhanRequest } from '@/lib/dhan/rate-limiter';
import { batchResolveFutures, getFuturesContractsForRange, resolveSymbol } from '@/lib/historify/master-contracts';
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

export class DhanDateUnavailableError extends Error {
  requestedDate: string;
  latestAvailableDate: string | null;
  probeSymbol: string | null;

  constructor(requestedDate: string, latestAvailableDate: string | null, probeSymbol: string | null) {
    super(
      latestAvailableDate
        ? `Dhan historical data for ${requestedDate} is not available yet. Latest available date is ${latestAvailableDate}${probeSymbol ? ` (probe: ${probeSymbol})` : ''}.`
        : `Dhan historical data for ${requestedDate} is not available yet.`,
    );
    this.name = 'DhanDateUnavailableError';
    this.requestedDate = requestedDate;
    this.latestAvailableDate = latestAvailableDate;
    this.probeSymbol = probeSymbol;
  }
}

export class DhanNonTradingDayError extends Error {
  symbol: string;
  requestedDate: string;
  previousTradingDate: string | null;
  nextTradingDate: string | null;

  constructor(
    symbol: string,
    requestedDate: string,
    previousTradingDate: string | null,
    nextTradingDate: string | null,
  ) {
    const details = [
      previousTradingDate ? `previous: ${previousTradingDate}` : null,
      nextTradingDate ? `next: ${nextTradingDate}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    super(
      `${symbol} has no trading data on ${requestedDate}.${details ? ` Nearest trading dates -> ${details}.` : ''}`,
    );
    this.name = 'DhanNonTradingDayError';
    this.symbol = symbol;
    this.requestedDate = requestedDate;
    this.previousTradingDate = previousTradingDate;
    this.nextTradingDate = nextTradingDate;
  }
}

interface RollingOptionPayload {
  close?: number[];
  volume?: number[];
  oi?: number[];
  strike?: number[];
  timestamp?: number[];
}

interface RollingOptionResponse {
  data?: {
    ce?: RollingOptionPayload;
    pe?: RollingOptionPayload;
  };
}

type OptionAggregate = {
  ceVolume: number;
  peVolume: number;
  optVolume: number;
  optOi: number;
  optTurnover: number;
};

type IntradayAggregate = {
  high: number;
  low: number;
  close: number;
  volume: number;
  oi: number;
  turnover: number;
};

export type DhanStockDownloadMeta = {
  symbol: string;
  equitySecurityId: string;
  futuresSecurityId: string | null;
  futuresExpiryDate: string | null;
  lotSize: number;
  requestedFromDate: string;
  requestedToDate: string;
  returnedDays: number;
};

export type DhanStockDownloadRow = {
  date: string;
  futuresContractSymbol: string | null;
  futuresSecurityId: string | null;
  futuresExpiryDate: string | null;
  lotSize: number;
  data: DailyStockData;
};

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

export async function getLatestDhanHistoricalDate(
  candidates = ['HDFCBANK', 'RELIANCE', 'ICICIBANK', 'SBIN', 'TCS'],
): Promise<{ latestDate: string | null; probeSymbol: string | null }> {
  const to = new Date();
  const toPlus1 = new Date(to);
  toPlus1.setDate(toPlus1.getDate() + 1);
  const from = new Date(to);
  from.setDate(from.getDate() - 10);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = toPlus1.toISOString().slice(0, 10);

  for (const symbol of candidates) {
    try {
      const eqEntry = await resolveSymbol(symbol, 'NSE');
      if (!eqEntry) continue;
      const eqId = Number.parseInt(eqEntry.securityId, 10);
      if (!Number.isFinite(eqId)) continue;

      const chart = await fetchDailyChart(eqId, 'NSE_EQ', 'EQUITY', fromStr, toStr);
      const dates = [...chart.keys()].sort();
      const latestDate = dates[dates.length - 1] ?? null;
      if (latestDate) return { latestDate, probeSymbol: symbol };
    } catch {
      // Try the next liquid symbol.
    }
  }

  return { latestDate: null, probeSymbol: null };
}

async function getNearestTradingDatesForSecurity(
  securityId: number,
  requestedDate: string,
): Promise<{ previousTradingDate: string | null; nextTradingDate: string | null }> {
  const requested = new Date(`${requestedDate}T00:00:00`);
  const from = new Date(requested);
  from.setDate(from.getDate() - 7);
  const toExclusive = new Date(requested);
  toExclusive.setDate(toExclusive.getDate() + 8);

  const chart = await fetchDailyChart(
    securityId,
    'NSE_EQ',
    'EQUITY',
    from.toISOString().slice(0, 10),
    toExclusive.toISOString().slice(0, 10),
  );
  const dates = [...chart.keys()].sort();

  let previousTradingDate: string | null = null;
  let nextTradingDate: string | null = null;

  for (const date of dates) {
    if (date < requestedDate) previousTradingDate = date;
    if (date > requestedDate) {
      nextTradingDate = date;
      break;
    }
  }

  return { previousTradingDate, nextTradingDate };
}

function buildEmptyOptionAggregate(): OptionAggregate {
  return {
    ceVolume: 0,
    peVolume: 0,
    optVolume: 0,
    optOi: 0,
    optTurnover: 0,
  };
}

function aggregateRollingSide(
  payload: RollingOptionPayload | undefined,
  target: Map<string, OptionAggregate>,
  side: 'ce' | 'pe',
): void {
  if (!payload?.timestamp?.length) return;

  const latestOiPerDateStrike = new Map<string, { ts: number; oi: number }>();

  for (let i = 0; i < payload.timestamp.length; i++) {
    const ts = payload.timestamp[i] ?? 0;
    const date = tsToDate(ts);
    const strike = payload.strike?.[i] ?? 0;
    const volume = payload.volume?.[i] ?? 0;
    const close = payload.close?.[i] ?? 0;
    const oi = payload.oi?.[i] ?? 0;

    const row = target.get(date) ?? buildEmptyOptionAggregate();
    if (side === 'ce') row.ceVolume += volume;
    else row.peVolume += volume;
    row.optVolume += volume;
    row.optTurnover += close * volume;
    target.set(date, row);

    const oiKey = `${date}:${strike}`;
    const prev = latestOiPerDateStrike.get(oiKey);
    if (!prev || ts >= prev.ts) {
      latestOiPerDateStrike.set(oiKey, { ts, oi });
    }
  }

  for (const [key, value] of latestOiPerDateStrike) {
    const date = key.split(':', 1)[0];
    const row = target.get(date) ?? buildEmptyOptionAggregate();
    row.optOi += value.oi;
    target.set(date, row);
  }
}

/**
 * Fetch historical option aggregates using Dhan rolling options.
 *
 * This is the scalable default mode:
 * - one option request per underlying
 * - ATM band only (not full-chain parity)
 * - aggregates CE/PE volume, OI, and turnover by date
 */
async function fetchHistoricalOptionAggregate(
  securityId: number,
  fromDate: string,
  toDate: string,
): Promise<Map<string, OptionAggregate>> {
  const attemptStrikes = ['ATM\u00b13~3', 'ATM'];
  const optionTypes: Array<'CALL' | 'PUT'> = ['CALL', 'PUT'];

  for (const strike of attemptStrikes) {
    try {
      const result = new Map<string, OptionAggregate>();
      for (const drvOptionType of optionTypes) {
        const resp = (await dhanRequest('/v2/charts/rollingoption', {
          securityId,
          exchangeSegment: 'NSE_FNO',
          instrument: 'OPTSTK',
          expiryFlag: 'MONTH',
          expiryCode: 1,
          strike,
          drvOptionType,
          requiredData: ['close', 'volume', 'strike', 'oi', 'timestamp'],
          interval: '60',
          fromDate,
          toDate,
        })) as RollingOptionResponse;

        aggregateRollingSide(resp.data?.ce, result, 'ce');
        aggregateRollingSide(resp.data?.pe, result, 'pe');
      }

      if (result.size > 0) {
        return result;
      }
    } catch {
      // Try the narrower fallback selector next.
    }
  }

  return new Map();
}

export async function fetchIntradayDayAggregate(
  securityId: number,
  segment: string,
  instrument: string,
  date: string,
  withOI = false,
): Promise<IntradayAggregate | null> {
  const data = (await dhanRequest('/v2/charts/intraday', {
    securityId: String(securityId),
    exchangeSegment: segment,
    instrument,
    expiryCode: 0,
    interval: '60',
    fromDate: date,
    toDate: date,
    ...(withOI ? { oi: true } : {}),
  })) as ChartResponse;

  if (!data.close?.length || !data.high?.length || !data.low?.length) return null;

  const high = Math.max(...data.high);
  const low = Math.min(...data.low);
  const close = data.close[data.close.length - 1] ?? 0;
  const volume = (data.volume ?? []).reduce((sum, value) => sum + value, 0);
  const turnover = (data.close ?? []).reduce((sum, value, index) => sum + value * (data.volume?.[index] ?? 0), 0);
  const oiSeries = data.open_interest ?? [];
  const oi = oiSeries.length > 0 ? (oiSeries[oiSeries.length - 1] ?? 0) : 0;

  return { high, low, close, volume, oi, turnover };
}

export async function fetchOptionAggregateForDate(securityId: number, date: string): Promise<OptionAggregate | null> {
  const to = new Date(date);
  to.setDate(to.getDate() + 1);
  const aggregateMap = await fetchHistoricalOptionAggregate(securityId, date, to.toISOString().slice(0, 10));
  return aggregateMap.get(date) ?? null;
}

/**
 * Fetch daily data for a symbol from Dhan historical API.
 * Returns DailyStockData[] (same structure as bhavcopy).
 * Makes 3 sequential API calls: equity + futures + scalable options approximation.
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

  // Verify the last date in response matches targetDate
  const targetStr = to.toISOString().slice(0, 10);
  const eqDates = [...eqChart.keys()].sort();
  const lastEqDate = eqDates[eqDates.length - 1];
  if (targetDate && lastEqDate !== targetStr) {
    throw new Error(
      `Date mismatch for ${symbol}: requested ${targetStr} but latest data is ${lastEqDate}. Data may not be available yet.`,
    );
  }

  const futChart = fut
    ? await fetchDailyChart(parseInt(fut.securityId, 10), 'NSE_FNO', 'FUTSTK', fromStr, toStr, true)
    : new Map();

  // Fetch options using a narrow window around the target date only.
  // The rolling-options API (expiryCode:1) only has data within the current monthly expiry
  // period (~30 days). A 45-day equity window crosses expiry boundaries, causing optChart
  // to return empty for dates in the prior expiry. Using a narrow window matches how
  // getDhanSymbolDailyRange works and consistently returns non-zero option data.
  const optFromDate = targetDate
    ? targetDate // exact target date
    : fromStr;   // fallback: full range when no target date specified
  const optChart = await fetchHistoricalOptionAggregate(eqId, optFromDate, toStr);

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
    const optOi = opt?.optOi ?? 0;
    const optTurnover = opt?.optTurnover ?? 0;

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
      opt_oi: optOi,
      opt_turnover: optTurnover,
      ce_volume: ceVol,
      pe_volume: peVol,
    });
  }

  return result.slice(-days);
}

export async function getDhanSymbolDailyRange(
  symbol: string,
  fromDate: string,
  toDate: string,
): Promise<{
  meta: DhanStockDownloadMeta;
  rows: DhanStockDownloadRow[];
}> {
  const from = fromDate <= toDate ? fromDate : toDate;
  const to = fromDate <= toDate ? toDate : fromDate;

  const eqEntry = await resolveSymbol(symbol, 'NSE');
  if (!eqEntry) throw new Error(`Equity not found: ${symbol}`);
  const eqId = parseInt(eqEntry.securityId, 10);

  const toExclusive = new Date(to);
  toExclusive.setDate(toExclusive.getDate() + 1);
  const toExclusiveStr = toExclusive.toISOString().slice(0, 10);

  const eqChart = await fetchDailyChart(eqId, 'NSE_EQ', 'EQUITY', from, toExclusiveStr);
  if (from === to && !eqChart.has(from)) {
    const { previousTradingDate, nextTradingDate } = await getNearestTradingDatesForSecurity(eqId, from);
    throw new DhanNonTradingDayError(symbol, from, previousTradingDate, nextTradingDate);
  }

  const futContracts = await getFuturesContractsForRange(symbol, from, to);
  const futCharts = new Map<
    string,
    {
      symbol: string;
      securityId: string;
      expiryDate: string;
      lotSize: number;
      chart: Map<string, { open: number; high: number; low: number; close: number; volume: number; oi: number }>;
    }
  >();
  for (const contract of futContracts) {
    const expiryDate = contract.expiry.toISOString().split('T')[0];
    futCharts.set(contract.securityId, {
      symbol: contract.symbol,
      securityId: contract.securityId,
      expiryDate,
      lotSize: contract.lotSize,
      chart: await fetchDailyChart(parseInt(contract.securityId, 10), 'NSE_FNO', 'FUTSTK', from, toExclusiveStr, true),
    });
  }
  const optChart = await fetchHistoricalOptionAggregate(eqId, from, toExclusiveStr);

  const dates = [...eqChart.keys()].sort();
  const rows: DhanStockDownloadRow[] = [];
  let prevOi = 0;

  for (const date of dates) {
    if (date < from || date > to) continue;

    const eq = eqChart.get(date);
    const activeFutContract =
      futContracts.find((contract) => contract.expiry.toISOString().split('T')[0] >= date) ?? null;
    const activeFutChart = activeFutContract ? (futCharts.get(activeFutContract.securityId) ?? null) : null;
    const f = activeFutChart?.chart.get(date);
    const opt = optChart.get(date);
    if (!eq) continue;

    const futOi = f?.oi ?? 0;
    const futOiChange = prevOi > 0 ? futOi - prevOi : 0;
    prevOi = futOi;

    const lotSize = activeFutChart?.lotSize ?? 1;
    const futVolumeContracts = f ? Math.round(f.volume / lotSize) : 0;
    const ceVol = opt?.ceVolume ?? 0;
    const peVol = opt?.peVolume ?? 0;

    rows.push({
      date,
      futuresContractSymbol: activeFutChart?.symbol ?? null,
      futuresSecurityId: activeFutChart?.securityId ?? null,
      futuresExpiryDate: activeFutChart?.expiryDate ?? null,
      lotSize,
      data: {
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
        opt_oi: opt?.optOi ?? 0,
        opt_turnover: opt?.optTurnover ?? 0,
        ce_volume: ceVol,
        pe_volume: peVol,
      },
    });
  }

  return {
    meta: {
      symbol,
      equitySecurityId: eqEntry.securityId,
      futuresSecurityId: rows[rows.length - 1]?.futuresSecurityId ?? null,
      futuresExpiryDate: rows[rows.length - 1]?.futuresExpiryDate ?? null,
      lotSize: rows[rows.length - 1]?.lotSize ?? 1,
      requestedFromDate: from,
      requestedToDate: to,
      returnedDays: rows.length,
    },
    rows,
  };
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
    optVolume REAL DEFAULT 0, optOi REAL DEFAULT 0, optTurnover REAL DEFAULT 0,
    ceVolume REAL DEFAULT 0, peVolume REAL DEFAULT 0,
    rFactor REAL DEFAULT 0,
    UNIQUE(date, symbol)
  )
`;

const ENSURE_STOCK_DOWNLOAD_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS dhan_stock_downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    symbol TEXT NOT NULL,
    equitySecurityId TEXT NOT NULL,
    futuresContractSymbol TEXT,
    futuresSecurityId TEXT,
    futuresExpiryDate TEXT,
    lotSize REAL DEFAULT 1,
    eqVolume REAL DEFAULT 0,
    eqTurnover REAL DEFAULT 0,
    eqHigh REAL DEFAULT 0,
    eqLow REAL DEFAULT 0,
    eqClose REAL DEFAULT 0,
    futVolume REAL DEFAULT 0,
    futOi REAL DEFAULT 0,
    futOiChange REAL DEFAULT 0,
    futTurnover REAL DEFAULT 0,
    optVolume REAL DEFAULT 0,
    optOi REAL DEFAULT 0,
    optTurnover REAL DEFAULT 0,
    ceVolume REAL DEFAULT 0,
    peVolume REAL DEFAULT 0,
    requestedFromDate TEXT,
    requestedToDate TEXT,
    savedAt TEXT NOT NULL,
    UNIQUE(date, symbol)
  )
`;

async function ensureDhanTable() {
  await prisma.$executeRawUnsafe(ENSURE_TABLE_SQL);
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE dhan_daily_data ADD COLUMN optOi REAL DEFAULT 0');
  } catch {}
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE dhan_daily_data ADD COLUMN optTurnover REAL DEFAULT 0');
  } catch {}
}

async function ensureDhanStockDownloadTable() {
  await prisma.$executeRawUnsafe(ENSURE_STOCK_DOWNLOAD_TABLE_SQL);
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
        return `('${date}','${s}',${d.eq_volume},${d.eq_turnover},${d.eq_high},${d.eq_low},${d.eq_close},${d.fut_volume},${d.fut_oi},${d.fut_oi_change},${d.fut_turnover},${d.opt_volume},${d.opt_oi},${d.opt_turnover},${d.ce_volume},${d.pe_volume},${r.rFactor})`;
      })
      .join(',');
    await prisma.$executeRawUnsafe(
      `INSERT OR REPLACE INTO dhan_daily_data (date,symbol,eqVolume,eqTurnover,eqHigh,eqLow,eqClose,futVolume,futOi,futOiChange,futTurnover,optVolume,optOi,optTurnover,ceVolume,peVolume,rFactor) VALUES ${values}`,
    );
  }
}

export async function saveDhanStockDownloadToDb(
  meta: DhanStockDownloadMeta,
  rows: DhanStockDownloadRow[],
): Promise<{ saved: number }> {
  await ensureDhanStockDownloadTable();
  const savedAt = new Date().toISOString();

  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const values = chunk
      .map((row) => {
        const d = row.data;
        const symbol = meta.symbol.replace(/'/g, "''");
        const equitySecurityId = meta.equitySecurityId.replace(/'/g, "''");
        const futuresContractSymbol = row.futuresContractSymbol
          ? `'${row.futuresContractSymbol.replace(/'/g, "''")}'`
          : 'NULL';
        const futuresSecurityId = row.futuresSecurityId ? `'${row.futuresSecurityId.replace(/'/g, "''")}'` : 'NULL';
        const futuresExpiryDate = row.futuresExpiryDate ? `'${row.futuresExpiryDate}'` : 'NULL';
        return `('${row.date}','${symbol}','${equitySecurityId}',${futuresContractSymbol},${futuresSecurityId},${futuresExpiryDate},${row.lotSize},${d.eq_volume},${d.eq_turnover},${d.eq_high},${d.eq_low},${d.eq_close},${d.fut_volume},${d.fut_oi},${d.fut_oi_change},${d.fut_turnover},${d.opt_volume},${d.opt_oi},${d.opt_turnover},${d.ce_volume},${d.pe_volume},'${meta.requestedFromDate}','${meta.requestedToDate}','${savedAt}')`;
      })
      .join(',');

    await prisma.$executeRawUnsafe(
      `INSERT OR REPLACE INTO dhan_stock_downloads (date,symbol,equitySecurityId,futuresContractSymbol,futuresSecurityId,futuresExpiryDate,lotSize,eqVolume,eqTurnover,eqHigh,eqLow,eqClose,futVolume,futOi,futOiChange,futTurnover,optVolume,optOi,optTurnover,ceVolume,peVolume,requestedFromDate,requestedToDate,savedAt) VALUES ${values}`,
    );
  }

  return { saved: rows.length };
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
    optOi: number;
    optTurnover: number;
    ceVolume: number;
    peVolume: number;
    rFactor: number;
  }[]
> {
  await ensureDhanTable();
  return prisma.$queryRawUnsafe(
    `SELECT symbol, eqVolume, eqTurnover, eqHigh, eqLow, eqClose, futVolume, futOi, futOiChange, futTurnover, optVolume, optOi, optTurnover, ceVolume, peVolume, rFactor FROM dhan_daily_data WHERE date = '${date}' ORDER BY rFactor DESC`,
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
