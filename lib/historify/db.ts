import Database, { Database as DatabaseType } from "better-sqlite3";
import path from "path";
import fs from "fs";

let _db: DatabaseType | null = null;
const dbDir = path.join(process.cwd(), "data");

function getDb(): DatabaseType {
    if (_db) return _db;
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    // This is now purely for small configurations.
    const dbPath = path.join(dbDir, "historify-config.db");
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
        SELECT w.symbol, w.exchange, w.segment, w.security_id, w.added_at
        FROM watchlist w
        ORDER BY w.added_at DESC
    `).all() as any[];

    // Note: To get precise candle_count / last_sync_ts, we would now query the 
    // DuckDB Parquet engine. For the config view, we return placeholders or proxy status.
    return rows.map(r => ({
        symbol: r.symbol,
        exchange: r.exchange,
        segment: r.segment,
        securityId: r.security_id || null,
        lastSyncTs: null, // Defer to specialized Parquet method
        candleCount: 0,   // Defer to specialized Parquet method
        status: "synced", // UI fallback
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

// OHLC Timeseries methods have been entirely migrated to DuckDB Parquet storage
// See lib/historify/duckdb.ts and api/historify/day-chart/route.ts

// ── Stats ────────────────────────────────────────────────────────────────────

export async function getStats() {
    const db = getDb();

    const watchlistCount = (db.prepare(`SELECT COUNT(*) as n FROM watchlist`).get() as any).n;
    const totalCandles = 0; // DuckDB metric
    const lastSyncTs = null; // DuckDB metric

    // Rough storage size from file
    const dbPath = path.join(dbDir, "historify-config.db");
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
