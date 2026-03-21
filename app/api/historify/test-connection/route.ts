import { NextResponse } from 'next/server';
import { getDhanAccessToken, hasDhanAuth } from '@/lib/dhan/auth';
import { dhanMarketFeed } from '@/lib/dhan/market-feed';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

function maskId(id: string): string {
  if (id.length <= 4) return '••••';
  return `${id.slice(0, 4)}••••${id.slice(-2)}`;
}

export async function GET() {
  const hasAuth = hasDhanAuth();
  const hasTOTP = !!(env.DHAN_CLIENT_ID && process.env.DHAN_PIN && process.env.DHAN_TOTP_SECRET);
  const hasStatic = !!(env.DHAN_CLIENT_ID && process.env.DHAN_ACCESS_TOKEN);

  const method = hasTOTP ? 'totp' : hasStatic ? 'static' : 'none';
  const clientId = env.DHAN_CLIENT_ID ? maskId(env.DHAN_CLIENT_ID) : null;

  if (!hasAuth) {
    return NextResponse.json({
      ok: false,
      method,
      clientId,
      error: 'No Dhan credentials configured. Set DHAN_PIN + DHAN_TOTP_SECRET, or DHAN_ACCESS_TOKEN in .env.local',
    });
  }

  const start = Date.now();
  try {
    await getDhanAccessToken();
    // HDFC Bank (securityId 1333) — always available on NSE
    const data = await dhanMarketFeed('ohlc', { NSE_EQ: [1333] });
    const latencyMs = Date.now() - start;

    const hdfc = data?.NSE_EQ?.['1333'];
    return NextResponse.json({
      ok: true,
      method,
      clientId,
      latencyMs,
      proof: hdfc ? { symbol: 'HDFCBANK', lastPrice: hdfc.last_price } : null,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      method,
      clientId,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
