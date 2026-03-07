import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { getActivity, initDb } = await import("@/lib/historify/db");
        await initDb();
        return NextResponse.json(await getActivity(20));
    } catch {
        return NextResponse.json([]);
    }
}
