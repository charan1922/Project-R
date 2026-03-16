import { type NextRequest, NextResponse } from 'next/server';
import { syncBhavcopy } from '@/lib/r-factor/bhavcopy-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(Number.parseInt(searchParams.get('days') || '25', 10), 60);

    console.log(`[API] Syncing bhavcopy for ${days} days...`);
    const result = await syncBhavcopy(days);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Bhavcopy Sync Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
