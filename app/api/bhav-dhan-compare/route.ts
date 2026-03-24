import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { computeRMSE, computeSpearmanCorrelation, computeTopNOverlap } from '@/lib/r-factor/comparison';
import { rFactorService } from '@/lib/r-factor/data-service';
import { isDhanDailyCached, loadDhanDailyFromDb, saveDhanDailyToDb } from '@/lib/r-factor/dhan-daily-service';

/**
 * GET /api/r-factor-compare?date=2026-03-23
 *
 * Returns Bhavcopy + Dhan daily raw data side by side. No TF.
 */
export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get('date');

    // Available dates from bhavcopy + dhan cache
    const [bhavDates, dhanDates] = await Promise.all([
      prisma.bhavcopyDay.findMany({ select: { date: true }, distinct: ['date'] }).then((r) => r.map((x) => x.date)),
      prisma
        .$queryRawUnsafe<{ date: string }[]>('SELECT DISTINCT date FROM dhan_daily_data')
        .then((r) => r.map((x) => x.date))
        .catch(() => [] as string[]),
    ]);
    const availableDates = [...new Set([...bhavDates, ...dhanDates])].sort().reverse();

    if (!date) {
      return NextResponse.json({ success: true, availableDates });
    }

    // 1. Bhavcopy raw data
    const bhavRows = await prisma.bhavcopyDay.findMany({ where: { date } });

    // 2. Bhavcopy R-Factor
    const bhavSignals = new Map<string, number>();
    try {
      const bhavResult = await rFactorService.scanPast({ date, stockList: 'all' });
      for (const s of bhavResult.signals) {
        bhavSignals.set(s.symbol, s.compositeRFactor);
      }
    } catch {
      /* bhavcopy might not have this date */
    }

    // 3. Dhan daily cache
    const dhanCached = await isDhanDailyCached(date);
    const dhanRows = dhanCached ? await loadDhanDailyFromDb(date) : [];

    // 4. Build stock list — bhav data + dhan data merged
    const bhavMap = new Map(bhavRows.map((r) => [r.symbol, r]));
    const dhanMap = new Map(dhanRows.map((r) => [r.symbol, r]));
    const allSymbols = [...new Set([...bhavMap.keys(), ...dhanMap.keys()])].sort();

    const stocks = allSymbols.map((symbol) => {
      const b = bhavMap.get(symbol);
      const d = dhanMap.get(symbol);
      return {
        symbol,
        bhav: b
          ? {
              eqHigh: b.eqHigh,
              eqLow: b.eqLow,
              eqClose: b.eqClose,
              eqVolume: b.eqVolume,
              futVolume: b.futVolume,
              futOi: b.futOi,
              futOiChange: b.futOiChange,
              futTurnover: b.futTurnover,
              ceVolume: b.ceVolume,
              peVolume: b.peVolume,
              rFactor: bhavSignals.get(symbol) ?? 0,
            }
          : null,
        dhan: d
          ? {
              eqHigh: d.eqHigh,
              eqLow: d.eqLow,
              eqClose: d.eqClose,
              eqVolume: d.eqVolume,
              futVolume: d.futVolume,
              futOi: d.futOi,
              futOiChange: d.futOiChange,
              futTurnover: d.futTurnover,
              ceVolume: d.ceVolume,
              peVolume: d.peVolume,
              rFactor: d.rFactor,
            }
          : null,
      };
    });

    // 5. Metrics (only Bhav vs Dhan)
    const pairs = stocks
      .filter((s) => s.bhav?.rFactor && s.dhan?.rFactor)
      .map((s) => ({ symbol: s.symbol, ourR: s.bhav!.rFactor, tfR: s.dhan!.rFactor }));

    return NextResponse.json({
      success: true,
      date,
      availableDates,
      hasBhav: bhavMap.size > 0,
      hasDhan: dhanMap.size > 0,
      dhanCached,
      bhavCount: bhavMap.size,
      dhanCount: dhanMap.size,
      stocks,
      metrics:
        pairs.length >= 5
          ? {
              matched: pairs.length,
              spearman: +computeSpearmanCorrelation(pairs).toFixed(3),
              top10: computeTopNOverlap(pairs, 10),
              top20: computeTopNOverlap(pairs, 20),
              rmse: +computeRMSE(pairs).toFixed(3),
            }
          : null,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * POST /api/r-factor-compare
 * { action: "compute-dhan", date: "2026-03-23" }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.action !== 'compute-dhan' || !body.date) {
      return NextResponse.json({ error: 'Provide { action: "compute-dhan", date: "YYYY-MM-DD" }' }, { status: 400 });
    }

    const date = body.date as string;
    const result = await rFactorService.scanDhanDaily({ stockList: 'all', date });

    const rawData = result.rawData ?? new Map();
    const rows = result.signals.map((s: any) => ({
      symbol: s.symbol as string,
      data: rawData.get(s.symbol) ?? {
        eq_volume: 0,
        eq_turnover: 0,
        eq_high: 0,
        eq_low: 0,
        eq_close: 0,
        fut_volume: 0,
        fut_oi: 0,
        fut_oi_change: 0,
        fut_turnover: 0,
        opt_volume: 0,
        opt_oi: 0,
        opt_turnover: 0,
        ce_volume: 0,
        pe_volume: 0,
      },
      rFactor: s.compositeRFactor as number,
    }));

    await saveDhanDailyToDb(date, rows);

    const failures = result.failures ?? [];
    return NextResponse.json({
      success: true,
      date,
      computed: result.signals.length,
      failed: failures.length,
      errors: failures.slice(0, 20),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
