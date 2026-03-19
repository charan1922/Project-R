# R-Factor Engine: Complete Technical Reference for AI Trading

> **Purpose**: This document describes the R-Factor institutional activity scoring system used in the DeepQuant (Project-R) algorithmic trading platform. It is designed to be comprehensive enough for LLM training — covering the mathematical model, data pipeline, validation methodology, practical trading application, and all implementation details with exact coefficients and thresholds.

---

## 1. What is R-Factor?

R-Factor is a **composite score that measures institutional trading activity intensity** in Indian NSE F&O (Futures & Options) stocks. A high R-Factor indicates that large players — Foreign Institutional Investors (FIIs), Domestic Institutional Investors (DIIs), and proprietary trading desks — are actively trading a stock, making it a candidate for sharp intraday price moves.

### Core Insight

Institutional traders leave footprints in market data that retail traders don't:
- **Wider price ranges** (high-low spread) relative to historical norms — institutions push prices further
- **Unusual futures turnover** without proportional volume increase — large block trades at specific prices
- **Options positioning** (put-call ratio shifts) — hedging activity before expected moves
- **Open Interest buildup** — large positions being established over days

R-Factor quantifies these footprints into a single actionable number.

### Score Interpretation

| R-Factor Range | Classification | Trading Signal |
|---------------|---------------|----------------|
| >= 2.8 | **Blast Trade** | Extreme institutional activity — highest conviction intraday candidates |
| 2.2 - 2.8 | High Activity | Strong institutional interest — worth monitoring |
| 1.8 - 2.2 | Moderate | Normal-to-elevated activity |
| 1.5 - 1.8 | Low | Below-average institutional presence |
| < 1.5 | Defensive | No significant institutional signal |

### Market Regimes

Each stock is also classified into a behavioral regime:

| Regime | Conditions | What It Means |
|--------|-----------|---------------|
| **Cheetah** | spread > 1.5x normal AND futures volume Z > 1.0 | Fast momentum — price moving sharply on rising volume. Institutions chasing direction. |
| **Elephant** | OI change Z > 1.0 AND futures turnover Z > 0.5 | Slow accumulation — large positions building over time. Institutions establishing directional bets. |
| **Hybrid** | Both Cheetah AND Elephant conditions | Both signals present — strongest institutional conviction. |
| **Defensive** | Neither condition | No significant institutional signal — retail-dominated activity. |

---

## 2. The Dual-Model Architecture

R-Factor uses **two different mathematical models** depending on the data source available:

### Model 1: Full OLS Regression (for NSE Bhavcopy data)

Used when: Historical NSE end-of-day bhavcopy data is available (post-market sync).

```
R = 1.108614
  + 0.624570 × spread_ratio
  + 0.076682 × pcr_z
  + 0.226081 × (spread_ratio × fut_turnover_z)
  + 1.414904 × fut_turnover_z
  - 1.733390 × fut_volume_z
```

**Validation**: LOO Pearson 0.60, Top-10 overlap 7/10 against TradeFinder benchmark (80 F&O stocks, March 13, 2026).

### Model 2: Spread-Quadratic (for live Dhan API data)

Used when: Real-time data from Dhan broker API during market hours.

```
For spread >= 1.0:
  R = 2.4491 - 1.8553 × spread_ratio + 0.9490 × spread_ratio²

For 0 < spread < 1.0:
  R = 1.0 + 0.5428 × spread_ratio  (linear ramp to junction at spread=1.0)

For spread <= 0:
  R = 1.0  (data error, neutral)
```

**Validation**: Pearson 0.857 against TradeFinder benchmark (59 stocks, March 18, 2026).

### Why Two Models?

The Dhan broker API provides real-time equity OHLC (price data) accurately, but its futures volume/turnover/OI numbers don't align with NSE bhavcopy's official figures. When Z-scoring Dhan's live futures data against a bhavcopy historical baseline, the mismatched units produce noisy Z-scores that degrade the full OLS model.

Empirical finding: **spread alone (equity OHLC) has Pearson 0.765 with TradeFinder's R-Factor** — higher than any other individual factor and higher than the full OLS model applied to Dhan data (0.683). The quadratic captures TradeFinder's non-linear amplification of extreme spread values.

When NSE bhavcopy is available (same data source for both current and historical), the full OLS model works correctly because all factors are measured consistently.

### Model Selection Logic

```
IF today's bhavcopy is synced (post-market):
  → Full OLS model (all 5 factors from bhavcopy)
  → dataSource: 'bhavcopy-today'

ELSE IF Dhan API available AND option chain cached:
  → Full OLS model (equity OHLC from Dhan + live PCR from option chain)
  → dataSource: 'live', modelUsed: 'ols'

ELSE IF Dhan API available:
  → Spread-quadratic model (equity OHLC from Dhan only)
  → dataSource: 'live', modelUsed: 'spread-quad'

ELSE:
  → Full OLS model (latest available bhavcopy)
  → dataSource: 'bhavcopy'
```

---

## 3. The Seven Factors

R-Factor is built from 7 market microstructure factors derived from daily stock data:

### Factor 1: Spread Ratio (Dominant Predictor)

```
current_spread = (day_high - day_low) / day_close
avg_spread = mean(current_spread for previous 20 trading days)
spread_ratio = current_spread / avg_spread
```

- **Pearson with TF R-Factor**: 0.54 (strongest single factor)
- **OLS coefficient**: +0.624570
- **Interpretation**: A spread_ratio of 2.0 means today's price range is 2x the 20-day average — institutional buying/selling is pushing the price further than normal
- **Why ratio, not Z-score**: Ratio captures "how many times above normal" more naturally. Validated: ratio gives 0.54 Pearson vs 0.48 for Z-score.

### Factor 2: PCR (Put-Call Ratio)

```
pcr = total_put_volume / total_call_volume
pcr_z = Z-score(today's pcr, 20-day pcr series)
```

- **Pearson with TF R-Factor**: 0.31
- **OLS coefficient**: +0.076682 (smallest, but statistically significant)
- **Interpretation**: Unusual PCR indicates institutional hedging. High PCR = institutions buying puts (protective/bearish). Low PCR = call buying (bullish speculation).
- **Data source**: CE/PE volume from NSE bhavcopy or Dhan Option Chain API

### Factor 3: Futures Turnover

```
fut_turnover = total_traded_value_in_rupees (from nearest-month futures contract)
fut_turnover_z = Z-score(today's turnover, 20-day series)
```

- **Pearson with TF R-Factor**: 0.18
- **OLS coefficient**: +1.414904 (second largest)
- **Interpretation**: High futures turnover = large money flows. Institutions execute large block trades that spike turnover.
- **Unit alignment**: NSE bhavcopy uses `TtlTrfVal` (VWAP × volume). Dhan uses `average_price × volume` as VWAP proxy.

### Factor 4: Futures Volume (Suppressor Variable)

```
fut_volume = total_contracts_traded (nearest-month futures)
fut_volume_z = Z-score(today's volume, 20-day series)
```

- **Pearson with TF R-Factor**: 0.16
- **OLS coefficient**: **-1.733390** (NEGATIVE — the key insight)
- **Interpretation**: This is a **suppressor variable**. High volume alone ≠ institutional activity. The turnover/volume *divergence* is the real signal:
  - High turnover + normal volume = large block trades at specific prices (institutional)
  - High volume + normal turnover = many small trades spread over time (retail)
  - The negative coefficient penalizes retail-style volume, amplifying the turnover signal

### Factor 5: OI Change (Open Interest)

```
oi_change = |today's_futures_OI - yesterday's_futures_OI|
oi_change_z = Z-score(today's oi_change, 20-day series)
```

- **Pearson with TF R-Factor**: 0.21
- **Not in OLS formula** (used for regime classification only)
- **Interpretation**: Large OI changes indicate new positions being established (bullish if price rising + OI rising) or closed (if OI dropping)

### Factor 6: Equity Trade Size

```
eq_trade_size = equity_turnover / equity_volume
eq_trade_size_z = Z-score(today's trade_size, 20-day series)
```

- **Pearson with TF R-Factor**: 0.13
- **Not in OLS formula** (used for display only)
- **Interpretation**: Higher average trade size suggests institutional block trades vs retail small orders

### Factor 7: Options Volume

```
opt_volume = total_options_volume (all strikes, CE + PE)
opt_volume_z = Z-score(today's opt_volume, 20-day series)
```

- **Pearson with TF R-Factor**: 0.09
- **Not in OLS formula** (used for display only)
- **Interpretation**: Spikes in options volume indicate institutional hedging or speculative positioning

### Interaction Term: Spread × Futures Turnover

```
interaction = spread_ratio × fut_turnover_z
```

- **OLS coefficient**: +0.226081
- **Interpretation**: When BOTH spread and futures turnover spike simultaneously, the institutional signal is much stronger than either alone. This captures the "institutional urgency" pattern: prices moving sharply AND large money flowing through futures.

---

## 4. Z-Score Computation

All factors (except spread_ratio and raw PCR) are converted to Z-scores before feeding into the model:

```
Z-score = (current_value - mean(20-day_series)) / std(20-day_series)
```

**Implementation**:
```typescript
function calculateZScore(value: number, series: number[]): number {
  const m = mean(series);   // from mathjs library
  const s = std(series);    // from mathjs library
  if (s === 0) return 0;    // avoid division by zero
  return (value - m) / s;
}
```

**Edge cases**:
- If all 20 values are identical (std = 0): return 0
- If fewer than 15 days available: signal is not computed (insufficient data)
- The 20-day lookback adapts to available data (uses whatever history exists, minimum 15)

---

## 5. Data Pipeline

### 5.1 Data Sources

| Source | What | When Used | Latency |
|--------|------|-----------|---------|
| **NSE Bhavcopy** | Official end-of-day equity + F&O data | Post-market (after 4 PM IST) | T+0 (same day after close) |
| **Dhan Quote API** | Real-time equity OHLC + volume + VWAP, futures volume + OI | During market hours (9:15-15:30 IST) | Real-time |
| **Dhan Option Chain API** | Per-strike CE/PE volume, OI, greeks | Background fetch (rate-limited) | 3s per stock |

### 5.2 NSE Bhavcopy Structure

NSE publishes two daily CSV files (ZIP compressed):

**Equity bhavcopy** (`BhavCopy_NSE_CM_0_0_0_YYYYMMDD_F_0000.csv`):
- `TckrSymb`: Stock symbol
- `SctySrs`: Security series (filter to 'EQ')
- `HghPric`: Day high
- `LwPric`: Day low
- `ClsPric`: Closing price
- `TtlTradgVol`: Total traded volume (shares)
- `TtlTrfVal`: Total traded value (₹)

**F&O bhavcopy** (`BhavCopy_NSE_FO_0_0_0_YYYYMMDD_F_0000.csv`):
- `TckrSymb`: Stock symbol
- `FinInstrmTp`: Instrument type (`STF` = stock futures, `STO` = stock options)
- `XpryDt`: Expiry date
- `OptnTp`: Option type (`CE` or `PE`) — for options only
- `OpnIntrst`: Open Interest
- `ChngInOpnIntrst`: Change in OI
- `TtlTradgVol`: Total contracts traded
- `TtlTrfVal`: Total traded value (₹, VWAP-based)

**Processing**: For each stock, the system:
1. Finds the **nearest-expiry** futures contract (STF)
2. Aggregates all option strikes (STO) by CE/PE for total volumes
3. Merges equity and F&O data by symbol
4. Stores in SQLite `bhavcopy_days` table (Prisma ORM)

### 5.3 Dhan Live Data Blend

During market hours, live data from Dhan replaces the "today" entry in the bhavcopy time series:

```
Historical baseline: [Day -24, Day -23, ..., Day -2, Day -1]  ← from bhavcopy DB
Live "today":        [Dhan equity OHLC + futures quote + option chain]

Blended array:       [Day -24, ..., Day -1, Live Today]
                      ↑ Z-score baseline      ↑ current values
```

**Live day construction**:
```
Equity high/low/close → Dhan Quote API (accurate)
Equity volume         → Dhan Quote API (available from Quote, not OHLC endpoint)
Equity turnover       → volume × average_price (VWAP from Dhan)
Futures volume        → Dhan Quote API (shares) ÷ lotSize = contracts
Futures turnover      → Dhan volume × average_price (VWAP proxy)
Futures OI            → Dhan Quote API
Futures OI change     → |today Dhan OI - yesterday bhavcopy OI|
CE/PE volume          → Dhan Option Chain API (if cached) or yesterday's bhavcopy
Options OI            → Dhan Option Chain API (if cached) or yesterday's bhavcopy
```

### 5.4 Volume Unit Conversion

**Critical**: Dhan reports futures volume in **shares**. NSE bhavcopy reports in **contracts/lots**.

```
Dhan futures volume (shares) ÷ lot_size = contracts (matches bhavcopy)
```

Example: RELIANCE with lot_size = 250
- Dhan volume: 2,500,000 shares → 2,500,000 ÷ 250 = **10,000 contracts** (matches bhavcopy)

Lot sizes are fetched from the `master_contracts` Prisma table (synced daily from Dhan's master CSV).

### 5.5 Turnover VWAP Alignment

NSE bhavcopy `TtlTrfVal` = Σ(trade_price × trade_quantity) — official VWAP-based.
Dhan provides `average_price` which approximates VWAP.

```
Dhan turnover = volume × average_price   (matches NSE methodology)
Fallback:      volume × (high + low) / 2  (if average_price unavailable)
Last resort:   volume × last_price         (least accurate)
```

---

## 6. The 206-Stock F&O Universe

The system scans **206 NSE F&O eligible stocks** (sourced from Zerodha's live F&O list). These are individual stock futures/options — no index derivatives (NIFTY, BANKNIFTY excluded).

### Sector Distribution

| Sector | Count | Examples |
|--------|-------|---------|
| FIN SERVICE | ~35 | MCX, BSE, SBICARD, BAJFINANCE, ANGELONE |
| PHARMA | ~25 | SUNPHARMA, CIPLA, BIOCON, GLENMARK |
| IT | ~20 | TCS, INFY, HCLTECH, TECHM, WIPRO |
| FMCG | ~20 | HINDUNILVR, ITC, TITAN, DMART |
| ENERGY | ~20 | RELIANCE, NTPC, POWERGRID, ADANIGREEN |
| AUTO | ~18 | MARUTI, TATAMOTORS, M&M, HEROMOTOCO |
| METAL | ~12 | TATASTEEL, HINDALCO, VEDL, SAIL |
| PVT BANK | ~10 | HDFCBANK, ICICIBANK, AXISBANK, KOTAKBANK |
| PSU BANK | ~8 | SBIN, BANKBARODA, PNB, CANBK |
| REALTY | ~8 | DLF, GODREJPROP, OBEROIRLTY, PRESTIGE |
| CEMENT | ~8 | ULTRACEMCO, AMBUJACEM, GRASIM, DALBHARAT |

### TradeFinder Subset

Of the 206 stocks, TradeFinder (the benchmark system) actively trades **136 stocks**. The remaining 70 are never traded by TF — filtering to TF's subset improves comparison accuracy.

---

## 7. Validation Methodology

### 7.1 Ground Truth

TradeFinder is an established Indian algorithmic trading platform that publishes R-Factor scores for ~80 F&O stocks daily. Their `param_3` field is the R-Factor value. We use this as our validation benchmark.

### 7.2 Leave-One-Out Cross-Validation (LOO CV)

For the OLS model, each of the 80 stocks was left out one at a time:
1. Train OLS on remaining 79 stocks
2. Predict R-Factor for the left-out stock
3. Repeat for all 80

**Results**:
- Pearson r: 0.60 (measures linear correlation)
- Spearman ρ: 0.55 (measures rank correlation)
- Top-10 overlap: 7/10 (stocks with highest predicted R match actual top 10)
- Within ±0.5 error: 89% of predictions (71/80 stocks)

### 7.3 Live Validation (Spread-Quadratic)

Comparing live Dhan-sourced data against TradeFinder's end-of-day R-Factor:

| Metric | Full OLS on Dhan | Spread-Quadratic |
|--------|-----------------|------------------|
| Pearson r | 0.683 | **0.857** |
| Top-10 overlap | 4/10 | **5/10** |
| Within ±0.5 | 85% | **86%** |

The spread-quadratic outperforms the full OLS on Dhan data because Dhan's futures Z-scores add noise.

### 7.4 Model Evolution

| Version | Method | Pearson | Key Discovery |
|---------|--------|---------|--------------|
| V1 | Fixed weights, 4 factors | 0.19 | Naive weighting doesn't work |
| V2 | Hand-tuned, 7 factors | 0.36 | More factors help but weights need optimization |
| V3 OLS | Regression, 5 features | 0.60 | **fut_volume needs negative coefficient (suppressor)** |
| V3 Spread-Quad | Single-factor quadratic | 0.857 | For live data, less is more — spread dominates |

### 7.5 Key Discovery: The Suppressor Variable

The most important insight from the OLS derivation: **futures volume has a NEGATIVE coefficient (-1.733)**.

This seems counterintuitive — shouldn't more volume mean more institutional activity? No:
- Futures volume and turnover are >0.85 correlated
- When both are high → turnover coefficient (+1.415) dominates → R goes up
- When volume is high BUT turnover is not proportionally high → the -1.733 coefficient drags R down
- This penalizes "retail noise" (many small trades) and rewards "institutional blocks" (fewer trades, larger value)

The turnover/volume **divergence** is the real institutional signal.

---

## 8. Practical Trading Application

### 8.1 Intraday Boost Workflow

1. **Pre-market (before 9:15 AM IST)**: Page loads with previous day's R-Factor rankings from cached Dhan data or bhavcopy
2. **Market open (9:15 AM)**: Live Dhan data flows in. Spread-quadratic model activates. Rankings update every 60 seconds.
3. **During market (9:15-15:30)**: Watch for stocks crossing blast threshold (R >= 2.8). Option chain data loads in background (15-min refresh).
4. **Post-market (after 15:30)**: If bhavcopy synced → full OLS model with official NSE data. Most accurate rankings.

### 8.2 Signal Interpretation for Trading

**Blast Trade (R >= 2.8)**:
- Highest conviction signal
- Institutional urgency confirmed
- Best for: Quick intraday scalps (15-60 min holding)
- Enter on: Pullback to VWAP or support levels
- Risk: Already extended — may reverse if institutions take profit

**Cheetah Regime**:
- Price moving fast on volume
- Best for: Momentum continuation trades
- Enter on: Breakout confirmation
- Risk: Can reverse sharply if momentum exhausts

**Elephant Regime**:
- Positions building slowly (OI increase)
- Best for: Swing trades (1-3 day holding)
- Enter on: Accumulation dips
- Risk: Slow-moving, may need patience

### 8.3 Lot Value / Margin Consideration

Each stock has a lot value = `lot_size × last_price` (notional value per futures/options lot). Intraday F&O margin is typically 20-25% of notional.

| Lot Value Range | Margin Required | Suitability |
|----------------|----------------|-------------|
| < 5L (₹5,00,000) | < 1.25L | Retail-friendly |
| 5-10L | 1.25-2.5L | Moderate capital needed |
| > 10L | > 2.5L | High capital — flagged in UI |

Stocks like MCX (16L), NATIONALUM (15L) require significant margin for F&O trades.

### 8.4 Sector Context

The sector dropdown shows **average spread Z-score per sector**:
```
Sector Activity = mean(max(0, stock.spread_z) for stocks in sector) / count
```

Sectors with activity > 1.5x suggest sector-wide institutional rotation (e.g., FII buying across all IT stocks).

---

## 9. Data Freshness & Caching

| Component | Market Hours | Post-Market | Pre-Market |
|-----------|-------------|-------------|------------|
| Equity OHLC | Fresh every request | Cached (per day) | Yesterday's cache |
| Futures quote | Fresh every request | Cached (per day) | Yesterday's cache |
| Option chain | 15-min background refresh | 24-hour cache | Yesterday's cache |
| Bhavcopy | Not available (published after close) | User-triggered sync | Latest in DB |
| R-Factor | Recalculated every request | Recalculated per request | From cache/bhavcopy |

### Dhan API Rate Limits

| Endpoint | Rate Limit | Batch Size |
|----------|-----------|------------|
| `/v2/marketfeed/quote` | 4 req/sec | Up to 100 security IDs per request |
| `/v2/optionchain` | 1 req/3 sec | 1 underlying per request |
| `/v2/charts/intraday` | 4 req/sec | 1 instrument per request |
| Token generation | 1 per 2 min | N/A |

---

## 10. Mathematical Appendix

### 10.1 Full OLS Coefficients

```
Intercept:           1.108614
spread_r:           +0.624570    (spread ratio, not Z-scored)
pcr_z:              +0.076682    (PCR Z-score)
spread_r × fut_tz:  +0.226081    (interaction term)
fut_turnover_z:     +1.414904    (futures turnover Z-score)
fut_volume_z:       -1.733390    (futures volume Z-score, NEGATIVE)
```

### 10.2 Spread-Quadratic Coefficients

```
Quadratic (spread >= 1.0):
  a = 2.4491, b = -1.8553, c = 0.9490
  R = 2.4491 - 1.8553 × spread + 0.9490 × spread²

Linear ramp (0 < spread < 1.0):
  atOne = a + b + c = 1.5428
  R = 1.0 + (atOne - 1.0) × spread = 1.0 + 0.5428 × spread

Zero/negative spread:
  R = 1.0 (data error, neutral signal)
```

### 10.3 Spread-Quadratic Values at Key Points

| Spread Ratio | R-Factor | Interpretation |
|-------------|---------|----------------|
| 0.0 | 1.00 | Data error / no activity |
| 0.5 | 1.27 | Below-average activity |
| 1.0 | 1.54 | Average activity (junction point) |
| 1.5 | 1.79 | Moderately above average |
| 2.0 | 2.54 | Clearly elevated |
| 2.5 | 3.78 | High institutional activity |
| 3.0 | 5.52 | Extreme (blast territory) |

### 10.4 Regime Classification Thresholds

```
Cheetah:   spread_ratio > 1.5 AND fut_volume_z > 1.0
Elephant:  oi_change_z > 1.0 AND fut_turnover_z > 0.5
Hybrid:    Cheetah AND Elephant
Defensive: NOT Cheetah AND NOT Elephant

Blast:     compositeRFactor >= 2.8
```

### 10.5 Individual Factor Correlations with TradeFinder R-Factor

```
Factor              Pearson   Used in OLS?
─────────────────────────────────────────
Spread ratio         0.54     Yes (+0.625)
PCR                  0.31     Yes (+0.077)
OI change            0.21     No (regime only)
Futures turnover     0.18     Yes (+1.415)
Futures volume       0.16     Yes (-1.733)
Equity trade size    0.13     No (display)
Options volume       0.09     No (display)
OI level            -0.13     Rejected
Delivery %          -0.12     Rejected
```

---

## 11. V4 Ensemble & Dhan-Live Model

### 11.1 V4 Architecture (March 19, 2026)

V4 transforms the engine from single-model to a configurable ensemble with 3 data paths:

| Data Path | Model | TF Top-10 Match | Notes |
|-----------|-------|-----------------|-------|
| Bhavcopy (Past tab) | Spread-quad dominant ensemble (90/5/5) | **8/10** | Best TF match. Scale correction expands extreme values. |
| Dhan live + option chain | Ensemble with live PCR | — | Uses all available data |
| Dhan live, no option chain | Dhan-live composite | **4-5/10** | OI level + opt vol + fut vol |

### 11.2 Key V4 Discovery: OI Level

**Daily `oi_change` misses sustained accumulation.** All TF top-5 stocks on Mar 19 had 25-35% OI above their 20-day average, but daily `oi_change_z` was near zero for most.

New factor: `oi_level = today's_OI / mean(20-day_OI)`

| Stock | TF Rank | OI vs 20d Avg | Daily oi_change_z |
|-------|---------|---------------|-------------------|
| WAAREEENER | #1 | **+25%** | 0.15 (missed!) |
| SBICARD | #3 | **+33%** | -0.37 (negative!) |
| PREMIERENE | #5 | **+35%** | -0.45 (negative!) |

### 11.3 Dhan-Live Composite Formula

For live data without option chain (`calculateSignalLive`):

```
R = 1.5
  + clamp(oi_level - 1.0, 0, 0.5) × 4.0     // OI accumulation
  + clamp(opt_volume_z, 0, 3.0) × 0.25        // Options activity
  + clamp(fut_volume_z, 0, 3.0) × 0.20        // Futures momentum
  + clamp(spread_r - 0.8, 0, 2.5) × 0.30      // Above-average spread
```

Output clamped to [1.0, 6.0]. No scale correction (already calibrated to TF range).

### 11.4 Why Spread-Quad Dominates (Not OLS)

**Testing on Mar 19, 2026:** Spread-quad-only gives 8/10 top-10, but OLS at 50% weight gives only 5/10. Root causes:

1. **OLS suppressor effect**: `fut_vol_z = -1.733` amplifies Dhan Z-score mismatches
2. **Robust regression backfires**: Penalizes stocks with |Z| > 3 — but TF's top stocks ARE the extreme ones (WAAREEENER opt_vol Z=3.26)
3. **TF uses previous close for spread**: `(H-L)/prev_close` is stable (only changes on new H/L). We were using LTP which fluctuated every tick.
4. **TF computes from stable data**: R-Factor values didn't change across 4 snapshots despite LTP moving. Formula only updates when intraday high or low expands.

### 11.5 Default Configuration

```typescript
ensembleWeights: { ols: 0.05, spreadQuad: 0.90, momentum: 0.05 }
robustRegression: { enabled: false }
scaleCorrection: { enabled: true, expansionThreshold: 2.5, expansionFactor: 1.5 }
```

### 11.6 UI-Configurable Presets

The Intraday Boost page has radio buttons and checkbox to switch between:

| Preset | Weights | Robust | TF Match |
|--------|---------|--------|----------|
| **Spread-Quad 90%** (default) | OLS 5%, SQ 90%, Mom 5% | OFF | 8/10 |
| Balanced OLS 50% | OLS 50%, SQ 30%, Mom 20% | ON | 5/10 |

API: `?preset=sq-dominant&robust=false` or `?preset=balanced&robust=true`

### 11.7 Scale Correction

Non-linear expansion for R > 2.5 to match TF's 1.0-5.0+ range:

```
excess = R - 2.5
expansion = 1 + 0.5 × tanh(excess)
R_scaled = 2.5 + excess × expansion
```

| Raw R | Scaled R | Delta |
|-------|----------|-------|
| 2.5 | 2.50 | 0.00 |
| 3.0 | 3.12 | +0.12 |
| 3.5 | 3.88 | +0.38 |
| 4.0 | 4.68 | +0.68 |
| 4.5 | 5.46 | +0.96 |

### 11.8 TradeFinder Ground Truth Collection

Ground truth stored in `derive-r/ground_truth/YYYYMMDD.json` (TradeFinder API format).

Multi-day training infrastructure: `derive-r/multi_day_training.py` — builds panel dataset, time-series cross-validation, regime-specific models.

Current: 1 day captured (Mar 19, 2026). Target: 5+ days for stable coefficient retraining.

---

## 12. Eight Factors (V4)

R-Factor V4 uses **8 market microstructure factors**:

| # | Factor | How Computed | Role |
|---|--------|-------------|------|
| 1 | `spread` | (H-L)/close RATIO vs 20d avg | Dominant predictor (OLS coeff +0.625) |
| 2 | `oi_level` | Absolute OI / 20d avg OI | **V4 addition** — sustained accumulation |
| 3 | `pcr` | Put volume / Call volume | Institutional hedging signal |
| 4 | `fut_turnover` | Futures traded value (₹) | Institutional money flow |
| 5 | `fut_volume` | Futures contracts traded | Suppressor (OLS coeff -1.733) |
| 6 | `opt_volume` | Total options volume | Hedging/speculation activity |
| 7 | `oi_change` | |today OI - yesterday OI| | Daily position changes |
| 8 | `eq_trade_size` | Equity turnover / volume | Block trade indicator |

### Dhan-Live Feature Correlations (79 stocks, Mar 19, 2026)

| Feature | Pearson with TF R | Note |
|---------|-------------------|------|
| `opt_volume_z` | **0.47** | Strongest on live data |
| `fut_volume_z` | 0.39 | |
| `fut_turnover_z` | 0.39 | |
| `oi_change_z` | 0.27 | Daily change — misses accumulation |
| `spread_r` | **-0.15** | Negative intraday! Reverses from bhavcopy |
| `pcr` | -0.14 | |

**Key insight**: Spread has NEGATIVE correlation with TF during afternoon trading — stocks that already moved (high spread) are "priced in." OI and options volume predict better intraday.

---

## 13. ADX Trend Strength Indicator

### 13.1 What is ADX?

ADX (Average Directional Index) measures **trend strength** — not direction. A high ADX means the stock is trending strongly (up OR down). Combined with R-Factor, it confirms whether institutional activity is driving a sustained move or just noise.

| ADX Value | Interpretation | UI Display |
|-----------|---------------|------------|
| **>= 28** | **Strong trend** — institutional momentum confirmed | **Amber/gold bold + "T" badge** |
| 20-28 | Moderate trend — developing or fading | Normal white text |
| < 20 | Weak/no trend — choppy, range-bound | Dimmed gray |

### 13.2 ADX Components

ADX is computed from three components using 14-period Wilder smoothing:

| Component | What It Measures | Trading Signal |
|-----------|-----------------|----------------|
| **ADX** | Trend strength (0-100) | >28 = strong trend |
| **+DI** | Bullish directional movement | +DI > -DI = bullish trend |
| **-DI** | Bearish directional movement | -DI > +DI = bearish trend |

**Crossover signals:**
- +DI crosses above -DI → bullish trend beginning
- -DI crosses above +DI → bearish trend beginning
- ADX rising + crossover → high-conviction signal

### 13.3 ADX + R-Factor Combined Signals

| R-Factor | ADX | +DI vs -DI | Signal |
|----------|-----|-----------|--------|
| >= 2.8 (Blast) | >= 28 | +DI > -DI | **Strongest buy signal** — institutional activity + confirmed bullish trend |
| >= 2.8 (Blast) | >= 28 | -DI > +DI | **Caution** — institutions active but trend is bearish (possible short) |
| >= 2.8 (Blast) | < 20 | — | R-Factor spike without trend confirmation — may be noise or start of new move |
| < 1.5 | >= 28 | — | Strong trend but low institutional activity — likely retail-driven |

### 13.4 Implementation

**Library**: `trading-signals` (npm, v7.4.3, Jan 2026, TypeScript native)

**Computation**: Uses 14-period Wilder smoothing on daily equity OHLC from bhavcopy history. Requires 27+ days of data to produce first ADX value.

**Data sources**:
- Past tab: computed from bhavcopy `eqHigh`, `eqLow`, `eqClose`
- Live tab: computed from bhavcopy history + today's Dhan OHLC (blended)
- R-Factor History: computed per date in the rolling window

**API fields**: `adx`, `plusDI`, `minusDI` — included in both `/api/r-factor` and `/api/r-factor-history` responses.

### 13.5 Example: WAAREEENER (Mar 6-19, 2026)

```
Date          R     ADX   +DI   -DI   Trend
Mar 06      1.47   27.5  19.8  30.2   STRONG BEAR  ← downtrend
Mar 11      1.40   25.8  25.0  30.5   STRONG BEAR
Mar 17      2.16   22.0  29.2  23.7   WEAK BULL    ← +DI crossed above -DI (reversal!)
Mar 18      5.87   22.8  37.7  19.4   WEAK BULL    ← R-Factor spike + bullish DI
Mar 19      1.51   23.4  35.4  18.2   WEAK BULL    ← R dropped but trend holding
```

The +DI/-DI crossover on Mar 17 preceded the R-Factor spike on Mar 18. ADX was still moderate (22.8) — the trend was developing, not yet confirmed. A trader watching both signals would have caught the early reversal.

---

## 14.1 Limitations & Known Gaps

1. **Single-day Dhan model**: Dhan-live coefficients fit on Mar 19 only. May overfit. Multi-day training needed.

2. **OLS suppressor on Dhan data**: `fut_vol_z = -1.733` destroys predictions when Z-scores from Dhan don't match bhavcopy baselines. Mitigated by reducing OLS weight to 5%.

3. **Robust regression counterproductive**: Penalizes TF's top stocks. Disabled by default.

4. **No market holidays**: `isTradingDay()` checks weekday + time only, not NSE holiday calendar.

5. **Option chain latency**: 206 stocks × 3s rate limit = ~10 minutes for full scan.

6. **Bhavcopy sync is manual**: User must explicitly trigger NSE bhavcopy download after market close.

7. **TF as ground truth**: We reverse-engineered TradeFinder's model. Their algorithm may change.

8. **Spread instability (fixed)**: Now uses previous close instead of LTP for spread denominator. R only changes when new intraday high/low is set.

9. **Dhan-live false positives**: Stocks with high OI level but low TF rank (LODHA, PFC) inflate our scores. More training data needed.

---

## 15. Glossary

| Term | Definition |
|------|-----------|
| **ADX** | Average Directional Index — measures trend strength (0-100). >28 = strong trend. Computed from +DI/-DI with Wilder smoothing. |
| **Bhavcopy** | NSE's daily official market data CSV files (equity + F&O) |
| **Blast Trade** | Stock with R-Factor >= 2.8 (extreme institutional activity) |
| **Dhan** | Indian discount broker with V2 API for market data |
| **Dhan-Live Model** | V4 composite formula using OI level + opt volume + fut volume + spread for live data |
| **Ensemble** | V4 confidence-weighted blend of OLS + spread-quad + momentum models |
| **F&O** | Futures & Options derivatives segment on NSE |
| **FII** | Foreign Institutional Investor |
| **DII** | Domestic Institutional Investor |
| **LOO CV** | Leave-One-Out Cross-Validation |
| **Lot Size** | Number of shares per futures/options contract |
| **OI** | Open Interest (total outstanding futures/options contracts) |
| **OI Level** | V4 factor: absolute OI / 20-day average OI. Values > 1.0 = accumulation, < 1.0 = distribution |
| **OLS** | Ordinary Least Squares regression |
| **PCR** | Put-Call Ratio (put volume / call volume) |
| **Spread Ratio** | Today's (high-low)/close divided by 20-day average of same |
| **Scale Correction** | V4 non-linear expansion for R > 2.5 to match TF's 1.0-5.0+ range |
| **Suppressor Variable** | A variable with negative coefficient that improves other variables' predictive power |
| **TradeFinder** | Benchmark algorithmic trading platform used for validation |
| **VWAP** | Volume-Weighted Average Price |
| **Z-Score** | (value - mean) / standard_deviation — measures how many std deviations from normal |
