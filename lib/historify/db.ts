import { prisma } from "@/lib/db";

// ── Init ────────────────────────────────────────────────────────────────────

export async function initDb() {
    // Prisma handles schema via migrations — nothing to init at runtime
}

// ── Watchlist ────────────────────────────────────────────────────────────────

export async function getWatchlist() {
    const entries = await prisma.watchlist.findMany({
        orderBy: { addedAt: "desc" },
    });
    return entries.map(r => ({
        symbol: r.symbol,
        exchange: r.exchange,
        segment: r.segment,
        securityId: r.securityId,
        lastSyncTs: null,
        candleCount: 0,
        status: "synced",
    }));
}

export async function addToWatchlist(symbol: string, exchange = "NSE", segment = "EQ", securityId?: string) {
    const normalized = symbol.toUpperCase().trim();
    await prisma.watchlist.upsert({
        where: { symbol_exchange: { symbol: normalized, exchange } },
        update: {},
        create: {
            symbol: normalized,
            exchange,
            segment,
            securityId: securityId || null,
        },
    });
}

export async function removeFromWatchlist(symbol: string, exchange = "NSE") {
    await prisma.watchlist.deleteMany({
        where: { symbol, exchange },
    });
}

// ── Stats ────────────────────────────────────────────────────────────────────

export async function getStats() {
    const watchlistCount = await prisma.watchlist.count();
    return {
        watchlistCount,
        totalCandles: 0,
        lastSyncTs: null,
        storageMb: 0,
    };
}

// ── Activity Log ─────────────────────────────────────────────────────────────

export async function logActivity(symbol: string, exchange: string, interval: string, action: string, rowsCount: number, status: "success" | "failed" | "skipped") {
    await prisma.activity.create({
        data: { symbol, exchange, interval, action, rowsCount, status },
    });

    // Keep last 500 entries max
    const count = await prisma.activity.count();
    if (count > 500) {
        const oldest = await prisma.activity.findMany({
            orderBy: { createdAt: "asc" },
            take: count - 500,
            select: { id: true },
        });
        await prisma.activity.deleteMany({
            where: { id: { in: oldest.map(e => e.id) } },
        });
    }
}

export async function getActivity(limit = 20) {
    return prisma.activity.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
    });
}
