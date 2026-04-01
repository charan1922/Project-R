import { NextResponse } from 'next/server';
import { searchSymbols } from '@/lib/historify/master-contracts';
import {
  DhanDateUnavailableError,
  DhanNonTradingDayError,
  type DhanStockDownloadMeta,
  type DhanStockDownloadRow,
  getDhanSymbolDailyRange,
  getLatestDhanHistoricalDate,
  saveDhanStockDownloadToDb,
} from '@/lib/r-factor/dhan-daily-service';

export const dynamic = 'force-dynamic';

import fs from 'node:fs';
import path from 'node:path';

function getFnoSymbols(): Set<string> {
  try {
    const filePath = path.join(process.cwd(), 'lib', 'data', 'fno_stocks_list.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return new Set<string>((json.stocks as string[]).map((s) => s.toUpperCase()));
  } catch {
    return new Set<string>();
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim();

    if (!query) {
      return NextResponse.json({ success: true, suggestions: [] });
    }

    const fnoSymbols = getFnoSymbols();
    const suggestions = await searchSymbols(query, 'NSE');
    const filtered =
      fnoSymbols.size > 0 ? suggestions.filter((entry) => fnoSymbols.has(entry.symbol.toUpperCase())) : suggestions;

    return NextResponse.json({
      success: true,
      suggestions: filtered.map((entry) => ({
        symbol: entry.symbol,
        exchange: entry.exchange,
        segment: entry.segment,
        securityId: entry.securityId,
        name: entry.name,
      })),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action?: 'fetch' | 'save';
      symbol?: string;
      fromDate?: string;
      toDate?: string;
      meta?: DhanStockDownloadMeta;
      rows?: DhanStockDownloadRow[];
    };

    if (body.action === 'save') {
      if (!body.meta || !body.rows?.length) {
        return NextResponse.json(
          { success: false, error: 'Provide meta and rows to save the preview.' },
          { status: 400 },
        );
      }

      const result = await saveDhanStockDownloadToDb(body.meta, body.rows);
      return NextResponse.json({ success: true, saved: result.saved });
    }

    const symbol = body.symbol?.trim().toUpperCase();
    const fromDate = body.fromDate?.trim();
    const toDate = body.toDate?.trim() ?? fromDate;

    if (!symbol || !fromDate || !toDate) {
      return NextResponse.json(
        { success: false, error: 'Provide symbol, fromDate, and toDate (or a single fromDate)' },
        { status: 400 },
      );
    }

    const { latestDate, probeSymbol } = await getLatestDhanHistoricalDate();
    if (latestDate && toDate > latestDate) {
      throw new DhanDateUnavailableError(toDate, latestDate, probeSymbol);
    }

    const result = await getDhanSymbolDailyRange(symbol, fromDate, toDate);
    return NextResponse.json({
      success: true,
      meta: {
        ...result.meta,
        source: {
          equity: '/v2/charts/historical',
          futures: '/v2/charts/historical',
          options: '/v2/charts/rollingoption',
          note: 'Futures contract is resolved per trading day using the nearest active expiry in the requested range.',
        },
      },
      data: result.rows.map((row) => ({
        date: row.date,
        symbol: result.meta.symbol,
        futuresContractSymbol: row.futuresContractSymbol,
        futuresSecurityId: row.futuresSecurityId,
        futuresExpiryDate: row.futuresExpiryDate,
        lotSize: row.lotSize,
        eqHigh: row.data.eq_high,
        eqLow: row.data.eq_low,
        eqClose: row.data.eq_close,
        eqVolume: row.data.eq_volume,
        eqTurnover: row.data.eq_turnover,
        futVolume: row.data.fut_volume,
        futOi: row.data.fut_oi,
        futOiChange: row.data.fut_oi_change,
        futTurnover: row.data.fut_turnover,
        optVolume: row.data.opt_volume,
        optOi: row.data.opt_oi,
        optTurnover: row.data.opt_turnover,
        ceVolume: row.data.ce_volume,
        peVolume: row.data.pe_volume,
      })),
    });
  } catch (error) {
    if (error instanceof DhanDateUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          code: 'DHAN_DATE_UNAVAILABLE',
          error: error.message,
          requestedDate: error.requestedDate,
          latestAvailableDate: error.latestAvailableDate,
          probeSymbol: error.probeSymbol,
        },
        { status: 409 },
      );
    }
    if (error instanceof DhanNonTradingDayError) {
      return NextResponse.json(
        {
          success: false,
          code: 'DHAN_NON_TRADING_DAY',
          error: error.message,
          symbol: error.symbol,
          requestedDate: error.requestedDate,
          previousTradingDate: error.previousTradingDate,
          nextTradingDate: error.nextTradingDate,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
