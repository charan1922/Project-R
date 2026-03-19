# R-Factor V4 Ensemble Engine

## Problem Statement

The V3 R-Factor engine (single OLS regression, LOO Pearson 0.60) has four key limitations:

1. **Range compression** — OLS predictions cap around 3.5, while TradeFinder shows values up to 5.0+. Extreme institutional activity is underrepresented in rankings.

2. **Outlier sensitivity** — Standard OLS is distorted by stocks like BIOCON (R=3.49 with low futures activity) and SAIL (high bid-ask, low options). A single anomalous Z-score can skew the entire prediction.

3. **Single-model fragility** — One model can't optimally handle both bhavcopy data (where all 5 factors are reliable) and live Dhan data (where only equity spread is accurate). The V3 spread-quadratic fallback is binary, with no blending.

4. **No momentum signal** — V3 treats each day independently. Multi-day patterns (accelerating spread, sustained turnover) that TradeFinder captures are invisible.

## Proposed Solution

Transform the engine from a single-model OLS to a confidence-weighted ensemble system with 8 improvements:

| Improvement | Impact |
|---|---|
| Ensemble model (OLS + spread-quad + momentum) | Combines strengths of each model |
| Scale correction (non-linear expansion) | Matches TradeFinder's 1.0–5.0+ range |
| Robust regression (Huber loss) | Reduces outlier distortion |
| Enhanced feature engineering | Adds acceleration, multi-day, close position |
| Market context adjustment | VIX, FII flows, breadth affect scores |
| Dhan-NSE calibration factors | Quantifies data source differences |
| Adaptive lookback window | Shorter for volatile, longer for stable stocks |
| Multi-day training infrastructure | Panel data for future coefficient retraining |

## Expected Performance

| Metric | V3 Baseline | V4 Target | Method |
|---|---|---|---|
| Pearson correlation | 0.60 | 0.66+ | Ensemble + scale correction |
| Top-10 overlap with TF | 7/10 | 8/10 | Better extreme value handling |
| Top-20 overlap | 13/20 | 16/20 | Momentum + robust regression |
| MAE | 0.35 | 0.28 | Multi-model averaging |
| Range maximum | ~3.5 | ~5.0 | Scale correction |

## Backward Compatibility

- `calculateSignal()` API unchanged (opts param is optional)
- `calculateSignalLive()` preserved for Dhan spread-quad path
- `data-service.ts` NOT modified (our version has scanLive/scanPast/option chain that V4 release lacks)
- `SignalOutput` expanded with new fields (`rawRFactor`, `scaledRFactor`, `confidence`, `marketAdjustment`) — all additive, no removals
- Existing `modelUsed: 'ols' | 'spread-quad'` expanded to include `'momentum' | 'ensemble'`

## Validation

- Python validation scripts: `derive-r/validate_v4_robust.py`, `derive-r/validate_v4_complete.py`
- Coefficients verified identical to V3 (1.108614, 0.624570, 0.076682, 0.226081, 1.414904, -1.733390)
- Multi-day training infrastructure: `derive-r/multi_day_training.py`

## Code Areas Affected

| File | Action |
|---|---|
| `lib/r-factor/types.ts` | Expanded — new interfaces, config, transform |
| `lib/r-factor/engine.ts` | Rewritten — ensemble + scale + robust + confidence |
| `lib/r-factor/ensemble.ts` | **New** — 3-model ensemble with confidence |
| `lib/r-factor/market-context.ts` | **New** — VIX/NIFTY/FII adjustments (neutral defaults) |
| `lib/r-factor/calibration.ts` | **New** — Dhan-NSE empirical factors |
| `lib/r-factor/index.ts` | Updated — re-exports new modules |
| `app/trading-lab/intraday-boost/_hooks/use-boost-data.ts` | Added `modelUsed`, `confidence` to UI type |
| `derive-r/validate_v4_robust.py` | **New** — Huber + ensemble validation |
| `derive-r/validate_v4_complete.py` | **New** — Full validation suite |
| `derive-r/multi_day_training.py` | **New** — Panel data training |
| `derive-r/V4_IMPROVEMENTS.md` | **New** — Implementation documentation |

## What Was NOT Changed

- `lib/r-factor/data-service.ts` — V4 release had OLD version without scanLive/scanPast/option chain. Our version is newer.
- `lib/r-factor/bhavcopy-service.ts` — Identical in V4 release.
- `lib/r-factor/stats.ts` — Identical in V4 release.
- `app/api/r-factor-history/route.ts` — No changes needed (accesses same `compositeRFactor`, `modelUsed` fields).
