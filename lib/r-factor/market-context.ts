/**
 * Market Context Service
 *
 * Provides market-wide context for R-Factor adjustment:
 * - NIFTY 50 daily change
 * - India VIX level
 * - FII/DII flows
 * - Market breadth (advance/decline ratio)
 *
 * This context is used to adjust R-Factor scores based on overall market conditions.
 */

import type { MarketContext } from './types';

// Cache market context for the day (refreshes at market open)
let cachedContext: MarketContext | null = null;
let cacheDate: string | null = null;

/**
 * Get current market context.
 * In production, this would fetch from NSE/BSE APIs.
 * For now, uses sensible defaults or cached values.
 */
export async function getMarketContext(): Promise<MarketContext> {
  const today = getTodayIST();

  // Return cached context if still valid (same trading day)
  if (cachedContext && cacheDate === today) {
    return cachedContext;
  }

  // Fetch fresh context
  const context = await fetchMarketContext();
  cachedContext = context;
  cacheDate = today;

  return context;
}

/**
 * Fetch market context from external sources.
 * TODO: Integrate with actual NSE/BSE APIs.
 */
async function fetchMarketContext(): Promise<MarketContext> {
  // For now, return default neutral context
  // In production, this would:
  // 1. Fetch NIFTY 50 OHLC from NSE
  // 2. Fetch India VIX from NSE
  // 3. Fetch FII/DII data from NSE/BSE
  // 4. Calculate advance/decline from market-wide data

  return {
    niftyChange: 0,
    vixLevel: 15, // Normal VIX level
    fiiNetFlow: 0,
    diiNetFlow: 0,
    advanceDeclineRatio: 1.0,
    marketTimestamp: new Date().toISOString(),
  };
}

/**
 * Adjust R-Factor based on market context.
 *
 * Rules:
 * 1. High VIX (>20): Reduce confidence in spread signals (more noise)
 * 2. Strong market move (>2%): Amplify signals in direction of move
 * 3. FII selling: Reduce scores for long-only stocks
 * 4. Poor breadth: Reduce scores across the board
 */
export function adjustForMarketContext(
  rawRFactor: number,
  context: MarketContext,
  thresholds: {
    highVix: number;
    strongMarketMove: number;
  },
): { adjustedRFactor: number; adjustment: number; reason: string[] } {
  const reasons: string[] = [];
  let multiplier = 1.0;

  // 1. VIX adjustment - high volatility reduces signal reliability
  if (context.vixLevel > thresholds.highVix) {
    const vixPenalty = Math.min(0.15, (context.vixLevel - thresholds.highVix) * 0.01);
    multiplier *= 1 - vixPenalty;
    reasons.push(`High VIX (${context.vixLevel.toFixed(1)}) reduces confidence by ${(vixPenalty * 100).toFixed(1)}%`);
  }

  // 2. Strong market move adjustment
  if (Math.abs(context.niftyChange) > thresholds.strongMarketMove) {
    // In strong directional move, amplify signals
    const amplification = 1 + Math.min(0.1, Math.abs(context.niftyChange) * 0.02);

    // For high R-Factor stocks, amplify in direction of market
    if (rawRFactor > 2.0) {
      multiplier *= amplification;
      reasons.push(
        `Strong market move (${context.niftyChange > 0 ? '+' : ''}${context.niftyChange.toFixed(2)}%) amplifies signal`,
      );
    }
  }

  // 3. FII flow adjustment (negative FII flow = selling pressure)
  if (context.fiiNetFlow < -500) {
    // Heavy FII selling (more than 500 cr)
    multiplier *= 0.95;
    reasons.push(`Heavy FII selling (₹${Math.abs(context.fiiNetFlow).toFixed(0)}cr) dampens scores`);
  } else if (context.fiiNetFlow > 500) {
    // Heavy FII buying
    multiplier *= 1.05;
    reasons.push(`Strong FII buying (₹${context.fiiNetFlow.toFixed(0)}cr) boosts scores`);
  }

  // 4. Market breadth adjustment
  if (context.advanceDeclineRatio < 0.5) {
    // Very poor breadth - more stocks declining
    multiplier *= 0.9;
    reasons.push(`Poor market breadth (A/D: ${context.advanceDeclineRatio.toFixed(2)}) reduces scores`);
  } else if (context.advanceDeclineRatio > 2.0) {
    // Very strong breadth
    multiplier *= 1.05;
    reasons.push(`Strong market breadth (A/D: ${context.advanceDeclineRatio.toFixed(2)}) boosts scores`);
  }

  const adjustedRFactor = rawRFactor * multiplier;
  const adjustment = adjustedRFactor - rawRFactor;

  return {
    adjustedRFactor,
    adjustment,
    reason: reasons,
  };
}

/**
 * Get today's date in IST timezone as YYYY-MM-DD string.
 */
function getTodayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/**
 * Clear the market context cache (for testing or forced refresh).
 */
export function clearMarketContextCache(): void {
  cachedContext = null;
  cacheDate = null;
}

/**
 * Set market context manually (for testing or manual override).
 */
export function setMarketContext(context: MarketContext): void {
  cachedContext = context;
  cacheDate = getTodayIST();
}

/**
 * Calculate market regime based on context.
 */
export function classifyMarketRegime(context: MarketContext): 'bull' | 'bear' | 'neutral' | 'volatile' {
  // High VIX with negative flows = volatile/bear
  if (context.vixLevel > 20 && context.niftyChange < 0) {
    return 'volatile';
  }

  // Strong positive move with good breadth = bull
  if (context.niftyChange > 1 && context.advanceDeclineRatio > 1.5) {
    return 'bull';
  }

  // Strong negative move = bear
  if (context.niftyChange < -1) {
    return 'bear';
  }

  return 'neutral';
}

/**
 * Get suggested position sizing based on market context.
 * Returns a multiplier for typical position size.
 */
export function getPositionSizeMultiplier(context: MarketContext): number {
  const regime = classifyMarketRegime(context);

  switch (regime) {
    case 'bull':
      return 1.2; // Increase position size in bull market
    case 'bear':
      return 0.7; // Reduce position size in bear market
    case 'volatile':
      return 0.5; // Significantly reduce in volatile conditions
    default:
      return 1.0; // Normal sizing
  }
}
