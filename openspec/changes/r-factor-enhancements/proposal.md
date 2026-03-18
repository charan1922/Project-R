# Proposal: R-Factor Enhancements

## Why

The Intraday Boost page (R-Factor scanner) has several gaps compared to TradeFinder's feature set:

1. **No sector context** — 206 stocks displayed as a flat list with no way to filter by sector or see which sectors have the highest institutional activity. TradeFinder shows sector-level R-Factor scores (e.g., "IT · 2.48 X") and allows filtering.

2. **Stale data after market close** — After 15:30 IST, the page falls back to bhavcopy (yesterday's data) even though Dhan's API still serves today's closing OHLC. Users see "Market Closed · Mar 17" at 9 PM on Mar 18, which is confusing.

3. **No historical tracking** — R-Factor is computed fresh each time with no way to see how a stock's R-Factor evolved over the past 25 days, or which stocks topped the leaderboard on a given day.

4. **Monolithic page component** — All data fetching, state management, sector computation, and UI rendering live in a single 500+ line component with duplicated display helpers across pages.

## What Changes

### New Capabilities
- **Sector filter dropdown** with per-sector activity score (avg spread Z-score)
- **Sector column** in the stock table
- **Post-market data** — Dhan OHLC used all day on trading days, not just 9:15–15:30
- **R-Factor History page** with two tabs: Stock History (per-symbol, 25-day chart + table) and Daily Leaderboard (per-date, ranked table)
- **Data source badges** — Live (green), Closing (sky blue), Market Closed (amber), Bhavcopy (red)

### Modified Capabilities
- **Intraday Boost page** refactored into modular hook + extracted sub-components
- **Shared R-Factor UI helpers** extracted for reuse across pages
- **Dhan response cache** — cache per trading day after market close to prevent inconsistent R-Factor values from Dhan's unstable post-market OHLC
- **IST date utility** — `todayIST()` replaces `en-CA` locale hack across all files
- **Retry logic** — 2 attempts with 2s delay before bhavcopy fallback

## Impact

### Code Areas
- `lib/dhan/market-feed.ts` — new `isTradingDay()`, `todayIST()` functions
- `lib/r-factor/data-service.ts` — sector attachment, `isTradingDay` integration, Dhan cache, retry logic
- `lib/historify/master-contracts.ts` — imports shared `todayIST()` (removed local `en-CA` function)
- `lib/quant/data-loader.ts` — local `formatDateIST()` replacing `en-CA`
- `app/trading-lab/intraday-boost/` — full modular refactor
- `app/trading-lab/r-factor-history/` — new page + API route
- `app/trading-lab/_lib/` — shared display utilities
- `app/components/_sidebar/nav-data.tsx` — new nav item

### Dependencies
- `fno_sectors.json` (existing) — 206-stock sector mapping
- Prisma `bhavcopyDay` table — historical data queries
- `r-factor/engine.ts` — rolling R-Factor computation for history
- Recharts — line chart for stock history visualization

### Systems
- Dhan V2 Market Feed API — now called after market close on trading days
- NSE Bhavcopy — historical baseline for Z-scores (unchanged)
