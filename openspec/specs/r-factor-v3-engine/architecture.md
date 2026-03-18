# Architecture: R-Factor V3

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (React)                          │
├─────────────┬─────────────────┬─────────────────────────────────┤
│ Intraday    │ Master          │ Bhavcopy                        │
│ Boost       │ Contracts       │ Data                            │
│ (read-only) │ (sync + browse) │ (sync + browse)                 │
│             │                 │                                 │
│ If not      │ "Re-sync" btn   │ "Sync" btn                      │
│ synced →    │ → POST /api/    │ → POST /api/                    │
│ modal       │ master-contracts│ bhavcopy/sync                   │
│             │ /sync           │                                 │
└──────┬──────┴────────┬────────┴────────┬────────────────────────┘
       │               │                 │
       ▼               ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API ROUTES (Next.js)                       │
├─────────────┬─────────────────┬─────────────────────────────────┤
│ GET         │ GET + POST      │ GET + POST                      │
│ /api/       │ /api/master-    │ /api/bhavcopy/                  │
│ r-factor    │ contracts/      │ [sync]                          │
│             │ [sync]          │                                 │
│ Catches:    │                 │                                 │
│ - MasterC.  │                 │                                 │
│   NotSynced │                 │                                 │
│ - Bhavcopy  │                 │                                 │
│   NotSynced │                 │                                 │
│ → 503       │                 │                                 │
└──────┬──────┴────────┬────────┴────────┬────────────────────────┘
       │               │                 │
       ▼               ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                              │
├──────────────────┬────────────────┬─────────────────────────────┤
│ lib/r-factor/    │ lib/historify/ │ lib/                         │
│                  │                │                              │
│ data-service.ts  │ master-        │ db.ts                        │
│  (orchestrator)  │ contracts.ts   │  (Prisma + SQLite            │
│  dhanMarketFeed  │  ensureSynced  │   via better-sqlite3         │
│  isMarketHours   │  resolveSymbol │   adapter, lazy proxy)       │
│  BoostSignal     │  batchResolve  │                              │
│                  │  forceSync     │ env.ts                       │
│ engine.ts        │                │  hasDhanCredentials()        │
│  OLS regression  │                │  isVercel()                  │
│  calculateSignal │                │                              │
│                  │                │                              │
│ bhavcopy-        │                │                              │
│ service.ts       │                │                              │
│  getHistorical   │                │                              │
│  syncBhavcopy    │                │                              │
│  importFromCache │                │                              │
│  getNSECookie    │                │                              │
│                  │                │                              │
│ types.ts         │                │                              │
│  DailyStockData  │                │                              │
│  FactorData      │                │                              │
│  SignalOutput    │                │                              │
│  transformTo..() │                │                              │
│  DEFAULT_CONFIG  │                │                              │
└──────────────────┴────────────────┴─────────────────────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL DATA                               │
├──────────────┬────────────────┬──────────────────────────────────┤
│ Dhan API     │ NSE Archives   │ Prisma SQLite                    │
│ (live)       │ (sync source)  │ (persistent)                     │
│              │                │                                  │
│ /marketfeed/ │ nsearchives.   │ master_contracts (24K rows)      │
│ ohlc + quote │ nseindia.com   │ bhavcopy_days (5K+ rows)        │
│              │ (needs cookie) │ watchlist, activity, settings    │
│ Master CSV:  │                │                                  │
│ images.dhan. │                │ Local: data/project-r.db         │
│ co/api-data/ │                │ Vercel: /tmp/project-r.db        │
└──────────────┴────────────────┴──────────────────────────────────┘
```

## Complete File Map

### lib/r-factor/ — R-Factor Engine

| File | Purpose | Key Exports |
|------|---------|-------------|
| `engine.ts` | OLS regression model with hardcoded coefficients | `engine.calculateSignal(symbol, current, historical)` |
| `types.ts` | Type definitions, `transformToFactorData()`, `DEFAULT_CONFIG` | DailyStockData, FactorData, SignalOutput, EngineConfig |
| `data-service.ts` | Orchestrator: ID resolution → Dhan live → blend → compute | `rFactorService.scanAllSymbols()`, `.getRFactorSignal()`, `BoostSignal` |
| `bhavcopy-service.ts` | NSE bhavcopy download, parse, DB storage, cookie handling | `getHistoricalData()`, `syncBhavcopy()`, `importFromCache()`, `BhavcopyNotSyncedError` |

### lib/historify/ — Instrument Management

| File | Purpose | Key Exports |
|------|---------|-------------|
| `master-contracts.ts` | Dhan master CSV sync + DB queries, process-level sync flag | `resolveSymbol()`, `batchResolveFutures()`, `ensureSynced()`, `forceSync()`, `MasterContractsNotSyncedError` |

### lib/ — Infrastructure

| File | Purpose | Key Exports |
|------|---------|-------------|
| `db.ts` | Prisma client singleton with `@prisma/adapter-better-sqlite3`, lazy proxy | `prisma` |
| `env.ts` | Zod-validated environment variables | `env`, `hasDhanCredentials()`, `isVercel()` |

### app/api/ — API Routes

| Route | Method | Handler |
|-------|--------|---------|
| `/api/r-factor` | GET | `?symbol=X` single stock, `?limit=N` bulk scan |
| `/api/master-contracts` | GET | Browse with `?q=`, `?segment=`, `?instrument=`, `?limit=`, `?offset=` |
| `/api/master-contracts/sync` | POST | Force re-sync from Dhan CSV |
| `/api/bhavcopy` | GET | Browse with `?symbol=`, `?date=`, `?limit=`, `?offset=` |
| `/api/bhavcopy/sync` | POST | Sync from NSE with `?days=25` |

### app/trading-lab/ — UI Pages

| Path | Component | Purpose |
|------|-----------|---------|
| `/trading-lab/intraday-boost` | IntradayBoostPage | Live R-Factor table, 60s auto-refresh, sync modal |
| `/trading-lab/master-contracts` | MasterContractsPage | Browse + re-sync Dhan instruments |
| `/trading-lab/bhavcopy` | BhavcopyPage | Browse + sync NSE daily data |

### app/components/_sidebar/nav-data.tsx — Navigation

v1Items children (in order):
1. Intraday Boost → `/trading-lab/intraday-boost` (Flame icon, LIVE badge)
2. Market Intelligence → `/trading-lab/intelligence` (Brain icon, NEW badge)
3. Trade Journal → `/trading-lab/tradefinder` (LineChart icon, ANALYTICS badge)
4. F&O Universe → `/trading-lab/fno-universe` (Layers icon, NEW badge)
5. Master Contracts → `/trading-lab/master-contracts` (Database icon)
6. Bhavcopy → `/trading-lab/bhavcopy` (BarChart2 icon)

### Static Data

| File | Purpose |
|------|---------|
| `lib/data/fno_stocks_list.json` | 206 F&O-eligible stock symbols. Fallback: 5 stocks if missing. |
| `lib/data/fno_sectors.json` | Symbol → sector mapping |
| `lib/cache/rfactor/daily/*.json` | Legacy JSON cache files (imported into DB by `importFromCache()`) |

## Design Decisions

### 1. Explicit Sync, Not Auto-Download

Pages never auto-trigger external data downloads. Sync is user-initiated from dedicated management pages. If data is missing, consumer pages show a modal with a link to the appropriate sync page.

**Reason:** Prevents slow page loads, avoids rate limiting, gives user control, keeps page rendering predictable.

### 2. Prisma SQLite via better-sqlite3 Adapter

Uses `@prisma/adapter-better-sqlite3` (Prisma v7 requirement). The adapter takes a `{ url: "file:..." }` config pointing to the SQLite file.

**Reason:** Prisma v7 client engine requires an explicit adapter. `better-sqlite3` is already a dependency.

### 3. Lazy Proxy for Prisma Client

`lib/db.ts` exports a `Proxy` that lazily creates the `PrismaClient` on first property access:
```typescript
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) { return Reflect.get(getPrisma(), prop); }
});
```

**Reason:** Avoids creating DB connection at import time (module side effects), only connects when actually queried.

### 4. Raw SQL for Bulk Inserts

`$executeRawUnsafe()` with multi-value INSERT instead of Prisma `createMany()`.

**Reason:** Prisma's `createMany` for SQLite generates individual INSERT statements, which is 10-50x slower for 24K+ rows. Raw SQL with 200-500 row chunks completes in seconds.

### 5. Bypass Dhan SDK for Market Feed

`dhanMarketFeed()` makes raw `fetch()` calls to Dhan API.

**Reason:** SDK sends string security IDs but API requires numeric. SDK's response types don't match the actual nested response format.

### 6. NSE Session Cookie

`getNSECookie()` visits `https://www.nseindia.com/` with browser-like headers to obtain Akamai session cookies.

**Reason:** NSE uses Akamai bot detection. Direct requests to `nsearchives.nseindia.com` return 403 without valid session cookies.

### 7. Filter Master Contracts to ~24K Rows

Only `KEEP_SEGMENTS = {NSE_EQ, NSE_FNO}` and `KEEP_INSTRUMENTS = {EQUITY, FUTSTK, FUTIDX}`.

**Reason:** R-Factor only needs equity OHLC + stock/index futures. Reduces 273K → 24K rows, sync time from ~30s to ~3s.

### 8. Process-Level Sync Flag

`let synced = false` in `master-contracts.ts`. After first DB check confirms data exists, flag is set to `true` — all subsequent calls skip the DB query.

**Reason:** Avoids 206+ redundant `COUNT(*)` queries per request (one per `resolveSymbol()` call).

## Error Handling

| Error Class | Thrown By | Caught By | HTTP | User Sees |
|-------------|-----------|-----------|------|-----------|
| `MasterContractsNotSyncedError` | `ensureSynced()` in master-contracts.ts | `/api/r-factor` | 503 | Modal: "Go to Master Contracts" |
| `BhavcopyNotSyncedError` | `getHistoricalData()` in bhavcopy-service.ts | `/api/r-factor` | 503 | Modal: "Go to Bhavcopy" |
| Dhan API 401/403 | `dhanMarketFeed()` | Caught internally, returns `{}` | — | Falls back to bhavcopy-only (stale data) |
| NSE 403 | `downloadAndExtractZip()` | Returns null, date skipped | — | "0 dates downloaded" in sync result |
| No Dhan credentials | `hasDhanCredentials()` check | `scanAllSymbols()` | — | Uses `computeBhavcopySignals()` fallback |

### Sync Modal (Intraday Boost)

The `syncRequired` state can be `false` (no issue), `"master-contracts"`, or `"bhavcopy"`. The modal shows:
- Title: "Sync Required"
- Body: context-specific message about what needs syncing
- Primary action: Link to the appropriate sync page
- Secondary action: "Dismiss" button to close modal

## Operational Notes

### Error Tracking

Sentry via `@sentry/nextjs` — client/server/edge configs at project root, instrumentation in `instrumentation.ts`. All unhandled errors are tracked.

### Holiday Handling

No explicit holiday calendar. `getWeekdayDates()` skips weekends (Saturday/Sunday). For NSE holidays on weekdays (e.g. Republic Day), the download returns 403/404, which is treated as "no data for this date" and skipped. The extra buffer (`days + 10` candidate dates) ensures enough trading days are found even with holidays.

### Market Hours Detection

`isMarketHours()` in `data-service.ts` checks IST 9:15–15:30, weekdays. Used to log whether live data is from market hours or after-hours snapshot. Currently informational — live Dhan data is fetched regardless (Dhan returns last known values after market close).
