import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function calculateEma(data: number[], period: number) {
    if (data.length === 0) return [];
    const k = 2 / (period + 1);
    const result = [data[0]];
    for (let i = 1; i < data.length; i++) result.push(data[i] * k + result[i - 1] * (1 - k));
    return result;
}

/** 14-period Wilder RSI (same smoothing as TradingView default) */
function calculateRsi(closes: number[], period = 14): number[] {
    const rsi: number[] = new Array(period).fill(NaN);
    if (closes.length <= period) return rsi;

    // Initial average gain/loss over first `period` bars
    let avgGain = 0, avgLoss = 0;
    for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) avgGain += diff; else avgLoss += Math.abs(diff);
    }
    avgGain /= period;
    avgLoss /= period;

    const firstRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + firstRs));

    // Wilder smoothing for remaining bars
    for (let i = period + 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        const gain = diff >= 0 ? diff : 0;
        const loss = diff < 0 ? Math.abs(diff) : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + rs));
    }
    return rsi;
}

export async function GET(request: NextRequest) {
    const sp = request.nextUrl.searchParams;
    const symbol = sp.get("symbol");
    const exchange = sp.get("exchange") || "NSE";
    const interval = sp.get("interval") || "Daily";

    if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

    try {
        const { getChartData, initDb } = await import("@/lib/historify/db");
        await initDb();
        const ohlc = await getChartData(symbol, exchange, interval, 500);

        if (ohlc.length === 0) {
            return NextResponse.json({ candles: [], indicators: { ema20: [], ema50: [], rsi: [] } });
        }

        const closes = ohlc.map(c => c.close);
        const ema20 = calculateEma(closes, 20);
        const ema50 = calculateEma(closes, 50);
        const rsiValues = calculateRsi(closes, 14);

        return NextResponse.json({
            candles: ohlc,
            indicators: {
                ema20: ohlc.map((c, i) => ({ time: c.time, value: +ema20[i].toFixed(2) })),
                ema50: ohlc.map((c, i) => ({ time: c.time, value: +ema50[i].toFixed(2) })),
                rsi: ohlc
                    .map((c, i) => ({ time: c.time, value: rsiValues[i] }))
                    .filter(r => !isNaN(r.value))
                    .map(r => ({ ...r, value: +r.value.toFixed(2) })),
            },
        });
    } catch {
        return NextResponse.json({ candles: [], indicators: { ema20: [], ema50: [], rsi: [] } });
    }
}
