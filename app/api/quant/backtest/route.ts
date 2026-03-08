import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            strategy = "ema_crossover",
            symbol = "SBIN",
            interval = "Daily",
            startDate,
            endDate,
            initialCash = 1_000_000,
            allocation = 0.75,
            params = {},
        } = body;

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: "startDate and endDate are required" },
                { status: 400 }
            );
        }

        const { runBacktest } = await import("@/lib/quant/backtest-engine");

        const result = await runBacktest({
            strategy,
            symbol,
            interval,
            startDate,
            endDate,
            initialCash,
            allocation,
            params,
        });

        return NextResponse.json(result);
    } catch (err: any) {
        console.error("Backtest API error:", err);
        return NextResponse.json(
            { error: err.message || "Backtest failed" },
            { status: 500 }
        );
    }
}
