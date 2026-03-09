# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Project-R (DeepQuant)** — Dhan V2 algorithmic trading platform with Historify historical data management, R-Factor market intelligence, and quantitative backtesting. Built with Next.js 16 App Router, React 19, TypeScript, and a custom Dhan V2 SDK.

## Commands

```bash
pnpm dev              # Dev server on port 5000
pnpm build            # Production build (output: dist/)
pnpm start            # Production server
pnpm lint             # ESLint
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
  - **`/lib/historify/`** — Data persistence (SQLite via better-sqlite3), live WebSocket management, Dhan API client, scheduler
  - **`/lib/quant/`** — Backtest engine, strategy implementations, data loader with 5-min TTL cache, math utils (EMA, RSI)
  - **`/lib/r-factor/`** — Market intelligence engine: composite Z-score from volume, OI, turnover, spread; regime classification (Elephant/Cheetah); blast trade detection
- **`/dhanv2`** — Standalone TypeScript SDK for Dhan V2 API (separate pnpm package `dhanhq-ts`). REST clients, WebSocket handlers, binary protocol parser. Rate-limited to 4 req/sec.
- **`/components`** — shadcn/ui components (Radix UI + Tailwind + CVA)

### Real-Time Data Pipeline

Browser → SSE (`/api/historify/live-stream`) → `LiveManager` singleton → Dhan WebSocket

1. `LiveManager` (`/lib/historify/live-manager.ts`) maintains a single Dhan WebSocket connection and broadcasts to SSE clients
2. SSE endpoint (`/app/api/historify/live-stream/route.ts`) bridges WebSocket quotes to browser
3. `useLiveSession` hook (`/app/historify/live/_hooks/use-live-session.ts`) aggregates ticks into 1-minute candles client-side

### Data Layer

- **SQLite** (better-sqlite3): Composite PRIMARY KEY `(symbol, exchange, interval, timestamp)` for O(log N) lookups. Config and watchlist in `/lib/historify/db.ts`
- **DuckDB** (@duckdb/node-api): Parquet columnar storage for large datasets in `/lib/historify/duckdb.ts`
- **No ORM** — direct SQL for performance
- Native modules (better-sqlite3, duckdb) are externalized in webpack config (`next.config.ts`)

### State Management

- **Zustand** store in `/lib/historify/live-store.ts` for live trading state (connection status, active symbol, ticks, historical data)
- Custom hooks over global context: `useHistorifyData()`, `useLiveSession()`
- `useRef` for non-state values (candle aggregator), `useMemo`/`useCallback` for perf

### Quant Strategies

Located in `/lib/quant/strategies/`: EMA Crossover, RSI Accumulation, Buy & Hold 75/25, Dual Momentum. The backtest engine (`/lib/quant/backtest-engine.ts`) calculates Sharpe ratio, max drawdown, CAGR, win rate, profit factor with Indian market fee modeling.

## Key Conventions

- **Path alias**: `@/*` maps to project root (configured in tsconfig.json)
- **Package manager**: pnpm 10.x (lockfile: pnpm-lock.yaml)
- **Styling**: Tailwind CSS 4 + shadcn/ui. Utility function `cn()` in `/lib/utils.ts` (clsx + twMerge)
- **API pattern**: All routes return `NextResponse.json({ success, data })` or `NextResponse.json({ error }, { status })`. Most use `export const dynamic = 'force-dynamic'`
- **Charting**: Lightweight Charts v5 for real-time (ref-based updates bypassing React DOM), Recharts for dashboards
- **Icons**: Lucide React
- **Feature pages** use underscore-prefixed folders for co-located non-route files: `_hooks/`, `_components/`, `_lib/`

## Environment Variables

Required in `.env.local` (never committed):
```
DHAN_CLIENT_ID=<client-id>
DHAN_ACCESS_TOKEN=<jwt-token>
```

## Specs & Design Docs

- `/specs/` — Feature specifications (e.g., R-Factor engine)
- `/openspec/` — OpenSpec design documents with proposal → design → spec → tasks workflow
