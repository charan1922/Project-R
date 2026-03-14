import AdmZip from 'adm-zip';
import { promises as fs } from 'fs';
import path from 'path';
import { DailyStockData } from './types';

/** Aggregated F&O data for a single stock on a single day */
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

/** Equity data for a single stock on a single day */
interface EqData {
  eq_volume: number;
  eq_turnover: number;
  eq_high: number;
  eq_low: number;
  eq_close: number;
}

/** One day's aggregated data for all stocks */
interface DailyCache {
  date: string;
  stocks: Record<string, DailyStockData>;
}

// Cache in /tmp on Vercel (serverless), local otherwise
const IS_VERCEL = !!process.env.VERCEL;
const CACHE_BASE = IS_VERCEL
  ? '/tmp/cache/rfactor/daily'
  : path.join(process.cwd(), 'lib', 'cache', 'rfactor', 'daily');

const NSE_BASE = 'https://nsearchives.nseindia.com/content';

// NSE requires browser-like headers
const NSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.nseindia.com/',
};

/**
 * Format date as YYYYMMDD for NSE bhavcopy URL
 */
function formatDateForUrl(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Format date as YYYY-MM-DD for cache file names
 */
function formatDateForCache(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse a CSV string into array of header-keyed objects.
 * Handles quoted fields and trims whitespace.
 */
function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length !== headers.length) continue;
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j];
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Download a ZIP file from NSE, extract the CSV inside, return as string.
 * Returns null if the file doesn't exist (weekend/holiday).
 */
async function downloadAndExtractZip(url: string): Promise<string | null> {
  const res = await fetch(url, { headers: NSE_HEADERS });

  if (!res.ok) {
    if (res.status === 404 || res.status === 403) {
      return null; // No bhavcopy for this date (weekend/holiday)
    }
    throw new Error(`NSE download failed: ${res.status} ${res.statusText} for ${url}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  // Find the CSV entry (there's usually just one)
  const csvEntry = entries.find(e => e.entryName.endsWith('.csv'));
  if (!csvEntry) {
    throw new Error(`No CSV found in ZIP from ${url}`);
  }

  return csvEntry.getData().toString('utf-8');
}

/**
 * Find the nearest expiry date from a list of expiry strings.
 * Used to identify near-month futures contracts.
 */
function findNearestExpiry(expiryDates: string[], referenceDate: Date): string | null {
  if (expiryDates.length === 0) return null;

  // Parse expiry dates and find the nearest one that's >= referenceDate
  const ref = referenceDate.getTime();
  let nearest: string | null = null;
  let nearestDiff = Infinity;

  for (const exp of expiryDates) {
    const expDate = new Date(exp);
    const diff = expDate.getTime() - ref;
    // Accept expiries on or after the reference date
    if (diff >= -86400000 && diff < nearestDiff) { // Allow 1 day tolerance
      nearest = exp;
      nearestDiff = diff;
    }
  }

  // If no future expiry found, take the closest overall (for edge cases near expiry)
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

export class BhavcopyService {
  /**
   * Download and parse F&O bhavcopy for a date.
   * Returns Map<symbol, FnOData> with aggregated futures + options data.
   */
  async fetchFnOBhavcopy(date: Date): Promise<Map<string, FnOData>> {
    const dateStr = formatDateForUrl(date);
    const url = `${NSE_BASE}/fo/BhavCopy_NSE_FO_0_0_0_${dateStr}_F_0000.csv.zip`;

    const csv = await downloadAndExtractZip(url);
    if (!csv) return new Map();

    const rows = parseCSV(csv);
    const result = new Map<string, FnOData>();

    // Group futures rows by symbol to find near-month
    const futuresRows = new Map<string, { expiry: string; row: Record<string, string> }[]>();
    const optionsRows: Record<string, string>[] = [];

    for (const row of rows) {
      const type = row['FinInstrmTp'];
      const symbol = row['TckrSymb'];
      if (!symbol) continue;

      if (type === 'STF') {
        // Stock futures
        if (!futuresRows.has(symbol)) futuresRows.set(symbol, []);
        futuresRows.get(symbol)!.push({ expiry: row['XpryDt'], row });
      } else if (type === 'STO') {
        // Stock options — aggregate all strikes
        optionsRows.push(row);
      }
    }

    // Process futures: pick near-month contract for each symbol
    for (const [symbol, entries] of futuresRows) {
      const expiries = entries.map(e => e.expiry);
      const nearestExpiry = findNearestExpiry(expiries, date);
      const nearMonthEntry = entries.find(e => e.expiry === nearestExpiry);

      if (!nearMonthEntry) continue;

      const r = nearMonthEntry.row;
      const data: FnOData = {
        fut_oi: parseFloat(r['OpnIntrst']) || 0,
        fut_oi_change: parseFloat(r['ChngInOpnIntrst']) || 0,
        fut_volume: parseFloat(r['TtlTradgVol']) || 0,
        fut_turnover: parseFloat(r['TtlTrfVal']) || 0,
        opt_oi: 0,
        opt_volume: 0,
        opt_turnover: 0,
        ce_volume: 0,
        pe_volume: 0,
      };
      result.set(symbol, data);
    }

    // Process options: sum across all strikes/expiries per symbol, split CE/PE
    for (const row of optionsRows) {
      const symbol = row['TckrSymb'];
      if (!symbol) continue;

      const vol = parseFloat(row['TtlTradgVol']) || 0;
      const optType = row['OptnTp']; // 'CE' or 'PE'

      const existing = result.get(symbol);
      if (existing) {
        existing.opt_oi += parseFloat(row['OpnIntrst']) || 0;
        existing.opt_volume += vol;
        existing.opt_turnover += parseFloat(row['TtlTrfVal']) || 0;
        if (optType === 'CE') existing.ce_volume += vol;
        else if (optType === 'PE') existing.pe_volume += vol;
      } else {
        result.set(symbol, {
          fut_oi: 0,
          fut_oi_change: 0,
          fut_volume: 0,
          fut_turnover: 0,
          opt_oi: parseFloat(row['OpnIntrst']) || 0,
          opt_volume: vol,
          opt_turnover: parseFloat(row['TtlTrfVal']) || 0,
          ce_volume: optType === 'CE' ? vol : 0,
          pe_volume: optType === 'PE' ? vol : 0,
        });
      }
    }

    return result;
  }

  /**
   * Download and parse equity bhavcopy for a date.
   * Returns Map<symbol, EqData>.
   */
  async fetchEquityBhavcopy(date: Date): Promise<Map<string, EqData>> {
    const dateStr = formatDateForUrl(date);
    const url = `${NSE_BASE}/cm/BhavCopy_NSE_CM_0_0_0_${dateStr}_F_0000.csv.zip`;

    const csv = await downloadAndExtractZip(url);
    if (!csv) return new Map();

    const rows = parseCSV(csv);
    const result = new Map<string, EqData>();

    for (const row of rows) {
      const symbol = row['TckrSymb'];
      const series = row['SctySrs'];
      if (!symbol) continue;

      // Only EQ series (skip BE, BL, etc.)
      if (series !== 'EQ') continue;

      result.set(symbol, {
        eq_volume: parseFloat(row['TtlTradgVol']) || 0,
        eq_turnover: parseFloat(row['TtlTrfVal']) || 0,
        eq_high: parseFloat(row['HghPric']) || 0,
        eq_low: parseFloat(row['LwPric']) || 0,
        eq_close: parseFloat(row['ClsPric']) || 0,
      });
    }

    return result;
  }

  /**
   * Fetch and merge equity + F&O data for a date, with caching.
   * Returns all stocks' combined DailyStockData.
   */
  async fetchDailyData(date: Date): Promise<Map<string, DailyStockData>> {
    const dateKey = formatDateForCache(date);

    // Check cache
    const cached = await this.loadFromCache(dateKey);
    if (cached) {
      return new Map(Object.entries(cached.stocks));
    }

    // Download both in parallel
    const [fnoData, eqData] = await Promise.all([
      this.fetchFnOBhavcopy(date),
      this.fetchEquityBhavcopy(date),
    ]);

    // If both are empty, this is likely a holiday
    if (fnoData.size === 0 && eqData.size === 0) {
      return new Map();
    }

    // Merge: use F&O symbols as base (we only care about F&O-eligible stocks)
    const merged = new Map<string, DailyStockData>();

    for (const [symbol, fno] of fnoData) {
      const eq = eqData.get(symbol);
      merged.set(symbol, {
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
      });
    }

    // Save to cache
    await this.saveToCache(dateKey, merged);

    return merged;
  }

  /**
   * Get N trading days of history for a specific symbol.
   * Downloads bhavcopy for each day if not cached.
   */
  async getHistoricalData(symbol: string, days: number = 25): Promise<DailyStockData[]> {
    const tradingDates = await this.getTradingDates(days);
    const results: DailyStockData[] = [];

    for (const date of tradingDates) {
      const dayData = await this.fetchDailyData(date);
      const stockData = dayData.get(symbol);
      if (stockData) {
        results.push(stockData);
      }
    }

    return results;
  }

  /**
   * Get the last N trading dates (skipping weekends).
   * Holidays are handled by empty bhavcopy responses.
   */
  private async getTradingDates(count: number): Promise<Date[]> {
    const dates: Date[] = [];
    const today = new Date();
    const current = new Date(today);

    // Go back enough days to find `count` weekdays
    while (dates.length < count + 5) { // Extra buffer for holidays
      current.setDate(current.getDate() - 1);
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // Skip weekends
        dates.push(new Date(current));
      }
    }

    // Return most recent first, but we want oldest first for Z-score computation
    return dates.slice(0, count + 5).reverse();
  }

  /**
   * Load cached daily data from disk.
   */
  private async loadFromCache(dateKey: string): Promise<DailyCache | null> {
    try {
      const filePath = path.join(CACHE_BASE, `${dateKey}.json`);
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as DailyCache;
    } catch {
      return null;
    }
  }

  /**
   * Save daily data to disk cache.
   */
  private async saveToCache(dateKey: string, data: Map<string, DailyStockData>): Promise<void> {
    try {
      await fs.mkdir(CACHE_BASE, { recursive: true });
      const cache: DailyCache = {
        date: dateKey,
        stocks: Object.fromEntries(data),
      };
      await fs.writeFile(
        path.join(CACHE_BASE, `${dateKey}.json`),
        JSON.stringify(cache),
      );
    } catch (e) {
      console.error(`Failed to cache bhavcopy for ${dateKey}:`, e);
    }
  }
}

export const bhavcopyService = new BhavcopyService();
