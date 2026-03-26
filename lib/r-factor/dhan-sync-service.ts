import { prisma } from '@/lib/db';
import { isTradingDay, todayIST } from '@/lib/dhan/market-feed';
import { rFactorService } from '@/lib/r-factor/data-service';
import {
  DhanDateUnavailableError,
  getLatestDhanHistoricalDate,
  saveDhanDailyToDb,
} from '@/lib/r-factor/dhan-daily-service';

export async function computeAndCacheDhanDate(date: string) {
  const { latestDate, probeSymbol } = await getLatestDhanHistoricalDate();
  const isTodayRequest = date === todayIST();

  const result =
    latestDate && date > latestDate
      ? isTodayRequest && isTradingDay()
        ? await rFactorService.scanDhanTodayFromLive({ stockList: 'all', date, latestHistoricalDate: latestDate })
        : (() => {
            throw new DhanDateUnavailableError(date, latestDate, probeSymbol);
          })()
      : await rFactorService.scanDhanDaily({ stockList: 'all', date });

  const rawData = result.rawData ?? new Map();
  const failures = result.failures ?? [];

  if (result.signals.length === 0) {
    if (latestDate && date > latestDate) {
      throw new DhanDateUnavailableError(date, latestDate, probeSymbol);
    }

    throw new Error(
      `Dhan sync produced 0 rows for ${date}${failures.length ? `. Sample failures: ${failures.slice(0, 3).join(' | ')}` : ''}`,
    );
  }

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

  return {
    date,
    mode: latestDate && date > latestDate ? 'live-today-fallback' : 'historical',
    computed: result.signals.length,
    failed: failures.length,
    errors: failures.slice(0, 20),
  };
}

export async function getBhavDatesInRange(fromDate?: string, toDate?: string): Promise<string[]> {
  const where: Record<string, unknown> = {};
  if (fromDate || toDate) {
    where.date = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  const rows = await prisma.bhavcopyDay.findMany({
    where,
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'asc' },
  });

  return rows.map((r) => r.date);
}

export async function computeAndCacheDhanRange(fromDate?: string, toDate?: string) {
  const dates = await getBhavDatesInRange(fromDate, toDate);
  if (dates.length === 0) {
    return {
      success: false as const,
      status: 404,
      body: { error: 'No bhavcopy dates found in the selected range' },
    };
  }

  const results = [];
  for (const date of dates) {
    results.push(await computeAndCacheDhanDate(date));
  }

  return {
    success: true as const,
    body: {
      success: true,
      mode: 'range',
      dates,
      processedDates: dates.length,
      computed: results.reduce((sum, r) => sum + r.computed, 0),
      failed: results.reduce((sum, r) => sum + r.failed, 0),
      errors: results.flatMap((r) => r.errors).slice(0, 50),
      results,
    },
  };
}

export async function computeAndCacheMissingDhanDates(fromDate?: string, toDate?: string) {
  const bhavDates = await getBhavDatesInRange(fromDate, toDate);
  if (bhavDates.length === 0) {
    return {
      success: false as const,
      status: 404,
      body: { error: 'No bhavcopy dates found for missing-date sync' },
    };
  }

  const dhanDates = await prisma
    .$queryRawUnsafe<{ date: string }[]>('SELECT DISTINCT date FROM dhan_daily_data ORDER BY date ASC')
    .then((rows) => rows.map((row) => row.date))
    .catch(() => [] as string[]);

  const cached = new Set(dhanDates);
  const missingDates = bhavDates.filter((date) => !cached.has(date));

  if (missingDates.length === 0) {
    return {
      success: true as const,
      body: {
        success: true,
        mode: 'missing',
        missingDates: [],
        processedDates: 0,
        computed: 0,
        failed: 0,
        errors: [],
      },
    };
  }

  const results = [];
  for (const date of missingDates) {
    results.push(await computeAndCacheDhanDate(date));
  }

  return {
    success: true as const,
    body: {
      success: true,
      mode: 'missing',
      missingDates,
      processedDates: missingDates.length,
      computed: results.reduce((sum, r) => sum + r.computed, 0),
      failed: results.reduce((sum, r) => sum + r.failed, 0),
      errors: results.flatMap((r) => r.errors).slice(0, 50),
      results,
    },
  };
}
