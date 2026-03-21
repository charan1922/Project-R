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
  const rows = await prisma.$queryRawUnsafe<{ cnt: number }[]>(`SELECT COUNT(*) as cnt FROM ${table} ${where}`);
  return rows[0]?.cnt ?? 0;
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

/** Checkpoint — no-op for SQLite (auto-commits) */
export async function checkpoint(): Promise<void> {
  // SQLite auto-commits, no checkpoint needed
}
