# Project-R Data Source

Project-R adapter provides Dhan V2 API, SQLite bhavcopy, and R-Factor signals for backtesting.
Located at `backtesting/projectr/`. No OpenAlgo server required.

## Detection

If `backtesting/projectr/` exists in the project root, use it as the primary data source for Indian market backtesting.

## Environment

- Auth token shared with Next.js server via `data/.dhan-token.json`
- Env vars from `.env.local` (Next.js convention), fallback to `.env`
- Required: `DHAN_CLIENT_ID`. Optional: `DHAN_ACCESS_TOKEN` (fallback if cached token expired)

## Modules

### dhan_client — Dhan V2 API

```python
from projectr import dhan_client

# Daily OHLCV + OI
df = dhan_client.fetch_historical("RELIANCE", "2025-01-01", "2026-03-20")

# 5-min intraday candles
df = dhan_client.fetch_intraday("RELIANCE", "2026-03-20", "2026-03-20", interval="5")

# NIFTY 50 benchmark
bench = dhan_client.fetch_benchmark("2025-01-01", "2026-03-20")

# Symbol -> securityId resolution
sec_id = dhan_client.resolve_security_id("RELIANCE")

# Lot size for futures
lot = dhan_client.resolve_lot_size("RELIANCE")
```

Rate limit: 4 req/sec (0.25s delay built-in). All DataFrames have tz-naive DatetimeIndex.

### bhavcopy — SQLite Bhavcopy Bridge

```python
from projectr import bhavcopy

# Per-symbol history (equity OHLCV + F&O columns)
df = bhavcopy.load_symbol("RELIANCE", days=25)
# Columns: high, low, close, volume, turnover,
#           fut_oi, fut_oi_change, fut_volume, fut_turnover,
#           opt_volume, opt_oi, ce_volume, pe_volume, pcr

# All symbols for a date
df = bhavcopy.load_date("2026-03-20")

# Available dates
dates = bhavcopy.available_dates()
```

Data source: `data/project-r.db` (SQLite, BhavcopyDay table). ~206 stocks x 40+ days.
Synced via web UI at `/trading-lab/bhavcopy`.

### rfactor — R-Factor V4 Ensemble

```python
from projectr import rfactor

# Rank all F&O stocks by R-Factor for a date
top_stocks = rfactor.rank_universe("2026-03-20", top_n=10)

# Boolean entry signal for vectorbt (True when R > threshold)
entries = rfactor.rfactor_entry_signal("RELIANCE", threshold=2.0, lookback=25)

# Low-level: compute from raw data list
result = rfactor.compute_rfactor(daily_data_list)
# Returns: RFactorResult(r_factor, scaled_r, confidence, regime, is_blast, z_scores)
```

### universe — F&O Stock Universe

```python
from projectr import universe

stocks = universe.get_fno_stocks()          # 207 F&O symbols
sectors = universe.get_sector_map()          # {symbol: sector}
it_stocks = universe.get_stocks_by_sector("IT")
```

### signals — Signal Utilities

```python
from projectr import signals

entries = signals.exrem(buy_raw.fillna(False), sell_raw.fillna(False))
exits = signals.exrem(sell_raw.fillna(False), buy_raw.fillna(False))
cross_up = signals.crossover(fast_ema, slow_ema)
cross_dn = signals.crossunder(fast_ema, slow_ema)
```

## Data Source Priority

1. **Bhavcopy SQLite** (fast, local, no API calls) — preferred for R-Factor and historical analysis
2. **Dhan API** (live, rate-limited) — for multi-year OHLCV or intraday data beyond bhavcopy range
3. **Dhan benchmark** — NIFTY 50 always via Dhan API (securityId=13)

## R-Factor Integration Patterns

### Pattern 1: Entry Filter

Combine R-Factor with a technical indicator — only take entries when R > threshold:

```python
rfactor_signal = rfactor.rfactor_entry_signal("SBIN", threshold=2.0)
ema_cross = signals.crossover(ema_fast, ema_slow)
entries = signals.exrem((rfactor_signal & ema_cross).fillna(False), exits.fillna(False))
```

### Pattern 2: Universe Screener

Rank stocks daily, backtest only the top N:

```python
top = rfactor.rank_universe("2026-03-20", top_n=10)
for symbol in top["symbol"]:
    df = dhan_client.fetch_historical(symbol, start, end)
    # ... run strategy on each
```

### Pattern 3: Regime Switch

Adjust strategy parameters based on R-Factor regime:

```python
result = rfactor.compute_rfactor(daily_data)
if result.regime == "Cheetah":
    sl_pct, size_pct = 0.015, 0.80  # Tight stops, bigger size
elif result.regime == "Elephant":
    sl_pct, size_pct = 0.02, 0.60
else:
    sl_pct, size_pct = 0.03, 0.40   # Conservative
```

## Fees

Use the same Indian market fees as the standard skill templates:
- Delivery equity: `fees=0.00111, fixed_fees=20`
- Intraday equity: `fees=0.000225, fixed_fees=20`
- Futures: `fees=0.00018, fixed_fees=20`

## Differences from OpenAlgo

| Feature | OpenAlgo | Project-R |
|---------|----------|-----------|
| Server | Separate localhost:5000 | No server (direct API/SQLite) |
| Auth | API key | Cached JWT from .dhan-token.json |
| Env file | `.env` | `.env.local` (fallback .env) |
| Benchmark | `NSE_INDEX` exchange | Dhan securityId 13 |
| F&O universe | Manual | `fno_stocks_list.json` (207 stocks) |
| R-Factor | Not available | Built-in V4 ensemble |
