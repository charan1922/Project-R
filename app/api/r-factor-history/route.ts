import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { engine } from '@/lib/r-factor/engine';
import { type DailyStockData, transformToFactorData } from '@/lib/r-factor/types';

function rowToStockData(r: {
  eqVolume: number;
  eqTurnover: number;
  eqHigh: number;
  eqLow: number;
  eqClose: number;
  futVolume: number;
  futOi: number;
  futOiChange: number;
  futTurnover: number;
  optVolume: number;
  optOi: number;
  optTurnover: number;
  ceVolume: number;
  peVolume: number;
}): DailyStockData {
  return {
    eq_volume: r.eqVolume,
    eq_turnover: r.eqTurnover,
    eq_high: r.eqHigh,
    eq_low: r.eqLow,
    eq_close: r.eqClose,
    fut_volume: r.futVolume,
    fut_oi: r.futOi,
    fut_oi_change: r.futOiChange,
    fut_turnover: r.futTurnover,
    opt_volume: r.optVolume,
    opt_oi: r.optOi,
    opt_turnover: r.optTurnover,
    ce_volume: r.ceVolume,
    pe_volume: r.peVolume,
  };
}

async function getSymbolHistory(symbol: string, days: number) {
  const rows = await prisma.bhavcopyDay.findMany({
    where: { symbol },
    orderBy: { date: 'asc' },
  });

  if (rows.length < 15) {
    return NextResponse.json({ success: false, error: `Insufficient data for ${symbol}` }, { status: 404 });
  }

  // Compute rolling R-Factor for the last `days` dates
  // Each position needs at least 15 prior data points for Z-scores
  const results: {
    date: string;
    compositeRFactor: number;
    spread: number;
    pcr: number;
    regime: string;
    isBlastTrade: boolean;
  }[] = [];

  const startIdx = Math.max(14, rows.length - days);

  for (let i = startIdx; i < rows.length; i++) {
    const window = rows.slice(0, i + 1).map(rowToStockData);
    const factorData = transformToFactorData(window);
    const current = factorData[factorData.length - 1];
    const historical = factorData.slice(0, -1);
    try {
      const signal = engine.calculateSignal(symbol, current, historical);
      results.push({
        date: rows[i].date,
        compositeRFactor: signal.compositeRFactor,
        spread: signal.zScores.spread,
        pcr: signal.zScores.pcr,
        regime: signal.regime,
        isBlastTrade: signal.isBlastTrade,
      });
    } catch {
      // Skip days with insufficient variance for Z-scores
    }
  }

  return NextResponse.json({ success: true, symbol, data: results });
}

async function getDailyLeaderboard(date: string, limit: number) {
  const dateRows = await prisma.bhavcopyDay.findMany({
    where: { date },
    select: { symbol: true },
  });

  if (dateRows.length === 0) {
    return NextResponse.json({ success: false, error: `No bhavcopy data for ${date}` }, { status: 404 });
  }

  const symbols = dateRows.map((r) => r.symbol);

  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      // Get last 25 rows up to and including this date (desc, then reverse)
      const rows = await prisma.bhavcopyDay.findMany({
        where: { symbol, date: { lte: date } },
        orderBy: { date: 'desc' },
        take: 25,
      });
      rows.reverse();

      if (rows.length < 15) return null;

      const stocks = rows.map(rowToStockData);
      const factorData = transformToFactorData(stocks);
      const current = factorData[factorData.length - 1];
      const historical = factorData.slice(0, -1);
      const signal = engine.calculateSignal(symbol, current, historical);

      return {
        symbol,
        compositeRFactor: signal.compositeRFactor,
        spread: signal.zScores.spread,
        pcr: signal.zScores.pcr,
        regime: signal.regime,
        isBlastTrade: signal.isBlastTrade,
      };
    }),
  );

  type LeaderEntry = { symbol: string; compositeRFactor: number; spread: number; pcr: number; regime: string; isBlastTrade: boolean };
  const ranked: LeaderEntry[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value !== null) ranked.push(r.value as LeaderEntry);
  }
  ranked.sort((a, b) => b.compositeRFactor - a.compositeRFactor);
  ranked.splice(limit);

  return NextResponse.json({ success: true, date, data: ranked });
}

async function getAvailableDates() {
  const rows = await prisma.bhavcopyDay.findMany({
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'desc' },
  });
  return NextResponse.json({ success: true, dates: rows.map((r) => r.date) });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();
    const date = searchParams.get('date');
    const datesOnly = searchParams.get('dates') === 'true';

    if (datesOnly) return getAvailableDates();
    if (symbol) return getSymbolHistory(symbol, parseInt(searchParams.get('days') || '25', 10));
    if (date) return getDailyLeaderboard(date, parseInt(searchParams.get('limit') || '20', 10));

    return NextResponse.json({ error: 'Provide ?symbol=, ?date=, or ?dates=true' }, { status: 400 });
  } catch (error) {
    console.error('[r-factor-history] Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
