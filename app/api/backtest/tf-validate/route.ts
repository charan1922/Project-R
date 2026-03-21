import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { downloadAllTFData, TF_TRADES } from '@/lib/backtest/data-downloader';
import { runFullBacktest } from '@/lib/backtest/backtest-evaluator';
import { getRowCount } from '@/lib/backtest/duckdb-schema';

/**
 * POST /api/backtest/tf-validate
 *
 * Downloads 5-min data for all 20 TF trade stocks and runs backtest.
 * Body: { action: 'download' | 'status' | 'backtest' }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? 'status';

    if (action === 'download') {
      const logs: string[] = [];
      const result = await downloadAllTFData((msg) => {
        logs.push(msg);
        console.log(`[TF Backtest] ${msg}`);
      });

      return NextResponse.json({
        success: true,
        action: 'download',
        totalRows: result.total,
        errors: result.errors,
        logs,
      });
    }

    if (action === 'status') {
      const equityRows = await getRowCount('backtest_equity');
      const futuresRows = await getRowCount('backtest_futures');
      const optionsRows = await getRowCount('backtest_options');

      return NextResponse.json({
        success: true,
        action: 'status',
        data: {
          equityRows,
          futuresRows,
          optionsRows,
          totalRows: equityRows + futuresRows + optionsRows,
          trades: TF_TRADES.length,
          uniqueSymbols: [...new Set(TF_TRADES.map((t) => t.symbol))].length,
        },
      });
    }

    if (action === 'backtest') {
      console.log('[TF Backtest] Running full backtest...');
      const { results, summary } = await runFullBacktest();
      return NextResponse.json({
        success: true,
        action: 'backtest',
        results,
        summary,
      });
    }

    if (action === 'debug') {
      const { queryRows: qr } = await import('@/lib/backtest/duckdb-schema');
      const eqDates = await qr("SELECT DISTINCT symbol, date FROM backtest_equity WHERE symbol='NATIONALUM' ORDER BY date DESC LIMIT 5");
      const optDates = await qr("SELECT DISTINCT symbol, option_type, date FROM backtest_options WHERE symbol='NATIONALUM' ORDER BY date DESC LIMIT 5");
      const sample = await qr("SELECT symbol, date, timestamp, close FROM backtest_equity WHERE symbol='NATIONALUM' ORDER BY timestamp DESC LIMIT 3");
      return NextResponse.json({ success: true, eqDates, optDates, sample });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[TF Backtest] Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

/**
 * GET /api/backtest/tf-validate
 *
 * Returns current status of downloaded data.
 */
export async function GET() {
  try {
    const equityRows = await getRowCount('backtest_equity');
    const futuresRows = await getRowCount('backtest_futures');
    const optionsRows = await getRowCount('backtest_options');

    return NextResponse.json({
      success: true,
      data: {
        equityRows,
        futuresRows,
        optionsRows,
        totalRows: equityRows + futuresRows + optionsRows,
        hasData: equityRows > 0,
        trades: TF_TRADES,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
