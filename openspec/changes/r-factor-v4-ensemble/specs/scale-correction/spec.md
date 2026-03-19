# Scale Correction Specification

## Problem

V3 OLS predictions compress to a maximum of ~3.5, while TradeFinder shows values up to 5.0+. Stocks with extreme institutional activity are ranked correctly but their absolute scores are too low.

## Location

`lib/r-factor/engine.ts` → `applyScaleCorrection()` (private method)

## Formula

For `R > threshold`:
```
excess = R - threshold
expansion = 1 + (factor - 1) × tanh(excess)
R_scaled = threshold + excess × expansion
```

For `R ≤ threshold`: no change.

## Configuration

```typescript
scaleCorrection: {
  enabled: true,
  expansionThreshold: 2.5,  // Only expand above this
  expansionFactor: 1.5,     // Maximum expansion multiplier
}
```

## Properties

1. **Monotonic** — if R_a > R_b, then scaled(R_a) > scaled(R_b). Rankings are preserved.
2. **Bounded** — tanh(x) ∈ (0, 1), so expansion ∈ (1, factor). No blow-up.
3. **Smooth** — C∞ differentiable at the threshold junction.
4. **Identity below threshold** — values below 2.5 are unchanged.

## Example Values

| Raw R | Excess | tanh(excess) | Expansion | Scaled R | Delta |
|---|---|---|---|---|---|
| 2.5 | 0.0 | 0.0 | 1.0 | 2.50 | 0.00 |
| 3.0 | 0.5 | 0.462 | 1.231 | 3.12 | +0.12 |
| 3.5 | 1.0 | 0.762 | 1.381 | 3.88 | +0.38 |
| 4.0 | 1.5 | 0.905 | 1.453 | 4.68 | +0.68 |
| 4.5 | 2.0 | 0.964 | 1.482 | 5.46 | +0.96 |

## When Applied

- In `calculateSignal()`: after ensemble prediction + robust adjustment, before market context
- In `calculateSignalLive()`: after spread-quad prediction, before market context
- In `calculateSignalOLS()`: NOT applied (legacy path returns raw OLS)

## Return Value

```typescript
{ scaledRFactor: number; adjustment: number }
```

Both `rawRFactor` (before) and `scaledRFactor` (after) are stored in `SignalOutput`.

## Disabling

Set `scaleCorrection.enabled = false` in config. Returns `{ scaledRFactor: rawRFactor, adjustment: 0 }`.
