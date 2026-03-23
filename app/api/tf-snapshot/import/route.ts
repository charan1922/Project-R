import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tf-snapshot/import
 *
 * Imports TradeFinder intraday_boost data.
 * Body: { date: "YYYY-MM-DD", stocks: [{ Symbol, param_0, param_1, param_2, param_3 }] }
 * OR: { data: { intraday_boost: [...] }, _meta: { captured: "..." } } (ground truth format)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

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
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_tf_snapshots_date ON tf_snapshots(date)');

    // Clear a date before re-import (replaceDate flag)
    if (body.replaceDate) {
      await prisma.$executeRawUnsafe(`DELETE FROM tf_snapshots WHERE date = '${body.replaceDate}'`);
      if (!body.stocks && !body.intraday_boost && !body.data && !body.payload) {
        return NextResponse.json({ success: true, deleted: body.replaceDate });
      }
    }

    // Parse input — support both formats
    let date: string;
    let stocks: { Symbol: string; param_0: number; param_1: number; param_2: number; param_3: number }[];

    if (body.payload?.data?.intraday_boost) {
      // Ground truth file format: { payload: { data: { intraday_boost: [...] } }, _meta: { ... } }
      stocks = body.payload.data.intraday_boost;
      date = body._meta?.captured
        ? new Date(body._meta.captured).toISOString().slice(0, 10)
        : (body.date ?? new Date().toISOString().slice(0, 10));
    } else if (body.data?.intraday_boost) {
      // API format: { data: { intraday_boost: [...] }, _meta: { ... } }
      stocks = body.data.intraday_boost;
      date = body._meta?.captured
        ? new Date(body._meta.captured).toISOString().slice(0, 10)
        : (body.date ?? new Date().toISOString().slice(0, 10));
    } else if (body.stocks) {
      // Simple format: { date, stocks: [...] }
      stocks = body.stocks;
      date = body.date ?? new Date().toISOString().slice(0, 10);
    } else if (body.intraday_boost) {
      // Direct array: { intraday_boost: [...], date }
      stocks = body.intraday_boost;
      date = body.date ?? new Date().toISOString().slice(0, 10);
    } else {
      return NextResponse.json(
        { error: 'No stocks data found. Provide stocks[], data.intraday_boost[], or intraday_boost[]' },
        { status: 400 },
      );
    }

    if (!stocks.length) {
      return NextResponse.json({ error: 'Empty stocks array' }, { status: 400 });
    }

    // Upsert rows
    let imported = 0;
    for (const s of stocks) {
      const symbol = s.Symbol?.trim();
      if (!symbol || !s.param_3) continue;
      await prisma.$executeRawUnsafe(
        `INSERT INTO tf_snapshots (date, symbol, rFactor, ltp, prevClose, pctChange)
         VALUES ('${date}', '${symbol.replace(/'/g, "''")}', ${s.param_3}, ${s.param_0 ?? 0}, ${s.param_1 ?? 0}, ${s.param_2 ?? 0})
         ON CONFLICT(date, symbol) DO UPDATE SET rFactor=${s.param_3}, ltp=${s.param_0 ?? 0}, prevClose=${s.param_1 ?? 0}, pctChange=${s.param_2 ?? 0}`,
      );
      imported++;
    }

    return NextResponse.json({ success: true, imported, date });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
