/**
 * Historify Export API — Streams CSV data from SQLite
 * GET /api/historify/export?symbols=SBIN,RELIANCE&interval=Daily&preset=Last+1+Year&format=csv
 */
import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

function getDateRange(preset: string): { startTs: number; endTs: number } {
    const now = Math.floor(Date.now() / 1000);
    const day = 86400;
    switch (preset) {
        case "Last 7 Days": return { startTs: now - 7 * day, endTs: now };
        case "Last 30 Days": return { startTs: now - 30 * day, endTs: now };
        case "Last 90 Days": return { startTs: now - 90 * day, endTs: now };
        case "Year to Date": {
            const jan1 = new Date(new Date().getFullYear(), 0, 1).getTime() / 1000;
            return { startTs: Math.floor(jan1), endTs: now };
        }
        case "Last 1 Year": return { startTs: now - 365 * day, endTs: now };
        case "All Time":
        default: return { startTs: 0, endTs: now };
    }
}

function toIST(ts: number): string {
    return new Date(ts * 1000).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

export async function GET(req: NextRequest) {
    try {
        const dbPath = path.join(process.cwd(), "data", "historify.db");
        const db = new Database(dbPath, { readonly: true });
        const url = new URL(req.url);

        const symbolsParam = url.searchParams.get("symbols") || "";
        const interval = url.searchParams.get("interval") || "Daily";
        const preset = url.searchParams.get("preset") || "Last 1 Year";
        const format = url.searchParams.get("format") || "csv";

        const symbols = symbolsParam.split(",").map(s => s.trim()).filter(Boolean);
        if (symbols.length === 0) {
            return NextResponse.json({ error: "No symbols provided" }, { status: 400 });
        }

        const { startTs, endTs } = getDateRange(preset);

        // Build CSV content
        const header = "Symbol,Exchange,Interval,Timestamp,DateTime_IST,Open,High,Low,Close,Volume\n";
        let csvBody = "";

        const placeholders = symbols.map(() => "?").join(",");
        const query = `
            SELECT symbol, exchange, interval, timestamp, open, high, low, close, volume
            FROM historical_data
            WHERE symbol IN (${placeholders}) AND exchange = ? AND interval = ?
              AND timestamp >= ? AND timestamp <= ?
            ORDER BY symbol ASC, timestamp ASC
        `;

        const rows = db.prepare(query).all(...symbols, 'NSE', interval, startTs, endTs) as any[];
        db.close();

        for (const r of rows) {
            csvBody += `${r.symbol},${r.exchange},${r.interval},${r.timestamp},"${toIST(r.timestamp)}",${r.open},${r.high},${r.low},${r.close},${r.volume}\n`;
        }

        if (rows.length === 0) {
            return NextResponse.json({
                error: "No data found for the given symbols, interval, and date range",
                symbols,
                interval,
                preset,
                dateRange: { start: new Date(startTs * 1000).toISOString(), end: new Date(endTs * 1000).toISOString() },
            }, { status: 404 });
        }

        const csv = header + csvBody;

        // Determine filename
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = symbols.length === 1
            ? `${symbols[0]}_${interval}_${dateStr}.csv`
            : `historify_export_${symbols.length}symbols_${interval}_${dateStr}.csv`;

        return new NextResponse(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "X-Row-Count": String(rows.length),
            },
        });
    } catch (err: any) {
        console.error("Export error:", err);
        return NextResponse.json({ error: err.message || "Export failed" }, { status: 500 });
    }
}
