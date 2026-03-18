import { calculateZScore } from './stats';
import { DEFAULT_CONFIG, type EngineConfig, type FactorData, type MarketRegime, type SignalOutput } from './types';

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
 * Spread-quadratic model for LIVE (Dhan) data.
 * Fitted from 59 stocks, Mar 18 2026 TF pairwise data.
 * Pearson 0.845 — outperforms full OLS (0.683) on Dhan data because
 * Dhan's futures Z-scores add noise (data source mismatch with bhavcopy baseline).
 * Spread is the only factor Dhan reports accurately (equity OHLC).
 *
 * R = a + b×spread_r + c×spread_r²
 */
const SPREAD_QUAD = {
  a: 2.4491,
  b: -1.8553,
  c: 0.949,
};

export class RFactorEngine {
  private config: EngineConfig;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculates market signal output for a given symbol.
   * Uses 5-feature OLS regression model with:
   *   - spread_r: spread ratio (today/20d avg) — dominant predictor
   *   - pcr_z: Z-score of put-call ratio
   *   - spread_r × fut_turn_z: interaction term
   *   - fut_turn_z: futures turnover Z-score
   *   - fut_vol_z: futures volume Z-score (NEGATIVE — suppressor)
   *
   * LOO Pearson 0.60 on 80 F&O stocks, Top 10 overlap 7/10.
   */
  public calculateSignal(symbol: string, current: FactorData, historical: FactorData[]): SignalOutput {
    // Extract series for each factor from historical data
    const futTurnoverSeries = historical.map((h) => h.fut_turnover);
    const futVolumeSeries = historical.map((h) => h.fut_volume);
    const optVolumeSeries = historical.map((h) => h.opt_volume);
    const eqTradeSizeSeries = historical.map((h) => h.eq_trade_size);
    const oiChangeSeries = historical.map((h) => h.oi_change);
    const pcrSeries = historical.map((h) => h.pcr);

    // Calculate Z-scores for all factors (used in display + composite)
    const zScores = {
      fut_turnover: calculateZScore(current.fut_turnover, futTurnoverSeries),
      fut_volume: calculateZScore(current.fut_volume, futVolumeSeries),
      opt_volume: calculateZScore(current.opt_volume, optVolumeSeries),
      eq_trade_size: calculateZScore(current.eq_trade_size, eqTradeSizeSeries),
      oi_change: calculateZScore(current.oi_change, oiChangeSeries),
      spread: current.spread, // Already a ratio from transformToFactorData
      pcr: current.pcr, // Raw PCR (displayed in UI)
    };

    // OLS composite uses specific features with signed coefficients
    const pcrZ = calculateZScore(current.pcr, pcrSeries);
    const compositeRFactor = this.calculateCompositeOLS(
      zScores.spread, // spread_r
      pcrZ, // pcr_z
      zScores.fut_turnover, // fut_turn_z
      zScores.fut_volume, // fut_vol_z
    );

    const regime = this.classifyRegime(zScores);
    const isBlastTrade = compositeRFactor >= this.config.thresholds.blastTrade;

    return {
      symbol,
      timestamp: new Date().toISOString(),
      zScores,
      compositeRFactor,
      regime,
      isBlastTrade,
      modelUsed: 'ols' as const,
    };
  }

  /**
   * Live signal using spread-quadratic model (for Dhan data).
   * Uses only equity spread ratio — the only reliable factor from Dhan's API.
   * Futures Z-scores are still computed for display but don't affect R-Factor.
   * Pearson 0.845 with TradeFinder (vs 0.683 for full OLS on Dhan data).
   */
  public calculateSignalLive(symbol: string, current: FactorData, historical: FactorData[]): SignalOutput {
    // Compute all Z-scores for display (regime classification, UI)
    const futTurnoverSeries = historical.map((h) => h.fut_turnover);
    const futVolumeSeries = historical.map((h) => h.fut_volume);
    const optVolumeSeries = historical.map((h) => h.opt_volume);
    const eqTradeSizeSeries = historical.map((h) => h.eq_trade_size);
    const oiChangeSeries = historical.map((h) => h.oi_change);

    const zScores = {
      fut_turnover: calculateZScore(current.fut_turnover, futTurnoverSeries),
      fut_volume: calculateZScore(current.fut_volume, futVolumeSeries),
      opt_volume: calculateZScore(current.opt_volume, optVolumeSeries),
      eq_trade_size: calculateZScore(current.eq_trade_size, eqTradeSizeSeries),
      oi_change: calculateZScore(current.oi_change, oiChangeSeries),
      spread: current.spread,
      pcr: current.pcr,
    };

    // R-Factor from spread-quadratic (Dhan equity OHLC is accurate, futures Z-scores are not)
    const compositeRFactor = this.calculateSpreadQuadratic(current.spread);

    const regime = this.classifyRegime(zScores);
    const isBlastTrade = compositeRFactor >= this.config.thresholds.blastTrade;

    return {
      symbol,
      timestamp: new Date().toISOString(),
      zScores,
      compositeRFactor,
      regime,
      isBlastTrade,
      modelUsed: 'spread-quad' as const,
    };
  }

  /**
   * OLS regression composite with intercept, signed coefficients,
   * and spread × fut_turnover interaction term.
   *
   * R = 1.11 + 0.625*spread_r + 0.077*pcr_z
   *   + 0.226*(spread_r × fut_turn_z)
   *   + 1.415*fut_turn_z - 1.733*fut_vol_z
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
   * Spread-quadratic model (piecewise):
   * - spread ≤ 0: R = 1.0 (data error, neutral)
   * - spread < 1.0: linear ramp from 1.0 → ~1.54 (below-average activity)
   * - spread ≥ 1.0: quadratic R = a + b×spread + c×spread² (amplifies extremes)
   *
   * The quadratic alone is U-shaped (minimum at spread≈0.98, intercept at 2.45).
   * Without the piecewise fix, spread=0 incorrectly gives R=2.45.
   * Fitted on 59 TF pairwise data points (Mar 18, 2026).
   */
  private calculateSpreadQuadratic(spreadR: number): number {
    if (spreadR <= 0) return 1.0;
    // Value at spread=1.0 (junction point)
    const atOne = SPREAD_QUAD.a + SPREAD_QUAD.b + SPREAD_QUAD.c; // ≈1.543
    if (spreadR < 1.0) {
      // Linear ramp: R = 1.0 at spread=0, smoothly meets quadratic at spread=1.0
      return 1.0 + (atOne - 1.0) * spreadR;
    }
    return SPREAD_QUAD.a + SPREAD_QUAD.b * spreadR + SPREAD_QUAD.c * spreadR * spreadR;
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
}

// Export default singleton instance with default config
export const engine = new RFactorEngine();
