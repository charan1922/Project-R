import { calculateZScore } from './stats';
import {
  DEFAULT_CONFIG,
  type EngineConfig,
  type EnhancedFactorData,
  type FactorData,
  type MarketContext,
  type MarketRegime,
  type SignalOutput,
  transformToEnhancedFactorData,
  transformToFactorData,
} from './types';
import { predictEnsemble } from './ensemble';
import { adjustForMarketContext, getMarketContext } from './market-context';

/**
 * OLS regression coefficients from 80-stock validation (March 13, 2026).
 * LOO Pearson = 0.60, Top 10 overlap = 7/10.
 *
 * Formula: R = INTERCEPT + spread_r*0.625 + pcr_z*0.077
 *            + (spread_r × fut_turnover_z)*0.226
 *            + fut_turnover_z*1.415 - fut_volume_z*1.733
 *
 * Key insight: fut_volume is a suppressor (negative coeff) — the
 * turnover/volume divergence carries the real institutional signal.
 */
const OLS_INTERCEPT = 1.108614;
const OLS_COEFFICIENTS = {
  spread_r: 0.62457,
  pcr_z: 0.076682,
  spread_x_fut_turn: 0.226081,
  fut_turn_z: 1.414904,
  fut_vol_z: -1.73339,
};

/**
 * Huber loss threshold for robust regression.
 * Values beyond this get linear penalty instead of quadratic.
 */
const HUBER_EPSILON = 1.35;

export class RFactorEngine {
  private config: EngineConfig;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculates market signal output for a given symbol.
   * Uses ensemble model by default, with OLS and spread-quadratic as fallbacks.
   */
  public calculateSignal(
    symbol: string,
    current: FactorData,
    historical: FactorData[],
    opts?: { hasOptionChain?: boolean; marketContext?: MarketContext },
  ): SignalOutput {
    // Compute Z-scores for all factors
    const zScores = this.computeZScores(current, historical);

    // Use ensemble model
    const ensembleResult = predictEnsemble(current, historical, this.config);
    let rawRFactor = ensembleResult.prediction.value;

    // Apply robust regression adjustment for outliers
    if (this.config.robustRegression.enabled) {
      rawRFactor = this.applyRobustAdjustment(rawRFactor, zScores);
    }

    // Apply scale correction for extreme values
    const { scaledRFactor } = this.applyScaleCorrection(rawRFactor);

    // Apply market context adjustment
    let marketAdjustment = 0;
    let finalRFactor = scaledRFactor;

    if (opts?.marketContext) {
      const marketResult = adjustForMarketContext(scaledRFactor, opts.marketContext, {
        highVix: this.config.thresholds.highVix,
        strongMarketMove: this.config.thresholds.strongMarketMove,
      });
      finalRFactor = marketResult.adjustedRFactor;
      marketAdjustment = marketResult.adjustment;
    }

    const regime = this.classifyRegime(zScores);
    const isBlastTrade = finalRFactor >= this.config.thresholds.blastTrade;
    const confidence = this.calculateConfidence(zScores, historical.length);

    return {
      symbol,
      timestamp: new Date().toISOString(),
      zScores,
      compositeRFactor: finalRFactor,
      rawRFactor,
      scaledRFactor,
      regime,
      isBlastTrade,
      modelUsed: 'ensemble',
      confidence,
      marketAdjustment,
      ensembleWeights: {
        ols: ensembleResult.weights.ols,
        'spread-quad': ensembleResult.weights['spread-quad'],
        momentum: ensembleResult.weights.momentum,
        ensemble: 0,
      },
    };
  }

  /**
   * Calculate signal using enhanced factor data (with momentum/acceleration features).
   */
  public calculateEnhancedSignal(
    symbol: string,
    current: EnhancedFactorData,
    historical: EnhancedFactorData[],
    opts?: { hasOptionChain?: boolean; marketContext?: MarketContext },
  ): SignalOutput {
    // Base calculation
    const baseSignal = this.calculateSignal(symbol, current, historical, opts);

    // Add momentum adjustment
    let momentumAdj = 0;
    if (current.momentum_signal > 0) {
      momentumAdj = 0.1 * current.momentum_signal;
    } else if (current.momentum_signal < 0) {
      momentumAdj = 0.15 * current.momentum_signal; // Deteriorating has larger impact
    }

    // Close position adjustment
    if (current.close_position > 0.8) {
      momentumAdj += 0.05; // Closing near high is bullish
    } else if (current.close_position < 0.2) {
      momentumAdj -= 0.05; // Closing near low is bearish
    }

    const adjustedRFactor = Math.max(1.0, baseSignal.compositeRFactor + momentumAdj);

    return {
      ...baseSignal,
      compositeRFactor: adjustedRFactor,
      isBlastTrade: adjustedRFactor >= this.config.thresholds.blastTrade,
    };
  }

  /**
   * Live signal for Dhan data — uses all available factors.
   *
   * Dhan-live coefficients fitted from 79 TF-paired stocks (Mar 19, 2026).
   * Key finding: on Dhan live data, OI change and options volume are the
   * strongest predictors (Pearson 0.47, 0.39), while spread has NEGATIVE
   * correlation at certain times of day. This is the opposite of bhavcopy OLS.
   *
   * Features use max(0, z) to only reward above-average activity (not penalize below).
   * Pearson 0.55 with TradeFinder, Top-10 overlap 6/10.
   */
  public calculateSignalLive(
    symbol: string,
    current: FactorData,
    historical: FactorData[],
    opts?: { marketContext?: MarketContext },
  ): SignalOutput {
    // Compute all Z-scores
    const zScores = this.computeZScores(current, historical);

    // Dhan-live model: R = 1.56 × spread (same as bhavcopy ensemble)
    const rawRFactor = this.calculateDhanLiveComposite(zScores);

    // Apply scale correction for extreme values (spread > ~2.2 → R > 3.5)
    const { scaledRFactor } = this.applyScaleCorrection(rawRFactor);

    // Apply market context
    let finalRFactor = scaledRFactor;
    let marketAdjustment = 0;

    if (opts?.marketContext) {
      const marketResult = adjustForMarketContext(scaledRFactor, opts.marketContext, {
        highVix: this.config.thresholds.highVix,
        strongMarketMove: this.config.thresholds.strongMarketMove,
      });
      finalRFactor = marketResult.adjustedRFactor;
      marketAdjustment = marketResult.adjustment;
    }

    const regime = this.classifyRegime(zScores);
    const isBlastTrade = finalRFactor >= this.config.thresholds.blastTrade;

    // Confidence based on how many factors agree
    const activeFactors = [
      zScores.oi_change > 0.5,
      zScores.opt_volume > 0.5,
      zScores.fut_volume > 0.5,
      zScores.spread > 1.0,
    ].filter(Boolean).length;
    const confidence = Math.min(1.0, 0.4 + activeFactors * 0.15);

    return {
      symbol,
      timestamp: new Date().toISOString(),
      zScores,
      compositeRFactor: finalRFactor,
      rawRFactor,
      scaledRFactor,
      regime,
      isBlastTrade,
      modelUsed: 'spread-quad',
      confidence,
      marketAdjustment,
    };
  }

  /**
   * Dhan-live composite for live data (no option chain path).
   *
   * Cross-validated on 158 samples (Mar 19+20, 2026):
   * Best CV model: R = 1.56 × spread (Pearson 0.80, Top-10 7.5/10)
   * Adding opt_volume/oi_level does NOT improve CV (overfits to single day).
   *
   * Uses same linear coefficient as bhavcopy ensemble for consistency.
   * Scale correction applied separately by the caller for extreme values.
   * Output capped at [1.0, 6.0].
   */
  private calculateDhanLiveComposite(zScores: SignalOutput['zScores']): number {
    // Linear model: R = 1.56 × spread_ratio
    // Cross-validated Pearson 0.80 on 2-day pooled data (beats quadratic 0.79)
    const r = 1.5596 * zScores.spread;

    // Clamp to [1.0, 6.0]
    return Math.max(1.0, Math.min(6.0, r));
  }

  /**
   * Legacy OLS-only calculation for backward compatibility.
   */
  public calculateSignalOLS(symbol: string, current: FactorData, historical: FactorData[]): SignalOutput {
    const zScores = this.computeZScores(current, historical);

    // OLS formula
    const pcrZ = calculateZScore(
      current.pcr,
      historical.map((h) => h.pcr),
    );
    const compositeRFactor = this.calculateCompositeOLS(zScores.spread, pcrZ, zScores.fut_turnover, zScores.fut_volume);

    const regime = this.classifyRegime(zScores);
    const isBlastTrade = compositeRFactor >= this.config.thresholds.blastTrade;

    return {
      symbol,
      timestamp: new Date().toISOString(),
      zScores,
      compositeRFactor,
      rawRFactor: compositeRFactor,
      scaledRFactor: compositeRFactor,
      regime,
      isBlastTrade,
      modelUsed: 'ols',
      confidence: this.calculateConfidence(zScores, historical.length),
      marketAdjustment: 0,
    };
  }

  /**
   * Compute Z-scores for all factors.
   */
  private computeZScores(current: FactorData, historical: FactorData[]): SignalOutput['zScores'] {
    return {
      fut_turnover: calculateZScore(
        current.fut_turnover,
        historical.map((h) => h.fut_turnover),
      ),
      fut_volume: calculateZScore(
        current.fut_volume,
        historical.map((h) => h.fut_volume),
      ),
      opt_volume: calculateZScore(
        current.opt_volume,
        historical.map((h) => h.opt_volume),
      ),
      eq_trade_size: calculateZScore(
        current.eq_trade_size,
        historical.map((h) => h.eq_trade_size),
      ),
      oi_change: calculateZScore(
        current.oi_change,
        historical.map((h) => h.oi_change),
      ),
      oi_level: current.oi_level, // Already a ratio (today OI / 20d avg OI)
      spread: current.spread, // Already a ratio
      pcr: current.pcr, // Raw PCR (displayed in UI)
    };
  }

  /**
   * OLS regression composite with intercept, signed coefficients,
   * and spread × fut_turnover interaction term.
   */
  private calculateCompositeOLS(spreadR: number, pcrZ: number, futTurnZ: number, futVolZ: number): number {
    return (
      OLS_INTERCEPT +
      OLS_COEFFICIENTS.spread_r * spreadR +
      OLS_COEFFICIENTS.pcr_z * pcrZ +
      OLS_COEFFICIENTS.spread_x_fut_turn * (spreadR * futTurnZ) +
      OLS_COEFFICIENTS.fut_turn_z * futTurnZ +
      OLS_COEFFICIENTS.fut_vol_z * futVolZ
    );
  }

  /**
   * Apply scale correction to match TradeFinder's distribution.
   * TradeFinder shows values up to 5.0+, while our model caps around 3.5.
   * This expands extreme values to match the expected range.
   */
  private applyScaleCorrection(rawRFactor: number): { scaledRFactor: number; adjustment: number } {
    if (!this.config.scaleCorrection.enabled) {
      return { scaledRFactor: rawRFactor, adjustment: 0 };
    }

    const threshold = this.config.scaleCorrection.expansionThreshold;
    const factor = this.config.scaleCorrection.expansionFactor;

    if (rawRFactor <= threshold) {
      return { scaledRFactor: rawRFactor, adjustment: 0 };
    }

    // Apply non-linear expansion for extreme values
    // Formula: threshold + (excess) × (1 + factor × tanh(excess))
    const excess = rawRFactor - threshold;
    const expansion = 1 + (factor - 1) * Math.tanh(excess);
    const scaledRFactor = threshold + excess * expansion;

    return {
      scaledRFactor,
      adjustment: scaledRFactor - rawRFactor,
    };
  }

  /**
   * Apply robust regression adjustment using Huber-like penalty.
   * This reduces the impact of outliers on the final prediction.
   */
  private applyRobustAdjustment(rFactor: number, zScores: SignalOutput['zScores']): number {
    // Identify extreme Z-scores that might indicate outliers
    const extremeScores = Object.values(zScores).filter((z) => Math.abs(z) > 3);

    if (extremeScores.length === 0) {
      return rFactor; // No adjustment needed
    }

    // Apply Huber-like penalty: reduce impact of extreme values
    const penaltyFactor = extremeScores.reduce((penFactor, z) => {
      const absZ = Math.abs(z);
      if (absZ > HUBER_EPSILON) {
        // Linear penalty beyond epsilon
        return penFactor * (HUBER_EPSILON / absZ);
      }
      return penFactor;
    }, 1.0);

    // Blend: 70% original + 30% robust-adjusted
    const robustRFactor = rFactor * (0.7 + 0.3 * penaltyFactor);

    return robustRFactor;
  }

  /**
   * Calculate adaptive lookback period based on volatility.
   */
  public calculateAdaptiveLookback(historical: FactorData[]): number {
    if (historical.length < this.config.minLookback) {
      return Math.max(5, historical.length);
    }

    // Calculate spread volatility over recent period
    const recentSpreads = historical.slice(-10).map((h) => h.spread);
    const avgSpread = recentSpreads.reduce((a, b) => a + b, 0) / recentSpreads.length;
    const variance = recentSpreads.reduce((sum, s) => sum + (s - avgSpread) ** 2, 0) / recentSpreads.length;
    const volatility = Math.sqrt(variance);

    // High volatility → shorter lookback (more responsive)
    // Low volatility → longer lookback (more stable)
    const baseLookback = this.config.lookbackPeriod;

    if (volatility > 1.0) {
      // High volatility: use shorter lookback
      return Math.max(this.config.minLookback, Math.floor(baseLookback * 0.7));
    }
    if (volatility < 0.3) {
      // Low volatility: use longer lookback
      return Math.min(this.config.maxLookback, Math.floor(baseLookback * 1.3));
    }

    return baseLookback;
  }

  /**
   * Classifies market regime based on factor patterns:
   * - Elephant: heavy accumulation (high OI change + moderate turnover)
   * - Cheetah: momentum with urgency (high spread ratio + high futures volume)
   * - Hybrid: both signals present
   * - Defensive: low activity across the board
   */
  private classifyRegime(zScores: SignalOutput['zScores']): MarketRegime {
    const isCheetah = zScores.spread > this.config.thresholds.regimeSwitch && zScores.fut_volume > 1.0;
    const isElephant = zScores.oi_change > 1.0 && zScores.fut_turnover > 0.5;

    if (isCheetah && isElephant) return 'Hybrid';
    if (isCheetah) return 'Cheetah';
    if (isElephant) return 'Elephant';
    return 'Defensive';
  }

  /**
   * Calculate confidence score based on factor agreement and data quality.
   */
  private calculateConfidence(zScores: SignalOutput['zScores'], historyLength: number): number {
    let confidence = 0.5; // Base confidence

    // Data quality factor
    if (historyLength >= 20) {
      confidence += 0.2;
    } else if (historyLength >= 15) {
      confidence += 0.1;
    }

    // Factor agreement: check if multiple factors point in same direction
    const positiveSignals = [
      zScores.spread > 1.0,
      zScores.fut_turnover > 0.5,
      zScores.oi_change > 0.5,
      zScores.pcr > 0.5, // High PCR = unusual hedging
    ].filter(Boolean).length;

    const negativeSignals = [
      zScores.spread < 0.8,
      zScores.fut_turnover < -0.5,
      zScores.fut_volume > 2.0, // High volume with low turnover = retail noise
    ].filter(Boolean).length;

    // High agreement = higher confidence
    if (positiveSignals >= 3) {
      confidence += 0.2;
    } else if (positiveSignals >= 2) {
      confidence += 0.1;
    }

    // Conflicting signals = lower confidence
    if (positiveSignals >= 2 && negativeSignals >= 2) {
      confidence -= 0.15;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Get market context and include in signal calculation.
   */
  public async calculateSignalWithContext(
    symbol: string,
    current: FactorData,
    historical: FactorData[],
    opts?: { hasOptionChain?: boolean },
  ): Promise<SignalOutput> {
    const marketContext = await getMarketContext();
    return this.calculateSignal(symbol, current, historical, {
      ...opts,
      marketContext,
    });
  }
}

// Export default singleton instance with default config
export const engine = new RFactorEngine();

// Re-export types and functions
export { transformToFactorData, transformToEnhancedFactorData };
