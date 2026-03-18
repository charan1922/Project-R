import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { fetchFullOptionChain } from '@/lib/dhan/option-chain-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();
    const expiry = searchParams.get('expiry') || undefined;

    if (!symbol) {
      return NextResponse.json({ success: false, error: 'Provide ?symbol=RELIANCE' }, { status: 400 });
    }

    const data = await fetchFullOptionChain(symbol, expiry);
    if (!data) {
      return NextResponse.json(
        { success: false, error: `Could not fetch option chain for ${symbol}` },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('[option-chain] Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
