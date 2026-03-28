/**
 * R-Factor Ensemble Model
 *
 * Combines multiple prediction models for improved accuracy:
 * 1. OLS (Full 5-feature regression) - Works best with bhavcopy data
 * 2. Spread-Quadratic - Works best with live Dhan data
 * 3. Momentum - Captures R-Factor trend over time
 *
 * The ensemble weights are configurable and can be adjusted based on:
 * - Data source (bhavcopy vs live)
 * - Market conditions
 * - Historical model performance
 */

import type { EnhancedFactorData, EngineConfig, FactorData } from './types';
import { calculateZScore } from './stats';

/** Model prediction result with metadata */
export interface ModelPrediction {
  value: number;
  modelType: 'ols' | 'spread-quad' | 'momentum';
  confidence: number; // 0-1 based on feature quality
  features: Record<string, number>; // Feature values used
}

/**
 * OLS Model (5-feature regression)
 *
 * R = 1.108614 + 0.625*spread_r + 0.077*pcr_z
 *     + 0.226*(spread_r × fut_turn_z) + 1.415*fut_turn_z - 1.733*fut_vol_z
 */
const OLS_COEFFICIENTS = {
  intercept: 1.108614,
  spread_r: 0.62457,
  pcr_z: 0.076682,
  spread_x_fut_turn: 0.226081,
  fut_turn_z: 1.414904,
  fut_vol_z: -1.73339,
};

export function predictOLS(current: FactorData, historical: FactorData[]): ModelPrediction {
  // Compute Z-scores
  const futTurnSeries = historical.map((h) => h.fut_turnover);
  const futVolSeries = historical.map((h) => h.fut_volume);
  const pcrSeries = historical.map((h) => h.pcr);

  const futTurnZ = calculateZScore(current.fut_turnover, futTurnSeries);
  const futVolZ = calculateZScore(current.fut_volume, futVolSeries);
  const pcrZ = calculateZScore(current.pcr, pcrSeries);

  // OLS formula
  const value =
    OLS_COEFFICIENTS.intercept +
    OLS_COEFFICIENTS.spread_r * current.spread +
    OLS_COEFFICIENTS.pcr_z * pcrZ +
    OLS_COEFFICIENTS.spread_x_fut_turn * (current.spread * futTurnZ) +
    OLS_COEFFICIENTS.fut_turn_z * futTurnZ +
    OLS_COEFFICIENTS.fut_vol_z * futVolZ;

  // Confidence based on data quality
  const confidence = calculateOLSConfidence(current, historical);

  return {
    value,
    modelType: 'ols',
    confidence,
    features: {
      spread_r: current.spread,
      pcr_z: pcrZ,
      fut_turn_z: futTurnZ,
      fut_vol_z: futVolZ,
      fut_avg_trade_size_z: calculateZScore(current.fut_avg_trade_size, historical.map(h => h.fut_avg_trade_size)),
      opt_avg_trade_size_z: calculateZScore(current.opt_avg_trade_size, historical.map(h => h.opt_avg_trade_size)),
      interaction: current.spread * futTurnZ,
    },
  };
}

/**
 * Spread-Linear Model (cross-validated on Mar 19+20, 158 paired samples)
 *
 * R = 1.56 × spread_ratio (CV Pearson 0.80, Top-10 7.5/10)
 *
 * Why linear beats quadratic:
 * - Quadratic underpredicts moderate spreads (1.0-2.0) where most stocks sit
 * - Linear generalizes better across normal + extreme market days
 * - Quadratic overfits to extreme-day patterns (Mar 19)
 * - Scale correction handles extreme values (>3.5) separately
 *
 * Retained name "SpreadQuadratic" for backward compatibility with ensemble API.
 */
const SPREAD_LINEAR_COEFF = 1.5596; // From 2-day OLS: R = -0.02 + 1.56 × spread

export function predictSpreadQuadratic(current: FactorData, historical: FactorData[]): ModelPrediction {
  const spread = current.spread;
  let value: number;

  if (spread <= 0) {
    value = 1.0;
  } else {
    // Linear model: R = 1.56 × spread_ratio
    // Floor at 1.0 (minimum R-Factor)
    value = Math.max(1.0, SPREAD_LINEAR_COEFF * spread);
  }

  // Confidence based on spread reliability
  const confidence = calculateSpreadConfidence(current, historical);

  return {
    value,
    modelType: 'spread-quad',
    confidence,
    features: {
      spread_r: spread,
      spread_squared: spread * spread,
    },
  };
}

/**
 * Momentum Model
 *
 * Captures R-Factor trend over time. Uses:
 * - Spread acceleration
 * - Turnover acceleration
 * - Multi-day spread pattern
 */
export function predictMomentum(
  current: EnhancedFactorData,
  _historical: EnhancedFactorData[],
): ModelPrediction {
  // Base R from simplified OLS (spread + turnover only)
  const baseR = 2.0 + (current.spread - 1.0) * 0.5;

  // Momentum adjustments
  let momentumAdjustment = 0;

  // Spread acceleration boost
  if (current.spread_acceleration > 0.2) {
    momentumAdjustment += 0.3; // Accelerating spread
  } else if (current.spread_acceleration < -0.2) {
    momentumAdjustment -= 0.2; // Decelerating spread
  }

  // Turnover acceleration boost
  if (current.turnover_acceleration > 0.5) {
    momentumAdjustment += 0.2;
  }

  // Multi-day pattern
  if (current.spread > current.spread_3d_avg * 1.1) {
    momentumAdjustment += 0.15; // Sustained above average
  }

  // Close position (where in the range)
  if (current.close_position > 0.7) {
    momentumAdjustment += 0.1; // Closing near high = bullish
  } else if (current.close_position < 0.3) {
    momentumAdjustment -= 0.1; // Closing near low = bearish
  }

  const value = Math.max(1.0, baseR + momentumAdjustment);

  // Confidence based on consistency of momentum signals
  const signals = [
    Math.abs(current.spread_acceleration) > 0.1,
    Math.abs(current.turnover_acceleration) > 0.2,
    current.close_position !== 0.5,
  ];
  const confidence = signals.filter(Boolean).length / signals.length;

  return {
    value,
    modelType: 'momentum',
    confidence,
    features: {
      spread_acceleration: current.spread_acceleration,
      turnover_acceleration: current.turnover_acceleration,
      close_position: current.close_position,
      momentum_signal: current.momentum_signal,
    },
  };
}

/**
 * Ensemble Prediction
 *
 * Combines all models with configurable weights.
 * Weights can be adjusted based on:
 * - Model confidence
 * - Data source quality
 * - Market conditions
 */
export function predictEnsemble(
  current: FactorData | EnhancedFactorData,
  historical: (FactorData | EnhancedFactorData)[],
  config: EngineConfig,
): { prediction: ModelPrediction; weights: Record<string, number> } {
  // Get individual predictions
  const olsPred = predictOLS(current, historical);
  const spreadQuadPred = predictSpreadQuadratic(current, historical);

  // Momentum model needs enhanced data
  let momentumPred: ModelPrediction;
  if ('spread_acceleration' in current) {
    momentumPred = predictMomentum(current as EnhancedFactorData, historical as EnhancedFactorData[]);
  } else {
    // Fallback: use spread-quad with lower weight
    momentumPred = { ...spreadQuadPred, modelType: 'momentum', confidence: 0.3 };
  }

  // Calculate dynamic weights based on confidence
  const baseWeights = config.ensembleWeights;
  const confidenceWeights = {
    ols: baseWeights.ols * olsPred.confidence,
    'spread-quad': baseWeights.spreadQuad * spreadQuadPred.confidence,
    momentum: baseWeights.momentum * momentumPred.confidence,
  };

  // Normalize weights
  const totalWeight = Object.values(confidenceWeights).reduce((a, b) => a + b, 0);
  const normalizedWeights = {
    ols: confidenceWeights.ols / totalWeight,
    'spread-quad': confidenceWeights['spread-quad'] / totalWeight,
    momentum: confidenceWeights.momentum / totalWeight,
  };

  // Weighted average
  const ensembleValue =
    olsPred.value * normalizedWeights.ols +
    spreadQuadPred.value * normalizedWeights['spread-quad'] +
    momentumPred.value * normalizedWeights.momentum;

  // Ensemble confidence is weighted average of individual confidences
  const ensembleConfidence =
    olsPred.confidence * normalizedWeights.ols +
    spreadQuadPred.confidence * normalizedWeights['spread-quad'] +
    momentumPred.confidence * normalizedWeights.momentum;

  return {
    prediction: {
      value: ensembleValue,
      modelType: 'ols', // Primary model used
      confidence: ensembleConfidence,
      features: {
        ...olsPred.features,
        spread_quad_value: spreadQuadPred.value,
        momentum_value: momentumPred.value,
      },
    },
    weights: normalizedWeights,
  };
}

/**
 * Calculate confidence for OLS model based on data quality.
 */
function calculateOLSConfidence(current: FactorData, historical: FactorData[]): number {
  let confidence = 1.0;

  // Penalize if insufficient history
  if (historical.length < 15) {
    confidence *= 0.7;
  }

  // Penalize if spread is extreme (might be data error)
  if (current.spread > 5 || current.spread < 0.1) {
    confidence *= 0.8;
  }

  // Penalize if PCR is extreme
  if (current.pcr > 5 || (current.pcr > 0 && current.pcr < 0.2)) {
    confidence *= 0.9;
  }

  // Penalize if zero volume/turnover
  if (current.fut_turnover === 0 || current.fut_volume === 0) {
    confidence *= 0.6;
  }

  return Math.max(0.1, confidence);
}

/**
 * Calculate confidence for spread-quadratic model.
 */
function calculateSpreadConfidence(current: FactorData, historical: FactorData[]): number {
  let confidence = 1.0;

  // Spread is reliable if we have good equity OHLC data
  if (current.spread <= 0) {
    confidence = 0.1; // Data error
  } else if (current.spread > 5) {
    confidence = 0.5; // Very wide spread - less reliable
  }

  // Check if spread is in "normal" range
  if (current.spread >= 0.5 && current.spread <= 3.0) {
    confidence = 1.0; // Most reliable range
  }

  // Historical consistency
  if (historical.length >= 10) {
    const spreads = historical.map((h) => h.spread);
    const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
    const variance = spreads.reduce((sum, s) => sum + (s - avgSpread) ** 2, 0) / spreads.length;

    // Lower variance = more predictable = higher confidence
    if (variance < 0.5) {
      confidence *= 1.1; // Bonus for stable spread
    } else if (variance > 2) {
      confidence *= 0.9; // Penalty for volatile spread
    }
  }

  return Math.min(1.0, Math.max(0.1, confidence));
}

/**
 * Select best model based on data availability and quality.
 */
export function selectBestModel(
  current: FactorData,
  historical: FactorData[],
  hasOptionChain: boolean,
): 'ols' | 'spread-quad' | 'ensemble' {
  // If we have option chain data, OLS is most reliable
  if (hasOptionChain && historical.length >= 15) {
    return 'ols';
  }

  // If spread is in good range, spread-quadratic is reliable
  if (current.spread > 0 && current.spread < 5) {
    return 'spread-quad';
  }

  // Default to ensemble for best of both worlds
  return 'ensemble';
}
