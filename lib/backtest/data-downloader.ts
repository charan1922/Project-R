/**
 * Backtest Data Downloader
 *
 * Downloads 5-min OHLCV data from Dhan APIs and stores in DuckDB.
 * Supports: equity, futures (with OI), and rolling options (with IV/OI/spot).
 *
 * Rate limits: 4 req/sec (250ms between calls).
 */

import { getDhanAccessToken, hasDhanAuth } from '@/lib/dhan/auth';
import { env } from '@/lib/env';
import { resolveSymbol, batchResolveFutures, resolveOptionSecurity, nearestStrike, getStrikeStep } from '@/lib/historify/master-contracts';
import { execute, checkpoint } from './duckdb-schema';

const DHAN_API_BASE = 'https://api.dhan.co';
const RATE_LIMIT_MS = 260; // ~4 req/sec

async function dhanFetch(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
  if (!hasDhanAuth()) throw new Error('Dhan auth not configured');
  const token = await getDhanAccessToken();
  const clientId = env.DHAN_CLIENT_ID!;

  await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));

  const resp = await fetch(`${DHAN_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'access-token': token,
      'client-id': clientId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Dhan API ${resp.status}: ${text.slice(0, 200)}`);
  }

  return resp.json();
}

/**
 * Convert Unix timestamp to IST date string (YYYY-MM-DD).
 * Dhan intraday API returns Unix timestamps (seconds since 1970).
 */
function unixToISTDate(unix: number): string {
  const istMs = (unix + 5.5 * 3600) * 1000;
  return new Date(istMs).toISOString().split('T')[0];
}

/**
 * Download equity 5-min OHLCV for a stock.
 * Uses /v2/charts/intraday endpoint.
 */
export async function downloadEquity5min(
  symbol: string,
  fromDate: string,
  toDate: string,
): Promise<{ rows: number; error?: string }> {
  try {
    const entry = await resolveSymbol(symbol, 'NSE');
    if (!entry) return { rows: 0, error: `Symbol not found: ${symbol}` };

    const data = (await dhanFetch('/v2/charts/intraday', {
      securityId: entry.securityId,
      exchangeSegment: 'NSE_EQ',
      instrument: 'EQUITY',
      interval: '5',
      fromDate,
      toDate,
    })) as { open?: number[]; high?: number[]; low?: number[]; close?: number[]; volume?: number[]; timestamp?: number[] };

    if (!data.open || data.open.length === 0) return { rows: 0, error: 'No data returned' };

    const n = data.open.length;
    const values: string[] = [];
    for (let i = 0; i < n; i++) {
      const ts = data.timestamp?.[i] ?? 0;
      const unix = ts;
      const date = unixToISTDate(unix);
      values.push(
        `('${symbol}', '${date}', ${unix}, ${data.open[i]}, ${data.high![i]}, ${data.low![i]}, ${data.close![i]}, ${data.volume?.[i] ?? 0})`,
      );
    }

    // Insert in chunks
    for (let i = 0; i < values.length; i += 500) {
      const chunk = values.slice(i, i + 500).join(',');
      await execute(`INSERT INTO backtest_equity VALUES ${chunk}`);
    }

    return { rows: n };
  } catch (error) {
    return { rows: 0, error: (error as Error).message };
  }
}

/**
 * Download futures 5-min OHLCV + OI for a stock.
 */
export async function downloadFutures5min(
  symbol: string,
  fromDate: string,
  toDate: string,
): Promise<{ rows: number; error?: string }> {
  try {
    const futMap = await batchResolveFutures([symbol]);
    const fut = futMap.get(symbol);
    if (!fut) return { rows: 0, error: `Futures not found: ${symbol}` };

    const data = (await dhanFetch('/v2/charts/intraday', {
      securityId: fut.securityId,
      exchangeSegment: 'NSE_FNO',
      instrument: 'FUTSTK',
      interval: '5',
      oi: true,
      fromDate,
      toDate,
    })) as { open?: number[]; high?: number[]; low?: number[]; close?: number[]; volume?: number[]; timestamp?: number[]; open_interest?: number[] };

    if (!data.open || data.open.length === 0) return { rows: 0, error: 'No data returned' };

    const n = data.open.length;
    const values: string[] = [];
    for (let i = 0; i < n; i++) {
      const ts = data.timestamp?.[i] ?? 0;
      const unix = ts;
      const date = unixToISTDate(unix);
      values.push(
        `('${symbol}', '${date}', ${unix}, ${data.open[i]}, ${data.high![i]}, ${data.low![i]}, ${data.close![i]}, ${data.volume?.[i] ?? 0}, ${data.open_interest?.[i] ?? 0})`,
      );
    }

    for (let i = 0; i < values.length; i += 500) {
      const chunk = values.slice(i, i + 500).join(',');
      await execute(`INSERT INTO backtest_futures VALUES ${chunk}`);
    }

    return { rows: n };
  } catch (error) {
    return { rows: 0, error: (error as Error).message };
  }
}

/**
 * Download option 5-min data (CE or PE at given strike).
 * Uses /v2/charts/intraday with the option contract's securityId from master_contracts.
 * Falls back to ATM strike if given strike=0.
 */
export async function downloadOption5min(
  symbol: string,
  optionType: 'CE' | 'PE',
  strike: number,
  fromDate: string,
  toDate: string,
): Promise<{ rows: number; error?: string }> {
  try {
    // If strike is 0, resolve ATM from equity spot (use last known close)
    let targetStrike = strike;
    if (targetStrike === 0) {
      // Get equity data to find approximate spot
      const eqEntry = await resolveSymbol(symbol, 'NSE');
      if (!eqEntry) return { rows: 0, error: `Symbol not found: ${symbol}` };
      const step = getStrikeStep(symbol);
      // Use a reasonable default — caller should provide actual strike
      targetStrike = nearestStrike(strike || 1000, step);
    }

    // Resolve option securityId from master_contracts DB
    const option = await resolveOptionSecurity(symbol, targetStrike, optionType, 0);
    if (!option) return { rows: 0, error: `Option contract not found: ${symbol} ${targetStrike} ${optionType}` };

    const data = (await dhanFetch('/v2/charts/intraday', {
      securityId: option.securityId,
      exchangeSegment: 'NSE_FNO',
      instrument: 'OPTSTK',
      interval: '5',
      oi: true,
      fromDate,
      toDate,
    })) as { open?: number[]; high?: number[]; low?: number[]; close?: number[]; volume?: number[]; timestamp?: number[]; open_interest?: number[] };

    if (!data.open || data.open.length === 0) return { rows: 0, error: 'No option data returned' };

    const n = data.open.length;
    const values: string[] = [];
    const esc = (s: string) => s.replace(/'/g, "''");
    for (let i = 0; i < n; i++) {
      const ts = data.timestamp?.[i] ?? 0;
      const unix = ts;
      const date = unixToISTDate(unix);
      values.push(
        `('${esc(symbol)}', '${date}', ${unix}, '${optionType}', ${targetStrike}, ${data.open[i]}, ${data.high![i]}, ${data.low![i]}, ${data.close![i]}, ${data.volume?.[i] ?? 0}, ${data.open_interest?.[i] ?? 0}, 0, 0)`,
      );
    }

    for (let i = 0; i < values.length; i += 500) {
      const chunk = values.slice(i, i + 500).join(',');
      await execute(`INSERT INTO backtest_options VALUES ${chunk}`);
    }

    return { rows: n };
  } catch (error) {
    return { rows: 0, error: (error as Error).message };
  }
}

/** TF trade definition for downloading */
export interface TFTrade {
  date: string; // YYYY-MM-DD
  symbol: string;
  optionType: 'CE' | 'PE';
  strike: number;
  pnl: number;
  // Verified execution details (optional — user provides from broker screenshots)
  entryTime?: string; // "10:17:46 AM"
  entryPrice?: number; // Option premium at entry
  exitTime?: string; // "03:25:32 PM"
  exitPrice?: number; // Option premium at exit
  quantity?: number; // Lots × lotSize
  capitalUsed?: number; // Entry premium × quantity
  spotPrice?: number;
  expiry?: string;
}

/**
 * Load ALL trades from tradefinder_platform_trades.json.
 * Returns unique stocks with their earliest/latest trade dates.
 */
export async function loadAllTFTrades(): Promise<{ trades: TFTrade[]; symbols: string[]; dateRange: { from: string; to: string } }> {
  const { promises: fs } = await import('node:fs');
  const path = await import('node:path');
  const filePath = path.join(process.cwd(), 'tradefinder_platform_trades.json');
  const raw = JSON.parse(await fs.readFile(filePath, 'utf8'));

  const trades: TFTrade[] = [];
  for (const t of raw.trades) {
    if (t.trade_status !== 'Trade Taken' || !t.stock_name) continue;
    // Parse date "17 Mar 2026" → "2026-03-17" (IST-safe)
    try {
      const match = t.trade_date.match(/(\d+)\s(\w+)\s(\d+)/);
      if (!match) continue;
      const months: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
      const day = match[1].padStart(2, '0');
      const mon = months[match[2]] ?? '01';
      const year = match[3];
      const dateStr = `${year}-${mon}-${day}`;
      const d = new Date(`${dateStr}T00:00:00`);
      if (Number.isNaN(d.getTime())) continue;
      trades.push({
        date: dateStr, // "2026-03-17" — timezone-safe
        symbol: t.stock_name,
        optionType: t.instrument_type ?? 'CE',
        strike: t.strike_price ?? 0,
        pnl: t.total_pnl ?? 0,
        entryTime: t.entry_time ?? undefined,
        entryPrice: t.entry_price ?? undefined,
        exitTime: t.exit_time ?? undefined,
        exitPrice: t.exit_price ?? undefined,
        quantity: t.quantity ?? undefined,
        capitalUsed: t.capital_used ?? undefined,
        spotPrice: t.spot_price ?? undefined,
        expiry: t.expiry_date ?? undefined,
      });
    } catch {
      continue;
    }
  }

  const symbols = [...new Set(trades.map((t) => t.symbol))].sort();
  const dates = trades.map((t) => t.date).sort();

  return {
    trades,
    symbols,
    dateRange: { from: dates[0] ?? '', to: dates[dates.length - 1] ?? '' },
  };
}

/**
 * Download data for specific symbols (not just the hardcoded 20).
 * Downloads equity + futures 5-min. Options only if strike is provided.
 */
export async function downloadSymbols(
  symbols: string[],
  fromDate: string,
  toDate: string,
  includeOptions: { symbol: string; optionType: 'CE' | 'PE'; strike: number }[] = [],
  onProgress?: (msg: string) => void,
): Promise<{ total: number; errors: string[] }> {
  const errors: string[] = [];
  let total = 0;
  const log = onProgress ?? console.log;

  for (const sym of symbols) {
    // Skip index symbols (NIFTY, BANKNIFTY)
    if (sym === 'NIFTY' || sym === 'BANKNIFTY') {
      log(`[${sym}] Skipping index symbol`);
      continue;
    }

    log(`[${sym}] Equity 5-min...`);
    const eq = await downloadEquity5min(sym, fromDate, toDate);
    if (eq.error) errors.push(`${sym} equity: ${eq.error}`);
    else total += eq.rows;
    log(`[${sym}] Equity: ${eq.rows} rows${eq.error ? ` (ERROR: ${eq.error})` : ''}`);

    log(`[${sym}] Futures 5-min...`);
    const fut = await downloadFutures5min(sym, fromDate, toDate);
    if (fut.error) errors.push(`${sym} futures: ${fut.error}`);
    else total += fut.rows;
    log(`[${sym}] Futures: ${fut.rows} rows${fut.error ? ` (ERROR: ${fut.error})` : ''}`);

    // Options if specified
    const optTrade = includeOptions.find((o) => o.symbol === sym);
    if (optTrade && optTrade.strike > 0) {
      log(`[${sym}] Option ${optTrade.optionType} ${optTrade.strike}...`);
      const opt = await downloadOption5min(sym, optTrade.optionType, optTrade.strike, fromDate, toDate);
      if (opt.error) errors.push(`${sym} option: ${opt.error}`);
      else total += opt.rows;
      log(`[${sym}] Option: ${opt.rows} rows${opt.error ? ` (ERROR: ${opt.error})` : ''}`);
    }
  }

  await checkpoint();
  log(`\nDone: ${total} rows, ${errors.length} errors`);
  return { total, errors };
}

/** The last 20 TF trades from tradefinder_platform_trades.json */
export const TF_TRADES: TFTrade[] = [
  { date: '2026-03-17', symbol: 'NATIONALUM', optionType: 'CE', strike: 390, pnl: 20250 },
  { date: '2026-03-16', symbol: 'BANDHANBNK', optionType: 'PE', strike: 170, pnl: 15120 },
  { date: '2026-03-13', symbol: 'JINDALSTEL', optionType: 'PE', strike: 1150, pnl: 18750 },
  { date: '2026-03-11', symbol: 'COLPAL', optionType: 'PE', strike: 2000, pnl: -2936 },
  { date: '2026-03-10', symbol: 'HAVELLS', optionType: 'CE', strike: 1400, pnl: 16500 },
  { date: '2026-03-09', symbol: 'ONGC', optionType: 'PE', strike: 280, pnl: 16425 },
  { date: '2026-03-05', symbol: 'MAZDOCK', optionType: 'CE', strike: 2300, pnl: 21930 },
  { date: '2026-03-04', symbol: 'TATASTEEL', optionType: 'PE', strike: 190, pnl: 17160 },
  { date: '2026-02-27', symbol: 'HDFCLIFE', optionType: 'PE', strike: 720, pnl: 18920 },
  { date: '2026-02-26', symbol: 'LAURUSLABS', optionType: 'CE', strike: 1100, pnl: -2550 },
  { date: '2026-02-24', symbol: 'PERSISTENT', optionType: 'PE', strike: 4600, pnl: 20050 },
  { date: '2026-02-23', symbol: 'KPITTECH', optionType: 'PE', strike: 800, pnl: 14110 },
  { date: '2026-02-20', symbol: 'ABB', optionType: 'CE', strike: 6000, pnl: 23875 },
  { date: '2026-02-19', symbol: 'PERSISTENT', optionType: 'PE', strike: 5400, pnl: 17400 },
  { date: '2026-02-18', symbol: 'DIXON', optionType: 'PE', strike: 11200, pnl: -2465 },
  { date: '2026-02-17', symbol: 'BANKBARODA', optionType: 'CE', strike: 300, pnl: 19013 },
  { date: '2026-02-16', symbol: 'POWERGRID', optionType: 'CE', strike: 295, pnl: 17100 },
  { date: '2026-02-13', symbol: 'ADANIGREEN', optionType: 'PE', strike: 960, pnl: 16410 },
  { date: '2026-02-12', symbol: 'KPITTECH', optionType: 'PE', strike: 920, pnl: 15725 },
  { date: '2026-02-11', symbol: 'LAURUSLABS', optionType: 'CE', strike: 1100, pnl: 18785 },
];

/**
 * Download all data for TF's last 20 trades.
 * For each trade: equity + futures + ATM option 5-min data.
 * Downloads 25 trading days before the trade date for R-Factor baseline.
 */
export async function downloadAllTFData(
  onProgress?: (msg: string) => void,
): Promise<{ total: number; errors: string[] }> {
  const errors: string[] = [];
  let total = 0;

  // Get unique symbols
  const symbols = [...new Set(TF_TRADES.map((t) => t.symbol))];
  const log = onProgress ?? console.log;

  // Global date range: earliest trade - 35 days → latest trade
  const earliest = TF_TRADES.reduce((a, b) => (a.date < b.date ? a : b)).date;
  const latest = TF_TRADES.reduce((a, b) => (a.date > b.date ? a : b)).date;

  // 35 trading days before earliest trade for R-Factor lookback
  const fromDate = new Date(earliest);
  fromDate.setDate(fromDate.getDate() - 50); // ~50 calendar days = ~35 trading days
  const fromDateStr = fromDate.toISOString().split('T')[0];

  log(`Downloading data for ${symbols.length} unique symbols`);
  log(`Date range: ${fromDateStr} → ${latest}`);

  for (const sym of symbols) {
    // 1. Equity 5-min
    log(`[${sym}] Downloading equity 5-min...`);
    const eq = await downloadEquity5min(sym, fromDateStr, latest);
    if (eq.error) errors.push(`${sym} equity: ${eq.error}`);
    else total += eq.rows;
    log(`[${sym}] Equity: ${eq.rows} rows ${eq.error ? `(ERROR: ${eq.error})` : ''}`);

    // 2. Futures 5-min
    log(`[${sym}] Downloading futures 5-min...`);
    const fut = await downloadFutures5min(sym, fromDateStr, latest);
    if (fut.error) errors.push(`${sym} futures: ${fut.error}`);
    else total += fut.rows;
    log(`[${sym}] Futures: ${fut.rows} rows ${fut.error ? `(ERROR: ${fut.error})` : ''}`);

    // 3. Rolling option (CE or PE matching TF's trade)
    const tfTrades = TF_TRADES.filter((t) => t.symbol === sym);
    for (const trade of tfTrades) {
      log(`[${sym}] Downloading ${trade.optionType} ${trade.strike} option (${trade.date})...`);
      const opt = await downloadOption5min(sym, trade.optionType, trade.strike, fromDateStr, latest);
      if (opt.error) errors.push(`${sym} ${trade.optionType}: ${opt.error}`);
      else total += opt.rows;
      log(`[${sym}] Option ${trade.optionType} ${trade.strike}: ${opt.rows} rows ${opt.error ? `(ERROR: ${opt.error})` : ''}`);
      break; // One option type per symbol is enough
    }
  }

  // Flush WAL to main file so other connections can read the data
  await checkpoint();
  log(`\nDownload complete: ${total} total rows, ${errors.length} errors`);
  return { total, errors };
}
