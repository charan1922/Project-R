# AGENTS.md

## Purpose

This repository is a Next.js 16 trading platform for Indian markets with four active layers:

1. The web app and API routes in `app/`
2. Domain logic in `lib/`
3. A standalone in-repo Dhan TypeScript SDK in `dhanv2/`
4. Research and backtesting code in `backtesting/`, `derive-r/`, and `openspec/`

Treat the current runtime code as the source of truth. Older docs and specs are useful context, but they are not always current.

## What Is Current vs Historical

Prefer the code in these paths when there is any conflict:

- `app/`
- `lib/`
- `prisma/`
- `dhanv2/src/`
- `package.json`
- `next.config.ts`

Treat these as historical, experimental, or partially stale unless the task is explicitly about them:

- `README.md`
- `CLAUDE.md`
- `openspec/`
- `derive-r/*.md`
- `knowledge-base/`

Example: `openspec/config.yaml` still describes an older Historify data model, but the current app uses Prisma + SQLite in `data/project-r.db` plus DuckDB/Parquet helpers in `lib/historify/duckdb.ts`.

## High-Level Product Map

- `app/trading-lab/*` is the main product surface. The root route redirects to `/trading-lab/intelligence`.
- `app/historify/*` is the data management and live charting surface.
- `app/quant/*` contains the newer quant lab pages.
- `app/learning/*` is a smaller educational/demo surface.
- `app/docs/*` serves Nextra docs from `content/`.
- `app/api-docs/*` serves Swagger UI for Project-R and Dhan specs.
- `app/api/*` is the backend for the dashboard.

The current feature catalog is easiest to see in `app/components/_sidebar/nav-data.tsx`.

## Most Important Runtime Modules

### `lib/r-factor/`

This is the most central decision engine in the repo.

- `data-service.ts` is the main orchestrator and one of the largest files in the repo.
- `engine.ts` and `ensemble.ts` implement the current R-Factor logic.
- `bhavcopy-service.ts` manages NSE bhavcopy reads and sync.
- `dhan-daily-service.ts` and `market-context.ts` support alternative paths.
- `types.ts` defines the shared factor and signal types.

If a task touches Intraday Boost, intelligence pages, signal ranking, or R-Factor APIs, start here.

### `lib/historify/`

This is the data ingestion and live market plumbing layer.

- `master-contracts.ts` resolves symbol to Dhan security IDs and syncs the master contract universe.
- `scheduler.ts` contains scheduled sync logic.
- `live-manager.ts` is the singleton that bridges Dhan WebSockets to browser SSE clients.
- `duckdb.ts` handles Parquet storage and Hugging Face-backed remote parquet reads.
- `db.ts` wraps Prisma-backed watchlist, activity, and stats helpers.

If a task touches live feeds, chart history, sync flows, or parquet storage, inspect this folder first.

### `lib/dhan/`

This contains the raw Dhan integration used by the app.

- `auth.ts` auto-generates and caches access tokens via TOTP or static token fallback.
- `market-feed.ts` calls Dhan market, option-chain, and chart endpoints directly.
- `rate-limiter.ts` and `option-chain-service.ts` enforce API access behavior.

### `lib/quant/` and `lib/backtest/`

There are two different backtesting paths:

- `lib/quant/` is the lightweight portfolio simulation engine used by the Quant Lab.
- `lib/backtest/` is the heavier TF replay/evaluation path that works with DuckDB and option-trade comparisons.

Note that `app/api/backtest/route.ts` is a synthetic/demo API and not the same thing as the real quant engine in `lib/quant/backtest-engine.ts`.

### `lib/ai-trading/`

This is the AI-assisted trading decision layer:

- signal collection
- prompt construction
- model calls
- risk checks
- option-specific helpers

It depends heavily on `lib/r-factor/`.

### `dhanv2/`

This is a standalone package, not just a folder of helpers.

- It has its own `package.json`
- It builds separately
- It uses Vitest
- Root Biome checks do not cover it

If you edit `dhanv2/src/*`, also use `cd dhanv2 && pnpm test`.

## Current Data Model

### Primary app database

The main application database is SQLite at:

- `data/project-r.db`

Prisma schema lives in:

- `prisma/schema.prisma`

Important tables:

- `watchlist`
- `activity`
- `master_contracts`
- `bhavcopy_days`
- `tf_snapshots`
- `option_trades`
- `settings`

Prisma access is centralized in:

- `lib/db.ts`

### Columnar and local market data

DuckDB is used as a query/write layer over parquet files.

- Local parquet path defaults to `data/parquet/historify/`
- Some reads can transparently fall back to Hugging Face parquet URLs
- Historify sync routes append and rewrite parquet files through DuckDB

Relevant file:

- `lib/historify/duckdb.ts`

### Transitional persistence

Not every feature is fully persisted yet.

- `app/api/ai-trading/positions/route.ts` keeps open positions in `globalThis`
- `app/api/ai-trading/history/route.ts` keeps AI decision history in `globalThis`

These survive within a server process, but they are not durable storage. If you are asked to make AI trading state reliable across restarts, this is one of the first places to change.

### Token and runtime cache files

These are runtime state, not source code:

- `data/.dhan-token.json`
- `data/.dhan-market-cache.json`
- `data/*.db`
- `data/parquet/**`

Do not hand-edit them unless the task is specifically about recovery or migration.

## External Integration Guardrails

### Dhan auth

The app can authenticate with either:

- `DHAN_CLIENT_ID` + `DHAN_PIN` + `DHAN_TOTP_SECRET`
- or `DHAN_CLIENT_ID` + `DHAN_ACCESS_TOKEN`

The token cache is persisted to `data/.dhan-token.json`.

### Rate limits matter here

The codebase assumes Dhan endpoints must be called carefully and sequentially.

- Quote-style endpoints are especially sensitive
- Option chain requests are intentionally throttled
- Do not introduce `Promise.all` over multiple Dhan quote/option-chain calls unless you have reworked the rate limiting end to end

If you are touching Dhan request loops, inspect the existing rate limiting and call patterns first.

### User-triggered sync is a real product rule

The current app assumes master contract sync and bhavcopy sync are explicit user actions. Do not quietly reintroduce automatic external downloads on page load.

Relevant paths:

- `app/api/master-contracts/sync/route.ts`
- `lib/historify/master-contracts.ts`
- `app/api/bhavcopy/sync/route.ts`
- `lib/r-factor/bhavcopy-service.ts`

### Live feed routes are Node-only

The live feed stack is not edge-safe.

- `app/api/historify/live-feed/route.ts` uses `runtime = 'nodejs'`
- `app/api/historify/live-stream/route.ts` uses `runtime = 'nodejs'`
- `lib/historify/live-manager.ts` owns the singleton WebSocket connection

If you change live subscriptions or SSE behavior, keep the route runtime and singleton lifecycle in mind.

## Frontend and Route Conventions

- App Router is used throughout `app/`
- Many pages are client components with local `_hooks`, `_components`, and `_lib` folders
- `@/*` points to the repo root
- Styling is Tailwind v4 + shadcn/ui
- Shared UI primitives are under `components/ui/`
- The root layout uses Geist fonts and a persistent sidebar shell

Follow the conventions of the folder you are editing. This repo has some style drift between older and newer files, so prefer local consistency over broad cleanup.

## API Route Conventions

Most routes use:

- `export const dynamic = 'force-dynamic'`
- `NextResponse.json(...)`

But response envelopes are not perfectly uniform across the whole repo. Newer routes often return `{ success, data }`, while some older/demo routes return raw objects. Match the style of the area you are editing instead of doing drive-by normalization.

## Docs and Content

Docs use Nextra.

- Route shell: `app/docs/layout.tsx`
- MDX component bridge: `mdx-components.tsx`
- Content source: `content/`

If the task is about the docs site, edit `content/**` and not generated assets.

## Commands

Root project:

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm format
pnpm db:migrate
pnpm db:push
pnpm db:studio
pnpm db:generate
pnpm mcp
pnpm extract
pnpm install:browsers
```

Standalone SDK:

```bash
cd dhanv2
pnpm build
pnpm test
pnpm lint
```

## Verification Guidance

Use the smallest verification that matches the area you changed.

- App or API route changes: `pnpm lint`
- Prisma schema changes: `pnpm db:generate` and then the relevant migration command
- `dhanv2/` changes: `cd dhanv2 && pnpm test`
- Python research or backtesting changes: run the specific script manually; root tooling will not validate them

Important repo quirk: `next.config.ts` sets `typescript.ignoreBuildErrors = true`, so a successful production build is not a strong TypeScript safety signal. Prefer `pnpm lint` and targeted runtime checks.

Also note that root Biome ignores these paths:

- `dhanv2/`
- `data/`
- `derive-r/`
- `dist/`
- `.next/`

So edits there need their own verification path.

## Files and Directories to Avoid Editing Casually

Generated, vendor-like, cache, or runtime-artifact paths:

- `node_modules/`
- `.next/`
- `dist/`
- `data/**/*.db`
- `data/parquet/**`
- `public/swagger-ui-bundle.js`
- `public/swagger-ui-standalone-preset.js`
- `public/swagger-ui.css`
- `backtesting/projectr/__pycache__/`

Large data/spec snapshots that should only change for explicit tasks:

- `document.json`
- `public/openapi.json`
- `public/dhan-api.json`
- `tradefinder_platform_trades.json`
- `derive-r/*.json`
- `derive-r/bhavcopy_cache/**`

## Practical Editing Advice

- Check `git status` before you start. This repo is sometimes already dirty.
- Keep diffs narrow. There are multiple active subsystems and some older files use different formatting styles.
- If you touch `lib/r-factor/data-service.ts`, expect ripple effects in multiple pages and API routes.
- If you touch live data flow, trace all three layers: browser hook -> API route -> server manager/client.
- If you touch sync or storage code, verify whether the source of truth is Prisma/SQLite, DuckDB/parquet, or both.
- If you touch research code, do not assume it is wired into the product runtime.

## Good Entry Points By Task

For product navigation or page discovery:

- `app/components/_sidebar/nav-data.tsx`

For R-Factor ranking and scan logic:

- `lib/r-factor/data-service.ts`
- `lib/r-factor/engine.ts`
- `app/api/r-factor/route.ts`
- `app/trading-lab/intraday-boost/page.tsx`

For Historify sync and live charts:

- `lib/historify/master-contracts.ts`
- `lib/historify/live-manager.ts`
- `app/api/historify/live-stream/route.ts`
- `app/api/historify/sync/route.ts`
- `app/historify/live/page.tsx`

For Quant Lab backtesting:

- `lib/quant/backtest-engine.ts`
- `app/historify/backtester/page.tsx`

For AI trading:

- `lib/ai-trading/index.ts`
- `app/api/ai-trading/analyze/route.ts`
- `app/trading-lab/ai-autopilot/*`

For docs:

- `app/docs/layout.tsx`
- `content/**`

## Bottom Line

This repo contains a live product, a reusable SDK, and a large amount of research material in one tree. Stay anchored to the current runtime code, verify in the subsystem you touched, and treat historical docs and cached data as context rather than ground truth.
