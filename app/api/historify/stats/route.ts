import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { getStats, initDb } = await import("@/lib/historify/db");
        await initDb();
        const stats = await getStats();
        return NextResponse.json(stats);
    } catch (err) {
        // DB not ready yet — return zero stats
        return NextResponse.json({
            watchlistCount: 0,
            totalCandles: 0,
            lastSyncTs: null,
            storageMb: 0,
        });
    }
}
