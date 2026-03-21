# R-Factor V2 Engine: Complete Technical Reference

> **Version**: V4.2 (March 20, 2026)
> **Purpose**: Comprehensive documentation of the R-Factor institutional activity scoring system — covering the cross-validated linear model, 8-factor data pipeline, ADX integration, AI trading module, and TradeFinder validation. Designed for LLM training and developer reference.

---

## 1. What is R-Factor?

R-Factor is a **composite score measuring institutional trading activity intensity** in Indian NSE F&O stocks. A high R-Factor indicates that large players (FIIs, DIIs, proprietary desks) are actively trading, making the stock a candidate for sharp price moves.

**Important**: R-Factor measures activity INTENSITY, not DIRECTION. A stock crashing with heavy institutional selling also gets high R-Factor. Price direction is shown separately via % change.

### Score Interpretation

| R-Factor Range | Classification | Signal |
|---------------|---------------|--------|
| >= 2.8 | **Blast Trade** | Extreme institutional activity |
| 2.0 - 2.8 | High Activity | Strong institutional interest |
| 1.5 - 2.0 | Moderate | Normal-to-elevated activity |
| 1.0 - 1.5 | Low | Below-average institutional presence |

### Market Regimes

| Regime | Conditions | Meaning |
|--------|-----------|---------|
| **Cheetah** | spread > 1.5× AND fut_volume Z > 1.0 | Fast momentum — price moving sharply |
| **Elephant** | OI change Z > 1.0 AND fut_turnover Z > 0.5 | Slow accumulation — large positions building |
| **Hybrid** | Both Cheetah AND Elephant | Strongest institutional conviction |
| **Defensive** | Neither condition | Retail-dominated activity |

---

## 2. The Model: R ≈ 1.56 × Spread Ratio

### Cross-Validated Linear Model (V4.2)

```
R-Factor = max(1.0, 1.5596 × spread_ratio)
```

Where `spread_ratio = (today_high - today_low) / today_close / 20d_avg_spread`

**Validation** (158 paired samples, Mar 19+20, 2026):

| Metric | Linear Model | Quadratic (V4.0) | Linear + opt_vol |
|--------|-------------|-------------------|------------------|
| **CV Pearson** | **0.757** | 0.729 | 0.756 |
| **CV MAE** | **0.459** | 0.495 | 0.464 |
| **Top-10** | **7/10** | 7/10 | 7/10 |
| **Top-20** | **12/20** | 12/20 | 11/20 |

**Why linear beats quadratic**: The quadratic overfits to extreme-day patterns. On normal market days (70%+ of trading days), the spread→R relationship is nearly linear. The linear model generalizes across both extreme and normal days.

**Why more features don't help**: With only 2 days of training data, each additional coefficient overfits to that day's noise. The opt_volume feature (Pearson 0.46) is significant but unstable across days — helps on extreme days, neutral on normal days. Once 5+ days of ground truth are collected, it may become reliable.

### Scale Correction (for extreme values)

For R > 2.5, non-linear expansion to match TradeFinder's 1.0-5.0+ range:

```
excess = R - 2.5
expansion = 1 + 0.5 × tanh(excess)
R_scaled = 2.5 + excess × expansion
```

| Raw R | Scaled R |
|-------|----------|
| 2.0 | 2.00 |
| 2.5 | 2.50 |
| 3.0 | 3.12 |
| 3.5 | 3.88 |
| 4.0 | 4.68 |

### Configuration

```typescript
ensembleWeights: { ols: 0.05, spreadQuad: 0.90, momentum: 0.05 }
robustRegression: { enabled: false }
scaleCorrection: { enabled: true, expansionThreshold: 2.5, expansionFactor: 1.5 }
```

Robust regression is **disabled** — it penalizes stocks with extreme Z-scores (|z| > 3), which are exactly the stocks TradeFinder ranks highest.

---

## 3. The Eight Factors

| # | Factor | How Computed | Pearson with TF |
|---|--------|-------------|-----------------|
| 1 | **spread** | (H-L)/close RATIO vs 20d avg | **0.808** |
| 2 | oi_level | Absolute OI / 20d avg OI | 0.204 |
| 3 | opt_volume | Total options volume Z-score | 0.462 |
| 4 | fut_turnover | Futures turnover Z-score | 0.334 |
| 5 | fut_volume | Futures volume Z-score | 0.325 |
| 6 | oi_change | |today OI - yesterday OI| Z-score | 0.159 |
| 7 | pcr | Put-Call ratio (pe_vol / ce_vol) | -0.143 |
| 8 | eq_trade_size | Equity turnover / volume Z-score | — |

**Spread dominates** at 0.81 Pearson — no other feature adds reliable cross-day information with current training data.

### Factor Details

**Spread Ratio** (dominant predictor):
```
current_spread = (day_high - day_low) / day_close
avg_spread = mean(current_spread for previous 20 trading days)
spread_ratio = current_spread / avg_spread
```
A spread_ratio of 2.0 = today's range is 2× the 20-day average.

**OI Level** (V4 addition — display only, not in ranking):
```
oi_level = today_futures_OI / mean(20d_futures_OI)
```
Values > 1.15 indicate sustained institutional accumulation. However, cross-validation showed NEGATIVE correlation (-0.16) on some days — high OI can mean "crowded trade" rather than "opportunity." Used for display, not ranking.

**Z-Score computation**:
```
Z = (current_value - mean(20d_series)) / std(20d_series)
```

---

## 4. ADX Trend Strength Indicator

ADX measures **trend strength** (not direction), computed from the `trading-signals` npm library (v7.4.3).

| ADX Value | Interpretation | UI Display |
|-----------|---------------|------------|
| >= 28 | Strong trend | Amber bold + "T" badge |
| 20-28 | Moderate trend | Normal text |
| < 20 | Weak/no trend | Dimmed gray |

**ADX has ZERO correlation (-0.004) with TF R-Factor** — it measures trend strength, not institutional activity. ADX is a **complementary** indicator shown alongside R-Factor, not used in the ranking calculation.

### ADX + R-Factor Combined Signals

| R-Factor | ADX | +DI vs -DI | Signal |
|----------|-----|-----------|--------|
| >= 2.8 | >= 28 | +DI > -DI | Strongest buy setup |
| >= 2.8 | >= 28 | -DI > +DI | Institutions selling — potential short |
| >= 2.8 | < 20 | — | Activity spike without trend — may be noise |
| < 1.5 | >= 28 | — | Strong trend but retail-driven |

### Components

- **ADX**: Trend strength (0-100). Wilder smoothing, 14-period.
- **+DI**: Bullish directional movement. +DI > -DI = bullish.
- **-DI**: Bearish directional movement. -DI > +DI = bearish.

---

## 5. Data Pipeline

### Three-Tier Model System

| Data Path | Model | When Used |
|-----------|-------|-----------|
| Bhavcopy (Past tab) | Linear ensemble (90% spread) | `mode=past`, r-factor-history |
| Dhan live + option chain | Ensemble with live PCR | `mode=live`, OC available |
| Dhan live, no option chain | Linear composite (same formula) | `mode=live`, no OC |

### Data Sources

| Source | What | Latency |
|--------|------|---------|
| **NSE Bhavcopy** | Official EOD equity + F&O data | Published after 5:30 PM IST |
| **Dhan Quote API** | Real-time equity OHLC + futures depth | Real-time (4 req/sec) |
| **Dhan Option Chain** | Per-strike CE/PE volume, OI, greeks | 1 req/3 sec |
| **Dhan Charts** | Daily/intraday OHLCV + OI | 4 req/sec |

### Live Data Blend

```
Historical baseline: [Day -24, Day -23, ..., Day -1]  ← from bhavcopy DB
Live "today":        [Dhan equity OHLC + futures quote]

Blended array:       [Day -24, ..., Day -1, Live Today]
                      ↑ Z-score baseline      ↑ current values
```

### Volume Unit Conversion

Dhan reports futures volume in **shares**, bhavcopy in **contracts/lots**:
```
Dhan_volume ÷ lot_size = contracts (matches bhavcopy)
```

---

## 6. Signal Direction

R-Factor measures activity INTENSITY. Direction comes from **% price change**:

- **Green up arrow**: `pctChange >= 0` (stock is up today)
- **Red down arrow**: `pctChange < 0` (stock is down today)
- **UP filter**: Shows only stocks with positive price change
- **DOWN filter**: Shows only stocks with negative price change

A stock with **high R-Factor + red down arrow** = heavy institutional SELLING.

---

## 7. TradeFinder Comparison

### Key Findings (Mar 19-20, 2026)

1. **TF computes R-Factor once per day** — values don't change despite LTP moving. TF likely uses bhavcopy or opening data.
2. **Spread is the dominant signal** — our linear model at 90% weight matches TF's top-10 7/10.
3. **TF's R-Factor range varies by market regime**: extreme days (1.6-5.5), normal days (1.2-3.3).
4. **OLS at high weight degrades rankings** — the negative `fut_vol_z` coefficient (-1.733) amplifies Z-score mismatches.
5. **Robust regression penalizes top stocks** — TF's highest-ranked stocks have extreme Z-scores that the Huber penalty dampens.

### Accuracy Summary

| Metric | Value |
|--------|-------|
| Cross-validated Pearson | 0.757 |
| Top-10 overlap | 7/10 |
| Top-20 overlap | 12/20 |
| Values within 0.5 of TF | ~80% |
| Ground truth collected | 2 days (159 paired samples) |

### Ground Truth Collection

Stored in `derive-r/ground_truth/YYYYMMDD.json`. Multi-day training via `derive-r/multi_day_training.py`.

---

## 8. AI Trading Module

### Architecture (5-Layer Pipeline)

```
Signal Collector → AI Analyzer → Decision Engine → Risk Manager → Execute
(R-Factor+ADX)    (DeepSeek)     (BUY/SELL/HOLD)   (Position size)   (Dhan)
```

### Components

| Module | Purpose |
|--------|---------|
| `lib/ai-trading/ai-analyzer.ts` | Vercel AI SDK + DeepSeek via AI Gateway |
| `lib/ai-trading/decision-engine.ts` | Orchestrator: entry window + risk checks |
| `lib/ai-trading/risk-manager.ts` | Position sizing, max drawdown, sector limits |
| `lib/ai-trading/prompts.ts` | Trading system prompt with decision rules |
| `lib/ai-trading/signal-collector.ts` | R-Factor → TradeSignal converter |

### Risk Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| Entry window | 09:45-11:00 IST | Only enter trades in this window |
| Exit mode | fixed-profit | Auto-exit at ₹5,000 profit |
| Force exit | 15:10 IST | Close all positions before market close |
| Max capital/trade | 2% | Per-trade capital allocation |
| Max open positions | 5 | Simultaneous positions |
| Max daily loss | 5% | Stop trading if exceeded |
| Min ADX | 28 | Strong trend required for entry |
| Min R-Factor | 2.0 | Institutional activity threshold |
| Paper trading | ON | Default safe mode — no real orders |

### AI Decision Rules (in system prompt)

```
BUY:  R-Factor > 2.0 AND ADX >= 28 AND +DI > -DI
SELL: R-Factor > 2.0 AND ADX >= 28 AND -DI > +DI AND spread > 1.5
HOLD: R-Factor < 2.0 OR ADX < 28 OR conflicting signals
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai-trading/analyze` | POST | AI analysis of single/multiple stocks |
| `/api/ai-trading/stream` | GET | SSE stream of live decisions (60s interval) |
| `/api/ai-trading/config` | GET/PUT | Risk configuration |
| `/api/ai-trading/positions` | GET | Open positions + P&L |
| `/api/ai-trading/history` | GET | Past decisions log |

---

## 9. The 207-Stock F&O Universe

207 NSE F&O eligible stocks scanned. Key additions in V4.2:
- **LTM** (LTIMindtree) — was missing, TF's #2 stock on Mar 20. Mapped to IT sector.

### Sector Distribution

11 sectors: AUTO, CEMENT, ENERGY, FIN SERVICE, FMCG, IT, METAL, PHARMA, PSU BANK, PVT BANK, REALTY

---

## 10. UI Features

### Intraday Boost Page (`/trading-lab/intraday-boost`)

- **Live tab**: Real-time Dhan data, Dhan-live composite model
- **Past tab**: Bhavcopy data, linear ensemble model
- **Columns**: Symbol, Sector, % Change, Spread, PCR, R-Factor, ADX, Signal Direction
- **Filters**: UP/DOWN (by price direction), Sector dropdown, Search
- **Click row**: Opens TradingView chart in new tab
- **Model info**: Single-line description (no configuration toggles)

### R-Factor History Page (`/trading-lab/r-factor-history`)

- **Stock History tab**: Per-symbol R-Factor + ADX trend over 25 days (chart + table)
- **Daily Leaderboard tab**: Per-date top stocks with OI Level, Confidence, all Z-scores
- **ADX columns**: ADX, +DI, -DI with trending indicators

### AI Trading Pages

- **AI Autopilot** (`/trading-lab/ai-autopilot`): Start/Stop, decision feed, position monitor
- **Trade History** (`/trading-lab/ai-autopilot/history`): Past decisions with filters
- **Strategy Config** (`/trading-lab/ai-autopilot/config`): Entry/exit rules, risk limits
- **Risk Manager** (`/trading-lab/ai-autopilot/risk`): P&L summary, safety checks, sector exposure

---

## 11. Technical Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16 App Router, React 19, TypeScript |
| AI SDK | Vercel AI SDK v6 + @ai-sdk/openai-compatible |
| Technical Analysis | `trading-signals` v7.4.3 (ADX, ATR) |
| Database | Prisma ORM + SQLite (via better-sqlite3) |
| Charts | Lightweight Charts v5, Recharts |
| State | Zustand, nuqs (URL state) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Linting | Biome |
| Error Tracking | Sentry |
| Broker API | Dhan V2 (custom SDK in `/dhanv2`) |

---

## 12. Model Evolution

| Version | Model | CV Pearson | Top-10 | Key Discovery |
|---------|-------|-----------|--------|---------------|
| V1 | Fixed weights, 4 factors | 0.19 | 2/10 | Naive weighting fails |
| V2 | Hand-tuned, 7 factors | 0.36 | 4/10 | More factors help |
| V3 | OLS regression, 5 features | 0.60 (LOO) | 7/10 | fut_volume is a suppressor (-1.73) |
| V4.0 | Ensemble (50/30/20) + scale correction | 0.60 | 5/10 | OLS degrades live rankings |
| V4.1 | Spread-quad 90% + OI level + Dhan-live | — | 6/10 | oi_level has negative correlation |
| **V4.2** | **Linear R=1.56×spread** | **0.757** | **7/10** | **Simplest model wins CV** |

---

## 13. Limitations & Known Gaps

1. **2-day training data**: Linear coefficient (1.56) is cross-validated but could shift with more data. Target: 5+ days.
2. **LTM overprediction**: Only 15 days of bhavcopy → unstable 20-day average → inflated spread ratio.
3. **opt_volume signal unstable**: Pearson 0.46 pooled but varies day-to-day. Not reliable enough for model inclusion yet.
4. **TF reverse-engineering limits**: TF may change their algorithm. Our model captures general patterns, not exact formula.
5. **No market holidays**: `isTradingDay()` checks weekday + time only.
6. **Bhavcopy sync is manual**: User must trigger download after market close.
7. **AI trading in paper mode**: Real order execution not yet tested.

---

## 14. Glossary

| Term | Definition |
|------|-----------|
| **ADX** | Average Directional Index — trend strength (0-100). >= 28 = strong trend. |
| **Blast Trade** | R-Factor >= 2.8 — extreme institutional activity |
| **Bhavcopy** | NSE's daily official market data CSV files (equity + F&O) |
| **CV** | Cross-Validation — train on one day, test on another |
| **Dhan** | Indian discount broker with V2 API for market data + orders |
| **F&O** | Futures & Options derivatives segment on NSE |
| **FII/DII** | Foreign/Domestic Institutional Investor |
| **OI Level** | Absolute OI / 20-day average OI. > 1.0 = accumulation. |
| **OLS** | Ordinary Least Squares regression |
| **PCR** | Put-Call Ratio (put volume / call volume) |
| **Scale Correction** | Non-linear expansion for R > 2.5 to match TF's range |
| **Spread Ratio** | Today's (high-low)/close divided by 20-day average |
| **Suppressor Variable** | fut_volume has negative OLS coefficient — penalizes retail noise |
| **TradeFinder** | Benchmark algorithmic trading platform for validation |
