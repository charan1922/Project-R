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
    - `engine.ts` — OLS regression: `R = 1.11 + 0.625×spread + 0.077×pcr + 0.226×(spread×fut_turn) + 1.415×fut_turn - 1.733×fut_vol`
    - `bhavcopy-service.ts` — NSE bhavcopy sync + DB reads. Data stored in `bhavcopy_days` Prisma table. Sync is user-triggered only (never auto-downloads). NSE requires session cookie — `getNSECookie()` visits nseindia.com first.
    - `data-service.ts` — Orchestrator: resolves security IDs → fetches Dhan live data → blends with bhavcopy history → runs engine. Returns `{ signals, dataSource: 'live' | 'bhavcopy' }`.
    - `types.ts` — DailyStockData, FactorData, SignalOutput types + `transformToFactorData()`
  - **`/lib/dhan/`** — Dhan API utilities:
    - `auth.ts` — Auto-generates access tokens via TOTP (`otpauth` library). Priority: cached token → renew existing → generate via TOTP → fallback to static `DHAN_ACCESS_TOKEN`. Token cached in memory with 1hr refresh buffer.
    - `market-feed.ts` — Raw Dhan V2 market feed calls (`dhanMarketFeed()`). Uses `getDhanAccessToken()` from auth.ts. Also exports `isMarketHours()` for IST 9:15–15:30 check.
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

**Volume unit mismatch:** Dhan reports futures volume in **shares**, NSE bhavcopy reports in **contracts/lots**. `data-service.ts` divides Dhan volume by `lotSize` (from `master_contracts` table) before computing Z-scores.

### Dhan Authentication

`lib/dhan/auth.ts` manages access tokens automatically:

1. **TOTP auto-generation** (preferred): Uses `otpauth` library to generate TOTP codes, calls `POST https://auth.dhan.co/app/generateAccessToken` with clientId + PIN + TOTP. Token cached 24hrs with 1hr refresh buffer.
2. **Token renewal**: Calls `POST /v2/RenewToken` if existing token is still valid but near expiry.
3. **Static fallback**: Uses `DHAN_ACCESS_TOKEN` from `.env.local` if TOTP credentials not configured.

Rate limit: Dhan allows token generation once every 2 minutes. Concurrent calls are deduplicated via a promise lock.

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

## Specs & Design Docs

- `/specs/002-r-factor-v3/` — R-Factor V3 engine spec (OLS model, data model, architecture, API reference)
- `/specs/001-r-factor-engine/` — V1 spec (superseded)
- `/strategy/` — Strategy guides (Intraday Boost beginner's guide)
- `/openspec/` — OpenSpec design documents with proposal → design → spec → tasks workflow
- `/derive-r/R_FACTOR_JOURNEY.md` — Complete validation journey (Python scripts, LOO CV, 80-stock validation)
