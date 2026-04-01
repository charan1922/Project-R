import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tradefinder/trades
 * Reads tradefinder_platform_trades.json from disk (dynamic — no caching).
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'tradefinder_platform_trades.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return NextResponse.json({ success: true, data: parsed });
  } catch (e) {
    return NextResponse.json({ error: `Failed to read trades: ${(e as Error).message}` }, { status: 500 });
  }
}
