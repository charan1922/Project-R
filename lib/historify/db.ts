import Database, { Database as DatabaseType } from "better-sqlite3";
import path from "path";
import fs from "fs";

let _db: DatabaseType | null = null;
const dbDir = path.join(process.cwd(), "data");

function getDb(): DatabaseType {
    if (_db) return _db;
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    const dbPath = path.join(dbDir, "historify.db");
    _db = new Database(dbPath);
    return _db;
}

export async function initDb() {
    getDb().exec(`
        CREATE TABLE IF NOT EXISTS watchlist (
            symbol      TEXT NOT NULL,
            exchange    TEXT NOT NULL DEFAULT 'NSE',
            segment     TEXT NOT NULL DEFAULT 'EQ',
            security_id TEXT,
            added_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
            PRIMARY KEY (symbol, exchange)
        );

        CREATE TABLE IF NOT EXISTS historical_data (
            symbol      TEXT NOT NULL,
            exchange    TEXT NOT NULL,
            interval    TEXT NOT NULL,
            timestamp   INTEGER NOT NULL,
            open        REAL,
            high        REAL,
            low         REAL,
            close       REAL,
            volume      INTEGER,
            PRIMARY KEY (symbol, exchange, interval, timestamp)
        );

        CREATE TABLE IF NOT EXISTS activity_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol      TEXT,
            exchange    TEXT,
            interval    TEXT,
            action      TEXT NOT NULL,
            rows_count  INTEGER DEFAULT 0,
            status      TEXT NOT NULL DEFAULT 'success',
            created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
        );
    `);
}

// ── Watchlist ────────────────────────────────────────────────────────────────

export async function getWatchlist() {
    const db = getDb();
    const rows = db.prepare(`
        SELECT w.symbol, w.exchange, w.segment, w.security_id, w.added_at,
               MAX(h.timestamp) as last_sync_ts,
               COUNT(h.timestamp) as candle_count
        FROM watchlist w
        LEFT JOIN historical_data h ON h.symbol = w.symbol AND h.exchange = w.exchange AND h.interval = 'Daily'
        GROUP BY w.symbol, w.exchange
        ORDER BY w.added_at DESC
    `).all() as any[];

    return rows.map(r => ({
        symbol: r.symbol,
        exchange: r.exchange,
        segment: r.segment,
        securityId: r.security_id || null,
        lastSyncTs: r.last_sync_ts || null,
        candleCount: r.candle_count || 0,
        status: !r.last_sync_ts ? "never" :
            (Date.now() / 1000 - r.last_sync_ts) < 86400 ? "synced" : "stale",
    }));
}

export async function addToWatchlist(symbol: string, exchange = "NSE", segment = "EQ", securityId?: string) {
    getDb().prepare(`
        INSERT OR IGNORE INTO watchlist (symbol, exchange, segment, security_id)
        VALUES (?, ?, ?, ?)
    `).run(symbol.toUpperCase().trim(), exchange, segment, securityId || null);
}

export async function removeFromWatchlist(symbol: string, exchange = "NSE") {
    getDb().prepare(`DELETE FROM watchlist WHERE symbol = ? AND exchange = ?`).run(symbol, exchange);
}

// ── OHLC Data ────────────────────────────────────────────────────────────────

export async function insertOHLC(
    symbol: string,
    exchange: string,
    interval: string,
    data: { timestamp: number[]; open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] }
) {
    if (!data.timestamp || data.timestamp.length === 0) return;
    const db = getDb();
    const insert = db.prepare(`
        INSERT OR REPLACE INTO historical_data (symbol, exchange, interval, timestamp, open, high, low, close, volume)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const tx = db.transaction((rows: any[]) => {
        for (const row of rows) insert.run(row.symbol, row.exchange, row.interval, row.ts, row.o, row.h, row.l, row.c, row.v);
    });
    tx(data.timestamp.map((ts, i) => ({ symbol, exchange, interval, ts, o: data.open[i], h: data.high[i], l: data.low[i], c: data.close[i], v: data.volume[i] })));
}

export async function getLastSync(symbol: string, exchange: string, interval: string): Promise<number | null> {
    const row = getDb().prepare(
        `SELECT MAX(timestamp) as last_ts FROM historical_data WHERE symbol = ? AND exchange = ? AND interval = ?`
    ).get(symbol, exchange, interval) as { last_ts: number } | undefined;
    return row?.last_ts || null;
}

export async function getChartData(symbol: string, exchange: string, interval: string, limit = 500) {
    const rows = getDb().prepare(`
        SELECT timestamp, open, high, low, close, volume
        FROM historical_data
        WHERE symbol = ? AND exchange = ? AND interval = ?
        ORDER BY timestamp DESC LIMIT ?
    `).all(symbol, exchange, interval, limit) as any[];

    return rows.reverse().map(r => ({
        time: new Date(r.timestamp * 1000).toISOString().split("T")[0],
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
    }));
}

// ── Stats ────────────────────────────────────────────────────────────────────

export async function getStats() {
    const db = getDb();

    const watchlistCount = (db.prepare(`SELECT COUNT(*) as n FROM watchlist`).get() as any).n;
    const totalCandles = (db.prepare(`SELECT COUNT(*) as n FROM historical_data`).get() as any).n;
    const lastSyncRow = db.prepare(`SELECT MAX(timestamp) as ts FROM historical_data`).get() as any;
    const lastSyncTs = lastSyncRow?.ts || null;

    // Rough storage size from file
    const dbPath = path.join(dbDir, "historify.db");
    let storageMb = 0;
    try { storageMb = +(fs.statSync(dbPath).size / 1024 / 1024).toFixed(1); } catch { }

    return {
        watchlistCount,
        totalCandles,
        lastSyncTs,
        storageMb,
    };
}

// ── Activity Log ─────────────────────────────────────────────────────────────

export async function logActivity(symbol: string, exchange: string, interval: string, action: string, rowsCount: number, status: "success" | "failed" | "skipped") {
    getDb().prepare(`
        INSERT INTO activity_log (symbol, exchange, interval, action, rows_count, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(symbol, exchange, interval, action, rowsCount, status);
}

export async function getActivity(limit = 20) {
    const rows = getDb().prepare(`
        SELECT symbol, exchange, interval, action, rows_count, status, created_at
        FROM activity_log
        ORDER BY created_at DESC LIMIT ?
    `).all(limit) as any[];
    return rows.map(r => ({ ...r, createdAt: r.created_at }));
}
