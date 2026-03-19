# Enhanced Feature Engineering Specification

## Purpose

Extend the 7-factor `FactorData` with momentum, acceleration, and multi-day pattern features that capture temporal dynamics invisible to single-day analysis.

## Location

- Interface: `lib/r-factor/types.ts` → `EnhancedFactorData`
- Transform: `lib/r-factor/types.ts` → `transformToEnhancedFactorData()`
- Consumer: `lib/r-factor/ensemble.ts` → `predictMomentum()`

## EnhancedFactorData Interface

Extends `FactorData` with 10 additional fields:

### Acceleration Features

| Field | Formula | Purpose |
|---|---|---|
| `spread_acceleration` | `(today_spread / yesterday_spread) - 1` | Detect accelerating institutional activity |
| `volume_acceleration` | `(today_volume / yesterday_volume) - 1` | Identify momentum shifts in futures |
| `turnover_acceleration` | `(today_turnover / yesterday_turnover) - 1` | Confirm institutional money flow direction |

### Multi-Day Patterns

| Field | Formula | Purpose |
|---|---|---|
| `spread_3d_avg` | Mean of last 3 days' spread ratios | Smooth single-day noise |
| `turnover_3d_avg` | Mean of last 3 days' turnover | Baseline for turnover trend |
| `momentum_signal` | Composite of spread + turnover vs 3d avg | -1 (deteriorating), 0 (neutral), +1 (improving) |

### Volatility Measures

| Field | Formula | Purpose |
|---|---|---|
| `intraday_range_pct` | `(high - low) / VWAP_proxy` | Intraday volatility normalized by price |
| `close_position` | `(close - low) / (high - low)` | Where close sits in the range (0=low, 1=high) |

### Sector-Relative (Optional)

| Field | Formula | Purpose |
|---|---|---|
| `sector_relative_spread?` | `spread_z - mean(sector_spread_z)` | Activity relative to sector peers |
| `sector_relative_turnover?` | `turnover_z - mean(sector_turnover_z)` | Turnover relative to sector peers |

Sector-relative fields are populated by the caller (not by `transformToEnhancedFactorData`).

## Transform Function

`transformToEnhancedFactorData(daily: DailyStockData[]): EnhancedFactorData[]`

### Algorithm

1. Compute base `FactorData[]` via `transformToFactorData(daily)`
2. For each day `i`:
   - **Acceleration:** Compare day `i` value to day `i-1`. Division-based: `(current / previous) - 1`. Handles zero previous with fallback to 0.
   - **3-day averages:** Slice `[i-2, i+1)`, compute mean of spread and turnover.
   - **Momentum signal:** `calculateMomentumSignal(current, { spread: avg3d, turnover: avg3d })`
     - +1 if spread > avg × 1.1
     - -1 if spread < avg × 0.9
     - Same for turnover
     - Normalize: `sum / 2`, clamp to [-1, 1]
   - **VWAP proxy:** `eq_turnover / eq_volume` (or `eq_close` if volume=0)
   - **Close position:** `(close - low) / (high - low)` (or 0.5 if range=0)

### Edge Cases

| Case | Handling |
|---|---|
| Day 0 (no previous) | Acceleration = 0, previous = current |
| Zero previous value | Acceleration = 0 |
| Range = 0 (high = low) | Close position = 0.5 |
| Volume = 0 | VWAP proxy = eq_close |

## Momentum Signal Calculation

```typescript
function calculateMomentumSignal(current, avg): number {
  let signal = 0;
  if (current.spread > avg.spread * 1.1) signal += 1;
  else if (current.spread < avg.spread * 0.9) signal -= 1;
  if (current.fut_turnover > avg.fut_turnover * 1.1) signal += 1;
  else if (current.fut_turnover < avg.fut_turnover * 0.9) signal -= 1;
  return Math.max(-1, Math.min(1, signal / 2));
}
```

Possible values: -1, -0.5, 0, 0.5, 1.

## Usage in Ensemble

The momentum model (`predictMomentum`) uses:
- `spread_acceleration` — primary momentum signal
- `turnover_acceleration` — confirmation
- `spread_3d_avg` — multi-day pattern context
- `close_position` — close quality (near high = bullish)
- `momentum_signal` — composite trend indicator

When basic `FactorData` is provided to `predictEnsemble`, the momentum model receives a fallback prediction (copy of spread-quad with confidence 0.3).

## Python Validation

`derive-r/validate_v4_robust.py` → `calculate_enhanced_features()` computes the same features in Python for cross-validation against TradeFinder ground truth.
