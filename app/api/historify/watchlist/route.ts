import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { getWatchlist, initDb } = await import("@/lib/historify/db");
        await initDb();
        return NextResponse.json(await getWatchlist());
    } catch {
        return NextResponse.json([]);
    }
}

export async function POST(request: NextRequest) {
    try {
        const { symbol, exchange = "NSE", segment = "EQ", securityId } = await request.json();
        if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
        const { addToWatchlist, getWatchlist, initDb } = await import("@/lib/historify/db");
        await initDb();
        await addToWatchlist(symbol, exchange, segment, securityId);
        return NextResponse.json(await getWatchlist());
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { symbol, exchange = "NSE" } = await request.json();
        if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
        const { removeFromWatchlist, getWatchlist, initDb } = await import("@/lib/historify/db");
        await initDb();
        await removeFromWatchlist(symbol, exchange);
        return NextResponse.json(await getWatchlist());
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
