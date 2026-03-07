import { NextRequest, NextResponse } from "next/server";
import { dhanAPI } from "@/lib/historify/dhan-client";
import { insertOHLC, getLastSync, logActivity, initDb } from "@/lib/historify/db";
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
                // Resolve securityId from master contracts — no hardcoding
                const entry = await resolveSymbol(symbol, exchange);
                if (!entry) {
                    results.push({ symbol, rows: 0, status: "failed", error: `Symbol not found in Dhan master contracts: ${exchange}:${symbol}` });
                    await logActivity(symbol, exchange, interval, "sync", 0, "failed");
                    continue;
                }

                // Incremental: prefer explicit payload dates, otherwise use lastSync or default
                const lastSync = await getLastSync(symbol, exchange, interval);
                const lastSyncDate = lastSync ? new Date((lastSync + 1) * 1000).toISOString().split("T")[0] : null;

                // For fromDate: Use payload if provided, else use lastSync (if exists), else use default
                const fromDate = payload.fromDate
                    ? payload.fromDate
                    : (lastSyncDate || "2020-01-01");

                // For toDate: Use payload if provided, else use today
                const toDate = payload.toDate
                    ? payload.toDate
                    : new Date().toISOString().split("T")[0];

                // Only skip if we are relying on lastSync and it's already caught up to the requested toDate
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
                    await insertOHLC(symbol, exchange, interval, data as any);
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
