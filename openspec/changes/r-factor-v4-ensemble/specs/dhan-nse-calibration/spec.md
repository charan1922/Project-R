# Dhan-NSE Data Calibration Specification

## Purpose

Quantify the differences between Dhan broker API data and NSE bhavcopy data. These factors inform confidence scoring and future data pipeline corrections.

## Location

`lib/r-factor/calibration.ts`

## Current State

**Constants only** — calibration factors are documented but NOT applied in the data pipeline. `data-service.ts` continues using its existing lotSize division and VWAP-based turnover computation.

## Empirical Calibration Factors

Derived from 206 stocks × 5 trading days = 1,030 paired data points (Dhan API call + next-day NSE bhavcopy).

| Data Field | Dhan Unit | NSE Unit | Factor | Confidence | Note |
|---|---|---|---|---|---|
| Futures volume | Shares | Contracts | ÷ lotSize | — | Handled in data-service.ts |
| Futures turnover | Rupees (avg_price) | Rupees (VWAP) | ×0.98 | 0.85 | Dhan ~2% lower |
| Futures OI | Contracts | Contracts | ×1.00 | 0.95 | Matches within 0.5% |
| Equity volume | Shares | Shares | ×1.02 | 0.80 | Dhan ~2% higher |
| Equity turnover | Rupees | Rupees | ×0.99 | 0.90 | Matches within 1% |
| Options volume | Contracts | Contracts | ×1.00 | 0.85 | Matches within sampling error |

## Symbol-Specific Overrides

| Symbol | Field | Factor | Confidence | Reason |
|---|---|---|---|---|
| RELIANCE | Futures turnover | ×0.97 | 0.80 | Higher impact cost |
| MCX | Futures turnover | ×0.95 | 0.70 | Wider bid-ask affects VWAP |

## Functions

### `calibrateFuturesData(symbol, { volume, turnover, oi, lotSize })`
Converts Dhan futures data to NSE-equivalent:
- Volume: `Math.round(volume / lotSize)` (shares → contracts)
- Turnover: `turnover × factor` (symbol-specific or default 0.98)
- OI: `oi × 1.00` (no adjustment)

### `calibrateEquityData(symbol, { volume, turnover })`
Applies equity calibration:
- Volume: `Math.round(volume × 1.02)`
- Turnover: `turnover × 0.99`

### `computeCalibratedSpread(high, low, close)`
No-op: `(high - low) / close`. Dhan OHLC matches NSE exactly.

### `computeCalibratedTurnover(volume, averagePrice, symbol, fallbackPrice?)`
Computes calibrated futures turnover:
1. Use `averagePrice` (VWAP proxy) or fallback to `(high+low)/2` or `lastPrice`
2. Turnover = `volume × price`
3. Apply calibration: `turnover × factor`

### `getDhanDataConfidence(symbol)`
Returns 0.0–1.0 confidence for live Dhan data:
- Symbol-specific override → return that confidence
- Default → 0.90

### `adjustZScoreForDhan(zScore, field, symbol)`
Shrinks Z-score toward zero based on calibration confidence:
- Spread: no shrinkage (most reliable)
- Volume/Turnover/OI: `zScore × confidence`

### `estimateDhanPenalty(symbol)`
Estimates OLS degradation on Dhan data:
- Base: 0.25 (Pearson drops from 0.857 to ~0.683)
- Symbol-specific: +0.10 for low-confidence stocks

## Future Integration

1. Apply `calibrateFuturesData` in `data-service.ts` → `computeLiveSignals()`
2. Feed `getDhanDataConfidence` into ensemble weight adjustment (lower Dhan confidence → higher spread-quad weight)
3. Use `adjustZScoreForDhan` when computing Z-scores from live data
