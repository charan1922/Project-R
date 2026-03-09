import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Calculate VWAP for a sequence of candles (cumulative intraday) */
function calcVwap(candles: { high: number; low: number; close: number; volume: number; time: string }[]) {
    let cumPV = 0, cumVol = 0;
    return candles.map(c => {
        const typical = (c.high + c.low + c.close) / 3;
        cumPV += typical * c.volume;
        cumVol += c.volume;
        return { time: c.time, value: cumVol > 0 ? +(cumPV / cumVol).toFixed(2) : typical };
    });
}

function calculateEma(data: number[], period: number) {
    if (data.length === 0) return [];
    const k = 2 / (period + 1);
    const result = [data[0]];
    for (let i = 1; i < data.length; i++) result.push(data[i] * k + result[i - 1] * (1 - k));
    return result;
}

function calculateRsi(closes: number[], period = 14): number[] {
    const rsi: number[] = new Array(period).fill(NaN);
    if (closes.length <= period) return rsi;

    let avgGain = 0, avgLoss = 0;
    for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) avgGain += diff; else avgLoss += Math.abs(diff);
    }
    avgGain /= period;
    avgLoss /= period;

    const firstRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + firstRs));

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
    const interval = sp.get("interval") || "5min";
    const date = sp.get("date"); // YYYY-MM-DD

    if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
    if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

    try {
        const fs = await import("fs");
        const { getDuckDb, getParquetPath } = await import("@/lib/historify/duckdb");

        const parquetPath = getParquetPath(symbol);
        if (!fs.existsSync(parquetPath)) {
            return NextResponse.json({ candles: [], indicators: { vwap: [], ema20: [], ema50: [], rsi: [] } });
        }

        const duckDb = await getDuckDb();
        const conn = await duckDb.connect();

        // DuckDB SQL to fetch candles for a specific local date
        // 'epoch' timestamp needs timezone adjustment since Dhan is IST
        const query = `
            SELECT timestamp as ts, open, high, low, close, volume 
            FROM read_parquet('${parquetPath}')
            WHERE interval = '${interval}'
              AND strftime(epoch_ms(timestamp * 1000) AT TIME ZONE 'Asia/Kolkata', '%Y-%m-%d') = '${date}'
            ORDER BY timestamp ASC
        `;

        const res = await conn.run(query);
        const rows = await res.getRows();

        if (rows.length === 0) {
            return NextResponse.json({ candles: [], indicators: { vwap: [], ema20: [], ema50: [], rsi: [] } });
        }

        // Map DuckDB Row Data
        const candles = rows.map((r: any) => ({
            time: new Date(Number(r[0]) * 1000).toISOString(),
            timestamp: Number(r[0]),
            open: Number(r[1]),
            high: Number(r[2]),
            low: Number(r[3]),
            close: Number(r[4]),
            volume: Number(r[5]),
        }));

        const closes = candles.map(c => c.close);
        const vwap = calcVwap(candles);

        // Calculate other indicators (filter out NaN warmups)
        const e20Raw = calculateEma(closes, 20);
        const e50Raw = calculateEma(closes, 50);
        const rsiRaw = calculateRsi(closes, 14);

        const ema20 = e20Raw.map((v, i) => ({ time: candles[i].time, value: v })).filter(v => !isNaN(v.value));
        const ema50 = e50Raw.map((v, i) => ({ time: candles[i].time, value: v })).filter(v => !isNaN(v.value));
        const rsi = rsiRaw.map((v, i) => ({ time: candles[i].time, value: v })).filter(v => !isNaN(v.value));

        return NextResponse.json({
            candles,
            indicators: { vwap, ema20, ema50, rsi }
        });
    } catch (err) {
        console.error("day-chart error:", err);
        return NextResponse.json({ candles: [], indicators: { vwap: [], ema20: [], ema50: [], rsi: [] } });
    }
}
