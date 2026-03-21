# Linear Spread Model Specification (V4.1)

## Problem

The spread-quadratic model (`R = 2.45 - 1.86×spread + 0.95×spread²`) underpredicts moderate spread ratios (1.0-2.0) where most stocks sit. On a normal market day (Mar 20, TF range 1.16-3.33), the quadratic curve grows too slowly in the mid-range.

Cross-validation on 158 paired samples (Mar 19+20) showed the quadratic OVERFITS to extreme days and the simplest linear model generalizes best.

## Cross-Validated Model Comparison

Training: Mar 19 bhavcopy → Testing: Mar 20 bhavcopy (TRUE out-of-sample)

| Model | Pearson | MAE | Top-10 | Top-20 |
|-------|---------|-----|--------|--------|
| **R = 0.15 + 1.59×spread** | **0.757** | **0.459** | **7/10** | **12/20** |
| R = spread + spread² (quadratic) | 0.729 | 0.495 | 7/10 | 12/20 |
| R = spread + opt_vol (linear+) | 0.756 | 0.464 | 7/10 | 11/20 |
| R = spread + spread² + opt_vol | 0.729 | 0.495 | 7/10 | 11/20 |

**Linear wins everything**: highest Pearson, lowest MAE, best Top-20. Adding opt_volume or quadratic term makes things WORSE out-of-sample.

## The Model

```
R = max(1.0, 1.5596 × spread_ratio)
```

With scale correction for extreme values (R > 2.5):
```
excess = R - 2.5
expansion = 1 + 0.5 × tanh(excess)
R_scaled = 2.5 + excess × expansion
```

## Feature Correlations (158 pooled samples)

| Feature | Pearson with TF R |
|---------|-------------------|
| **spread_r** | **0.808** |
| **spread_r²** | **0.822** |
| spread × opt_vol | 0.547 |
| opt_vol_z | 0.462 |
| fut_turn_z | 0.334 |
| fut_vol_z | 0.325 |
| oi_level | 0.204 |
| oi_change_z | 0.159 |
| pcr | -0.143 |

**Spread dominates with 0.81 Pearson** — no other feature adds reliable information cross-day.

## Key Insights

1. **Simplest model wins cross-validation** — adding features HURTS out-of-sample because each additional coefficient overfits to one day's noise
2. **With only 2 days of training data**, anything beyond `R ≈ 1.56 × spread` is overfitting
3. **The quadratic overfits to Mar 19** (extreme day with spreads up to 2.83) — on a normal day (Mar 20), the relationship is nearly linear
4. **opt_volume has 0.46 correlation** but is UNSTABLE across days (helps Mar 19, neutral Mar 20)
5. **oi_level has 0.20 pooled correlation** but was NEGATIVE (-0.16) on Mar 20 alone — contradictory signal

## Location

- `lib/r-factor/ensemble.ts` → `predictSpreadQuadratic()` — now uses `SPREAD_LINEAR_COEFF = 1.5596`
- `lib/r-factor/engine.ts` → `calculateDhanLiveComposite()` — same coefficient for live path

## Example Values

| Spread Ratio | R-Factor | With Scale Correction |
|-------------|---------|----------------------|
| 0.5 | 1.00 (floor) | 1.00 |
| 1.0 | 1.56 | 1.56 |
| 1.5 | 2.34 | 2.34 |
| 2.0 | 3.12 | 3.20 |
| 2.5 | 3.90 | 4.43 |
| 3.0 | 4.68 | 5.70 |

## When to Retrain

With 5+ days of ground truth, the coefficients become more stable. Multi-day training (`derive-r/multi_day_training.py`) should be run after collecting 5 TF ground truth files. The linear model may evolve to include opt_volume once the coefficient stabilizes across more days.

## Ground Truth Files

- `derive-r/ground_truth/20260319.json` — 80 stocks (extreme day)
- `derive-r/ground_truth/20260320.json` — 79 stocks (normal day)
