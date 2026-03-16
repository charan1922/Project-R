/**
 * Bhavcopy Service — Prisma SQLite backed
 *
 * NSE bhavcopy (equity + F&O) data is stored in the bhavcopy_days table.
 * Sync is explicit (triggered from the Bhavcopy page), never auto-triggered.
 * Reads are fast DB queries.
 */

import AdmZip from 'adm-zip';
import { prisma } from '@/lib/db';
import type { DailyStockData } from './types';

const NSE_BASE = 'https://nsearchives.nseindia.com/content';
const NSE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: '*/*',
  'Accept-Encoding': 'gzip, deflate, br',
  Referer: 'https://www.nseindia.com/',
};

// ─── Error class ─────────────────────────────────────────────────────────────

export class BhavcopyNotSyncedError extends Error {
  constructor() {
    super('Bhavcopy data not available. Please sync from the Bhavcopy page.');
    this.name = 'BhavcopyNotSyncedError';
  }
}

// ─── Read API (used by R-Factor engine) ──────────────────────────────────────

/**
 * Get N days of historical data for a symbol from the DB.
 * Throws BhavcopyNotSyncedError if no data exists.
 */
export async function getHistoricalData(symbol: string, days = 25): Promise<DailyStockData[]> {
  const rows = await prisma.bhavcopyDay.findMany({
    where: { symbol },
    orderBy: { date: 'asc' },
  });

  if (rows.length === 0) {
    throw new BhavcopyNotSyncedError();
  }

  // Take the most recent `days` entries
  const recent = rows.slice(-days);

  return recent.map((r) => ({
    eq_volume: r.eqVolume,
    eq_turnover: r.eqTurnover,
    eq_high: r.eqHigh,
    eq_low: r.eqLow,
    eq_close: r.eqClose,
    fut_volume: r.futVolume,
    fut_oi: r.futOi,
    fut_oi_change: r.futOiChange,
    fut_turnover: r.futTurnover,
    opt_volume: r.optVolume,
    opt_oi: r.optOi,
    opt_turnover: r.optTurnover,
    ce_volume: r.ceVolume,
    pe_volume: r.peVolume,
  }));
}

// ─── Sync API (triggered from Bhavcopy page) ────────────────────────────────

type BhavcopyRow = {
  date: string;
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
};

/**
 * Import bhavcopy data from existing JSON cache files into DB.
 * Reads lib/cache/rfactor/daily/*.json files (from previous sessions).
 */
export async function importFromCache(): Promise<{ dates: number; rows: number; elapsed: string }> {
  const { promises: fs } = await import('node:fs');
  const path = await import('node:path');
  const startMs = Date.now();

  const cacheDir = path.join(process.cwd(), 'lib', 'cache', 'rfactor', 'daily');
  let files: string[];
  try {
    files = (await fs.readdir(cacheDir)).filter((f) => f.endsWith('.json'));
  } catch {
    return { dates: 0, rows: 0, elapsed: '0s' };
  }

  // Find which dates are already in DB
  const existing = await prisma.bhavcopyDay.findMany({ select: { date: true }, distinct: ['date'] });
  const syncedSet = new Set(existing.map((r) => r.date));

  let totalRows = 0;
  let datesAdded = 0;

  for (const file of files) {
    const dateKey = file.replace('.json', '');
    if (syncedSet.has(dateKey)) continue;

    try {
      const raw = await fs.readFile(path.join(cacheDir, file), 'utf-8');
      const cache = JSON.parse(raw) as { date: string; stocks: Record<string, DailyStockData> };
      const rows = buildRows(dateKey, cache.stocks);
      if (rows.length > 0) {
        await insertRows(rows);
        totalRows += rows.length;
        datesAdded++;
      }
    } catch (e) {
      console.error(`[Bhavcopy] Failed to import ${file}:`, e);
    }
  }

  const elapsed = `${((Date.now() - startMs) / 1000).toFixed(1)}s`;
  console.log(`[Bhavcopy] Imported ${datesAdded} dates, ${totalRows} rows from cache in ${elapsed}`);
  return { dates: datesAdded, rows: totalRows, elapsed };
}

/**
 * Sync bhavcopy data from NSE for the last N trading days.
 * First imports from local cache, then downloads missing dates from NSE.
 * NSE requires a session cookie — we fetch nseindia.com first to get one.
 */
export async function syncBhavcopy(days = 25): Promise<{ dates: number; rows: number; elapsed: string }> {
  const startMs = Date.now();

  // Step 1: Import any cached files first (instant, no network)
  const cacheResult = await importFromCache();
  let totalRows = cacheResult.rows;
  let datesAdded = cacheResult.dates;

  // Step 2: Find missing dates
  const candidateDates = getWeekdayDates(days + 10);
  const existingDates = await prisma.bhavcopyDay.findMany({ select: { date: true }, distinct: ['date'] });
  const syncedSet = new Set(existingDates.map((r) => r.date));
  const missingDates = candidateDates.filter((d) => !syncedSet.has(formatDate(d)));

  if (missingDates.length === 0) {
    const elapsed = `${((Date.now() - startMs) / 1000).toFixed(1)}s`;
    return { dates: datesAdded, rows: totalRows, elapsed };
  }

  console.log(`[Bhavcopy] ${syncedSet.size} dates in DB, ${missingDates.length} to download from NSE`);

  // Step 3: Get NSE session cookie
  const nseCookie = await getNSECookie();

  for (const date of missingDates) {
    const dateKey = formatDate(date);
    console.log(`[Bhavcopy] Downloading ${dateKey}...`);

    const [fnoData, eqData] = await Promise.all([
      fetchFnOBhavcopy(date, nseCookie),
      fetchEquityBhavcopy(date, nseCookie),
    ]);

    if (fnoData.size === 0 && eqData.size === 0) {
      console.log(`[Bhavcopy] ${dateKey} — no data (holiday/blocked)`);
      continue;
    }

    const stockMap: Record<string, DailyStockData> = {};
    for (const [symbol, fno] of fnoData) {
      const eq = eqData.get(symbol);
      stockMap[symbol] = {
        eq_volume: eq?.eq_volume ?? 0,
        eq_turnover: eq?.eq_turnover ?? 0,
        eq_high: eq?.eq_high ?? 0,
        eq_low: eq?.eq_low ?? 0,
        eq_close: eq?.eq_close ?? 0,
        fut_volume: fno.fut_volume,
        fut_oi: fno.fut_oi,
        fut_oi_change: fno.fut_oi_change,
        fut_turnover: fno.fut_turnover,
        opt_volume: fno.opt_volume,
        opt_oi: fno.opt_oi,
        opt_turnover: fno.opt_turnover,
        ce_volume: fno.ce_volume,
        pe_volume: fno.pe_volume,
      };
    }

    const rows = buildRows(dateKey, stockMap);
    if (rows.length > 0) {
      await insertRows(rows);
      totalRows += rows.length;
      datesAdded++;
      console.log(`[Bhavcopy] ${dateKey} — ${rows.length} stocks inserted`);
    }
  }

  const elapsed = `${((Date.now() - startMs) / 1000).toFixed(1)}s`;
  console.log(`[Bhavcopy] Sync done: ${datesAdded} dates, ${totalRows} rows in ${elapsed}`);
  return { dates: datesAdded, rows: totalRows, elapsed };
}

// ─── DB insert helpers ───────────────────────────────────────────────────────

function buildRows(dateKey: string, stocks: Record<string, DailyStockData>): BhavcopyRow[] {
  return Object.entries(stocks).map(([symbol, s]) => ({
    date: dateKey,
    symbol,
    eqVolume: s.eq_volume,
    eqTurnover: s.eq_turnover,
    eqHigh: s.eq_high,
    eqLow: s.eq_low,
    eqClose: s.eq_close,
    futVolume: s.fut_volume,
    futOi: s.fut_oi,
    futOiChange: s.fut_oi_change,
    futTurnover: s.fut_turnover,
    optVolume: s.opt_volume,
    optOi: s.opt_oi,
    optTurnover: s.opt_turnover,
    ceVolume: s.ce_volume,
    peVolume: s.pe_volume,
  }));
}

async function insertRows(rows: BhavcopyRow[]): Promise<void> {
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const values = chunk
      .map(
        (r) =>
          `(NULL, '${r.date}', '${esc(r.symbol)}', ${r.eqVolume}, ${r.eqTurnover}, ${r.eqHigh}, ${r.eqLow}, ${r.eqClose}, ${r.futVolume}, ${r.futOi}, ${r.futOiChange}, ${r.futTurnover}, ${r.optVolume}, ${r.optOi}, ${r.optTurnover}, ${r.ceVolume}, ${r.peVolume})`,
      )
      .join(',');
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO bhavcopy_days (id, date, symbol, eqVolume, eqTurnover, eqHigh, eqLow, eqClose, futVolume, futOi, futOiChange, futTurnover, optVolume, optOi, optTurnover, ceVolume, peVolume) VALUES ${values}`,
    );
  }
}

/** Get NSE session cookie by visiting nseindia.com first. Required for bhavcopy downloads. */
async function getNSECookie(): Promise<string> {
  try {
    const res = await fetch('https://www.nseindia.com/', {
      headers: {
        'User-Agent': NSE_HEADERS['User-Agent'],
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    const cookies = res.headers.getSetCookie?.() || [];
    const cookieStr = cookies.map((c) => c.split(';')[0]).join('; ');
    console.log(`[Bhavcopy] Got ${cookies.length} NSE session cookies`);
    return cookieStr;
  } catch (e) {
    console.error('[Bhavcopy] Failed to get NSE cookie:', e);
    return '';
  }
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateForUrl(date: Date): string {
  return formatDate(date).replace(/-/g, '');
}

function getWeekdayDates(count: number): Date[] {
  const dates: Date[] = [];
  const current = new Date();
  while (dates.length < count) {
    current.setDate(current.getDate() - 1);
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(new Date(current));
    }
  }
  return dates.reverse(); // oldest first
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    if (values.length !== headers.length) continue;
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j];
    }
    rows.push(row);
  }
  return rows;
}

async function downloadAndExtractZip(url: string, cookie = ''): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const hdrs: Record<string, string> = { ...NSE_HEADERS };
  if (cookie) hdrs.Cookie = cookie;
  let res: Response;
  try {
    res = await fetch(url, { headers: hdrs, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(buffer);
  const csvEntry = zip.getEntries().find((e) => e.entryName.endsWith('.csv'));
  if (!csvEntry) return null;
  return csvEntry.getData().toString('utf-8');
}

interface FnOData {
  fut_oi: number;
  fut_oi_change: number;
  fut_volume: number;
  fut_turnover: number;
  opt_oi: number;
  opt_volume: number;
  opt_turnover: number;
  ce_volume: number;
  pe_volume: number;
}

interface EqData {
  eq_volume: number;
  eq_turnover: number;
  eq_high: number;
  eq_low: number;
  eq_close: number;
}

function findNearestExpiry(expiryDates: string[], referenceDate: Date): string | null {
  const ref = referenceDate.getTime();
  let nearest: string | null = null;
  let nearestDiff = Number.POSITIVE_INFINITY;
  for (const exp of expiryDates) {
    const diff = new Date(exp).getTime() - ref;
    if (diff >= -86400000 && diff < nearestDiff) {
      nearest = exp;
      nearestDiff = diff;
    }
  }
  if (!nearest && expiryDates.length > 0) {
    for (const exp of expiryDates) {
      const diff = Math.abs(new Date(exp).getTime() - ref);
      if (diff < nearestDiff) {
        nearest = exp;
        nearestDiff = diff;
      }
    }
  }
  return nearest;
}

async function fetchFnOBhavcopy(date: Date, cookie = ''): Promise<Map<string, FnOData>> {
  const dateStr = formatDateForUrl(date);
  const url = `${NSE_BASE}/fo/BhavCopy_NSE_FO_0_0_0_${dateStr}_F_0000.csv.zip`;
  const csv = await downloadAndExtractZip(url, cookie);
  if (!csv) return new Map();

  const rows = parseCSV(csv);
  const result = new Map<string, FnOData>();
  const futuresRows = new Map<string, { expiry: string; row: Record<string, string> }[]>();
  const optionsRows: Record<string, string>[] = [];

  for (const row of rows) {
    const type = row.FinInstrmTp;
    const symbol = row.TckrSymb;
    if (!symbol) continue;
    if (type === 'STF') {
      if (!futuresRows.has(symbol)) futuresRows.set(symbol, []);
      futuresRows.get(symbol)!.push({ expiry: row.XpryDt, row });
    } else if (type === 'STO') {
      optionsRows.push(row);
    }
  }

  for (const [symbol, entries] of futuresRows) {
    const expiries = entries.map((e) => e.expiry);
    const nearestExpiry = findNearestExpiry(expiries, date);
    const nearMonth = entries.find((e) => e.expiry === nearestExpiry);
    if (!nearMonth) continue;
    const r = nearMonth.row;
    result.set(symbol, {
      fut_oi: Number.parseFloat(r.OpnIntrst) || 0,
      fut_oi_change: Number.parseFloat(r.ChngInOpnIntrst) || 0,
      fut_volume: Number.parseFloat(r.TtlTradgVol) || 0,
      fut_turnover: Number.parseFloat(r.TtlTrfVal) || 0,
      opt_oi: 0,
      opt_volume: 0,
      opt_turnover: 0,
      ce_volume: 0,
      pe_volume: 0,
    });
  }

  for (const row of optionsRows) {
    const symbol = row.TckrSymb;
    if (!symbol) continue;
    const vol = Number.parseFloat(row.TtlTradgVol) || 0;
    const optType = row.OptnTp;
    const existing = result.get(symbol);
    if (existing) {
      existing.opt_oi += Number.parseFloat(row.OpnIntrst) || 0;
      existing.opt_volume += vol;
      existing.opt_turnover += Number.parseFloat(row.TtlTrfVal) || 0;
      if (optType === 'CE') existing.ce_volume += vol;
      else if (optType === 'PE') existing.pe_volume += vol;
    } else {
      result.set(symbol, {
        fut_oi: 0,
        fut_oi_change: 0,
        fut_volume: 0,
        fut_turnover: 0,
        opt_oi: Number.parseFloat(row.OpnIntrst) || 0,
        opt_volume: vol,
        opt_turnover: Number.parseFloat(row.TtlTrfVal) || 0,
        ce_volume: optType === 'CE' ? vol : 0,
        pe_volume: optType === 'PE' ? vol : 0,
      });
    }
  }

  return result;
}

async function fetchEquityBhavcopy(date: Date, cookie = ''): Promise<Map<string, EqData>> {
  const dateStr = formatDateForUrl(date);
  const url = `${NSE_BASE}/cm/BhavCopy_NSE_CM_0_0_0_${dateStr}_F_0000.csv.zip`;
  const csv = await downloadAndExtractZip(url, cookie);
  if (!csv) return new Map();

  const rows = parseCSV(csv);
  const result = new Map<string, EqData>();
  for (const row of rows) {
    const symbol = row.TckrSymb;
    if (!symbol || row.SctySrs !== 'EQ') continue;
    result.set(symbol, {
      eq_volume: Number.parseFloat(row.TtlTradgVol) || 0,
      eq_turnover: Number.parseFloat(row.TtlTrfVal) || 0,
      eq_high: Number.parseFloat(row.HghPric) || 0,
      eq_low: Number.parseFloat(row.LwPric) || 0,
      eq_close: Number.parseFloat(row.ClsPric) || 0,
    });
  }
  return result;
}
