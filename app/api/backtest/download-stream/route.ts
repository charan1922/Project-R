import { downloadEquity5min, downloadFutures5min, downloadOption5min } from '@/lib/backtest/data-downloader';

export const dynamic = 'force-dynamic';

/**
 * POST /api/backtest/download-stream
 *
 * Streams download progress via SSE as symbols are downloaded.
 * Body: { symbols: { symbol, optionType, strike }[], fromDate, toDate }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const items = (body.symbols ?? []) as { symbol: string; optionType: string; strike: number; date: string }[];

  if (!items.length) {
    return new Response(JSON.stringify({ error: 'No symbols provided' }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let totalRows = 0;
      const errors: string[] = [];

      for (let i = 0; i < items.length; i++) {
        const { symbol, optionType, strike, date } = items[i];
        // 45 calendar days back ≈ 30 trading sessions
        const from = new Date(date);
        from.setDate(from.getDate() - 45);
        const fromDate = from.toISOString().slice(0, 10);
        const toDate = date;

        // Equity
        try {
          send({ type: 'progress', symbol, step: 'equity', symbolIndex: i, totalSymbols: items.length });
          const result = await downloadEquity5min(symbol, fromDate, toDate);
          if (result.error) throw new Error(result.error);
          totalRows += result.rows;
          send({
            type: 'step-done',
            symbol,
            step: 'equity',
            rows: result.rows,
            symbolIndex: i,
            totalSymbols: items.length,
          });
        } catch (e) {
          const msg = `${symbol} equity: ${(e as Error).message}`;
          errors.push(msg);
          send({ type: 'error', symbol, step: 'equity', message: msg });
        }

        // Futures
        try {
          send({ type: 'progress', symbol, step: 'futures', symbolIndex: i, totalSymbols: items.length });
          const result = await downloadFutures5min(symbol, fromDate, toDate);
          if (result.error) throw new Error(result.error);
          totalRows += result.rows;
          send({
            type: 'step-done',
            symbol,
            step: 'futures',
            rows: result.rows,
            symbolIndex: i,
            totalSymbols: items.length,
          });
        } catch (e) {
          const msg = `${symbol} futures: ${(e as Error).message}`;
          errors.push(msg);
          send({ type: 'error', symbol, step: 'futures', message: msg });
        }

        // Options (if strike > 0)
        if (strike > 0) {
          try {
            send({ type: 'progress', symbol, step: 'options', symbolIndex: i, totalSymbols: items.length });
            const result = await downloadOption5min(symbol, optionType as 'CE' | 'PE', strike, fromDate, toDate);
            if (result.error) throw new Error(result.error);
            totalRows += result.rows;
            send({
              type: 'step-done',
              symbol,
              step: 'options',
              rows: result.rows,
              symbolIndex: i,
              totalSymbols: items.length,
            });
          } catch (e) {
            const msg = `${symbol} ${optionType} ${strike}: ${(e as Error).message}`;
            errors.push(msg);
            send({ type: 'error', symbol, step: 'options', message: msg });
          }
        }

        send({ type: 'symbol-done', symbol, symbolIndex: i, totalSymbols: items.length, totalRows });
      }

      send({ type: 'complete', totalRows, errorCount: errors.length, errors: errors.slice(0, 20) });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
