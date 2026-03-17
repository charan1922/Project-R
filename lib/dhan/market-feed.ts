import { getDhanAccessToken, hasDhanAuth } from '@/lib/dhan/auth';
import { env } from '@/lib/env';

export interface MarketFeedQuote {
  last_price: number;
  ohlc: { open: number; close: number; high: number; low: number };
  volume?: number;
  oi?: number;
}

export type MarketFeedResponse = Record<string, Record<string, MarketFeedQuote>>;

/**
 * Check if Indian market is currently open.
 * IST = UTC+5:30, market hours 9:15–15:30.
 */
export function isMarketHours(): boolean {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utcMs + 5.5 * 3600000);
  const day = ist.getDay();
  if (day === 0 || day === 6) return false;
  const hours = ist.getHours();
  const mins = ist.getMinutes();
  const time = hours * 60 + mins;
  return time >= 9 * 60 + 15 && time <= 15 * 60 + 30;
}

/**
 * Raw Dhan V2 market feed call.
 * The API expects numeric security IDs and returns nested structure:
 * { data: { SEGMENT: { "secId": { last_price, ohlc: { open, close, high, low }, volume?, oi? } } } }
 */
export async function dhanMarketFeed(
  endpoint: 'ohlc' | 'quote',
  securities: Record<string, number[]>,
): Promise<MarketFeedResponse> {
  if (!hasDhanAuth()) return {};
  const token = await getDhanAccessToken();
  const clientId = env.DHAN_CLIENT_ID!;

  const resp = await fetch(`https://api.dhan.co/v2/marketfeed/${endpoint}`, {
    method: 'POST',
    headers: {
      'access-token': token,
      'client-id': clientId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(securities),
  });

  if (!resp.ok) {
    console.warn(
      `[Dhan] marketfeed/${endpoint} HTTP ${resp.status}${resp.status === 401 ? ' — TOKEN EXPIRED. Will auto-refresh on next call.' : ''}`,
    );
    return {};
  }

  const json = (await resp.json()) as { data?: Record<string, Record<string, unknown>>; status: string };
  if (json.status !== 'success' || !json.data) return {};
  return json.data as MarketFeedResponse;
}
