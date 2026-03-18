# Tasks: R-Factor Enhancements

## 1. Post-Market Data Fix
- [x] 1.1 Add `isTradingDay()` and private `getIST()` to `lib/dhan/market-feed.ts`
- [x] 1.2 Update `scanAllSymbols()` in `data-service.ts` to use `isTradingDay` for Dhan fetch decision
- [x] 1.3 Add `marketOpen` field to `ScanResult` interface
- [x] 1.4 Pass `marketOpen` through `app/api/r-factor/route.ts` response

## 2. Data Source Badges & Banners
- [x] 2.1 Add `latestDate` state to Intraday Boost page
- [x] 2.2 Add `getLatestBhavcopyDate()` to `RFactorDataService`
- [x] 2.3 Implement `DataSourceBadge` component (Live/Closing/Market Closed/Bhavcopy states)
- [x] 2.4 Add Market Closed banner with "View History →" link

## 3. Sector Integration
- [x] 3.1 Add `sector?: string` to `BoostSignal` interface in `data-service.ts`
- [x] 3.2 Add `getSectorMap()` to read `fno_sectors.json`
- [x] 3.3 Add `attachSectors()` to tag each signal with its sector
- [x] 3.4 Wire `attachSectors()` into all `scanAllSymbols()` return paths
- [x] 3.5 Add Sector column to stock table (between Symbol and %)
- [x] 3.6 Add sector dropdown filter with activity scores
- [x] 3.7 Implement `computeSectorStats()` using average spread Z-score

## 4. R-Factor History Page
- [x] 4.1 Create `app/api/r-factor-history/route.ts` with three query modes (symbol, date, dates)
- [x] 4.2 Implement `getSymbolHistory()` — rolling window R-Factor computation
- [x] 4.3 Implement `getDailyLeaderboard()` — per-date ranked stock list
- [x] 4.4 Implement `getAvailableDates()` — distinct dates query
- [x] 4.5 Create `app/trading-lab/r-factor-history/page.tsx` with Stock History tab
- [x] 4.6 Add line chart (Recharts) for R-Factor over time
- [x] 4.7 Add Daily Leaderboard tab with date selector
- [x] 4.8 Add "R-Factor History" to sidebar nav (`nav-data.tsx`)

## 5. Data Consistency & IST Utilities
- [x] 5.1 Add `todayIST()` to `lib/dhan/market-feed.ts` — proper IST date formatting
- [x] 5.2 Replace all `en-CA` locale hack in `data-service.ts` with `getTodayIST()`
- [x] 5.3 Replace `en-CA` in `master-contracts.ts` — import shared `todayIST()`
- [x] 5.4 Replace `en-CA` in `data-loader.ts` — local `formatDateIST()` helper
- [x] 5.5 Replace `en-CA` in `intraday-boost/page.tsx` — inline IST date math
- [x] 5.6 Add Dhan response cache (instance-level, keyed by IST date) to `RFactorDataService`
- [x] 5.7 Cache only used when `!isMarketHours()` — fresh fetches during market hours
- [x] 5.8 Add retry logic (2 attempts, 2s delay) before bhavcopy fallback
- [x] 5.9 Remove silent error swallowing in Dhan batch fetch — use `Promise.all` so failures throw

## 6. Modular Refactor
- [x] 6.1 Extract `app/trading-lab/_lib/r-factor-ui.ts` — shared display helpers
- [x] 6.2 Extract `app/trading-lab/intraday-boost/_hooks/use-boost-data.ts` — data fetching hook
- [x] 6.3 Extract `app/trading-lab/intraday-boost/_lib/sector-stats.ts` — sector computation
- [x] 6.4 Rewrite `page.tsx` as thin render layer with sub-components (`SyncModal`, `DataSourceBadge`, `SortButton`, `StockRow`)
- [x] 6.5 Update R-Factor History page to import from shared `r-factor-ui.ts`
- [x] 6.6 Verify `pnpm lint` passes on all modified files
