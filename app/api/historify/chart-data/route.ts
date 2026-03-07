import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function calculateEma(data: number[], period: number) {
    if (data.length === 0) return [];
    const k = 2 / (period + 1);
    const result = [data[0]];
    for (let i = 1; i < data.length; i++) result.push(data[i] * k + result[i - 1] * (1 - k));
    return result;
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
            return NextResponse.json({ candles: [], indicators: { ema20: [], ema50: [] } });
        }

        const closes = ohlc.map(c => c.close);
        const ema20 = calculateEma(closes, 20);
        const ema50 = calculateEma(closes, 50);

        return NextResponse.json({
            candles: ohlc,
            indicators: {
                ema20: ohlc.map((c, i) => ({ time: c.time, value: +ema20[i].toFixed(2) })),
                ema50: ohlc.map((c, i) => ({ time: c.time, value: +ema50[i].toFixed(2) })),
            },
        });
    } catch (err) {
        return NextResponse.json({ candles: [], indicators: { ema20: [], ema50: [] } });
    }
}
