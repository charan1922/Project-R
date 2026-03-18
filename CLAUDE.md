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
  - **`/lib/r-factor/`** — Market intelligence engine:
    - `engine.ts` — Dual-model R-Factor computation:
      - **Full OLS** (for bhavcopy data): `R = 1.11 + 0.625×spread + 0.077×pcr + 0.226×(spread×fut_turn) + 1.415×fut_turn - 1.733×fut_vol` (LOO Pearson 0.60)
      - **Spread-quadratic** (for live Dhan data): piecewise `R = 2.45 - 1.86×spread + 0.95×spread²` for spread ≥ 1.0, linear ramp below (Pearson 0.857 with TradeFinder)
      - `calculateSignal()` = full OLS (bhavcopy path), `calculateSignalLive()` = spread-quad (Dhan path)
      - `SignalOutput.modelUsed` field indicates which model was used ('ols' | 'spread-quad')
    - `bhavcopy-service.ts` — NSE bhavcopy sync + DB reads. Data stored in `bhavcopy_days` Prisma table. Sync is user-triggered only (never auto-downloads). NSE requires session cookie — `getNSECookie()` visits nseindia.com first.
    - `data-service.ts` — Orchestrator with smart data source selection:
      - Market hours + Dhan → `computeLiveSignals()` with spread-quad model → `dataSource: 'live'`
      - Post-market + today's bhavcopy synced → `computeBhavcopySignals()` with full OLS → `dataSource: 'bhavcopy-today'`
      - Post-market + no bhavcopy → Dhan closing data (cached) → `dataSource: 'live'`
      - Non-trading day → latest bhavcopy → `dataSource: 'bhavcopy'`
      - Dhan response cache: per-day, only used when `!isMarketHours()` (fresh during market hours)
      - Retry logic: 2 attempts with 2s delay before bhavcopy fallback
      - Sector attachment: reads `lib/data/fno_sectors.json`, attaches `sector` to each signal
      - Lot value: computes `lotSize × lastPrice` for margin estimation
    - `types.ts` — DailyStockData, FactorData, SignalOutput types + `transformToFactorData()`
  - **`/lib/dhan/`** — Dhan API utilities:
    - `auth.ts` — Auto-generates access tokens via TOTP (`otpauth` library). Priority: disk-cached token → renew existing → generate via TOTP → fallback to static `DHAN_ACCESS_TOKEN`. Token persisted to `data/.dhan-token.json` (gitignored) to survive hot reloads. 24hr token with 1hr refresh buffer.
    - `market-feed.ts` — Raw Dhan V2 market feed calls (`dhanMarketFeed()`). Uses `getDhanAccessToken()` from auth.ts. Exports: `isMarketHours()` (9:15-15:30 IST), `isTradingDay()` (weekday after 9:15), `todayIST()` (YYYY-MM-DD in IST). Dhan API endpoints used:
      - `POST /v2/marketfeed/quote` — equity OHLC + volume + VWAP; futures volume + OI + VWAP
      - `POST /v2/optionchain` — per-strike CE/PE volume, OI, greeks (rate limit: 1 req / 3s)
      - `POST /v2/charts/intraday` — 5-min candle data for backtesting/analysis
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
  - `bhavcopy_days` — NSE daily equity + F&O data (per stock per day). ~206 stocks × 25+ days. Synced via `/trading-lab/bhavcopy` page. NSE requires session cookie for downloads.
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
| `POST /v2/charts/intraday` | Any | 5-min OHLCV candles for current day | 4 req/sec |
| `POST /v2/charts/historical` | Any | Daily OHLCV candles | 4 req/sec |

### R-Factor Model Architecture

**Dual-model system** — different models for different data sources:

| Data Source | Model | Pearson with TF | When Used |
|-------------|-------|----------------|-----------|
| Dhan live | Spread-quadratic (piecewise) | 0.857 | Market hours, or post-market without bhavcopy |
| NSE bhavcopy | Full 5-factor OLS | 0.60 (LOO) | After syncing today's bhavcopy, or historical |

**Why dual models**: Dhan's futures volume/turnover/OI values don't align with NSE bhavcopy units for Z-score computation. Spread (equity OHLC) is the only factor Dhan reports accurately enough for Z-scoring against bhavcopy historical baselines. The spread-quadratic captures the non-linear amplification TradeFinder uses for extreme activity levels.

**Next step**: Integrate Dhan's Option Chain API (`/v2/optionchain`) to get live CE/PE volume → live PCR, enabling the full OLS model with all-Dhan data during market hours. Requires verifying unit alignment between Dhan option chain volume and bhavcopy `ce_volume`/`pe_volume`.

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
- `_hooks/use-boost-data.ts` — data fetching hook (auto-refresh 60s, sync error handling)
- `_lib/sector-stats.ts` — per-sector average spread Z-score computation
- `page.tsx` — thin render layer with sub-components: `SyncModal`, `DataSourceBadge`, `SortButton`, `StockRow`
- `app/trading-lab/_lib/r-factor-ui.ts` — shared display helpers (colors, badges, date formatting) used by both Intraday Boost and R-Factor History pages

### R-Factor History Page

`/trading-lab/r-factor-history` — two tabs:
- **Stock History**: per-symbol R-Factor trend over 25 days (Recharts line chart + table)
- **Daily Leaderboard**: per-date top stocks ranked by R-Factor (date selector from available bhavcopy dates)

API: `GET /api/r-factor-history?symbol=X&days=25` | `?date=YYYY-MM-DD&limit=20` | `?dates=true`

## Specs & Design Docs

- `/openspec/specs/r-factor-v3-engine/` — R-Factor V3 OLS model spec (coefficients, data model, architecture)
- `/openspec/changes/r-factor-enhancements/` — Current enhancement: sector integration, post-market data, history page, dual model, data consistency
- `/openspec/` — OpenSpec design documents with proposal → design → spec → tasks workflow
- `/derive-r/R_FACTOR_JOURNEY.md` — Complete validation journey (Python scripts, LOO CV, 80-stock validation)
- `/document.json` — Dhan V2 OpenAPI spec (full API reference)
