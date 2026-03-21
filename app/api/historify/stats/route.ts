import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { getStats, initDb } = await import('@/lib/historify/db');
    await initDb();
    const stats = await getStats();

    // Add backtest data stats
    let backtestEquity = 0;
    let backtestFutures = 0;
    let backtestOptions = 0;
    try {
      const { getRowCount } = await import('@/lib/backtest/duckdb-schema');
      backtestEquity = await getRowCount('backtest_equity');
      backtestFutures = await getRowCount('backtest_futures');
      backtestOptions = await getRowCount('backtest_options');
    } catch {
      // Backtest tables may not exist yet
    }

    // Add option contracts count
    let optionContractsCount = 0;
    try {
      const { prisma } = await import('@/lib/db');
      optionContractsCount = await prisma.masterContract.count({ where: { instrument: 'OPTSTK' } });
    } catch {
      // ignore
    }

    return NextResponse.json({
      ...stats,
      optionContractsCount,
      backtestEquity,
      backtestFutures,
      backtestOptions,
      backtestTotal: backtestEquity + backtestFutures + backtestOptions,
    });
  } catch {
    return NextResponse.json({
      watchlistCount: 0,
      masterContractsCount: 0,
      bhavcopyDaysCount: 0,
      storageMb: 0,
      lastMasterSync: null,
      optionContractsCount: 0,
      backtestEquity: 0,
      backtestFutures: 0,
      backtestOptions: 0,
      backtestTotal: 0,
    });
  }
}
