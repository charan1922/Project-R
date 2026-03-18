/**
 * Option Chain Service — fetches and processes per-strike OI data from Dhan.
 * Used by the Option Chain analysis page (/trading-lab/option-chain).
 */

import { prisma } from '@/lib/db';
import { getDhanAccessToken, hasDhanAuth } from '@/lib/dhan/auth';
import { env } from '@/lib/env';
import { batchResolveFutures, resolveSymbol } from '@/lib/historify/master-contracts';
import type { OptionChainData, OptionSideData, StrikeData } from './option-chain-types';

// Re-export types for server-side consumers
export type { OptionChainData, OptionSideData, StrikeData } from './option-chain-types';
export { formatOI } from './option-chain-types';

// ─── Raw Dhan Response Types ─────────────────────────────────────────────────

interface DhanOptionSide {
  oi?: number;
  previous_oi?: number;
  volume?: number;
  previous_volume?: number;
  implied_volatility?: number;
  last_price?: number;
  average_price?: number;
  security_id?: number;
  top_bid_price?: number;
  top_ask_price?: number;
  top_bid_quantity?: number;
  top_ask_quantity?: number;
  previous_close_price?: number;
  greeks?: {
    delta?: number;
    theta?: number;
    gamma?: number;
    vega?: number;
  };
}

interface DhanOptionChainResponse {
  data?: {
    last_price?: number;
    oc?: Record<string, { ce?: DhanOptionSide; pe?: DhanOptionSide }>;
  };
  status: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Fetch full option chain for a symbol + expiry.
 * Returns per-strike CE/PE data with OI, OI change, IV, greeks.
 */
export async function fetchFullOptionChain(symbol: string, expiry?: string): Promise<OptionChainData | null> {
  if (!hasDhanAuth()) return null;

  // Resolve equity security ID
  const entry = await resolveSymbol(symbol, 'NSE');
  if (!entry) return null;
  const securityId = parseInt(entry.securityId, 10);

  const token = await getDhanAccessToken();
  const clientId = env.DHAN_CLIENT_ID!;

  // Resolve nearest expiry if not provided (Dhan requires expiry)
  let resolvedExpiry = expiry;
  if (!resolvedExpiry) {
    const futMap = await batchResolveFutures([symbol]);
    const futEntry = futMap.get(symbol);
    if (futEntry?.expiryDate) {
      resolvedExpiry = futEntry.expiryDate;
    } else {
      console.warn(`[OptionChain] No expiry found for ${symbol}`);
      return null;
    }
  }

  const body: Record<string, unknown> = {
    UnderlyingScrip: securityId,
    UnderlyingSeg: 'NSE_FNO',
    Expiry: resolvedExpiry,
  };

  const resp = await fetch('https://api.dhan.co/v2/optionchain', {
    method: 'POST',
    headers: {
      'access-token': token,
      'client-id': clientId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    console.warn(`[OptionChain] HTTP ${resp.status} for ${symbol}`);
    return null;
  }

  const json = (await resp.json()) as DhanOptionChainResponse;
  if (json.status !== 'success' || !json.data?.oc) return null;

  const underlyingPrice = json.data.last_price ?? 0;
  const rawStrikes = json.data.oc;

  // Parse strikes
  const strikes: StrikeData[] = [];
  let totalCallOi = 0;
  let totalPutOi = 0;
  let callOiChange = 0;
  let putOiChange = 0;

  for (const [strikeStr, data] of Object.entries(rawStrikes)) {
    const strike = parseFloat(strikeStr);
    if (isNaN(strike)) continue;

    const ce = data.ce ? parseSide(data.ce) : null;
    const pe = data.pe ? parseSide(data.pe) : null;

    strikes.push({ strike, ce, pe });

    if (ce) {
      totalCallOi += ce.oi;
      callOiChange += ce.oiChange;
    }
    if (pe) {
      totalPutOi += pe.oi;
      putOiChange += pe.oiChange;
    }
  }

  // Sort by strike price
  strikes.sort((a, b) => a.strike - b.strike);

  // Find ATM strike
  const atmStrike =
    strikes.length > 0
      ? strikes.reduce((closest, s) =>
          Math.abs(s.strike - underlyingPrice) < Math.abs(closest.strike - underlyingPrice) ? s : closest,
        ).strike
      : 0;

  const pcr = totalCallOi > 0 ? totalPutOi / totalCallOi : 0;

  return {
    underlying: { symbol, lastPrice: underlyingPrice, securityId },
    expiries: await getAvailableExpiries(symbol),
    selectedExpiry: resolvedExpiry,
    strikes,
    summary: { totalCallOi, totalPutOi, callOiChange, putOiChange, pcr, atmStrike },
    refreshedAt: new Date().toISOString(),
  };
}

function parseSide(raw: DhanOptionSide): OptionSideData {
  const oi = raw.oi ?? 0;
  const previousOi = raw.previous_oi ?? oi;
  return {
    oi,
    oiChange: oi - previousOi,
    previousOi,
    volume: raw.volume ?? 0,
    previousVolume: raw.previous_volume ?? 0,
    iv: raw.implied_volatility ?? 0,
    lastPrice: raw.last_price ?? 0,
    averagePrice: raw.average_price ?? 0,
    greeks: raw.greeks
      ? {
          delta: raw.greeks.delta ?? 0,
          theta: raw.greeks.theta ?? 0,
          gamma: raw.greeks.gamma ?? 0,
          vega: raw.greeks.vega ?? 0,
        }
      : null,
  };
}

/** Get available F&O expiry dates for a symbol from master_contracts */
async function getAvailableExpiries(symbol: string): Promise<string[]> {
  const rows = await prisma.masterContract.findMany({
    where: {
      underlying: symbol,
      segment: 'NSE_FNO',
      instrument: { in: ['FUTSTK', 'FUTIDX'] },
      expiryDate: { gte: new Date() },
    },
    select: { expiryDate: true },
    distinct: ['expiryDate'],
    orderBy: { expiryDate: 'asc' },
  });
  return rows.map((r) => (r.expiryDate ? new Date(r.expiryDate).toISOString().split('T')[0] : '')).filter(Boolean);
}
