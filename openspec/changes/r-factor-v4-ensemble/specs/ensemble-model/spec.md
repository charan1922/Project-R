# Ensemble Model Specification

## Overview

Three-model ensemble combining OLS regression, spread-quadratic, and momentum models. Confidence-weighted dynamic blending produces a single R-Factor prediction.

## Location

`lib/r-factor/ensemble.ts`

## Models

### 1. OLS Model (`predictOLS`)

**Formula:**
```
R = 1.108614 + 0.62457×spread_r + 0.076682×pcr_z
    + 0.226081×(spread_r × fut_turn_z) + 1.414904×fut_turn_z - 1.73339×fut_vol_z
```

**Inputs:** `FactorData` current + `FactorData[]` historical (for Z-score computation).

**Confidence scoring** (`calculateOLSConfidence`):
| Condition | Multiplier |
|---|---|
| History < 15 days | ×0.7 |
| Spread > 5 or < 0.1 | ×0.8 |
| PCR > 5 or (0 < PCR < 0.2) | ×0.9 |
| Zero futures volume/turnover | ×0.6 |
| Floor | 0.1 |

### 2. Spread-Quadratic Model (`predictSpreadQuadratic`)

**Formula (piecewise):**
```
spread ≤ 0:     R = 1.0 (data error)
0 < spread < 1: R = 1.0 + 0.5428×spread (linear ramp to junction)
spread ≥ 1:     R = 2.4491 - 1.8553×spread + 0.949×spread²
```

Junction value at spread=1.0: `2.4491 - 1.8553 + 0.949 = 1.5428`.

**Confidence scoring** (`calculateSpreadConfidence`):
| Condition | Confidence |
|---|---|
| Spread ≤ 0 | 0.1 |
| Spread > 5 | 0.5 |
| Spread ∈ [0.5, 3.0] | 1.0 |
| Historical variance < 0.5 | ×1.1 (bonus) |
| Historical variance > 2.0 | ×0.9 (penalty) |
| Clamped to | [0.1, 1.0] |

### 3. Momentum Model (`predictMomentum`)

**Requires:** `EnhancedFactorData` (with acceleration/multi-day features).

**Formula:**
```
baseR = 2.0 + (spread - 1.0) × 0.5
```

**Adjustments:**
| Signal | Condition | Adjustment |
|---|---|---|
| Spread acceleration | > 0.2 | +0.3 |
| Spread acceleration | < -0.2 | -0.2 |
| Turnover acceleration | > 0.5 | +0.2 |
| Multi-day above avg | spread > spread_3d_avg × 1.1 | +0.15 |
| Close near high | close_position > 0.7 | +0.1 |
| Close near low | close_position < 0.3 | -0.1 |

**Floor:** R ≥ 1.0.

**Confidence:** Proportion of momentum signals that are active (3 signals checked).

**Fallback:** When basic `FactorData` is provided (no enhanced features), momentum prediction copies spread-quad with confidence 0.3.

## Ensemble Blending (`predictEnsemble`)

### Base Weights (from `EngineConfig`)
| Model | Weight |
|---|---|
| OLS | 0.50 |
| Spread-Quadratic | 0.30 |
| Momentum | 0.20 |

### Dynamic Weighting
```
confidenceWeight[model] = baseWeight[model] × confidence[model]
normalizedWeight[model] = confidenceWeight[model] / Σ(confidenceWeights)
```

### Final Prediction
```
R_ensemble = Σ(prediction[model] × normalizedWeight[model])
confidence_ensemble = Σ(confidence[model] × normalizedWeight[model])
```

### Return Value
```typescript
{
  prediction: ModelPrediction,  // value, confidence, features
  weights: Record<string, number>,  // normalized weights used
}
```

## Model Selection Helper (`selectBestModel`)

Returns which single model to use (for cases where ensemble is not desired):
- Has option chain data + history ≥ 15 → `'ols'`
- Spread ∈ (0, 5) → `'spread-quad'`
- Otherwise → `'ensemble'`

## Dependencies

- `calculateZScore` from `./stats`
- `FactorData`, `EnhancedFactorData`, `EngineConfig` from `./types`
