# Signal Direction Fix Specification

## Problem

The UP/DOWN signal indicator used `spread > 1.2` (range SIZE) instead of actual price direction. A stock crashing -5% with a wide spread showed as "UP" because the spread ratio was above 1.2. This was incorrect — R-Factor measures institutional ACTIVITY intensity, not direction.

## Affected Locations (all in `app/trading-lab/intraday-boost/page.tsx`)

| Location | Before (Bug) | After (Fixed) |
|----------|-------------|---------------|
| Signal filter buttons | `spread > 1.2` / `spread <= 1.2` | `pctChange >= 0` / `pctChange < 0` |
| Stats counter (upSignals) | `spread > 1.2` count | `pctChange >= 0` count |
| StockRow arrow icon | `spread > 1.2` | `pctChange >= 0` |
| Info footer text | "Signal UP when spread > 1.2×" | "Signal direction based on % price change" |

## NOT Changed (Correct Usage)

- `lib/ai-trading/signal-collector.ts`: `spread > 1.3` used for signal QUALITY check (activity threshold), not direction
- `lib/r-factor/engine.ts`: spread in confidence scoring — measures factor agreement, not direction
- Spread display coloring in StockRow — UI-only, shows spread magnitude

## UI Controls Removal

The engine preset radio buttons (Spread-Quad 90% vs Balanced OLS 50%) and Robust Regression checkbox were also removed in this change. Reason: no combination beats the default (Spread-Linear 90%, Robust OFF). The controls created false confidence — users could switch to settings that strictly degraded accuracy.

The API params (`?preset=balanced&robust=true`) remain available for debugging.

## Verification

- MCX (-4.81%) → RED down arrow, appears in DOWN filter
- JSWSTEEL (+3.32%) → GREEN up arrow, appears in UP filter
- Stats "Up Signals" count matches actual positive-% stocks
