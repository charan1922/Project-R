import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { engine } from '@/lib/r-factor/engine';
import { type DailyStockData, transformToFactorData } from '@/lib/r-factor/types';

let sectorCache: Record<string, string> | null = null;
async function getSectorMap(): Promise<Record<string, string>> {
  if (sectorCache) return sectorCache;
  try {
    const data = await fs.readFile(path.join(process.cwd(), 'lib', 'data', 'fno_sectors.json'), 'utf8');
    sectorCache = JSON.parse(data);
    return sectorCache!;
  } catch {
    return {};
  }
}

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

  const sectorMap = await getSectorMap();
  const sector = sectorMap[symbol] ?? null;

  // Compute rolling R-Factor for the last `days` dates
  const results: Record<string, unknown>[] = [];
  const startIdx = Math.max(14, rows.length - days);

  for (let i = startIdx; i < rows.length; i++) {
    const window = rows.slice(0, i + 1).map(rowToStockData);
    const factorData = transformToFactorData(window);
    const current = factorData[factorData.length - 1];
    const historical = factorData.slice(0, -1);
    const raw = rows[i];
    try {
      const signal = engine.calculateSignal(symbol, current, historical);
      // Previous day's R for delta computation
      const prevR = results.length > 0 ? (results[results.length - 1].compositeRFactor as number) : null;

      results.push({
        date: raw.date,
        compositeRFactor: signal.compositeRFactor,
        delta: prevR !== null ? signal.compositeRFactor - prevR : null,
        zScores: signal.zScores,
        regime: signal.regime,
        isBlastTrade: signal.isBlastTrade,
        modelUsed: signal.modelUsed,
        // Raw bhavcopy values for context
        raw: {
          eqHigh: raw.eqHigh,
          eqLow: raw.eqLow,
          eqClose: raw.eqClose,
          eqVolume: raw.eqVolume,
          futVolume: raw.futVolume,
          futOi: raw.futOi,
          futOiChange: raw.futOiChange,
          futTurnover: raw.futTurnover,
          ceVolume: raw.ceVolume,
          peVolume: raw.peVolume,
          optOi: raw.optOi,
        },
      });
    } catch {
      // Skip days with insufficient variance for Z-scores
    }
  }

  // Summary stats
  const rValues = results.map((r) => r.compositeRFactor as number);
  const spreads = results.map((r) => (r.zScores as Record<string, number>).spread);
  const blastDays = results.filter((r) => r.isBlastTrade).length;
  const regimes = results.map((r) => r.regime as string);
  const regimeCounts = regimes.reduce(
    (acc, r) => {
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const dominantRegime = Object.entries(regimeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Defensive';

  // Trend: compare last 5 days avg vs first 5 days avg
  const recent5 = rValues.slice(-5);
  const early5 = rValues.slice(0, 5);
  const recentAvg = recent5.length > 0 ? recent5.reduce((a, b) => a + b, 0) / recent5.length : 0;
  const earlyAvg = early5.length > 0 ? early5.reduce((a, b) => a + b, 0) / early5.length : 0;
  const trendDirection = recentAvg > earlyAvg + 0.1 ? 'up' : recentAvg < earlyAvg - 0.1 ? 'down' : 'flat';

  const summary = {
    avgR: rValues.length > 0 ? rValues.reduce((a, b) => a + b, 0) / rValues.length : 0,
    maxR: rValues.length > 0 ? Math.max(...rValues) : 0,
    minR: rValues.length > 0 ? Math.min(...rValues) : 0,
    blastDays,
    totalDays: results.length,
    dominantRegime,
    regimeCounts,
    trendDirection,
    avgSpread: spreads.length > 0 ? spreads.reduce((a, b) => a + b, 0) / spreads.length : 0,
    maxSpread: spreads.length > 0 ? Math.max(...spreads) : 0,
  };

  return NextResponse.json({ success: true, symbol, sector, summary, data: results });
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
      const sectorMap = await getSectorMap();

      return {
        symbol,
        sector: sectorMap[symbol] ?? null,
        compositeRFactor: signal.compositeRFactor,
        zScores: signal.zScores,
        regime: signal.regime,
        isBlastTrade: signal.isBlastTrade,
        modelUsed: signal.modelUsed,
      };
    }),
  );

  type LeaderEntry = {
    symbol: string;
    sector: string | null;
    compositeRFactor: number;
    zScores: Record<string, number>;
    regime: string;
    isBlastTrade: boolean;
    modelUsed: string;
  };
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
