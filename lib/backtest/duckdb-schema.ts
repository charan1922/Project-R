/**
 * Backtest Data Storage — SQLite via Prisma raw queries
 *
 * Uses the existing project-r.db SQLite database.
 * Avoids DuckDB module isolation issues with Turbopack.
 */

import { prisma } from '@/lib/db';

/** Ensure backtest tables exist in SQLite */
export async function ensureBacktestTables(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS backtest_equity (
      symbol TEXT NOT NULL, date TEXT NOT NULL, timestamp INTEGER NOT NULL,
      open REAL, high REAL, low REAL, close REAL, volume REAL,
      PRIMARY KEY (symbol, timestamp)
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS backtest_futures (
      symbol TEXT NOT NULL, date TEXT NOT NULL, timestamp INTEGER NOT NULL,
      open REAL, high REAL, low REAL, close REAL, volume REAL, oi REAL,
      PRIMARY KEY (symbol, timestamp)
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS backtest_options (
      symbol TEXT NOT NULL, date TEXT NOT NULL, timestamp INTEGER NOT NULL,
      option_type TEXT NOT NULL, strike REAL NOT NULL,
      open REAL, high REAL, low REAL, close REAL,
      volume REAL, oi REAL, iv REAL, spot REAL,
      PRIMARY KEY (symbol, option_type, strike, timestamp)
    )
  `);
}

/** Get row count for a table */
export async function getRowCount(table: string, symbol?: string): Promise<number> {
  await ensureBacktestTables();
  const where = symbol ? `WHERE symbol = '${symbol}'` : '';
  const rows = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(`SELECT COUNT(*) as cnt FROM ${table} ${where}`);
  return Number(rows[0]?.cnt ?? 0);
}

/** Query rows from a backtest table */
export async function queryRows(sql: string): Promise<Record<string, unknown>[]> {
  await ensureBacktestTables();
  return prisma.$queryRawUnsafe(sql);
}

/** Execute a statement (INSERT, DELETE, etc.) */
export async function execute(sql: string): Promise<void> {
  await ensureBacktestTables();
  await prisma.$executeRawUnsafe(sql);
}

/** Get row counts per symbol for a table (batch — 1 query instead of N) */
export async function getSymbolCounts(table: string): Promise<Map<string, number>> {
  await ensureBacktestTables();
  const rows = await prisma.$queryRawUnsafe<{ symbol: string; cnt: bigint }[]>(
    `SELECT symbol, COUNT(*) as cnt FROM ${table} GROUP BY symbol`,
  );
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.symbol, Number(r.cnt));
  return map;
}

/** Get (symbol, date) pairs that have data — for per-trade status checks */
export async function getSymbolDatePairs(table: string): Promise<Set<string>> {
  await ensureBacktestTables();
  const rows = await prisma.$queryRawUnsafe<{ symbol: string; date: string }[]>(
    `SELECT DISTINCT symbol, date FROM ${table}`,
  );
  const set = new Set<string>();
  for (const r of rows) set.add(`${r.symbol}|${r.date}`);
  return set;
}

/** Get (symbol, option_type, strike, date) tuples that have option data */
export async function getOptionDatePairs(): Promise<Set<string>> {
  await ensureBacktestTables();
  const rows = await prisma.$queryRawUnsafe<{ symbol: string; option_type: string; strike: number; date: string }[]>(
    `SELECT DISTINCT symbol, option_type, CAST(strike AS INTEGER) as strike, date FROM backtest_options`,
  );
  const set = new Set<string>();
  for (const r of rows) set.add(`${r.symbol}|${r.option_type}|${Number(r.strike)}|${r.date}`);
  return set;
}

/** Checkpoint — no-op for SQLite (auto-commits) */
export async function checkpoint(): Promise<void> {
  // SQLite auto-commits, no checkpoint needed
}
