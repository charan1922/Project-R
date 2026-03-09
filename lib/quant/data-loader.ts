/**
 * Quant Data Loader
 * Fetches daily OHLCV from DuckDB Parquet (local or Hugging Face cloud) with Dhan V2 API fallback.
 * Returns data as typed arrays suitable for math engines.
 */

import { NSE_INDEX_SYMBOLS } from "./sectors";

export interface OHLCVRow {
    timestamp: number;
    date: string;      // YYYY-MM-DD (IST)
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// In-memory cache with 5-minute TTL
const _cache = new Map<string, { data: OHLCVRow[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function cacheKey(symbol: string, exchange: string, interval: string, from: string, to: string) {
    return `${symbol}:${exchange}:${interval}:${from}:${to}`;
}

/**
 * Get daily prices for a symbol. Tries DuckDB Parquet first, falls back to Dhan API.
 */
export async function getDailyPrices(
    symbol: string,
    startDate: string,
    endDate: string,
    exchange = "NSE"
): Promise<OHLCVRow[]> {
    const key = cacheKey(symbol, exchange, "Daily", startDate, endDate);
    const cached = _cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

    // Try DuckDB (local parquet or Hugging Face cloud)
    let rows = await fetchFromParquet(symbol, startDate, endDate);

    // Fallback to Dhan API for index symbols or if still empty
    if (rows.length === 0) {
        rows = await fetchFromDhanAPI(symbol, exchange, startDate, endDate);
    }

    _cache.set(key, { data: rows, ts: Date.now() });
    return rows;
}

async function fetchFromParquet(
    symbol: string,
    startDate: string,
    endDate: string
): Promise<OHLCVRow[]> {
    try {
        const { getDuckDb, resolveParquetSource, ensureHttpfs } = await import("@/lib/historify/duckdb");

        const { source, isCloud } = resolveParquetSource(symbol);

        const duckDb = await getDuckDb();
        const conn = await duckDb.connect();

        if (isCloud) await ensureHttpfs(conn);

        const startTs = Math.floor(new Date(startDate).getTime() / 1000);
        const endTs = Math.floor(new Date(endDate + "T23:59:59").getTime() / 1000);

        const res = await conn.run(`
            SELECT timestamp, open, high, low, close, volume
            FROM read_parquet('${source}')
            WHERE interval = 'Daily'
              AND timestamp >= ${startTs} AND timestamp <= ${endTs}
            ORDER BY timestamp ASC
        `);
        const rows = await res.getRows();

        return rows.map((r: any) => ({
            timestamp: Number(r[0]),
            date: new Date(Number(r[0]) * 1000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
            open: Number(r[1]),
            high: Number(r[2]),
            low: Number(r[3]),
            close: Number(r[4]),
            volume: Number(r[5]) || 0,
        }));
    } catch {
        return [];
    }
}

async function fetchFromDhanAPI(
    symbol: string,
    exchange: string,
    startDate: string,
    endDate: string
): Promise<OHLCVRow[]> {
    try {
        const { resolveSymbol } = await import("@/lib/historify/master-contracts");

        // Determine exchange segment for the API
        const isIndex = NSE_INDEX_SYMBOLS.has(symbol);
        const exchangeSegment = isIndex ? "IDX_I" : "NSE_EQ";

        const entry = await resolveSymbol(symbol, exchange);
        if (!entry?.securityId) return [];

        const clientId = process.env.DHAN_CLIENT_ID;
        const accessToken = process.env.DHAN_ACCESS_TOKEN;
        if (!clientId || !accessToken) return [];

        const res = await fetch("https://api.dhan.co/v2/charts/historical", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "access-token": accessToken,
                "client-id": clientId,
            },
            body: JSON.stringify({
                securityId: entry.securityId,
                exchangeSegment,
                instrument: isIndex ? "INDEX" : "EQUITY",
                fromDate: startDate,
                toDate: endDate,
                expiryCode: 0,
            }),
        });

        if (!res.ok) return [];
        const data = await res.json();

        if (!data.timestamp || data.timestamp.length === 0) return [];

        return data.timestamp.map((ts: number, i: number) => ({
            timestamp: ts,
            date: new Date(ts * 1000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
            open: data.open[i],
            high: data.high[i],
            low: data.low[i],
            close: data.close[i],
            volume: data.volume?.[i] || 0,
        }));
    } catch (err) {
        console.error(`Dhan API fallback failed for ${symbol}:`, err);
        return [];
    }
}

/** Clear the in-memory cache */
export function clearCache() {
    _cache.clear();
}
