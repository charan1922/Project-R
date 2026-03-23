import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tf-snapshot
 *
 * ?date=YYYY-MM-DD — returns TF data for that date
 * ?dates=true — returns list of available dates
 * ?symbol=X&days=25 — returns TF R-Factor history for a symbol
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Ensure table exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS tf_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        symbol TEXT NOT NULL,
        rFactor REAL NOT NULL,
        ltp REAL DEFAULT 0,
        prevClose REAL DEFAULT 0,
        pctChange REAL DEFAULT 0,
        UNIQUE(date, symbol)
      )
    `);

    if (searchParams.get('dates') === 'true') {
      const rows = await prisma.$queryRawUnsafe<{ date: string; cnt: bigint }[]>(
        'SELECT date, COUNT(*) as cnt FROM tf_snapshots GROUP BY date ORDER BY date DESC',
      );
      return NextResponse.json({
        success: true,
        dates: rows.map((r) => ({ date: r.date, stocks: Number(r.cnt) })),
      });
    }

    const symbol = searchParams.get('symbol');
    if (symbol) {
      const days = Number(searchParams.get('days') ?? 25);
      const rows = await prisma.$queryRawUnsafe<{ date: string; rFactor: number; ltp: number; pctChange: number }[]>(
        `SELECT date, rFactor, ltp, pctChange FROM tf_snapshots WHERE symbol = '${symbol.replace(/'/g, "''")}' ORDER BY date DESC LIMIT ${days}`,
      );
      return NextResponse.json({ success: true, symbol, data: rows });
    }

    const date = searchParams.get('date');
    if (date) {
      const rows = await prisma.$queryRawUnsafe<
        { symbol: string; rFactor: number; ltp: number; prevClose: number; pctChange: number }[]
      >(
        `SELECT symbol, rFactor, ltp, prevClose, pctChange FROM tf_snapshots WHERE date = '${date}' ORDER BY rFactor DESC`,
      );
      return NextResponse.json({ success: true, date, stocks: rows });
    }

    return NextResponse.json({ error: 'Provide ?date=, ?dates=true, or ?symbol=' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
