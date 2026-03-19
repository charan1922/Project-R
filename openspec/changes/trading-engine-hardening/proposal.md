# Proposal: Trading Engine Hardening

## Why

External audit identified gaps in backtesting accuracy, position sizing, and risk management. The R-Factor engine tells WHAT to trade but not HOW MUCH or WHEN TO STOP. These are critical for real-money deployment.

## Priority Improvements

### P0 — Backtesting Accuracy

1. **Look-Ahead Bias Audit**: `transformToFactorData()` uses `daily.slice(lookbackStart, i)` for spread ratio. Must verify current-day data never leaks into lookback window. A single off-by-one error here means the backtest "knows the future."

2. **Slippage Modeling**: Backtest engine (`lib/quant/backtest-engine.ts`) models Indian fees (STT, brokerage, GST) but NOT:
   - Bid-ask spread penalty (dynamic per stock based on liquidity)
   - Market impact (order size degrading fill price)
   - These turn profitable scalping strategies into losers in live trading

### P1 — Position Sizing

3. **Kelly Criterion Integration**: R-Factor provides a confidence signal (1.0–5.0). Map this to optimal position size:
   ```
   f* = (p × b - q) / b
   where p = win probability from R-Factor confidence
   ```
   Use Half-Kelly for safety. Higher R-Factor = larger position, lower R = smaller.

### P2 — Risk Management

4. **Portfolio VaR Module**: Calculate maximum expected loss at 95% confidence. If real-time VaR exceeds threshold (e.g., 5% of capital), halt all new entries and unwind positions.

5. **Circuit Breaker**: If cumulative daily loss exceeds X% or if the algorithm detects it's contributing to unusual price movement in a low-liquidity stock, sever API connection automatically.

### P3 — Signal Enhancement

6. **Market Depth Analysis**: Dhan Quote returns bid/ask depth arrays. The bid-ask spread and order imbalance are leading indicators of institutional activity — currently ignored. Could improve R-Factor accuracy.

7. **Stationarity Testing**: Test if log-returns of spread ratio outperform raw ratio in the OLS model. Raw ratio may have non-stationary properties that degrade over time.

## What's Already Handled

- Secrets management (TOTP, .env.local, gitignored tokens) ✓
- Stale data prevention (abort controllers, debounce, data source badges) ✓
- Statistical validation (LOO CV, Pearson benchmarking against TradeFinder) ✓
- Fee modeling in backtest (STT, brokerage, stamp duty) ✓
- Persistent WebSocket connections for live data ✓

## Source

Based on external algorithmic trading audit document. Generic recommendations filtered to our specific architecture.
