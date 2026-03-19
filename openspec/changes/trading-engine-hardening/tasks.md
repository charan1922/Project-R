# Tasks: Trading Engine Hardening

## 1. Backtesting Realism

- [x] 1.1 Add `slippageBps` config option to `BacktestConfig` in `lib/quant/backtest-engine.ts`
- [x] 1.2 Apply slippage to buy price (`close × (1 + rate)`) and sell price (`close × (1 - rate)`) in `simulateFromSignals()`
- [x] 1.3 Wire `slippageBps` through API route `app/api/quant/backtest/route.ts`
- [x] 1.4 Fix SQL injection in `app/api/historify/export/route.ts` — add `VALID_INTERVALS` whitelist

## 2. Risk Management

- [x] 2.1 Add `maxDrawdownLimit` config option to `BacktestConfig`
- [x] 2.2 Implement drawdown circuit breaker in `simulateFromSignals()` — pause entries for 10 bars when DD exceeds threshold
- [x] 2.3 Add `dailyVaR95` field to `BacktestResult` interface
- [x] 2.4 Calculate 95% historical VaR (5th percentile of sorted daily returns) in `calcMetrics()`
- [x] 2.5 Wire `maxDrawdownLimit` through API route

## 3. ATR Indicator & Trailing Stops

- [x] 3.1 Implement `atr(highs, lows, closes, period)` function in `lib/quant/math-utils.ts` — True Range + Wilder smoothing
- [x] 3.2 Extend `EMAParams` with optional `atrPeriod` and `atrMultiplier` in `lib/quant/strategies/ema-crossover.ts`
- [x] 3.3 Add ATR trailing stop logic — trail upward only, exit when `low ≤ trailingStop`
- [x] 3.4 Preserve original EMA crossdown exit when `atrPeriod = 0` (backwards compatible)
- [x] 3.5 Pass `highs`/`lows` arrays from backtest engine to EMA strategy when ATR params present

## 4. Security Hardening

- [x] 4.1 Add Content-Security-Policy header to `next.config.ts` — `connect-src` locked to self + Dhan + Sentry
- [x] 4.2 Add `beforeSend` hook to `sentry.server.config.ts` — mask JWT tokens and scrub sensitive headers
- [x] 4.3 Add sync lock to `app/api/master-contracts/sync/route.ts` — return 409 on concurrent requests
- [x] 4.4 Add sync lock to `app/api/bhavcopy/sync/route.ts` — same pattern

## 5. Data Pipeline Robustness

- [x] 5.1 Add SSE heartbeat (`: heartbeat\n\n` every 30s) to `app/api/historify/live-stream/route.ts`
- [x] 5.2 Consolidate cleanup logic (heartbeat timer + client removal) into single `cleanup()` function
- [x] 5.3 Handle cleanup on both `cancel()` and `abort` signal paths

## 6. Future Work (Not Implemented)

- [ ] 6.1 Kelly criterion position sizing — map R-Factor confidence to optimal bet fraction
- [ ] 6.2 Regime-aware strategy filtering — only take EMA entries in Elephant/Cheetah regimes
- [ ] 6.3 Meta-labeling — train classifier on historical signal profitability
- [ ] 6.4 R-Factor alerts — browser/webhook notifications on blast trade detection
- [ ] 6.5 Paper trading mode — track hypothetical P&L of R-Factor signals
