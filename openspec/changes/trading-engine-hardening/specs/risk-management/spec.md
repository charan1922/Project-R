# Spec: Risk Management Primitives

## Overview

Adds foundational risk management to the backtest engine. Previously, metrics like Sharpe ratio and max drawdown were calculated post-facto only. Now the engine can actively limit risk during simulation and report probabilistic risk measures.

## Risk Primitives Implemented

### 1. Drawdown Circuit Breaker (Active Risk Control)

Controls position entry based on real-time portfolio drawdown during backtest simulation.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `maxDrawdownLimit` | number | 0 | Max drawdown % before pausing entries. 0 = disabled |

**State machine:**
```
NORMAL → (DD ≥ threshold) → COOLDOWN (10 bars) → NORMAL
```

- Tracks `peakValue`, `circuitBreakerActive`, `cooldownBarsLeft`
- Exits still execute during cooldown (only entries paused)
- Peak resets continue during cooldown

### 2. Value at Risk — 95% Historical (Post-Facto Metric)

Non-parametric VaR using the historical simulation method.

| Field | Type | Description |
|-------|------|-------------|
| `dailyVaR95` | number | 5th percentile of daily returns × 100 (negative %) |

**Calculation:**
1. Compute daily returns from equity curve: `(V[i] - V[i-1]) / V[i-1]`
2. Sort ascending
3. Take value at index `floor(N × 0.05)`
4. Multiply by 100 for percentage

**Interpretation:** A `dailyVaR95` of -2.1 means: "On 95% of days, the portfolio lost less than 2.1%. On the worst 5% of days, losses exceeded 2.1%."

### 3. Slippage (Friction Cost)

Degrades execution prices to model real-world fill quality.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `slippageBps` | number | 5 | Basis points of slippage per trade side |

**Impact on a ₹1000 stock at 5 bps:**
- Buy fills at ₹1000.50 (0.05% worse)
- Sell fills at ₹999.50 (0.05% worse)
- Round-trip cost: ~₹1.00/share (on top of fees)

## What's NOT Implemented Yet

| Feature | Why Deferred |
|---------|-------------|
| Kelly criterion sizing | Requires win rate estimation, which needs sufficient trade history |
| ATR-based position sizing | Different from ATR stops; sizes position inversely to volatility |
| Correlation-based hedging | Single-symbol backtest only; no portfolio-level simulation |
| Real-time VaR | No live execution; R-Factor is observational |
| Tail risk / CVaR | VaR is sufficient for backtest reporting |

## Files Modified

- `lib/quant/backtest-engine.ts` — `BacktestConfig`, `BacktestResult`, `simulateFromSignals()`, `calcMetrics()`
- `app/api/quant/backtest/route.ts` — Pass-through of new config fields
