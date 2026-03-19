# Robust Regression Specification

## Problem

Standard OLS is sensitive to outliers. Stocks like BIOCON (high R-Factor from TradeFinder but low futures activity) have extreme Z-scores in one factor that distort the prediction for that stock AND (in training) for all stocks.

## Approach

Runtime Huber-like penalty on predictions when extreme Z-scores are detected. This is NOT a full IRLS Huber re-estimation — it's a Z-score shrinkage that dampens predictions when outlier signals are present.

## Location

`lib/r-factor/engine.ts` → `applyRobustAdjustment()` (private method)

## Algorithm

1. **Identify extremes:** Filter Z-scores where |z| > 3.0
2. **If no extremes:** Return R-Factor unchanged
3. **Compute penalty factor:** For each extreme Z-score:
   ```
   if |z| > epsilon (1.35):
     penalty *= epsilon / |z|  (linear penalty — shrinks toward zero)
   ```
4. **Blend:** `R_robust = R × (0.7 + 0.3 × penaltyFactor)`

## Interpretation

- When `penaltyFactor = 1.0` (no outliers): `R × 1.0 = R` (identity)
- When `penaltyFactor = 0.5` (moderate outlier): `R × 0.85` (15% reduction)
- When `penaltyFactor = 0.0` (extreme outlier): `R × 0.70` (30% reduction)
- Maximum reduction is 30% of R-Factor value

## Configuration

```typescript
robustRegression: {
  enabled: true,
  huberEpsilon: 1.35,  // Standard Huber threshold
}
```

## When Applied

- In `calculateSignal()`: after ensemble prediction, before scale correction
- NOT in `calculateSignalLive()` (spread-quad doesn't use Z-scores for R-Factor)
- NOT in `calculateSignalOLS()` (legacy path)

## Example: BIOCON Case

BIOCON has fut_volume Z=5.2 but low fut_turnover Z=0.3.

Without robust adjustment:
- OLS amplifies the extreme volume signal → R inflated

With robust adjustment:
- `extremeScores = [5.2]`
- `penaltyFactor = 1.35 / 5.2 = 0.26`
- `R_robust = R × (0.7 + 0.3 × 0.26) = R × 0.778`
- ~22% reduction, bringing prediction closer to TradeFinder

## Python Validation

`derive-r/validate_v4_robust.py` implements full Huber regression via IRLS and compares with the runtime shrinkage approach. The shrinkage achieves similar MAE improvement on outlier stocks.

## Disabling

Set `robustRegression.enabled = false` in config. The method returns R-Factor unchanged.
