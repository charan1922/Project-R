import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dhancopy — same shape as /api/bhavcopy but reads from dhan_daily_data table.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();
    const date = searchParams.get('date');
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50', 10), 500);
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10);

    // Ensure table exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS dhan_daily_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL, symbol TEXT NOT NULL,
        eqVolume REAL DEFAULT 0, eqTurnover REAL DEFAULT 0,
        eqHigh REAL DEFAULT 0, eqLow REAL DEFAULT 0, eqClose REAL DEFAULT 0,
        futVolume REAL DEFAULT 0, futOi REAL DEFAULT 0, futOiChange REAL DEFAULT 0, futTurnover REAL DEFAULT 0,
        optVolume REAL DEFAULT 0, ceVolume REAL DEFAULT 0, peVolume REAL DEFAULT 0,
        rFactor REAL DEFAULT 0,
        UNIQUE(date, symbol)
      )
    `);

    const whereClauses: string[] = [];
    if (symbol) whereClauses.push(`symbol LIKE '%${symbol.replace(/'/g, "''")}%'`);
    if (date) whereClauses.push(`date = '${date}'`);
    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [data, totalRows, dateRows] = await Promise.all([
      prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT rowid as id, date, symbol, eqHigh, eqLow, eqClose, eqVolume, futVolume, futOi, futOiChange, futTurnover, ceVolume, peVolume, rFactor FROM dhan_daily_data ${where} ORDER BY date DESC, symbol ASC LIMIT ${limit} OFFSET ${offset}`,
      ),
      prisma.$queryRawUnsafe<{ cnt: bigint }[]>(`SELECT COUNT(*) as cnt FROM dhan_daily_data ${where}`),
      prisma.$queryRawUnsafe<{ date: string }[]>('SELECT DISTINCT date FROM dhan_daily_data ORDER BY date DESC'),
    ]);

    const total = Number(totalRows[0]?.cnt ?? 0);
    const dateList = dateRows.map((d) => d.date);

    return NextResponse.json({
      success: true,
      data,
      total,
      dates: dateList,
      dateRange: dateList.length > 0 ? { from: dateList[dateList.length - 1], to: dateList[0] } : null,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
