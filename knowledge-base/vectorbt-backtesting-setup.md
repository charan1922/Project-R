# VectorBT Backtesting (Project-R Integration)

> Python-based backtesting using VectorBT + TA-Lib, connected to Project-R's Dhan data and R-Factor signals.

---

## 1. What This Is

A Python backtesting layer that sits alongside the TypeScript trading platform. It uses:

- **VectorBT** — fast vectorized backtesting (portfolio simulation, stats, plots)
- **TA-Lib** — technical indicators (EMA, RSI, MACD, BBANDS, ATR, ADX)
- **Project-R adapter** (`backtesting/projectr/`) — bridges Dhan API, bhavcopy SQLite, and R-Factor signals to Python

No OpenAlgo or yfinance needed. Data comes from the same Dhan account and bhavcopy database the Next.js app uses.

---

## 2. Getting Started

### Step 1: Setup Environment

```
/setup
```

Select **"Indian Markets (Project-R / Dhan V2)"**. Creates a Python venv and installs all dependencies.

**Prerequisites**:
- Next.js dev server must have run at least once (`pnpm dev`) to generate the Dhan auth token
- Master contracts synced via `/trading-lab/master-contracts`
- Bhavcopy synced via `/trading-lab/bhavcopy` (needed for R-Factor signals)

### Step 2: Run a Backtest

```
/backtest ema-crossover RELIANCE
/backtest rsi SBIN
/backtest r-factor-filter RELIANCE
```

### Step 3: Compare Strategies

```
/strategy-compare SBIN ema-crossover rsi donchian
```

### Step 4: Optimize Parameters

```
/optimize ema-crossover RELIANCE
```

---

## 3. Available Strategies

| Strategy | Command | What It Does |
|----------|---------|-------------|
| EMA Crossover | `ema-crossover` | Fast EMA crosses slow EMA (default 10/20) |
| RSI | `rsi` | RSI(14) oversold buy / overbought sell |
| Donchian | `donchian` | Channel breakout (20-period) |
| Supertrend | `supertrend` | ATR-based trend following |
| MACD | `macd` | MACD signal-line crossover |
| SDA2 | `sda2` | SDA2 trend following |
| Momentum | `momentum` | Double momentum (MOM + MOM-of-MOM) |
| Dual Momentum | `dual-momentum` | Quarterly ETF rotation |
| Buy & Hold | `buy-hold` | Static allocation benchmark |
| RSI Accumulation | `rsi-accumulation` | Weekly RSI slab-wise buying |
| **R-Factor Filter** | `r-factor-filter` | **EMA crossover filtered by R-Factor > threshold** |

---

## 4. R-Factor Backtesting Patterns

This is the unique edge — using institutional activity signals as a backtesting filter.

### Pattern 1: Entry Filter

Only enter trades when R-Factor confirms institutional activity:

```python
rfactor_signal = rfactor.rfactor_entry_signal("SBIN", threshold=2.0)
ema_cross = signals.crossover(ema_fast, ema_slow)
entries = signals.exrem((rfactor_signal & ema_cross).fillna(False), exits)
```

**Why**: R-Factor > 2.0 means unusual institutional activity. Combining with technical signals filters out noise trades where there's no smart money backing the move.

### Pattern 2: Universe Screener

Rank all 207 F&O stocks, backtest only the top N:

```python
top = rfactor.rank_universe("2026-03-20", top_n=10)
for symbol in top["symbol"]:
    df = dhan_client.fetch_historical(symbol, start, end)
    # ... run strategy on each
```

**Why**: Focus capital on stocks where institutions are most active rather than scanning everything blindly.

### Pattern 3: Regime Switch

Adjust strategy aggression based on R-Factor regime:

| Regime | Conditions | What It Means | How To Trade |
|--------|-----------|---------------|-------------|
| Cheetah | R > 2.0, spread > 1.5, fut_vol Z > 1.0 | Fast institutional push | Tight stops, bigger size |
| Elephant | R > 1.5, turnover Z > 1.0 | Slow institutional accumulation | Wide stops, patient |
| Hybrid | Both above thresholds | Rare — both fast and heavy | Highest conviction |
| Defensive | Low R, low volume | No institutional interest | Small size or skip |

---

## 5. Indian Market Fee Model

| Segment | fees | fixed_fees | When To Use |
|---------|------|-----------|-------------|
| Delivery Equity | 0.00111 | 20 | Holding overnight (CNC) |
| Intraday Equity | 0.000225 | 20 | Same-day buy-sell (MIS) |
| Futures | 0.00018 | 20 | F&O futures |
| Options | 0.00098 | 20 | F&O options |

`fees` = percentage (STT + statutory). `fixed_fees` = Rs 20/order (broker flat fee).

### Index Lot Sizes (SEBI revised Dec 2025)

| Index | Lot Size | VectorBT Setting |
|-------|----------|-----------------|
| NIFTY | 65 | `min_size=65, size_granularity=65` |
| BANKNIFTY | 30 | `min_size=30, size_granularity=30` |
| FINNIFTY | 60 | `min_size=60, size_granularity=60` |
| MIDCPNIFTY | 120 | `min_size=120, size_granularity=120` |

---

## 6. Slash Commands Reference

| Command | What It Does | Example |
|---------|-------------|---------|
| `/setup` | Create Python venv + install deps | `/setup` |
| `/backtest` | Generate and run a strategy backtest | `/backtest ema-crossover SBIN NSE D` |
| `/optimize` | Parameter sweep with heatmaps | `/optimize ema-crossover RELIANCE` |
| `/quick-stats` | Inline stats (no file created) | `/quick-stats SBIN` |
| `/strategy-compare` | Side-by-side comparison | `/strategy-compare SBIN ema-crossover rsi donchian` |

Every backtest auto-generates: strategy vs NIFTY benchmark table, equity curve (Plotly dark theme), trades CSV export, and a plain-language report.
