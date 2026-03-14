# R-Factor Engine — Complete Build Journey

## What is R-Factor?

R-Factor is a proprietary metric from TradeFinder that scores stocks based on **institutional activity intensity**. A high R-Factor (>2.5) means big players (FIIs, DIIs, prop desks) are actively trading that stock — making it a candidate for sharp intraday moves.

TradeFinder doesn't publish how R-Factor is computed. We reverse-engineered it using publicly available NSE data.

---

## Phase 1: Data Discovery

### What data does NSE publish daily?

NSE publishes two "bhavcopy" files after market close:

**Equity Bhavcopy** (CM = Cash Market):
```
URL: https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_{YYYYMMDD}_F_0000.csv.zip
Fields: TckrSymb, SctySrs, HghPric, LwPric, ClsPric, TtlTradgVol, TtlTrfVal
```

**F&O Bhavcopy** (FO = Futures & Options):
```
URL: https://nsearchives.nseindia.com/content/fo/BhavCopy_NSE_FO_0_0_0_{YYYYMMDD}_F_0000.csv.zip
Fields: TckrSymb, FinInstrmTp (STF=futures, STO=options), OptnTp (CE/PE),
        XpryDt, OpnIntrst, ChngInOpnIntrst, TtlTradgVol, TtlTrfVal
```

These contain EVERY trade aggregated for EVERY stock, EVERY day. This is the same raw data TradeFinder likely uses.

### Ground truth: 80 stocks with known R-Factor

We captured TradeFinder's `intraday_boost` API response on March 13, 2026. File: `derive-r/march-13-2026.json`

This gave us `param_3` (R-Factor) for 80 F&O stocks. Range: 1.578 (INDIANB) to 3.486 (BIOCON).

---

## Phase 2: Initial Hypotheses (V1)

### First attempt — 4-factor Z-score model

We started with intuition: institutional activity = high volume + high OI + high turnover + unusual spread.

**V1 weights (guesswork):**
```
volume: 0.20, OI: 0.50, turnover: 0.20, spread: 0.10
```

**Result:** Pearson 0.19 against 80 stocks. Near useless — basically random.

**Why it failed:**
- OI *levels* have **negative correlation** (-0.13) with R-Factor! A stock can have huge OI but zero institutional activity today.
- Spread was weighted only 10% but turned out to be the **dominant predictor**.
- Volume and turnover are multicollinear (>0.85 correlated), so double-counting them added noise.

---

## Phase 3: 80-Stock Validation Infrastructure

### Built bhavcopy pipeline

Downloaded 29 trading days of bhavcopy data (Feb 2 – Mar 13, 2026) for validation.

**Files created:**
- `derive-r/validate_engine.py` — Downloads bhavcopy, computes V1 scores, compares with ground truth
- `derive-r/bhavcopy_cache/` — 29 days × 2 files = 58 cached CSVs (no re-downloading)

### Individual factor correlations discovered

Computed Pearson correlation of each factor (as Z-score) against actual R-Factor:

| Factor | Pearson | Verdict |
|--------|---------|---------|
| **Spread ratio** (today/20d avg) | **0.54** | Dominant predictor |
| **PCR** (put vol / call vol) | **0.31** | Strong, was missing from model |
| OI change (absolute) | 0.21 | Moderate |
| Futures turnover | 0.18 | Moderate |
| Futures volume | 0.16 | Correlated with turnover |
| Equity trade size | 0.13 | Weak but conceptually valid |
| Options volume | 0.09 | Weak at scale |
| **Delivery %** | **-0.12** | Tested and rejected — anti-correlated |
| **OI level** | **-0.13** | Tested and rejected — anti-correlated |

**Key discovery:** Spread (how much the stock's price range expanded today vs its 20-day average) is by far the strongest single signal. This makes sense — when institutions trade aggressively, they move the price range.

---

## Phase 4: V2 — Corrected Weights + PCR

### Added Put-Call Ratio (PCR)

The F&O bhavcopy has an `OptnTp` column with `CE` (call) or `PE` (put). We split options volume into CE vs PE and computed:

```
PCR = pe_volume / ce_volume
```

A high PCR means more put buying (hedging/bearish positioning). Pearson 0.31 — significant.

### Used hybrid ratio + Z-score approach

Regression showed spread works better as a **ratio** (today / 20-day average) than a Z-score. Other factors still work best as Z-scores.

**V2 weights (from intuition + individual correlations):**
```
spread: 0.30, fut_turnover: 0.20, pcr: 0.15, oi_change: 0.12,
eq_trade_size: 0.10, fut_volume: 0.08, opt_volume: 0.05
```

**Result:** Pearson 0.36, Top 10 overlap 5/10. Better, but still mediocre.

**Why it was still weak:** Using fixed positive weights for all factors ignores multicollinearity and interaction effects.

---

## Phase 5: V3 — OLS Regression (The Breakthrough)

### Exhaustive feature search

File: `derive-r/improve_v3.py`

We generated **24 features** from the raw data:
- Z-scores for all factors (7 features)
- Ratios for all factors (7 features)
- Non-linear transforms: log, squared, absolute (4 features)
- Interaction terms: spread × pcr, spread × fut_turnover (2 features)
- Additional: equity volume Z/ratio, equity turnover Z/ratio (4 features)

Then tested every possible combination of 3, 4, and 5 features using **Leave-One-Out (LOO) cross-validation** — the strictest test because each stock is predicted using a model trained on the other 79.

### Winning model: 5-feature OLS

```
R = 1.109 + 0.625 × spread_r
          + 0.077 × pcr_z
          + 0.226 × (spread_r × fut_turn_z)
          + 1.415 × fut_turn_z
          - 1.733 × fut_vol_z
```

**Why each feature matters:**

| Feature | Coefficient | Why |
|---------|------------|-----|
| `spread_r` | +0.625 | Price range expansion = institutional urgency |
| `pcr_z` | +0.077 | Unusual put/call ratio = hedging/positioning |
| `spread_r × fut_turn_z` | +0.226 | **Interaction** — both spread AND futures spiking = strongest signal |
| `fut_turn_z` | +1.415 | Futures money flow anomaly |
| `fut_vol_z` | **-1.733** | **Negative!** Suppressor variable — high volume without proportional turnover = retail noise, not institutional. The turnover/volume *divergence* is the real signal. |

**Why negative fut_volume?** Futures turnover = price × volume. When turnover spikes but volume doesn't spike proportionally, it means large-value trades (institutional blocks). When both spike equally, it's broad retail participation — not the signal we want.

### Validation results

| Metric | V1 | V2 | V3 (final) |
|--------|-----|-----|------------|
| Pearson | 0.19 | 0.36 | **0.67** |
| Spearman | 0.21 | 0.37 | **0.55** |
| Top 10 overlap | ~2/10 | 5/10 | **7/10** |
| Top 20 overlap | ~5/20 | 10/20 | **13/20** |
| Within ±0.5 error | ~20% | ~40% | **89% (71/80)** |
| Scale | Wrong | Wrong | **1.69–3.29 vs actual 1.58–3.49** |

---

## Phase 6: Production Implementation

### Files modified in the TypeScript codebase

| File | What changed |
|------|-------------|
| `lib/r-factor/types.ts` | Added `ce_volume`, `pe_volume` to DailyStockData. Added `pcr` to FactorData. `transformToFactorData()` now computes spread as ratio and PCR from CE/PE split. |
| `lib/r-factor/bhavcopy-service.ts` | Options parsing now checks `OptnTp` column for CE/PE and tracks volumes separately. Merge output includes both fields. |
| `lib/r-factor/engine.ts` | Replaced fixed-weight composite with OLS regression formula. Intercept + 5 signed coefficients including negative fut_volume and spread×turnover interaction. |
| `app/trading-lab/intelligence/page.tsx` | Updated to 7-factor display, reordered by importance (spread first), updated description text. |
| `src/mcp-server.ts` | Added PCR to signal output. |
| `lib/nse-service.ts` | Added `pcr: 0` for backward compatibility. |

### How the production pipeline works

```
1. BhavcopyService.fetchDailyData(date)
   ├── Downloads F&O bhavcopy ZIP from NSE
   ├── Downloads equity bhavcopy ZIP from NSE
   ├── Parses CSVs, picks near-month futures, splits CE/PE options
   ├── Merges into DailyStockData per symbol
   └── Caches to disk (never re-downloads same date)

2. transformToFactorData(dailyArray)
   ├── For each day, computes:
   │   ├── spread = (high-low)/close ratio vs 20-day average
   │   ├── pcr = pe_volume / ce_volume
   │   ├── eq_trade_size = turnover / volume
   │   ├── oi_change = |today OI - yesterday OI|
   │   └── Raw fut_turnover, fut_volume, opt_volume
   └── Returns FactorData[] array

3. RFactorEngine.calculateSignal(symbol, current, historical)
   ├── Computes Z-scores for fut_turnover, fut_volume, pcr, etc.
   ├── Spread stays as ratio (not Z-scored)
   ├── OLS formula: R = 1.11 + 0.625*spread_r + 0.077*pcr_z
   │                     + 0.226*(spread_r × fut_turn_z)
   │                     + 1.415*fut_turn_z - 1.733*fut_vol_z
   ├── Classifies regime (Elephant/Cheetah/Hybrid/Defensive)
   └── Returns SignalOutput with score, regime, blast flag
```

---

## Phase 7: What We Can't Capture (The ~33% Gap)

Our model explains ~45% of variance (R² ≈ 0.45). The remaining ~55% likely comes from:

1. **Intraday tick data** — Order flow, bid-ask imbalance, block trade timestamps. TradeFinder may track these in real-time.

2. **BIOCON anomaly** — Actual R=3.49 but low futures activity. Something beyond daily aggregates drives it (possibly intraday order flow or options skew patterns).

3. **Multi-day momentum** — Our model is single-day snapshot. TradeFinder may track multi-day accumulation patterns.

4. **Proprietary signals** — TradeFinder has access to their own user order flow data.

---

## File Index

### Validation & Research (`derive-r/`)

| File | Purpose |
|------|---------|
| `march-13-2026.json` | Ground truth — 80 stocks with TradeFinder R-Factor |
| `validate_engine.py` | V1 validation — downloads bhavcopy, tests original weights |
| `validate_regression.py` | V2 regression — OLS on 80 stocks, feature importance |
| `improve_v3.py` | V3 exhaustive search — 24 features, 3/4/5 combos, LOO CV |
| `validate_v3.py` | V3 fixed-weight validation |
| `validate_v3_final.py` | V3 OLS production engine validation |
| `engine_validation.json` | V1 results (80 stocks, all Z-scores) |
| `best_model.json` | V3 winning model coefficients + predictions |
| `v3_final_validation.json` | Final production engine predictions for all 80 stocks |
| `bhavcopy_cache/` | 29 days of cached bhavcopy CSVs |

### Production Engine (`lib/r-factor/`)

| File | Purpose |
|------|---------|
| `types.ts` | Data interfaces, OLS weights, `transformToFactorData()` |
| `engine.ts` | `RFactorEngine` class — OLS composite + regime classification |
| `bhavcopy-service.ts` | NSE bhavcopy download, parse, cache pipeline |
| `data-service.ts` | Orchestrator — combines bhavcopy + engine |
| `stats.ts` | Z-score computation using mathjs |
| `index.ts` | Module exports |

### UI & API

| File | Purpose |
|------|---------|
| `app/trading-lab/intelligence/page.tsx` | Intelligence dashboard — 7-factor cards |
| `app/api/r-factor/route.ts` | REST endpoint for scanning stocks |
| `src/mcp-server.ts` | MCP tools for AI queries |
| `lib/nse-service.ts` | Legacy NSE service (equity-only, pcr=0 compat) |

---

## How to Run

### Validate against ground truth (Python)
```bash
# Requires numpy
python3 derive-r/validate_v3_final.py
```

### Run production engine (TypeScript)
```bash
pnpm dev
# Visit: http://localhost:5000/trading-lab/intelligence
```

### Check build
```bash
npx tsc --noEmit   # Should be zero errors
```

---

## Key Learnings

1. **Individual factor correlations lie.** Futures turnover had Pearson 0.70 on 11 stocks but only 0.18 on 80. Always validate at scale.

2. **Multicollinearity matters.** Futures volume and turnover are >0.85 correlated. Using both with positive weights = double counting. The OLS regression discovered that volume needs a *negative* coefficient — the divergence is the signal.

3. **Ratios > Z-scores for some features.** Spread works better as today/20d_avg ratio (0.54) than as Z-score (0.48). Different features need different normalization.

4. **Interaction terms catch non-linear effects.** Spread alone = 0.54. Spread × futures_turnover catches the case where *both* signals fire simultaneously = institutional urgency.

5. **LOO cross-validation prevents overfitting.** Our in-sample R² was 0.45 but LOO Pearson was 0.60. With only 80 data points, in-sample metrics are unreliable. LOO gives honest out-of-sample estimates.

6. **The intercept calibrates scale.** Without the intercept (1.11), our scores range -1 to +3. With it, they range 1.7–3.3, matching TradeFinder's actual 1.6–3.5 scale.
