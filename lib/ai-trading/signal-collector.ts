/**
 * Signal Collector — Aggregates R-Factor + ADX + live data into TradeSignals.
 *
 * Bridges the R-Factor data service with the AI analyzer.
 * Filters stocks by configurable thresholds before sending to AI.
 */

import type { BoostSignal } from '@/lib/r-factor/data-service';
import type { RiskConfig, TradeSignal } from './types';

/** Convert a BoostSignal to a TradeSignal for AI analysis */
export function toTradeSignal(boost: BoostSignal): TradeSignal {
  return {
    symbol: boost.symbol,
    rFactor: boost.compositeRFactor,
    confidence: boost.confidence,
    modelUsed: boost.modelUsed,
    regime: boost.regime,
    adx: boost.adx ?? null,
    plusDI: boost.plusDI ?? null,
    minusDI: boost.minusDI ?? null,
    spread: boost.zScores.spread,
    oiLevel: boost.zScores.oi_level,
    futTurnover: boost.zScores.fut_turnover,
    futVolume: boost.zScores.fut_volume,
    optVolume: boost.zScores.opt_volume,
    pcr: boost.zScores.pcr,
    pctChange: boost.pctChange ?? null,
    sector: boost.sector ?? null,
    lotValue: boost.lotValue ?? null,
    lastPrice: boost.lotValue && boost.lotValue > 0 ? boost.lotValue / 1 : null, // Approximation
  };
}

/**
 * Filter stocks that meet minimum thresholds for AI analysis.
 * Reduces AI API calls by pre-screening obvious HOLDs.
 */
export function filterCandidates(signals: BoostSignal[], config: RiskConfig): BoostSignal[] {
  return signals.filter((s) => {
    // Must meet minimum R-Factor
    if (s.compositeRFactor < config.minRFactorThreshold) return false;
    // Must have some trend confirmation (ADX or OI)
    const hasAdxTrend = (s.adx ?? 0) >= config.minADXThreshold;
    const hasOiAccumulation = s.zScores.oi_level > 1.1;
    const hasHighSpread = s.zScores.spread > 1.3;
    if (!hasAdxTrend && !hasOiAccumulation && !hasHighSpread) return false;
    return true;
  });
}

/** Get top N candidates sorted by R-Factor */
export function getTopCandidates(signals: BoostSignal[], config: RiskConfig, limit = 10): BoostSignal[] {
  const filtered = filterCandidates(signals, config);
  return filtered
    .sort((a, b) => b.compositeRFactor - a.compositeRFactor)
    .slice(0, limit);
}
