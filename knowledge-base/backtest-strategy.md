# Backtest Strategy — TradeFinder Trade Validation

> How we validate our R-Factor signals against TradeFinder's real broker-verified option trades using 5-min historical data from Dhan.

---

## Strategy Overview

The backtest replays TradeFinder's (TF) actual trades against our R-Factor + ADX signals. For each trade, we answer:

1. **Would our signal have picked the same stock?** (stock match / top-10)
2. **Would we have picked the same direction — CE or PE?** (direction match via ADX)
3. **How does our simulated P&L compare to TF's actual broker P&L?**

---

## Data Pipeline

### Sources
- **Equity 5-min** — Dhan `/v2/charts/intraday` (OHLCV per stock per day)
- **Futures 5-min** — Dhan intraday with `oi: true` flag (for OI data)
- **Options 5-min** — Dhan intraday for specific strike + CE/PE
- **TF Trades** — `tradefinder_platform_trades.json` (286 trades, some with verified broker entry/exit)

### Storage
SQLite via Prisma — tables: `backtest_equity`, `backtest_futures`, `backtest_options`. Each row = one 5-min candle with symbol, date, OHLCV, OI.

### Timestamps
Dhan intraday returns **Unix timestamps** (seconds since 1970-01-01 UTC). Not Dhan epoch. IST conversion: `timestamp + 19800` (5h30m offset).

---

## Signal Computation (Per-Bar)

For each 5-min bar on a trading day:

### 1. Spread Ratio
```
intraday_spread = (running_high - running_low) / current_close
spread_ratio = intraday_spread / avg_daily_spread_20d
```
Where `avg_daily_spread_20d` = mean of `(day_high - day_low) / day_close` over the prior 20 trading days.

### 2. R-Factor
```
R = 1.56 × spread_ratio  (linear model, cross-validated Pearson 0.80)
```
Applied via the V4 ensemble with spread-quadratic at 90% weight.

### 3. ADX (7-period, intraday)
Uses `trading-signals` npm library (v7.4.3), 7-period ADX on 5-min bars:
- **+DI > -DI** → CE (bullish) direction
- **-DI > +DI** → PE (bearish) direction
- **ADX ≥ 28** → strong trend confirmation

### 4. Direction Signal
```
direction = plusDI > minusDI ? 'CE' : 'PE'
isHot = rFactor ≥ 2.0 && adx ≥ 28
```

---

## Trade Simulation

### Full Backtest Mode (20 trades)
Entry at **9:45 AM bar** (6th bar of the day). All available stocks ranked by spread ratio. Exit rules:
- **Stop-loss**: -30% of option premium
- **Profit target**: +100% (premium doubled)
- **Time exit**: last bar of day (3:25 PM)

### Trade Detail Mode (individual trade replay)
When verified broker data exists (entry_time, entry_price, exit_time, exit_price), we use the **exact verified values** — no estimation.

For unverified trades, entry bar is estimated by:
1. `findBarByTime()` — parses "10:17:46 AM" → finds the 5-min bar that contains this time
2. Spot price matching — if only spot price known, find the bar where equity close ≈ spot price
3. Default — 9:45 AM bar

### Bar-Time Matching (`findBarByTime`)
```
"10:17:46 AM" → 10:17 → 617 minutes since midnight
Find bar where barMinutes ≤ 617 < barMinutes + 5
→ Matches 10:15 AM bar (615-619 minutes)
```
This ensures entry/exit markers on charts point to the **correct candle**, not a price-matched one.

---

## Commission Model (ExpiryFlow port)

Realistic Indian market charges applied to each simulated trade:

| Component | Rate |
|-----------|------|
| Brokerage | ₹40 flat (₹20/order × 2 legs) |
| STT (sell) | 0.0625% of sell turnover |
| Exchange | 0.0495% of total turnover |
| GST | 18% of (brokerage + exchange) |
| SEBI | ₹10/crore of turnover |
| Stamp duty | 0.003% of buy turnover |

---

## Results (NATIONALUM CE 390 — Mar 17, 2026)

**Verified broker trade:**
- Entry: 10:17:46 AM @ ₹10.15 (1 lot = 3,750 qty)
- Exit: 03:25:32 PM @ ₹15.55
- Capital: ₹38,063
- TF P&L: ₹20,250
- Return: 53.2%

**Our simulation:**
- Entry bar: 10:15 AM (correctly matched via `findBarByTime`)
- P&L curve tracks TF's actual ₹20,250 closely (our sim: ₹21,938)
- R-Factor at entry: 1.30 → rises to 2.55 by EOD
- ADX at entry: 8 → rises to 80+ by 11:00 AM

**Aggregate (20 trades):**
- Our total P&L: ₹1,43,778
- Win rate: 80% (16/20)
- Direction accuracy: 90%
- TF stock in our top 10: 80%

---

## Visualization (Trade Detail Page)

Four chart panels for each trade, built with Lightweight Charts v5:

1. **Option Candlestick** — OHLC candles with BUY/SELL markers, entry/exit price lines, volume histogram
2. **Equity Candlestick** — Underlying stock with entry/exit markers at corresponding times
3. **R-Factor + ADX** — Dual-axis: R-Factor (blue, left axis) + ADX (amber, right axis) with reference lines at R=2.0 and ADX=28
4. **P&L Curve** — Cumulative P&L from entry with TF's actual P&L as dashed reference line

Plus a bar-by-bar signal table with time, equity price, spread, R-Factor, ADX, +DI, -DI, direction, and option price. Table auto-scrolls to the entry row on load.

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/backtest/backtest-evaluator.ts` | Core: `runFullBacktest()`, `getTradeDetail()`, `findBarByTime()` |
| `lib/backtest/data-downloader.ts` | Downloads 5-min data from Dhan, loads TF trades from JSON |
| `lib/backtest/duckdb-schema.ts` | SQLite (Prisma) queries for backtest tables |
| `tradefinder_platform_trades.json` | TF's 286 trades with optional verified broker data |
| `app/trading-lab/ai-autopilot/backtest/page.tsx` | Page: data status, download controls |
| `backtest/_components/trade-detail.tsx` | Trade detail section with charts + signal table |
| `backtest/_components/option-chart.tsx` | Candlestick chart (option + equity) |
| `backtest/_components/signal-chart.tsx` | R-Factor + ADX dual-axis chart |
| `backtest/_components/pnl-chart.tsx` | P&L curve chart |
| `backtest/_components/trade-search.tsx` | Autocomplete trade selector with keyboard nav |
| `backtest/_lib/types.ts` | Shared TypeScript interfaces |

---

## Learnings

1. **Spread ratio is the dominant predictor** — 90% weight in ensemble matches 8/10 of TF's top-10 stocks
2. **ADX needs ~30 bars** to stabilize on 5-min data — early bars show ADX=0 or erratic values
3. **Dhan timestamps are Unix** — an earlier bug subtracted Dhan epoch offset (1980), producing dates 10 years in the past
4. **Verified broker data is sacred** — when we have exact entry_time/entry_price, display as-is, never substitute with bar timestamps or computed approximations
5. **`findBarByTime` > price matching** — matching by verified time (10:17 → 10:15 bar) is correct; matching by price found wrong bars
6. **Commission impact is real** — ₹800-1,200 per trade in charges, ~4-6% of typical trade size
