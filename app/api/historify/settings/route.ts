import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const DEFAULTS = {
    dhanClientId: env.DHAN_CLIENT_ID ?? "",
    dhanAccessToken: "(auto-managed)",
    batchSize: 10,
    rateLimitMs: 250,
    defaultRange: "30",
    theme: "dark",
    chartHeight: 450,
    autoRefresh: true,
    showTooltips: true,
};

export async function GET() {
    const row = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!row) return NextResponse.json(DEFAULTS);
    return NextResponse.json({ ...DEFAULTS, ...row });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        await prisma.settings.upsert({
            where: { id: 1 },
            update: body,
            create: { id: 1, ...body },
        });
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}
