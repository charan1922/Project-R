# Dhan-Live Model Specification

## Problem

The V4 ensemble (50% OLS + 30% spread-quad + 20% momentum) produces poor rankings on Dhan live data:
- OLS coefficient `fut_vol_z: -1.733` (suppressor) amplifies Z-score mismatches between Dhan and bhavcopy
- Even at 20% OLS weight, rankings degrade from 8/10 to 5/10 top-10 overlap with TradeFinder
- Spread-quad alone (using equity OHLC) gives unstable rankings throughout the day because intraday `(H-L)/LTP` fluctuates as LTP moves

## Key Discovery: OI Level vs OI Change

All TradeFinder top-5 stocks on Mar 19, 2026 had **sustained OI accumulation** (20-35% above 20-day average):

| Stock | TF Rank | TF R | OI vs 20d Avg | Our `oi_change_z` |
|-------|---------|------|---------------|-------------------|
| WAAREEENER | #1 | 5.459 | +25% | 0.15 (near zero!) |
| TATATECH | #2 | 5.018 | +5% | -0.54 |
| SBICARD | #3 | 4.577 | +33% | -0.37 |
| DELHIVERY | #4 | 3.834 | +27% | 0.02 |
| PREMIERENE | #5 | 3.814 | +35% | -0.45 |

**The existing `oi_change` (daily change) completely missed this signal.** A stock can accumulate OI for weeks with small daily changes that average to near-zero Z-scores.

## Solution: `oi_level` Factor

New factor added to `FactorData`:
```typescript
oi_level: number; // Absolute OI RATIO vs 20d avg — captures sustained accumulation
```

Computed in `transformToFactorData()`:
```typescript
const avgOi = lookback.reduce((sum, h) => sum + h.fut_oi, 0) / lookback.length;
oi_level = avgOi > 0 ? d.fut_oi / avgOi : 0;
```

Interpretation:
- `oi_level = 1.0` → OI at 20-day average (normal)
- `oi_level = 1.25` → OI 25% above average (accumulation)
- `oi_level = 0.75` → OI 25% below average (distribution)

## Dhan-Live Composite Formula

Location: `lib/r-factor/engine.ts` → `calculateDhanLiveComposite()`

```
R = 1.5
  + clamp(oi_level - 1.0, 0, 0.5) × 4.0     // OI 25% above → +1.0, 50%+ → +2.0
  + clamp(opt_volume_z, 0, 3.0) × 0.25        // High options volume → up to +0.75
  + clamp(fut_volume_z, 0, 3.0) × 0.20        // High futures volume → up to +0.60
  + clamp(spread_r - 0.8, 0, 2.5) × 0.30      // Above-average spread → up to +0.75
```

Output clamped to [1.0, 6.0].

**No scale correction applied** — the formula is already calibrated to TF's range.

## Feature Correlations with TradeFinder (79 stocks, Mar 19, 2026)

| Feature | Pearson with TF R |
|---------|-------------------|
| `opt_volume_z` | 0.47 (highest) |
| `fut_volume_z` | 0.39 |
| `fut_turnover_z` | 0.39 |
| `oi_change_z` | 0.27 |
| `spread_r` | -0.15 (negative intraday!) |
| `pcr` | -0.14 |

**Spread has NEGATIVE correlation with TF during afternoon** — stocks that already moved (high spread) are "priced in." TF's signal comes from OI/volume activity that precedes or accompanies the move.

## When Used

- `data-service.ts` → `computeLiveSignals()` → when option chain data is NOT available
- Called via `engine.calculateSignalLive(symbol, current, historical)`
- The `activeEngine` is used, so UI preset/robust overrides apply

## Performance

Tested against TradeFinder top-20 (Mar 19, 2026 afternoon):
- Within 0.5 of TF: 7/18
- Within 1.0 of TF: 14/18
- Top-10 overlap: 4-5/10 (varies with market conditions)

## Limitations

1. **Fitted on 1 day of data** — coefficients may not generalize. Multi-day training needed.
2. **OI level ratio has lag** — based on 20-day average, slow to respond to regime changes.
3. **False positives** — Stocks with high OI buildup but low TF rank (LODHA, PFC) inflate our scores.
4. **TF computes once per day** — their values are static while ours fluctuate with live data.

## Future Improvements

1. Collect 5+ days of TF ground truth → retrain with `multi_day_training.py`
2. Add intraday OI change tracking (Dhan charts API with `oi: true`)
3. Use previous day's close instead of LTP for spread calculation (more stable)
4. Weight `oi_level` higher during afternoon when spread correlation reverses
