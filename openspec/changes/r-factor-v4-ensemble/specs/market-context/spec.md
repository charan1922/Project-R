# Market Context Specification

## Purpose

Adjust R-Factor scores based on market-wide conditions. High VIX reduces signal reliability, strong market moves amplify directional signals, FII selling dampens scores, poor breadth reduces all scores.

## Location

`lib/r-factor/market-context.ts`

## Current State

**Returns neutral defaults** — no live NSE/BSE API integration. All adjustments evaluate to zero with default context.

```typescript
{
  niftyChange: 0,       // No move → no amplification
  vixLevel: 15,         // Below threshold 20 → no VIX penalty
  fiiNetFlow: 0,        // Zero → no FII adjustment
  diiNetFlow: 0,        // (not used in adjustments yet)
  advanceDeclineRatio: 1.0,  // Neutral → no breadth adjustment
  marketTimestamp: new Date().toISOString(),
}
```

## MarketContext Interface

```typescript
interface MarketContext {
  niftyChange: number;        // Daily % change
  vixLevel: number;           // India VIX
  fiiNetFlow: number;         // Net buy/sell in ₹ crores
  diiNetFlow: number;         // Net buy/sell in ₹ crores
  advanceDeclineRatio: number; // advances / declines
  marketTimestamp: string;     // ISO timestamp
}
```

## Adjustment Rules (`adjustForMarketContext`)

| Rule | Condition | Multiplier | Example |
|---|---|---|---|
| VIX penalty | VIX > `highVix` (20) | ×(1 - min(0.15, (VIX-20)×0.01)) | VIX=25 → ×0.95 |
| Market amplification | |NIFTY%| > `strongMarketMove` (2%) AND R > 2.0 | ×(1 + min(0.1, |NIFTY%|×0.02)) | NIFTY +3% → ×1.06 |
| FII selling | FII < -500cr | ×0.95 | FII -800cr → ×0.95 |
| FII buying | FII > +500cr | ×1.05 | FII +1000cr → ×1.05 |
| Poor breadth | A/D < 0.5 | ×0.90 | A/D 0.3 → ×0.90 |
| Strong breadth | A/D > 2.0 | ×1.05 | A/D 2.5 → ×1.05 |

All multipliers are cumulative: `adjustedR = rawR × m1 × m2 × m3 × m4`.

## Return Value

```typescript
{
  adjustedRFactor: number,
  adjustment: number,    // adjustedR - rawR
  reason: string[],      // Human-readable explanation of each adjustment
}
```

## Market Regime Classification (`classifyMarketRegime`)

| Condition | Regime |
|---|---|
| VIX > 20 AND NIFTY < 0 | `'volatile'` |
| NIFTY > 1% AND A/D > 1.5 | `'bull'` |
| NIFTY < -1% | `'bear'` |
| Otherwise | `'neutral'` |

## Position Sizing (`getPositionSizeMultiplier`)

| Regime | Multiplier |
|---|---|
| Bull | 1.2× |
| Bear | 0.7× |
| Volatile | 0.5× |
| Neutral | 1.0× |

## Caching

- Cached per trading day (IST date string)
- `clearMarketContextCache()` forces re-fetch
- `setMarketContext()` allows manual override (for testing)

## Future Integration Path

1. Fetch NIFTY 50 OHLC from Dhan (already have API access)
2. Fetch India VIX from NSE (requires session cookie like bhavcopy)
3. Fetch FII/DII data from NSDL/BSE (public PDFs, needs scraping)
4. Calculate advance/decline from market-wide data (Dhan doesn't provide this)
