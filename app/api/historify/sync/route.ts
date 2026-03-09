import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { dhanAPI } from "@/lib/historify/dhan-client";
import { logActivity, initDb } from "@/lib/historify/db";
import { getDuckDb, getParquetPath } from "@/lib/historify/duckdb";
import { resolveSymbol } from "@/lib/historify/master-contracts";
import { ExchangeSegment } from "../../../../dhanv2/src/types";

export const dynamic = "force-dynamic";

const INTERVAL_MAP: Record<string, number> = {
    "1min": 1,
    "3min": 3,
    "5min": 5,
    "15min": 15,
    "25min": 25,
    "60min": 60,
    "1hour": 60,
};

const EXCHANGE_SEGMENT_MAP: Record<string, ExchangeSegment> = {
    NSE: ExchangeSegment.NSE_EQ,
    BSE: ExchangeSegment.BSE_EQ,
};

export async function POST(request: NextRequest) {
    try {
        await initDb();
        const payload = await request.json();

        // Accept either a single {symbol, exchange, interval} or a batch {symbols: [...], interval}
        const isBatch = Array.isArray(payload.symbols);
        const targets = isBatch
            ? payload.symbols.map((s: any) => ({ symbol: s.symbol || s, exchange: s.exchange || payload.exchange || "NSE", interval: payload.interval || "Daily" }))
            : [{ symbol: payload.symbol, exchange: payload.exchange || "NSE", interval: payload.interval || "Daily" }];

        const results: { symbol: string; rows: number; status: string; error?: string }[] = [];

        for (const target of targets) {
            const { symbol, exchange, interval } = target;

            try {
                // Resolve securityId from master contracts
                const entry = await resolveSymbol(symbol, exchange);
                if (!entry) {
                    await logActivity(symbol, exchange, interval, "sync", 0, "failed");
                    results.push({ symbol, rows: 0, status: "failed", error: "Symbol not found in master contracts" });
                    continue;
                }

                // Check for existing Parquet file to determine lastSyncDate
                const parquetPath = getParquetPath(symbol);
                const duckDb = await getDuckDb();
                let lastSyncDate: string | null = null;

                if (fs.existsSync(parquetPath)) {
                    // Fast columnar query to find the absolute max timestamp in the file
                    const c = await duckDb.connect();
                    const res = await c.run(`SELECT MAX(timestamp) as max_ts FROM read_parquet('${parquetPath}') WHERE interval = '${interval}'`);
                    const rows = await res.getRows();
                    if (rows.length > 0 && rows[0][0]) {
                        // Add 1 second to avoid overlapping candles if necessary
                        lastSyncDate = new Date((Number(rows[0][0]) + 1) * 1000).toISOString().split("T")[0];
                    }
                }

                const fromDate = payload.fromDate ? payload.fromDate : (lastSyncDate || "2020-01-01");
                const toDate = payload.toDate ? payload.toDate : new Date().toISOString().split("T")[0];

                if (!payload.fromDate && fromDate > toDate) {
                    results.push({ symbol, rows: 0, status: "up_to_date" });
                    continue;
                }

                const baseReq = {
                    securityId: entry.securityId,
                    exchangeSegment: EXCHANGE_SEGMENT_MAP[exchange] ?? ExchangeSegment.NSE_EQ,
                    instrument: "EQUITY" as any,
                    fromDate,
                    toDate,
                };

                let data;
                if (interval === "Daily") {
                    data = await dhanAPI.fetchDaily(baseReq);
                } else {
                    const intValue = INTERVAL_MAP[interval] ?? 5;
                    data = await dhanAPI.fetchIntradayChunked({ ...baseReq, interval: intValue as any });
                }

                const rows = data?.timestamp?.length ?? 0;
                if (rows > 0) {
                    // Structure data for DuckDB JSON ingestion
                    const insertRows = data!.timestamp.map((ts: number, i: number) => ({
                        symbol, exchange, interval, timestamp: ts,
                        open: data!.open[i], high: data!.high[i], low: data!.low[i], close: data!.close[i], volume: data!.volume[i]
                    }));

                    const conn = await duckDb.connect();
                    const tempJsonPath = path.join(process.cwd(), 'data', `temp_sync_${symbol}.json`);

                    try {
                        fs.writeFileSync(tempJsonPath, JSON.stringify(insertRows));

                        if (fs.existsSync(parquetPath)) {
                            // Append to existing file
                            await conn.run(`
                                CREATE TEMP TABLE IF NOT EXISTS temp_sync AS SELECT * FROM read_parquet('${parquetPath}');
                                INSERT INTO temp_sync SELECT * FROM read_json_auto('${tempJsonPath}');
                                COPY (SELECT DISTINCT * FROM temp_sync ORDER BY timestamp ASC) TO '${parquetPath}' (FORMAT PARQUET);
                                DROP TABLE temp_sync;
                            `);
                        } else {
                            // Create brand new Parquet file
                            await conn.run(`COPY (SELECT * FROM read_json_auto('${tempJsonPath}') ORDER BY timestamp ASC) TO '${parquetPath}' (FORMAT PARQUET)`);
                        }
                    } finally {
                        if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
                    }
                }

                await logActivity(symbol, exchange, interval, "sync", rows, "success");
                results.push({ symbol, rows, status: "success" });

            } catch (err) {
                const msg = String(err);
                console.error(`[Sync] ${exchange}:${symbol} failed:`, err);
                await logActivity(symbol, exchange, interval, "sync", 0, "failed");
                results.push({ symbol, rows: 0, status: "failed", error: msg });
            }
        }

        const totalRows = results.reduce((s, r) => s + r.rows, 0);
        return NextResponse.json({ results, totalRows });

    } catch (err) {
        console.error("[Sync] Unexpected error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
