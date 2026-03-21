# R-Factor V4 Journey — From Signal to Backtest

> Complete record of the R-Factor V4 development, TradeFinder validation, AI trading integration, and backtest results. March 19-22, 2026.

---

## 1. V4 Ensemble Integration (Mar 19)

### What was done
Integrated the V4 release code into the existing V3 engine. Three new files (ensemble, market-context, calibration) + merged types and engine.

### Key V4 additions
- **3-model ensemble**: OLS (5-factor regression) + Spread-Quadratic + Momentum
- **Scale correction**: Non-linear expansion for R > 2.5 to match TradeFinder's 1.0-5.0+ range
- **Robust regression**: Huber-like penalty for outlier Z-scores (later disabled)
- **Enhanced features**: Acceleration, multi-day patterns, close position
- **Market context**: VIX/NIFTY/FII adjustments (neutral defaults — no NSE API yet)
- **Dhan-NSE calibration**: Empirical factors for data source differences (documented, not applied)

### Coefficients verified identical to V3
```
OLS: R = 1.108614 + 0.62457×spread + 0.077×pcr_z + 0.226×(spread×turn_z) + 1.415×turn_z - 1.733×vol_z
Spread-quad: R = 2.4491 - 1.8553×spread + 0.949×spread²
```

---

## 2. TradeFinder Comparison — Day 1 (Mar 19)

### First comparison at 13:22 IST
- **8/10 top-10 overlap** with spread-quad model at 90% weight
- WAAREEENER: our R=5.93 vs TF 5.46 (close!)

### Afternoon collapse (14:30+ IST)
- **1/10 top-10 overlap** — rankings collapsed as spreads normalized
- Root cause: spread ratio = (H-L)/LTP fluctuates as LTP moves intraday

### Key discoveries
1. **TF's R-Factor is STATIC** — same values across 4 snapshots despite LTP changing
2. **TF likely uses previous day's close** for spread denominator (not live LTP)
3. **OLS at 50% weight DEGRADES rankings** — negative fut_vol_z coefficient amplifies Dhan Z-score mismatches
4. **Robust regression PENALIZES top stocks** — they have extreme Z-scores indicating genuine institutional activity

### OI Level discovery
All TF top-5 stocks had **25-35% OI buildup** above 20-day average, but our `oi_change_z` was near zero for most. Reason: `oi_change` measures daily change, not sustained accumulation.

**New feature added**: `oi_level = today's_OI / 20d_avg_OI` — captures what daily change misses.

---

## 3. Model Tuning (Mar 19-20)

### Optimal configuration found
```typescript
ensembleWeights: { ols: 0.05, spreadQuad: 0.90, momentum: 0.05 }
robustRegression: { enabled: false }
scaleCorrection: { enabled: true, threshold: 2.5, factor: 1.5 }
```

### Why this works
| Config | Top-10 | Why |
|--------|--------|-----|
| **SQ 90% + Robust OFF** | **8/10** | Spread-quad matches TF's spread-dominated model |
| OLS 50% + Robust OFF | 5/10 | OLS suppressor drags down high-activity stocks |
| OLS 50% + Robust ON | 4/10 | Worst — both OLS drag + penalty |

---

## 4. Cross-Validated Linear Model (Mar 20)

### 2-day pooled analysis (158 samples: Mar 19 + Mar 20)
Tested 8 model specifications with train-on-one-day, test-on-other cross-validation.

**Best CV model**: `R = 1.56 × spread_ratio` (Pearson 0.80, Top-10 7.5/10)

- Linear beats quadratic on CV (0.80 vs 0.79) — quadratic overfits to extreme days
- Adding opt_volume doesn't improve CV (0.80 vs 0.80) — unstable across days
- Adding oi_level HURTS on Mar 20 (negative correlation -0.16)

### Feature correlations (pooled 158 samples)
| Feature | Pearson | Role |
|---------|---------|------|
| spread² | 0.82 | Highest pooled (but overfits) |
| spread | 0.81 | Best cross-validated |
| spread × opt_vol | 0.55 | Interaction |
| opt_volume | 0.46 | Secondary |
| fut_turnover | 0.33 | Moderate |
| fut_volume | 0.32 | Moderate |
| oi_level | 0.20 | Weak positive (pooled), negative on single day |

---

## 5. Dhan-Live Model for Intraday (Mar 19)

### Problem
Spread-quad works for bhavcopy (EOD) but intraday spread correlation reverses in the afternoon.

### Solution
Fitted a composite model from 79 TF-paired stocks using Dhan live features:
```
R = 1.5 + oiExcess × 4.0 + optVolBoost × 0.25 + futVolBoost × 0.20 + spreadBoost × 0.30
```

**Performance**: 5/10 top-10, 14/18 within 1.0 of TF. More stable than spread-quad throughout the day.

### Later replaced
Cross-validation showed that `R = 1.56 × spread` also works for the live path. The Dhan-live composite was replaced with the same linear model for consistency.

---

## 6. ADX Integration (Mar 20)

### Library
`trading-signals` npm package (v7.4.3, Jan 2026, native TypeScript)

### Two ADX modes
- **Past tab**: Daily ADX (14-period) from bhavcopy OHLC
- **Live tab**: 5-min ADX (7-period) from Dhan intraday candles (top 20 stocks only)

### ADX thresholds
| ADX | Meaning | UI Display |
|-----|---------|------------|
| ≥ 28 | Strong trend | Amber bold + "T" badge |
| 20-28 | Moderate | Normal text |
| < 20 | Weak/no trend | Dimmed |

### HOT stock criteria
R-Factor ≥ 2.0 **AND** ADX ≥ 28 **AND** |%change| ≥ 1%
→ Row gets amber left border + fire icon

---

## 7. AI Trading Module (Mar 20)

### Architecture: 5-layer pipeline
```
Signal Collector → AI Analyzer (DeepSeek) → Decision Engine → Risk Manager → Executor
```

### Technology
- **Vercel AI SDK** (`ai` v6.0) + `@ai-sdk/openai-compatible`
- **DeepSeek** via AI Gateway for structured output (BUY/SELL/HOLD with confidence + rationale)
- **Zod schema** for type-safe AI responses

### Safety defaults
- Paper trading ON
- Entry window: 9:45-11:00 IST
- ADX ≥ 28 mandatory for entry
- Force exit: 15:10 IST
- Max daily loss: 5%

---

## 8. ExpiryFlow Option Trading Integration (Mar 22)

### What ExpiryFlow provides (ported from Python to TypeScript)
- **Commission model**: Brokerage ₹20 + STT 0.1% + Exchange 0.04% + GST 18% + SEBI ₹10/Cr + Stamp 0.004%
- **Strike resolution**: `resolveOptionSecurity()` via Prisma raw SQL on 92K OPTSTK contracts
- **Strike steps**: Static map for 50+ stocks (RELIANCE=20, SBIN=5, HDFCBANK=25, etc.)

### Option trading flow
```
R-Factor (which stock?) → ADX (+DI/-DI = CE or PE?) → nearestStrike(spot, step)
→ resolveOptionSecurity(symbol, strike, CE/PE) → AI analysis → Risk check → Execute
```

---

## 9. Signal Validation (Mar 20)

### Test: Our signals vs TF's last 20 actual trades

| Metric | Result |
|--------|--------|
| Exact stock match (#1 = TF pick) | 5/20 (25%) |
| TF stock in our top 10 | 13/20 (65%) |
| Direction match (CE/PE from ADX) | 13/20 (65%) |

### Key finding
TF doesn't always pick the #1 R-Factor stock. They pick mid-tier stocks with additional signals we can't capture. Direction match is better (65%) but daily ADX lags on reversal days.

---

## 10. Full 5-min Backtest (Mar 22)

### Data downloaded
| Data Type | Rows | Stocks |
|-----------|------|--------|
| Equity 5-min OHLCV | 73,950 | 17 |
| Futures 5-min + OI | 66,318 | 17 |
| Options 5-min + OI | 31,735 | 17 ATM contracts |
| **Total** | **172,003** | — |

### Backtest results (replaying 20 TF trade dates)

| Metric | Our Strategy | TradeFinder |
|--------|-------------|-------------|
| **Total P&L** | **₹1,43,778** | ₹2,99,572 |
| **Win Rate** | **80% (16/20)** | 85% (17/20) |
| **Direction Accuracy** | **90% (18/20)** | — |
| **TF stock in Top 10** | **85% (17/20)** | — |
| **Stock Match** | 20% (4/20) | — |

### Trade-by-trade highlights
- **Best trade**: MAZDOCK CE → +₹46,600 (profit target hit, 100% premium gain)
- **Worst trade**: PERSISTENT PE → -₹61,900 (high-premium option, time exit at loss)
- **4 exact stock matches**: COLPAL, ONGC, ABB, POWERGRID
- **Profit target hits**: 4 trades doubled the option premium

### Methodology
1. At 9:45 AM bar: rank all 17 stocks by intraday spread ratio
2. Pick top-1 stock, direction from 5-min ADX(7) +DI/-DI
3. Enter TF's ATM option at 9:45 bar close price
4. Exit on: profit target (100% gain) / stop-loss (30% drop) / time (last bar)
5. Commission-adjusted P&L using ExpiryFlow's fee model

---

## 11. Technical Debt & Bugs Fixed

### Spread direction bug
`spread > 1.2` was used for UP/DOWN signal direction. Spread measures range SIZE, not price DIRECTION. Fixed to use `pctChange >= 0` for UP and `pctChange < 0` for DOWN.

### Regime classification
Stocks with ADX ≥ 28 and R ≥ 2.0 were showing "Defensive" because regime didn't consider ADX. Fixed with UI-level override: ADX-confirmed trend → Cheetah (bullish) or Hybrid (bearish).

### Dhan timestamp epoch
Dhan intraday API returns Unix timestamps (since 1970), NOT Dhan epoch (since 1980). Our code was subtracting the 1980 offset, producing dates 10 years in the past. Fixed by passing raw timestamps through.

### DuckDB vs SQLite
DuckDB module isolation in Turbopack caused data written by one route to be invisible to another. Switched to SQLite (Prisma) for backtest data storage. SQLite handles 172K rows fine for our query patterns.

---

## 12. Ground Truth Collection

### Files saved
- `derive-r/ground_truth/20260319.json` — 80 TF stocks with R-Factor
- `derive-r/ground_truth/20260320.json` — 79 TF stocks with R-Factor
- `tradefinder_platform_trades.json` — 293 TF option trades (May 2025 → Mar 2026)

### Multi-day training infrastructure
`derive-r/multi_day_training.py` — panel data builder + time-series cross-validation. Ready for 5+ day coefficient retraining.

---

## 13. Files Created/Modified Summary

### New modules
| Module | Files | Purpose |
|--------|-------|---------|
| `lib/r-factor/ensemble.ts` | 1 | 3-model ensemble |
| `lib/r-factor/market-context.ts` | 1 | VIX/FII adjustments |
| `lib/r-factor/calibration.ts` | 1 | Dhan-NSE factors |
| `lib/ai-trading/` | 8 | AI trading pipeline |
| `lib/backtest/` | 3 | Data download + backtest |
| `app/api/ai-trading/` | 5 | AI trading API routes |
| `app/trading-lab/ai-autopilot/` | 5 | AI trading UI pages |
| `knowledge-base/` | 2 | ADX guide + this doc |

### Key config values
```
R-Factor model: R = 1.56 × spread_ratio (cross-validated on 2 days)
Ensemble weights: OLS 5%, Spread 90%, Momentum 5%
Robust regression: OFF
Scale correction: threshold 2.5, factor 1.5
ADX threshold: 28 (strong trend)
Entry window: 9:45-11:00 IST
Force exit: 15:10 IST
Paper trading: ON by default
```
