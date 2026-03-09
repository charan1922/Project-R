import path from "path";
import fs from "fs";

const dataDir = process.env.VERCEL === '1'
    ? '/tmp'
    : path.join(process.cwd(), "data");

const WATCHLIST_PATH = path.join(dataDir, "watchlist.json");
const ACTIVITY_PATH = path.join(dataDir, "activity-log.json");

interface WatchlistEntry {
    symbol: string;
    exchange: string;
    segment: string;
    securityId: string | null;
    addedAt: number;
}

interface ActivityEntry {
    symbol: string;
    exchange: string;
    interval: string;
    action: string;
    rows_count: number;
    status: string;
    createdAt: number;
}

function ensureDir() {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readJson<T>(filePath: string, fallback: T): T {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, "utf-8"));
        }
    } catch { }
    return fallback;
}

function writeJson(filePath: string, data: unknown) {
    ensureDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ── Init (no-op, kept for API compatibility) ────────────────────────────────

export async function initDb() {
    ensureDir();
}

// ── Watchlist ────────────────────────────────────────────────────────────────

export async function getWatchlist() {
    const entries = readJson<WatchlistEntry[]>(WATCHLIST_PATH, []);
    return entries
        .sort((a, b) => b.addedAt - a.addedAt)
        .map(r => ({
            symbol: r.symbol,
            exchange: r.exchange,
            segment: r.segment,
            securityId: r.securityId,
            lastSyncTs: null,
            candleCount: 0,
            status: "synced",
        }));
}

export async function addToWatchlist(symbol: string, exchange = "NSE", segment = "EQ", securityId?: string) {
    const entries = readJson<WatchlistEntry[]>(WATCHLIST_PATH, []);
    const key = `${symbol.toUpperCase().trim()}:${exchange}`;
    if (entries.some(e => `${e.symbol}:${e.exchange}` === key)) return;
    entries.push({
        symbol: symbol.toUpperCase().trim(),
        exchange,
        segment,
        securityId: securityId || null,
        addedAt: Math.floor(Date.now() / 1000),
    });
    writeJson(WATCHLIST_PATH, entries);
}

export async function removeFromWatchlist(symbol: string, exchange = "NSE") {
    const entries = readJson<WatchlistEntry[]>(WATCHLIST_PATH, []);
    const filtered = entries.filter(e => !(e.symbol === symbol && e.exchange === exchange));
    writeJson(WATCHLIST_PATH, filtered);
}

// ── Stats ────────────────────────────────────────────────────────────────────

export async function getStats() {
    const entries = readJson<WatchlistEntry[]>(WATCHLIST_PATH, []);
    return {
        watchlistCount: entries.length,
        totalCandles: 0,
        lastSyncTs: null,
        storageMb: 0,
    };
}

// ── Activity Log ─────────────────────────────────────────────────────────────

export async function logActivity(symbol: string, exchange: string, interval: string, action: string, rowsCount: number, status: "success" | "failed" | "skipped") {
    const entries = readJson<ActivityEntry[]>(ACTIVITY_PATH, []);
    entries.push({
        symbol, exchange, interval, action,
        rows_count: rowsCount,
        status,
        createdAt: Math.floor(Date.now() / 1000),
    });
    // Keep last 500 entries max
    if (entries.length > 500) entries.splice(0, entries.length - 500);
    writeJson(ACTIVITY_PATH, entries);
}

export async function getActivity(limit = 20) {
    const entries = readJson<ActivityEntry[]>(ACTIVITY_PATH, []);
    return entries
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
}
