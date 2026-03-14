import { calculateZScore } from './stats';
import {
  FactorData,
  SignalOutput,
  MarketRegime,
  EngineConfig,
  DEFAULT_CONFIG
} from './types';

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
  spread_r: 0.624570,
  pcr_z: 0.076682,
  spread_x_fut_turn: 0.226081,
  fut_turn_z: 1.414904,
  fut_vol_z: -1.733390,
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
  public calculateSignal(
    symbol: string,
    current: FactorData,
    historical: FactorData[]
  ): SignalOutput {
    // Extract series for each factor from historical data
    const futTurnoverSeries = historical.map(h => h.fut_turnover);
    const futVolumeSeries = historical.map(h => h.fut_volume);
    const optVolumeSeries = historical.map(h => h.opt_volume);
    const eqTradeSizeSeries = historical.map(h => h.eq_trade_size);
    const oiChangeSeries = historical.map(h => h.oi_change);
    const pcrSeries = historical.map(h => h.pcr);

    // Calculate Z-scores for all factors (used in display + composite)
    const zScores = {
      fut_turnover: calculateZScore(current.fut_turnover, futTurnoverSeries),
      fut_volume: calculateZScore(current.fut_volume, futVolumeSeries),
      opt_volume: calculateZScore(current.opt_volume, optVolumeSeries),
      eq_trade_size: calculateZScore(current.eq_trade_size, eqTradeSizeSeries),
      oi_change: calculateZScore(current.oi_change, oiChangeSeries),
      spread: current.spread,  // Already a ratio from transformToFactorData
      pcr: current.pcr,        // Raw PCR (displayed in UI)
    };

    // OLS composite uses specific features with signed coefficients
    const pcrZ = calculateZScore(current.pcr, pcrSeries);
    const compositeRFactor = this.calculateCompositeOLS(
      zScores.spread,           // spread_r
      pcrZ,                     // pcr_z
      zScores.fut_turnover,     // fut_turn_z
      zScores.fut_volume,       // fut_vol_z
    );

    const regime = this.classifyRegime(zScores);
    const isBlastTrade = compositeRFactor >= this.config.thresholds.blastTrade;

    return {
      symbol,
      timestamp: new Date().toISOString(),
      zScores,
      compositeRFactor,
      regime,
      isBlastTrade
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
  private calculateCompositeOLS(
    spreadR: number,
    pcrZ: number,
    futTurnZ: number,
    futVolZ: number,
  ): number {
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
   * Classifies market regime based on factor patterns:
   * - Elephant: heavy accumulation (high OI change + moderate turnover)
   * - Cheetah: momentum with urgency (high spread ratio + high futures volume)
   * - Hybrid: both signals present
   * - Defensive: low activity across the board
   */
  private classifyRegime(zScores: SignalOutput['zScores']): MarketRegime {
    const isCheetah = zScores.spread > this.config.thresholds.regimeSwitch
      && zScores.fut_volume > 1.0;
    const isElephant = zScores.oi_change > 1.0
      && zScores.fut_turnover > 0.5;

    if (isCheetah && isElephant) return 'Hybrid';
    if (isCheetah) return 'Cheetah';
    if (isElephant) return 'Elephant';
    return 'Defensive';
  }
}

// Export default singleton instance with default config
export const engine = new RFactorEngine();
