/**
 * Option Strike Resolver
 *
 * Given a stock symbol and direction (CE/PE), resolves:
 * 1. Current spot price from Dhan quote
 * 2. ATM strike price (nearest to spot)
 * 3. Option contract securityId from master_contracts DB
 * 4. Current option premium from Dhan quote
 *
 * Used by the option trading engine to find the exact contract to trade.
 */

import {
  dhanMarketFeed,
  isMarketHours,
} from '@/lib/dhan/market-feed';
import {
  resolveSymbol,
  resolveOptionSecurity,
  getStrikeStep,
  nearestStrike,
} from '@/lib/historify/master-contracts';

/** Fully resolved option contract ready for trading */
export interface ResolvedOption {
  symbol: string; // Underlying (e.g. JSWSTEEL)
  optionType: 'CE' | 'PE';
  strikePrice: number;
  securityId: string; // Dhan option securityId
  optionSymbol: string; // Trading symbol (e.g. JSWSTEEL-27Mar2026-1180-CE)
  spotPrice: number;
  optionPrice: number; // Current premium
  lotSize: number;
  expiryDate: string;
  dte: number; // Days to expiry
}

/**
 * Resolve the ATM option contract for a stock.
 *
 * @param symbol - Underlying stock (e.g. "JSWSTEEL")
 * @param direction - CE for bullish, PE for bearish
 * @param minDTE - Minimum days to expiry (default 7)
 * @returns Resolved option contract or null if not found
 */
export async function resolveATMOption(
  symbol: string,
  direction: 'CE' | 'PE',
  minDTE = 7,
): Promise<ResolvedOption | null> {
  // Step 1: Get equity securityId for spot price
  const equity = await resolveSymbol(symbol, 'NSE');
  if (!equity) {
    console.warn(`[OptionResolver] Equity not found: ${symbol}`);
    return null;
  }

  // Step 2: Get current spot price
  const eqId = parseInt(equity.securityId, 10);
  const quoteData = await dhanMarketFeed('quote', { NSE_EQ: [eqId] });
  const eqQuote = quoteData?.NSE_EQ?.[equity.securityId];
  if (!eqQuote) {
    console.warn(`[OptionResolver] No quote for ${symbol}`);
    return null;
  }
  const spotPrice = eqQuote.last_price;

  // Step 3: Calculate ATM strike
  const strikeStep = getStrikeStep(symbol);
  const atmStrike = nearestStrike(spotPrice, strikeStep);

  // Step 4: Resolve option securityId from DB
  const option = await resolveOptionSecurity(symbol, atmStrike, direction, minDTE);
  if (!option) {
    console.warn(`[OptionResolver] No option contract found: ${symbol} ${atmStrike} ${direction}`);
    return null;
  }

  // Step 5: Get option premium (LTP)
  const optId = parseInt(option.securityId, 10);
  let optionPrice = 0;

  if (isMarketHours()) {
    const optQuote = await dhanMarketFeed('quote', { NSE_FNO: [optId] });
    const optData = optQuote?.NSE_FNO?.[option.securityId];
    optionPrice = optData?.last_price ?? 0;
  }

  // Step 6: Calculate DTE
  const expiryDate = new Date(option.expiry);
  const today = new Date();
  const dte = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return {
    symbol,
    optionType: direction,
    strikePrice: atmStrike,
    securityId: option.securityId,
    optionSymbol: option.symbol,
    spotPrice,
    optionPrice,
    lotSize: option.lotSize,
    expiryDate: option.expiry,
    dte,
  };
}
