import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const SETTINGS_PATH = path.join(process.cwd(), "data", "historify-settings.json");

const DEFAULTS = {
    dhanClientId: process.env.DHAN_CLIENT_ID || "",
    dhanAccessToken: process.env.DHAN_ACCESS_TOKEN || "",
    batchSize: 10,
    rateLimitMs: 250,
    defaultRange: "30",
    theme: "dark",
    chartHeight: 450,
    autoRefresh: true,
    showTooltips: true,
};

function readSettings() {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
            return { ...DEFAULTS, ...JSON.parse(raw) };
        }
    } catch { }
    return { ...DEFAULTS };
}

export async function GET() {
    return NextResponse.json(readSettings());
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const current = readSettings();
        const merged = { ...current, ...body };
        const dir = path.dirname(SETTINGS_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2), "utf-8");
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}
