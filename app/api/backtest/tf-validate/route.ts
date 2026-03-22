import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { getTradeDetail, runFullBacktest, simulateTrade } from '@/lib/backtest/backtest-evaluator';
import { downloadAllTFData, downloadSymbols, loadAllTFTrades, TF_TRADES } from '@/lib/backtest/data-downloader';
import { getOptionDatePairs, getRowCount, getSymbolDatePairs } from '@/lib/backtest/duckdb-schema';

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

    if (action === 'all-tf-trades') {
      // Load ALL trades from tradefinder_platform_trades.json
      const allTF = await loadAllTFTrades();
      // Check which symbols are already downloaded
      const downloadedSymbols = new Set<string>();
      for (const sym of allTF.symbols) {
        const count = await getRowCount('backtest_equity', sym);
        if (count > 0) downloadedSymbols.add(sym);
      }
      return NextResponse.json({
        success: true,
        totalTrades: allTF.trades.length,
        totalSymbols: allTF.symbols.length,
        downloadedSymbols: downloadedSymbols.size,
        missingSymbols: allTF.symbols.filter((s) => !downloadedSymbols.has(s)).length,
        dateRange: allTF.dateRange,
        symbols: allTF.symbols.map((s) => ({
          symbol: s,
          downloaded: downloadedSymbols.has(s),
          trades: allTF.trades.filter((t) => t.symbol === s).length,
        })),
      });
    }

    if (action === 'symbol-status') {
      const allTF = await loadAllTFTrades();
      // Batch check: which (symbol,date) pairs have data?
      const [eqPairs, futPairs, optPairs] = await Promise.all([
        getSymbolDatePairs('backtest_equity'),
        getSymbolDatePairs('backtest_futures'),
        getOptionDatePairs(),
      ]);
      let readyCount = 0;
      let partialCount = 0;
      let missingCount = 0;
      const trades = allTF.trades.map((t) => {
        const hasEquity = eqPairs.has(`${t.symbol}|${t.date}`);
        const hasFutures = futPairs.has(`${t.symbol}|${t.date}`);
        const hasOptions = t.strike > 0 ? optPairs.has(`${t.symbol}|${t.optionType}|${t.strike}|${t.date}`) : true;
        const status =
          hasEquity && hasFutures && hasOptions ? 'ready' : hasEquity || hasFutures ? 'partial' : 'missing';
        if (status === 'ready') readyCount++;
        else if (status === 'partial') partialCount++;
        else missingCount++;
        return {
          symbol: t.symbol,
          date: t.date,
          optionType: t.optionType,
          strike: t.strike,
          pnl: t.pnl,
          verified: !!(t.entryPrice && t.exitPrice),
          entryTime: t.entryTime,
          entryPrice: t.entryPrice,
          exitTime: t.exitTime,
          exitPrice: t.exitPrice,
          hasEquity,
          hasFutures,
          hasOptions,
          status,
        };
      });
      return NextResponse.json({
        success: true,
        trades,
        summary: { totalTrades: trades.length, readyCount, partialCount, missingCount, dateRange: allTF.dateRange },
      });
    }

    if (action === 'download-symbols') {
      // Download specific symbols: { symbols: string[], fromDate, toDate, options?: [...] }
      const symbols = body.symbols as string[];
      const fromDate = body.fromDate ?? '2024-12-01';
      const toDate = body.toDate ?? '2026-03-22';
      const options = body.options ?? [];
      if (!symbols || symbols.length === 0) {
        return NextResponse.json({ success: false, error: 'No symbols provided' }, { status: 400 });
      }
      const logs: string[] = [];
      const result = await downloadSymbols(symbols, fromDate, toDate, options, (msg) => {
        logs.push(msg);
        console.log(`[TF Download] ${msg}`);
      });
      return NextResponse.json({ success: true, ...result, logs });
    }

    if (action === 'download-all-tf') {
      // Download ALL 158 TF symbols (equity + futures)
      const allTF = await loadAllTFTrades();
      // Filter out already downloaded
      const downloadedSymbols = new Set<string>();
      for (const sym of allTF.symbols) {
        const count = await getRowCount('backtest_equity', sym);
        if (count > 0) downloadedSymbols.add(sym);
      }
      const missing = allTF.symbols.filter((s) => !downloadedSymbols.has(s));
      if (missing.length === 0) {
        return NextResponse.json({ success: true, message: 'All symbols already downloaded', totalRows: 0 });
      }

      // Build options list from trades
      const optionsList = allTF.trades
        .filter((t) => t.strike > 0 && missing.includes(t.symbol))
        .map((t) => ({ symbol: t.symbol, optionType: t.optionType, strike: t.strike }));
      // Dedupe — one option per symbol
      const optionsMap = new Map<string, (typeof optionsList)[0]>();
      for (const o of optionsList) {
        if (!optionsMap.has(o.symbol)) optionsMap.set(o.symbol, o);
      }

      const logs: string[] = [];
      const result = await downloadSymbols(
        missing,
        allTF.dateRange.from,
        allTF.dateRange.to,
        Array.from(optionsMap.values()),
        (msg) => {
          logs.push(msg);
          console.log(`[TF Download] ${msg}`);
        },
      );
      return NextResponse.json({ success: true, downloaded: missing.length, ...result, logs });
    }

    if (action === 'trade-detail') {
      const detail = await getTradeDetail({
        symbol: body.symbol,
        date: body.date,
        optionType: body.optionType,
        strike: body.strike,
        spotPrice: body.spotPrice,
        tfPnl: body.tfPnl,
        tfExpiry: body.tfExpiry,
        tfEntryTime: body.entryTime,
        tfEntryPrice: body.entryPrice,
        tfExitTime: body.exitTime,
        tfExitPrice: body.exitPrice,
        tfQuantity: body.quantity,
      });
      return NextResponse.json({ success: true, detail });
    }

    if (action === 'simulate') {
      const result = await simulateTrade({
        symbol: body.symbol,
        date: body.date,
        optionType: body.optionType,
        strike: body.strike,
        entryTimestamp: body.entryTimestamp,
        exitTimestamp: body.exitTimestamp,
        tfPnl: body.tfPnl,
      });
      return NextResponse.json({ success: true, result });
    }

    if (action === 'tf-trades-list') {
      const allTF = await loadAllTFTrades();
      // Check data availability per trade (quick count)
      const tradesWithStatus = await Promise.all(
        allTF.trades.slice(0, 100).map(async (t) => {
          const count = await getRowCount('backtest_options', t.symbol);
          return { ...t, hasData: count > 0 };
        }),
      );
      return NextResponse.json({ success: true, trades: tradesWithStatus, total: allTF.trades.length });
    }

    if (action === 'debug') {
      const { queryRows: qr } = await import('@/lib/backtest/duckdb-schema');
      const eqDates = await qr(
        "SELECT DISTINCT symbol, date FROM backtest_equity WHERE symbol='NATIONALUM' ORDER BY date DESC LIMIT 5",
      );
      const optDates = await qr(
        "SELECT DISTINCT symbol, option_type, date FROM backtest_options WHERE symbol='NATIONALUM' ORDER BY date DESC LIMIT 5",
      );
      const sample = await qr(
        "SELECT symbol, date, timestamp, close FROM backtest_equity WHERE symbol='NATIONALUM' ORDER BY timestamp DESC LIMIT 3",
      );
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
