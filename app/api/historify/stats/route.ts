import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { getStats, initDb } = await import('@/lib/historify/db');
    await initDb();
    const stats = await getStats();
    return NextResponse.json(stats);
  } catch {
    // DB not ready yet — return zero stats
    return NextResponse.json({
      watchlistCount: 0,
      masterContractsCount: 0,
      bhavcopyDaysCount: 0,
      storageMb: 0,
      lastMasterSync: null,
    });
  }
}
