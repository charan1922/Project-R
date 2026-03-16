# Feature Specification: R-Factor V3 Engine

**Created**: 2026-03-17
**Status**: Implemented
**Supersedes**: `specs/001-r-factor-engine/` (V1 4-factor Z-score model)

## Overview

R-Factor V3 is an OLS regression model that scores F&O stocks by institutional activity intensity. Validated against TradeFinder's 80-stock R-Factor values with LOO Pearson 0.60 and 7/10 top-stock overlap.

## Model

### OLS Regression (5 features)

```
R = 1.108614
  + 0.624570 × spread_r
  + 0.076682 × pcr_z
  + 0.226081 × (spread_r × fut_turn_z)   [interaction term]
  + 1.414904 × fut_turn_z
  - 1.733390 × fut_vol_z                 [suppressor variable]
```

**Intercept (1.108614):** Calibrates the output scale to match TradeFinder's observed range of 1.5–3.5. Without it, raw OLS output would center around 0.

**Note:** `DEFAULT_CONFIG.weights` in `types.ts` are vestigial from V2 and are NOT used by the OLS engine. The engine uses the hardcoded OLS coefficients above (in `engine.ts`).

### Feature Definitions

| Feature | Type | Source | Live? | Description |
|---------|------|--------|-------|-------------|
| `spread_r` | Ratio | Equity OHLC | Yes (Dhan) | `(high-low)/close` today ÷ 20-day avg spread. Dominant predictor (Pearson 0.54). NOT a Z-score. |
| `pcr_z` | Z-score | F&O bhavcopy | No (proxy) | Z-score of put-call ratio (`pe_volume / ce_volume`). Smallest coefficient (0.077), acceptable to proxy from yesterday. |
| `fut_turn_z` | Z-score | Futures depth | Yes (Dhan) | Z-score of futures turnover (`volume × price`). |
| `fut_vol_z` | Z-score | Futures depth | Yes (Dhan) | Z-score of futures volume. **Negative coefficient (-1.733)** is intentional — suppressor variable that catches turnover/volume divergence (institutional block trades where few large orders create high turnover but low volume count). |
| `spread_r × fut_turn_z` | Interaction | Computed | Yes | Captures institutional urgency: high spread + high turnover = conviction. |

### 20-Day Lookback Window

`transformToFactorData()` computes the spread ratio using a rolling 20-day window (`Math.max(0, i - 20)` to `i`). For the first few days where lookback < 20, it uses whatever history is available (minimum 1 day). If lookback is empty, spread defaults to 0.

### Regime Classification

| Regime | Condition | Meaning |
|--------|-----------|---------|
| Cheetah | `spread > 1.5` AND `fut_volume Z > 1.0` | Fast momentum, wide spreads |
| Elephant | `oi_change Z > 1.0` AND `fut_turnover Z > 0.5` | Heavy OI buildup, institutional |
| Hybrid | Both conditions met | Rare, high conviction |
| Defensive | Neither | Normal market, no signal |

The `regimeSwitch: 1.5` threshold in `DEFAULT_CONFIG` corresponds to the spread threshold for Cheetah classification.

### Blast Trade Detection

A stock is flagged as a blast trade when `compositeRFactor >= 2.8` (extreme institutional activity). This threshold is defined in `DEFAULT_CONFIG.thresholds.blastTrade` in `types.ts`.

## Data Pipeline

### Data Sources

1. **NSE Bhavcopy** (historical baseline — `bhavcopy-service.ts`)
   - Equity CSV: `BhavCopy_NSE_CM_0_0_0_YYYYMMDD_F_0000.csv.zip`
     - Fields: `TckrSymb`, `SctySrs` (filter EQ only), `HghPric`, `LwPric`, `ClsPric`, `TtlTradgVol`, `TtlTrfVal`
   - F&O CSV: `BhavCopy_NSE_FO_0_0_0_YYYYMMDD_F_0000.csv.zip`
     - Fields: `TckrSymb`, `FinInstrmTp` (STF=stock futures, STO=stock options), `XpryDt`, `OpnIntrst`, `ChngInOpnIntrst`, `TtlTradgVol`, `TtlTrfVal`, `OptnTp` (CE/PE)
   - **Futures processing:** Groups by symbol, finds near-month expiry via `findNearestExpiry()` (nearest expiry >= reference date with 1-day tolerance), uses only that contract's data.
   - **Options processing:** Aggregates ALL strikes and expiries per symbol. Splits CE vs PE volume using `OptnTp` field.
   - **Holiday handling:** If both equity and F&O downloads return empty (404/403), the date is treated as a holiday and skipped. No explicit holiday calendar.
   - **NSE authentication:** Requires Akamai session cookie. `getNSECookie()` visits `https://www.nseindia.com/` with browser-like headers (`Accept: text/html`, `Accept-Language: en-US`, full Chrome User-Agent), extracts `Set-Cookie` headers (`ak_bmsc`, `bm_mi`, `bm_sz`), passes cookie string to subsequent ZIP downloads. Cookie is obtained once per sync session. Falls back to empty string on failure.
   - Stored in: `bhavcopy_days` Prisma table (~206 stocks × 25+ days)
   - Sync: User-triggered from `/trading-lab/bhavcopy`. `importFromCache()` reads existing JSON files from `lib/cache/rfactor/daily/*.json` first, then `syncBhavcopy()` downloads missing dates from NSE.

2. **Dhan Master Contracts** (instrument mapping — `master-contracts.ts`)
   - CSV: `https://images.dhan.co/api-data/api-scrip-master.csv` (~100MB, 273K instruments)
   - Column mapping: `SEM_EXM_EXCH_ID` (exchange), `SEM_SEGMENT` (E=equity, D=derivatives), `SEM_SMST_SECURITY_ID`, `SEM_TRADING_SYMBOL`, `SEM_INSTRUMENT_NAME`, `SEM_EXCH_INSTRUMENT_TYPE` (ES/FUT/OP), `SEM_EXPIRY_DATE`
   - **Filtered** to `KEEP_SEGMENTS = {NSE_EQ, NSE_FNO}` and `KEEP_INSTRUMENTS = {EQUITY, FUTSTK, FUTIDX}` → ~24K rows (from 273K). Options, currencies, commodities, BSE excluded.
   - Segment normalization: `NSE+E → NSE_EQ`, `NSE+D → NSE_FNO`, instrument normalization: `FUT → FUTSTK/FUTIDX` (from `SEM_INSTRUMENT_NAME`), `OP → OPTSTK/OPTIDX`
   - Underlying extraction: For `FUTSTK`, parses `RELIANCE-Mar2026-FUT` → underlying `RELIANCE`
   - Stored in: `master_contracts` Prisma table
   - Sync: User-triggered from `/trading-lab/master-contracts`

3. **Dhan Market Feed** (live intraday — `data-service.ts`)
   - `POST /v2/marketfeed/ohlc` — equity OHLC for all 206 stocks (1 API call, max 1000)
   - `POST /v2/marketfeed/quote` — futures depth (volume, OI, depth) for all 206 stocks (1 API call)
   - **SDK bypass:** `dhanMarketFeed()` makes raw `fetch()` calls instead of using the Dhan V2 SDK because: (a) SDK sends string security IDs but API requires numeric, (b) SDK's response types don't match the actual nested response `data.SEGMENT.securityId.{last_price, ohlc, volume?, oi?}`
   - Rate limit: 1 req/sec, max 1000 instruments per call

4. **F&O Stock List** (`lib/data/fno_stocks_list.json`)
   - Static JSON: `{ "source": "...", "total": 206, "stocks": ["RELIANCE", "TCS", ...] }`
   - Fallback if file missing: `['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'SBIN']`
   - Updated manually from Zerodha/NSE F&O list

### Computation Flow

```
Intraday Boost page load
  → GET /api/r-factor?limit=206
    → scanAllSymbols(206)
      → preWarmCache() — fetches RELIANCE bhavcopy to warm DB connection
      → hasDhanCredentials()? — checks env.DHAN_CLIENT_ID + env.DHAN_ACCESS_TOKEN
        → YES: computeLiveSignals(symbols)
          → ensureSynced() — checks master_contracts has today's syncDate (throws MasterContractsNotSyncedError if not)
          → resolveSymbol() × 206 — equity securityId from master_contracts (synced flag = true after first check, subsequent calls skip DB)
          → batchResolveFutures(symbols) — single query for all 206 futures securityIds
          → dhanMarketFeed('ohlc', {NSE_EQ: [numericIds]}) — live equity OHLC (parallel)
          → dhanMarketFeed('quote', {NSE_FNO: [numericIds]}) — live futures depth (parallel)
          → For each stock:
            → getHistoricalData(symbol, 25) — from bhavcopy_days table (throws BhavcopyNotSyncedError if empty)
            → Blend live + historical (see Live Data Blending below)
            → transformToFactorData() → engine.calculateSignal() → BoostSignal
          → Sort by compositeRFactor descending
        → NO: computeBhavcopySignals(symbols) — pure bhavcopy, no live data
```

### Live Data Blending

During market hours (IST 9:15–15:30, weekdays — checked by `isMarketHours()`), today's data is synthesized:

| Field | Source | Live? |
|-------|--------|-------|
| `eq_high`, `eq_low`, `eq_close` | Dhan equity OHLC | Yes |
| `eq_volume`, `eq_turnover` | Yesterday's bhavcopy | No (not needed for OLS) |
| `fut_volume` | Dhan futures depth `.volume` | Yes |
| `fut_turnover` | Computed: `fut_volume × fut_lastPrice` | Yes |
| `fut_oi` | Dhan futures depth `.oi` | Yes |
| `fut_oi_change` | Computed: `abs(live_oi - yesterday_oi)` | Yes |
| `ce_volume`, `pe_volume` | Yesterday's bhavcopy proxy | No (PCR coeff 0.077, smallest) |
| `opt_volume`, `opt_oi`, `opt_turnover` | Yesterday's bhavcopy proxy | No |

**No Dhan credentials fallback:** If `DHAN_CLIENT_ID` or `DHAN_ACCESS_TOKEN` are not set in `.env.local`, the system falls back to `computeBhavcopySignals()` which uses only the last day of bhavcopy data. Logs: `[Boost] No Dhan credentials → bhavcopy-only signals`.

### Timezone Handling

All date operations use IST (Asia/Kolkata, UTC+5:30). `todayIST()` in `master-contracts.ts` returns `YYYY-MM-DD` in IST using `toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })`. This ensures sync date comparisons align with Indian market days.

## Database

### Prisma + SQLite via better-sqlite3 Adapter

`lib/db.ts` uses `@prisma/adapter-better-sqlite3` with a lazy proxy pattern:
- Local: `data/project-r.db`
- Vercel: `/tmp/project-r.db`
- Global singleton via `globalForPrisma` to prevent multiple connections in dev (HMR)
- Lazy proxy: `new Proxy({} as PrismaClient, { get: ... })` — Prisma client only created on first property access

### Bulk Insert Optimization

Both master contracts and bhavcopy use `prisma.$executeRawUnsafe()` with multi-value INSERT statements instead of Prisma's `createMany()`. Reason: `createMany` for SQLite generates individual INSERT statements, which is extremely slow for 24K+ rows. Raw SQL with batched multi-value INSERTs (500 rows/chunk for master contracts, 200 for bhavcopy) completes in 2-3s. Single quotes in data are escaped via `s.replace(/'/g, "''")`. Duplicate handling via `INSERT OR IGNORE`.

### Process-Level Sync Flag

`master-contracts.ts` uses `let synced = false` as an in-memory flag. After the first successful `ensureSynced()` call confirms DB has today's data, it sets `synced = true`. Subsequent calls skip the DB count query entirely. Flag resets only on process restart (dev server HMR or production restart).

## Sync Architecture

Data sync is **user-triggered only** — no page auto-downloads external data.

| Source | Sync Page | API | What Happens |
|--------|-----------|-----|-------------|
| Dhan master CSV | `/trading-lab/master-contracts` "Re-sync" | `POST /api/master-contracts/sync` | Downloads CSV → filters to EQUITY+FUTSTK+FUTIDX → bulk inserts ~24K rows |
| NSE bhavcopy | `/trading-lab/bhavcopy` "Sync" | `POST /api/bhavcopy/sync?days=25` | Imports from JSON cache first → downloads missing dates from NSE → bulk inserts |

**Consumer pages (Intraday Boost):** Read from DB only. If data missing:
- `MasterContractsNotSyncedError` → API returns `{ code: "SYNC_REQUIRED", syncTarget: "master-contracts" }` (HTTP 503) → page shows modal: "Go to Master Contracts"
- `BhavcopyNotSyncedError` → API returns `{ code: "SYNC_REQUIRED", syncTarget: "bhavcopy" }` (HTTP 503) → page shows modal: "Go to Bhavcopy"

## UI Pages

| Page | Path | Purpose |
|------|------|---------|
| Intraday Boost | `/trading-lab/intraday-boost` | Live R-Factor rankings, auto-refresh 60s |
| Master Contracts | `/trading-lab/master-contracts` | Browse + sync Dhan instruments |
| Bhavcopy | `/trading-lab/bhavcopy` | Browse + sync NSE daily data |

Sidebar nav items added in `app/components/_sidebar/nav-data.tsx` under v1Items: Intraday Boost (Flame icon, LIVE badge), Master Contracts (Database icon), Bhavcopy (BarChart2 icon).

## Validation Results

| Metric | V1 (4-factor) | V3 (OLS) |
|--------|---------------|----------|
| Pearson vs TradeFinder | 0.19 | 0.67 |
| LOO Cross-Validation | — | 0.60 |
| Top-10 overlap | 2/10 | 7/10 |
| Within ±0.5 of TradeFinder | 42/80 | 71/80 |
| R-Factor range | 0.5–4.0 | 1.0–3.5 |

### Validation Scripts (derive-r/)

| File | Purpose |
|------|---------|
| `derive-r/improve_v3.py` | Exhaustive 24-feature search with LOO CV. Found best 5-feature model (LOO 0.5989). |
| `derive-r/validate_v3_final.py` | Final production engine validation (Pearson 0.67, 7/10 top overlap, 71/80 within ±0.5). |
| `derive-r/best_model.json` | Winning model coefficients stored as JSON. |
| `derive-r/v3_final_validation.json` | Predictions for all 80 stocks used for comparison. |
| `derive-r/R_FACTOR_JOURNEY.md` | Complete step-by-step documentation of the entire build journey. |

## Key Insights

1. **Spread ratio is dominant** (Pearson 0.54 individually, coeff 0.625) — not a Z-score, but a ratio of today's spread vs 20-day average
2. **Negative fut_volume coefficient (-1.733)** is intentional — suppressor variable that catches turnover/volume divergence (institutional block trades)
3. **Intercept (1.108)** calibrates the scale to match TradeFinder's 1.5–3.5 range. Without it, scores would center around 0.
4. **PCR has the smallest coefficient (0.077)** — acceptable to proxy from yesterday during live trading
5. **`DEFAULT_CONFIG.weights`** in `types.ts` are vestigial from V2 and NOT used by the OLS engine. The engine uses hardcoded OLS coefficients in `engine.ts`.
