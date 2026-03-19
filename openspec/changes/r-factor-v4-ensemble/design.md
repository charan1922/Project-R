# R-Factor V4 Ensemble — Design Document

## Context

The R-Factor engine scores institutional activity in Indian F&O stocks by computing a composite score from equity spread, futures turnover/volume, PCR, and OI change. V3 uses a single OLS regression (Pearson 0.60 with TradeFinder). V4 introduces a multi-model ensemble to improve accuracy, handle outliers, and match TradeFinder's score distribution.

## Goals

1. Improve Pearson correlation from 0.60 to 0.66+ via ensemble averaging
2. Match TradeFinder's 1.0–5.0+ score range via scale correction
3. Reduce outlier distortion (BIOCON, SAIL cases) via Huber-like penalty
4. Add momentum/acceleration features for multi-day pattern detection
5. Prepare infrastructure for market-wide context adjustment (VIX, FII flows)
6. Quantify Dhan-NSE data differences with empirical calibration factors
7. Maintain full backward compatibility — no API changes, no data-service changes

## Non-Goals

- Live market context integration (NSE/BSE API). Returns neutral defaults for now.
- Dhan calibration applied in data-service.ts (left for future work).
- Retraining OLS coefficients. V4 uses the same V3 coefficients; multi-day training is infrastructure-only.
- UI changes to display new fields (rawRFactor, scaledRFactor, ensembleWeights). Only modelUsed and confidence surfaced.

## Design Decisions

### D1: Confidence-Weighted Ensemble Over Model Selection

**Decision:** Blend all three models (OLS, spread-quad, momentum) with confidence-weighted dynamic weights, rather than selecting one model per data source.

**Rationale:** Model selection (V3 approach: OLS for bhavcopy, spread-quad for Dhan) creates a hard boundary. Blending reduces variance because:
- When OLS is confident (good history, non-extreme values), it naturally dominates (base weight 50%)
- When spread data is poor, spread-quad confidence drops and its contribution shrinks
- Momentum model contributes only when enhanced features are available

**Base weights:** OLS 50%, Spread-Quad 30%, Momentum 20%.
**Dynamic adjustment:** Each model's weight is multiplied by its confidence score (0.1–1.0), then normalized to sum to 1.0.

**Trade-off:** Ensemble is slightly more expensive (3 predictions per stock vs 1), but with ~206 stocks and simple arithmetic this is negligible (~1ms total).

### D2: Non-Linear Scale Correction Over Linear Scaling

**Decision:** Apply `threshold + excess × (1 + (factor-1) × tanh(excess))` for R > 2.5, rather than a simple linear multiplier.

**Rationale:**
- Linear scaling (e.g., `R × 1.4`) would inflate ALL values, changing the relative ranking
- Tanh-based expansion is monotonic (preserves ranking), bounded (can't blow up to infinity), and only affects values above threshold
- At R=3.0, excess=0.5, expansion ≈ 1.23× → scaled ≈ 3.12
- At R=4.0, excess=1.5, expansion ≈ 1.41× → scaled ≈ 4.62
- Matches TradeFinder's observed distribution where top stocks reach 5.0+

**Configuration:**
```typescript
scaleCorrection: {
  enabled: true,
  expansionThreshold: 2.5,
  expansionFactor: 1.5,
}
```

### D3: Z-Score Shrinkage Over Full Huber Re-Estimation

**Decision:** Apply a Huber-like penalty that shrinks R-Factor when extreme Z-scores (|z| > 3) are present, blending 70% original + 30% penalized. NOT a full IRLS Huber regression.

**Rationale:**
- Full Huber re-estimation would require re-fitting coefficients at runtime (expensive, complex)
- The shrinkage approach is computationally trivial and achieves the practical goal: when a stock has one extreme Z-score (e.g., BIOCON with fut_volume Z=5.2), the prediction is damped rather than amplified
- 70/30 blend prevents over-correction while still reducing MAE on outliers

**Python validation:** `derive-r/validate_v4_robust.py` confirms improvement on BIOCON, SAIL, LAURUSLABS cases.

### D4: Enhanced Features as Optional Extension

**Decision:** `EnhancedFactorData` extends `FactorData`. The ensemble works with either type. Momentum model falls back to spread-quad when basic FactorData is provided.

**Rationale:**
- `transformToEnhancedFactorData()` requires raw `DailyStockData[]` (not available in all code paths)
- Making enhanced features mandatory would break `data-service.ts` which passes `FactorData` to the engine
- Graceful degradation: momentum confidence drops to 0.3 when using basic data, naturally down-weighting its contribution

### D5: Market Context Defaults to Neutral

**Decision:** `getMarketContext()` returns `{ niftyChange: 0, vixLevel: 15, fiiNetFlow: 0, diiNetFlow: 0, advanceDeclineRatio: 1.0 }` — no actual NSE/BSE API integration.

**Rationale:**
- NSE data requires session cookies (same Akamai issue as bhavcopy)
- VIX/FII data APIs are undocumented and rate-limited
- Neutral defaults mean: `vixLevel=15 < threshold=20` → no VIX penalty, `niftyChange=0 < threshold=2%` → no amplification, `fiiNetFlow=0` → no flow adjustment, `advanceDeclineRatio=1.0` → no breadth adjustment
- Net effect: market context has zero impact until integrated. Pure additive improvement path.

### D6: Calibration Factors as Constants, Not Applied

**Decision:** `calibration.ts` documents empirical Dhan-NSE differences but does NOT modify the data pipeline. `data-service.ts` continues using its existing lotSize division and VWAP-based turnover.

**Rationale:**
- The calibration factors (0.98× turnover, 1.02× equity volume) are small corrections
- Applying them would change R-Factor values for all live users immediately
- Better approach: use calibration factors to inform confidence scoring, then gradually integrate

### D7: Adaptive Lookback Exposed But Not Auto-Applied

**Decision:** `calculateAdaptiveLookback()` is a public method on `RFactorEngine` but is NOT automatically called by `calculateSignal()`. Callers must opt in.

**Rationale:**
- Auto-applying adaptive lookback would change R-Factor for every stock, making comparison with historical values difficult
- Exposing it as a method allows future integration (e.g., `data-service.ts` could call it before computing signals)
- Default lookback remains 20 days for reproducibility

### D8: OLS Coefficients Duplicated in engine.ts and ensemble.ts

**Decision:** Both files contain the same OLS coefficients. `engine.ts` uses them for `calculateCompositeOLS()` (legacy method). `ensemble.ts` uses them for `predictOLS()` (ensemble component).

**Rationale:**
- `engine.ts` needs coefficients for backward-compatible `calculateSignalOLS()` method
- `ensemble.ts` needs them independently to be a self-contained prediction module
- Extracting to a shared constants file would add a file for 6 numbers. Not worth the indirection.
- Coefficient changes require updating both files — documented in V4_IMPROVEMENTS.md

## Risks and Trade-offs

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Ensemble degrades for specific stocks | Medium | Low | `calculateSignalOLS()` preserved as fallback |
| Scale correction inflates false positives | Low | Medium | Only applies above 2.5, tanh-bounded |
| Market context integration breaks neutral | Low | High | Tested: default context produces zero adjustment |
| OLS coefficient drift between files | Low | High | Both checked in validation; documented |
| Enhanced features add latency | Low | Low | Only computed when `transformToEnhancedFactorData()` called |
| Momentum model overfits to recent data | Medium | Low | 20% weight cap, confidence-weighted |
