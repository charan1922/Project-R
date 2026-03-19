# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Project-R (DeepQuant)** — Dhan V2 algorithmic trading platform with Historify historical data management, R-Factor market intelligence, and quantitative backtesting. Built with Next.js 16 App Router, React 19, TypeScript, and a custom Dhan V2 SDK.

## Commands

```bash
pnpm dev              # Dev server on port 5000
pnpm build            # Production build (output: dist/)
pnpm start            # Production server
pnpm lint             # Biome check (linting + formatting)
pnpm format           # Biome format --write
pnpm db:migrate       # Prisma migrate dev (create/apply migrations)
pnpm db:push          # Prisma push schema to DB (no migration file)
pnpm db:studio        # Prisma Studio (visual DB editor)
pnpm db:generate      # Regenerate Prisma client
pnpm mcp              # Start MCP server for AI queries
pnpm extract          # Playwright data extractor
pnpm install:browsers # Install Playwright browsers (needed for extract)
```

No test runner is currently configured in the root project. The Dhan V2 SDK (`/dhanv2`) uses Vitest — run with `cd dhanv2 && pnpm test`.

## Architecture

### Domain Modules

The codebase is organized by domain, not by type:

- **`/app`** — Next.js App Router. Pages use `"use client"` with client-side data fetching via `useEffect`. API routes under `/app/api/` serve as the backend.
- **`/lib`** — Core business logic, split into three engines:
  - **`/lib/historify/`** — Data persistence, live WebSocket management, Dhan API client, scheduler. `master-contracts.ts` handles Dhan instrument lookup (Prisma-backed, daily sync).
  - **`/lib/quant/`** — Backtest engine, strategy implementations, data loader with 5-min TTL cache, math utils (EMA, RSI)
  - **`/lib/r-factor/`** — Market intelligence engine (V4 ensemble):
    - `engine.ts` — V4 R-Factor computation with configurable ensemble:
      - **Spread-quadratic** (default 90% weight): piecewise `R = 2.45 - 1.86×spread + 0.95×spread²` for spread ≥ 1.0, linear ramp below. Best match with TradeFinder (8/10 top-10 overlap on bhavcopy).
      - **Full OLS** (default 5% weight): `R = 1.11 + 0.625×spread + 0.077×pcr + 0.226×(spread×fut_turn) + 1.415×fut_turn - 1.733×fut_vol` (LOO Pearson 0.60). Negative fut_vol coefficient is a suppressor — high OLS weight degrades live rankings.
      - **Momentum** (default 5% weight): Uses spread acceleration, turnover acceleration, close position.
      - **Dhan-live model** (`calculateSignalLive`): OI-level ratio + options volume + futures volume composite. Fitted on 79 TF-paired stocks (Mar 19, 2026). Uses `oi_level` (absolute OI / 20d avg) to capture sustained institutional accumulation.
      - `calculateSignal()` = ensemble (bhavcopy + option chain path)
      - `calculateSignalLive()` = Dhan-live composite (no option chain path)
      - `calculateSignalOLS()` = legacy V3 OLS-only
      - `SignalOutput.modelUsed`: `'ols' | 'spread-quad' | 'momentum' | 'ensemble'`
      - Scale correction: non-linear expansion above threshold 2.5 for matching TF's 1.0-5.0+ range
      - Robust regression: Huber-like penalty (disabled by default — penalizes high-activity stocks TF ranks highest)
    - `ensemble.ts` — 3-model ensemble: `predictOLS()`, `predictSpreadQuadratic()`, `predictMomentum()`, `predictEnsemble()` with confidence-weighted dynamic blending
    - `market-context.ts` — Market-wide adjustments (VIX, NIFTY, FII/DII). Returns neutral defaults until NSE feed integrated.
    - `calibration.ts` — Dhan-NSE empirical calibration factors (206 stocks × 5 days). Documents data source differences but NOT applied in pipeline yet.
    - `bhavcopy-service.ts` — NSE bhavcopy sync + DB reads. Data stored in `bhavcopy_days` Prisma table. Sync is user-triggered only (never auto-downloads). NSE requires session cookie — `getNSECookie()` visits nseindia.com first.
    - `data-service.ts` — Orchestrator with smart data source selection:
      - Market hours + Dhan → `computeLiveSignals()` with Dhan-live model → `dataSource: 'live'`
      - With option chain → `activeEngine.calculateSignal()` (ensemble)
      - Without option chain → `activeEngine.calculateSignalLive()` (Dhan-live composite)
      - Post-market + today's bhavcopy synced → `computeBhavcopySignals()` → `dataSource: 'bhavcopy-today'`
      - Non-trading day → latest bhavcopy → `dataSource: 'bhavcopy'`
      - **Engine overrides**: `setEngineOverrides()` / `clearEngineOverrides()` allow API-level config changes (preset weights, robust toggle) from UI controls
      - Dhan response cache: per-day, only used when `!isMarketHours()` (fresh during market hours)
      - Retry logic: 2 attempts with 2s delay before bhavcopy fallback
      - Sector attachment: reads `lib/data/fno_sectors.json`, attaches `sector` to each signal
    - `types.ts` — DailyStockData, FactorData (8 factors including `oi_level`), EnhancedFactorData, SignalOutput (with rawRFactor, scaledRFactor, confidence, marketAdjustment), EngineConfig + `transformToFactorData()`, `transformToEnhancedFactorData()`
    - `stats.ts` — `calculateZScore()`, `calculateRollingStats()`
    - `index.ts` — Barrel exports for all R-Factor modules
  - **`/lib/dhan/`** — Dhan API utilities:
    - `auth.ts` — Auto-generates access tokens via TOTP (`otpauth` library). Priority: disk-cached token → renew existing → generate via TOTP → fallback to static `DHAN_ACCESS_TOKEN`. Token persisted to `data/.dhan-token.json` (gitignored) to survive hot reloads. 24hr token with 1hr refresh buffer.
    - `market-feed.ts` — Raw Dhan V2 market feed calls (`dhanMarketFeed()`). Uses `getDhanAccessToken()` from auth.ts. Exports: `isMarketHours()` (9:15-15:30 IST), `isTradingDay()` (weekday after 9:15), `todayIST()` (YYYY-MM-DD in IST). Dhan API endpoints used:
      - `POST /v2/marketfeed/quote` — equity OHLC + volume + VWAP; futures volume + OI + VWAP
      - `POST /v2/optionchain` — per-strike CE/PE volume, OI, greeks (rate limit: 1 req / 3s)
      - `POST /v2/charts/intraday` — 5-min candle data (with `oi: true` flag for OI) for backtesting/analysis
      - `POST /v2/charts/historical` — Daily OHLCV candles (with `oi: true` flag for OI)
- **`/dhanv2`** — Standalone TypeScript SDK for Dhan V2 API (separate pnpm package `dhanhq-ts`). REST clients, WebSocket handlers, binary protocol parser. Rate-limited to 4 req/sec.
- **`/components`** — shadcn/ui components (Radix UI + Tailwind + CVA)

### Real-Time Data Pipeline

Browser → SSE (`/api/historify/live-stream`) → `LiveManager` singleton → Dhan WebSocket

1. `LiveManager` (`/lib/historify/live-manager.ts`) maintains a single Dhan WebSocket connection and broadcasts to SSE clients
2. SSE endpoint (`/app/api/historify/live-stream/route.ts`) bridges WebSocket quotes to browser
3. `useLiveSession` hook (`/app/historify/live/_hooks/use-live-session.ts`) aggregates ticks into 1-minute candles client-side

### Data Layer

- **Prisma ORM** + **SQLite** via `@prisma/adapter-better-sqlite3`: Schema in `prisma/schema.prisma`, config in `prisma/prisma.config.ts`, client singleton in `lib/db.ts` (lazy proxy pattern). DB file at `data/project-r.db`. Tables:
  - `watchlist`, `activity`, `settings` — app state
  - `master_contracts` — Dhan instrument mappings (symbol → securityId). Synced daily from Dhan CSV (~24K rows: EQUITY + FUTSTK + FUTIDX only). Managed via `/trading-lab/master-contracts` page. Includes `lotSize` field for Dhan volume → contracts conversion.
  - `bhavcopy_days` — NSE daily equity + F&O data (per stock per day). ~206 stocks × 40+ days. Synced via `/trading-lab/bhavcopy` page. NSE requires session cookie for downloads.
- **DuckDB** (@duckdb/node-api): Parquet columnar storage for large market datasets in `/lib/historify/duckdb.ts`
- Native modules (prisma, duckdb) are externalized in webpack config (`next.config.ts`)

### Data Sync Architecture

Data sync is **user-triggered only** — no page auto-downloads external data. Each data source has a dedicated management page:

1. **Master Contracts** (`/trading-lab/master-contracts`) — Re-sync downloads Dhan's master CSV, filters to EQUITY + FUTSTK + FUTIDX, stores in SQLite. Required before Intraday Boost can resolve security IDs.
2. **Bhavcopy** (`/trading-lab/bhavcopy`) — Sync downloads NSE bhavcopy ZIPs (equity + F&O), imports from local JSON cache first, then fetches missing dates from NSE. Required for R-Factor Z-score baselines.
3. **Intraday Boost** (`/trading-lab/intraday-boost`) — Reads from DB only. Shows modal directing to the appropriate sync page if data is missing (`MasterContractsNotSyncedError` or `BhavcopyNotSyncedError`).

### Dhan V2 Market Feed

Raw API calls bypass the SDK (SDK sends string IDs, API needs numbers). `dhanMarketFeed()` in `lib/dhan/market-feed.ts` calls `POST /v2/marketfeed/ohlc` (equity OHLC) and `POST /v2/marketfeed/quote` (futures depth with volume + OI). Response is nested: `data.SEGMENT.securityId.{last_price, ohlc, volume?, oi?}`.

**Volume unit mismatch:** Dhan reports futures volume in **shares**, NSE bhavcopy reports in **contracts/lots**. `data-service.ts` divides Dhan volume by `lotSize` (from `master_contracts` table) before computing Z-scores. Futures turnover uses `average_price` (VWAP) instead of `last_price` to match NSE's `TtlTrfVal` methodology.

### Dhan Authentication

`lib/dhan/auth.ts` manages access tokens automatically:

1. **TOTP auto-generation** (preferred): Uses `otpauth` library to generate TOTP codes, calls `POST https://auth.dhan.co/app/generateAccessToken` with clientId + PIN + TOTP. Token persisted to `data/.dhan-token.json` (gitignored) to survive Turbopack hot reloads. 24hr token with 1hr refresh buffer.
2. **Token renewal**: Calls `POST /v2/RenewToken` if existing token is still valid but near expiry.
3. **Static fallback**: Uses `DHAN_ACCESS_TOKEN` from `.env.local` if TOTP credentials not configured.

Rate limit: Dhan allows token generation once every 2 minutes. Concurrent calls are deduplicated via a promise lock.

**Standalone scripts**: When running TypeScript outside Next.js (e.g., `npx tsx -e "..."`), env vars from `.env.local` are NOT auto-loaded. Use `import { config } from 'dotenv'; config({ path: '.env.local' });` at the top of the script.

### Dhan API Endpoints Used

| Endpoint | Segment | Returns | Rate Limit |
|----------|---------|---------|-----------|
| `POST /v2/marketfeed/quote` | NSE_EQ | OHLC, volume, average_price, last_price | 4 req/sec |
| `POST /v2/marketfeed/quote` | NSE_FNO | volume, OI, average_price, last_price, depth | 4 req/sec |
| `POST /v2/optionchain` | NSE_FNO | Per-strike CE/PE: volume, OI, greeks, IV | 1 req/3sec |
| `POST /v2/charts/intraday` | Any | 5-min OHLCV candles + OI (with oi flag) | 4 req/sec |
| `POST /v2/charts/historical` | Any | Daily OHLCV candles + OI (with oi flag) | 4 req/sec |

### R-Factor V4 Model Architecture

**Three-tier model system** — different models for different data paths:

| Data Path | Model | TF Match | When Used |
|-----------|-------|----------|-----------|
| Bhavcopy (Past tab) | Spread-quad dominant ensemble (90/5/5) | 8/10 top-10 | `mode=past`, r-factor-history |
| Dhan live + option chain | Ensemble with OC PCR | — | `mode=live`, OC available |
| Dhan live, no option chain | Dhan-live composite (OI level + opt vol + fut vol) | 5/10 top-10 | `mode=live`, no OC |

**Key V4 findings from TradeFinder comparison (Mar 19, 2026):**
- TF's R-Factor is **computed once per day** (values don't change despite LTP moving). Likely from EOD/bhavcopy data.
- TF's model is heavily **spread-dominated** — our spread-quad at 90% weight matches 8/10 top-10.
- OLS at high weight (50%) **degrades** live rankings because `fut_vol_z` coefficient (-1.733) amplifies Dhan Z-score mismatches.
- Robust regression **penalizes** the very stocks TF ranks highest (those with extreme Z-scores > 3 indicating genuine institutional activity).
- `oi_level` (absolute OI / 20d avg) captures **sustained accumulation** that daily `oi_change` misses. All TF top-5 stocks had 25-35% OI buildup above 20d average.

**8 factors in FactorData:**
1. `spread` — (H-L)/close RATIO vs 20d avg (dominant predictor)
2. `oi_level` — Absolute OI / 20d avg OI (sustained accumulation signal, V4 addition)
3. `fut_turnover` — Futures turnover
4. `fut_volume` — Futures volume
5. `opt_volume` — Options total volume
6. `eq_trade_size` — Equity avg trade size
7. `oi_change` — |today's OI - yesterday's OI| (daily change)
8. `pcr` — Put-Call ratio

**UI-configurable engine presets** (Intraday Boost page):
- **Spread-Quad 90%** (default): `ensembleWeights: {ols: 0.05, spreadQuad: 0.90, momentum: 0.05}`, `robustRegression: false`. Best TF match.
- **Balanced OLS 50%**: `ensembleWeights: {ols: 0.50, spreadQuad: 0.30, momentum: 0.20}`, `robustRegression: true`. Original V4 ensemble.
- Passed via API query params: `?preset=sq-dominant|balanced&robust=true|false`

**Dhan-live composite** (`calculateSignalLive`, used when no option chain):
```
R = 1.5 + oiExcess × 4.0 + optVolBoost × 0.25 + futVolBoost × 0.20 + spreadBoost × 0.30
```
Where `oiExcess = clamp(oi_level - 1.0, 0, 0.5)`, all boosts capped. Output clamped to [1.0, 6.0].

### State Management

- **Zustand** store in `/lib/historify/live-store.ts` for live trading state (connection status, active symbol, ticks, historical data)
- Custom hooks over global context: `useHistorifyData()`, `useLiveSession()`
- `useRef` for non-state values (candle aggregator), `useMemo`/`useCallback` for perf

### Quant Strategies

Located in `/lib/quant/strategies/`: EMA Crossover, RSI Accumulation, Buy & Hold 75/25, Dual Momentum. The backtest engine (`/lib/quant/backtest-engine.ts`) calculates Sharpe ratio, max drawdown, CAGR, win rate, profit factor with Indian market fee modeling.

### Operational Infrastructure

- **Environment validation**: `lib/env.ts` — Zod schema validates all env vars at import time. Use `env.*`, `isVercel()` instead of raw `process.env`
- **Error boundaries**: `app/error.tsx` (page-level) and `app/global-error.tsx` (root layout) with Sentry integration
- **Error tracking**: Sentry via `@sentry/nextjs` — client/server/edge configs at project root, instrumentation in `instrumentation.ts`
- **Middleware**: `middleware.ts` — request timing, CORS for API routes
- **Security headers**: Configured in `next.config.ts` headers() — HSTS, X-Frame-Options, CSP, etc.
- **Analytics**: Vercel Analytics (`@vercel/analytics`) in root layout
- **URL state**: `nuqs` adapter in root layout — use `useQueryState` for bookmarkable filter/search state
- **Structured logging**: `lib/logger.ts` — JSON output in production, console in dev
- **Linter**: Biome (`biome.json`) — replaces ESLint. Config ignores `dhanv2/`, `data/`, `derive-r/`

## Key Conventions

- **Path alias**: `@/*` maps to project root (configured in tsconfig.json)
- **Package manager**: pnpm 10.x (lockfile: pnpm-lock.yaml)
- **Styling**: Tailwind CSS 4 + shadcn/ui. Utility function `cn()` in `/lib/utils.ts` (clsx + twMerge)
- **API pattern**: All routes return `NextResponse.json({ success, data })` or `NextResponse.json({ error }, { status })`. Most use `export const dynamic = 'force-dynamic'`
- **Charting**: Lightweight Charts v5 for real-time (ref-based updates bypassing React DOM), Recharts for dashboards
- **Icons**: Lucide React
- **Feature pages** use underscore-prefixed folders for co-located non-route files: `_hooks/`, `_components/`, `_lib/`
- **Type-safe actions**: `next-safe-action` available for new mutation endpoints (server actions over POST routes)
- **Code validation**: Use `pnpm lint` (Biome), NOT `tsc --noEmit`

## Environment Variables

Validated in `lib/env.ts`. Required in `.env.local` (never committed):
```
DHAN_CLIENT_ID=<client-id>
DHAN_ACCESS_TOKEN=<jwt-token>             # Optional if TOTP configured
DHAN_PIN=<6-digit-pin>                    # For TOTP auto-token generation
DHAN_TOTP_SECRET=<base32-secret>          # From Dhan authenticator setup
DATABASE_URL=<url>                        # Optional: default is SQLite file:data/project-r.db
NEXT_PUBLIC_SENTRY_DSN=<sentry-dsn>      # Optional: error tracking
SENTRY_ORG=<org>                          # Optional: source maps
SENTRY_PROJECT=<project>                  # Optional: source maps
```

## Intraday Boost Page Architecture

The main trading page (`/trading-lab/intraday-boost`) is modular:
- `_hooks/use-boost-data.ts` — data fetching hook (auto-refresh 60s, sync error handling, engine preset/robust params)
- `_lib/sector-stats.ts` — per-sector average spread Z-score computation
- `page.tsx` — thin render layer with sub-components: `SyncModal`, `DataSourceBadge`, `SortButton`, `StockRow`, `Tooltip`
- `app/trading-lab/_lib/r-factor-ui.ts` — shared display helpers (colors, badges, date formatting) used by both Intraday Boost and R-Factor History pages
- **Engine config controls**: Radio buttons for preset (Spread-Quad 90% vs Balanced OLS 50%) + checkbox for Robust Regression. Each has hover tooltip with detailed explanation. Dynamic description text below shows active formula.

### R-Factor History Page

`/trading-lab/r-factor-history` — two tabs:
- **Stock History**: per-symbol R-Factor trend over 25 days (Recharts line chart + table with OI Level, Confidence, all Z-scores)
- **Daily Leaderboard**: per-date top stocks ranked by R-Factor (date selector, OI Level column, sector filter)

API: `GET /api/r-factor-history?symbol=X&days=25` | `?date=YYYY-MM-DD&limit=20` | `?dates=true`

V4 fields in API response: `rawRFactor`, `scaledRFactor`, `confidence`, `modelUsed`, `zScores.oi_level`

## Specs & Design Docs

- `/openspec/specs/r-factor-v3-engine/` — R-Factor V3 OLS model spec (coefficients, data model, architecture)
- `/openspec/changes/r-factor-v4-ensemble/` — V4 ensemble: proposal, design (8 decisions), tasks (all complete), 6 detailed specs (ensemble model, scale correction, robust regression, market context, dhan-nse calibration, enhanced features)
- `/openspec/changes/r-factor-enhancements/` — Sector integration, post-market data, history page, dual model, data consistency
- `/openspec/changes/trading-engine-hardening/` — Backtest realism, risk management, security hardening
- `/openspec/` — OpenSpec design documents with proposal → design → spec → tasks workflow
- `/derive-r/R_FACTOR_JOURNEY.md` — Complete validation journey (Python scripts, LOO CV, 80-stock validation)
- `/derive-r/V4_IMPROVEMENTS.md` — V4 implementation documentation (8 improvements)
- `/derive-r/ground_truth/` — TradeFinder R-Factor captures for multi-day model training
- `/document.json` — Dhan V2 OpenAPI spec (full API reference)
