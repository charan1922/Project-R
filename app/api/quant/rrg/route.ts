import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const sp = request.nextUrl.searchParams;
    const benchmark = sp.get("benchmark") || "NIFTY";
    const tail = parseInt(sp.get("tail") || "8", 10);

    try {
        const { computeFullRRG } = await import("@/lib/quant/rrg-engine");
        const result = await computeFullRRG(benchmark, tail);
        return NextResponse.json(result);
    } catch (err: any) {
        console.error("RRG API error:", err);
        return NextResponse.json(
            { error: err.message || "Failed to compute RRG" },
            { status: 500 }
        );
    }
}
