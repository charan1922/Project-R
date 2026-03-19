# Spec: Backtest Realism — Slippage, ATR Stops, VaR

## Overview

Enhances the backtest engine with realistic market friction modeling and volatility-based exit logic. Previously, the engine only modeled Indian transaction fees (STT, brokerage, GST). Now it includes slippage, drawdown circuit breakers, ATR trailing stops, and Value at Risk reporting.

## Feature Details

### Slippage Model

- Location: `lib/quant/backtest-engine.ts` → `simulateFromSignals()`
- Config: `BacktestConfig.slippageBps` (default: 5 = 0.05%)
- Buy execution: `buyPrice = close × (1 + slippageBps / 10000)`
- Sell execution: `sellPrice = close × (1 - slippageBps / 10000)`
- Applied symmetrically to both normal exits and forced close at last bar

### Drawdown Circuit Breaker

- Location: `lib/quant/backtest-engine.ts` → `simulateFromSignals()`
- Config: `BacktestConfig.maxDrawdownLimit` (default: 0 = disabled)
- Logic: Tracks peak portfolio value. When `(peak - current) / peak × 100 ≥ maxDrawdownLimit`, sets `circuitBreakerActive = true` for 10 bars
- During cooldown: new entries blocked, exits still execute normally
- After cooldown expires: entries resume, peak tracking continues

### ATR Function

- Location: `lib/quant/math-utils.ts` → `atr(highs, lows, closes, period)`
- True Range: `max(high-low, |high-prevClose|, |low-prevClose|)`
- Smoothing: Wilder method (alpha = 1/period), same as RSI smoothing
- Output: `number[]` with NaN for first `period-1` values
- Default period: 14

### ATR Trailing Stop (EMA Crossover Strategy)

- Location: `lib/quant/strategies/ema-crossover.ts`
- Config: `EMAParams.atrPeriod` (default: 0 = disabled), `EMAParams.atrMultiplier` (default: 2.0)
- Requires `highs[]` and `lows[]` arrays (passed from backtest engine)
- Entry: unchanged (EMA fast crosses above slow)
- Exit when enabled: `lows[i] ≤ trailingStop` where `trailingStop = max(prevStop, close - ATR × multiplier)`
- Exit when disabled: original EMA crossdown logic preserved
- Returns `stopLevels: number[]` array for visualization

### Value at Risk (VaR)

- Location: `lib/quant/backtest-engine.ts` → `calcMetrics()`
- Output: `BacktestResult.dailyVaR95`
- Method: Historical simulation (non-parametric)
- Calculation: Sort daily returns ascending, take value at 5th percentile index
- Interpretation: "5% chance of losing more than X% in a single day"

## API Contract

### `POST /api/quant/backtest`

New optional request body fields:
- `slippageBps: number` — default 5
- `maxDrawdownLimit: number` — default 0 (disabled)
- `params.atrPeriod: number` — default 0 (disabled, EMA crossover only)
- `params.atrMultiplier: number` — default 2.0 (EMA crossover only)

New response field:
- `dailyVaR95: number` — 95% daily VaR as percentage

## SQL Injection Fix

- Location: `app/api/historify/export/route.ts`
- Added `VALID_INTERVALS` set: `["Daily", "5min", "15min", "30min", "60min", "1min"]`
- Request rejected with 400 if interval not in whitelist
- Prevents injection via `WHERE interval = '${interval}'` in DuckDB query

## Constraints

- Slippage is static per trade, not volume-dependent (simplified model)
- ATR stops only available for EMA crossover strategy (other strategies unmodified)
- Circuit breaker cooldown is bar-count based, not calendar-day based
- VaR assumes historical returns are representative of future risk
