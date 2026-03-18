# Spec: post-market-data

## Overview

Fix the Intraday Boost page to show today's R-Factor data after market close (15:30 IST) on trading days. Previously, the page fell back to yesterday's bhavcopy data after 15:30, even though Dhan's API still serves today's closing OHLC.

## User Stories

- As a user, when I visit Intraday Boost at 9 PM on a trading day, I see today's R-Factor data (not yesterday's)
- As a user, I see a "Closing · 18 Mar" badge (sky blue) indicating post-market closing data
- As a user, during market hours I see "Live · 18 Mar" badge (green) indicating real-time data
- As a user, on weekends I see "Market Closed · Fri 14 Mar" badge (amber) with a banner explaining when live data resumes
- As a user, if Dhan auth fails during market hours I see "Bhavcopy · 17 Mar" badge (red) indicating fallback

## Feature Details

### `isTradingDay()` Function
- Location: `lib/dhan/market-feed.ts`
- Logic: returns `true` on weekdays after 9:15 IST
- Purpose: determines if Dhan data represents "today" (vs stale weekend data)
- Separate from `isMarketHours()` which checks the 9:15–15:30 window

### Data Fetch Decision Matrix

| Condition | Data Source | Badge |
|-----------|-----------|-------|
| `hasDhan && isTradingDay() && isMarketHours()` | Dhan live | Live · {today} (green) |
| `hasDhan && isTradingDay() && !isMarketHours()` | Dhan closing | Closing · {today} (sky blue) |
| `hasDhan && !isTradingDay()` | Bhavcopy | Market Closed · {latest date} (amber) |
| `!hasDhan` | Bhavcopy | Bhavcopy · {latest date} (red) |
| Dhan fetch fails | Bhavcopy | Bhavcopy · {latest date} (red) |

### Market Closed Banner
- Shown when `dataSource === 'bhavcopy' && marketOpen === false`
- Text: "Market closed — showing data from {date}. Live R-Factor resumes at 9:15 AM IST."
- Right-aligned link: "View History →" pointing to `/trading-lab/r-factor-history`

### API Response Fields
- `dataSource: 'live' | 'bhavcopy'` — which data source was used
- `latestDate: string` — YYYY-MM-DD of the data being shown
- `marketOpen: boolean` — whether IST market was open at computation time

### `todayIST()` Utility
- Location: `lib/dhan/market-feed.ts`
- Returns current IST date as `YYYY-MM-DD` string
- Uses explicit `UTC+5:30` offset math (no locale tricks)
- Exported and used by: `data-service.ts`, `master-contracts.ts`
- Replaces all `toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })` calls

### Dhan Response Cache
- Problem: Dhan's OHLC API returns different values on each post-market call (e.g., WAAREEENER spread Z-score: 2.99 → 1.77 between refreshes). This caused R-Factor values to fluctuate randomly after market close.
- Solution: Instance-level cache on `RFactorDataService`, keyed by IST date
- Cache logic:
  - **Market open** (`isMarketHours() === true`) → always fetch fresh (real-time prices)
  - **Market closed** + cache exists for today → return cached data (consistent values)
  - **Market closed** + no cache → fetch from Dhan once, store in cache
- Cache cleared automatically when `todayIST()` returns a new date

### Retry Logic
- 2 attempts with 2-second delay before falling back to bhavcopy
- `MasterContractsNotSyncedError` and `BhavcopyNotSyncedError` thrown immediately (no retry)
- Prevents single transient Dhan failure from silently switching entire page to bhavcopy

## Constraints

- `isTradingDay()` does not account for market holidays (Republic Day, Diwali, etc. on weekdays). On such days, Dhan returns the previous trading day's data — acceptable since bhavcopy would show the same.
- Before 9:15 IST on a weekday, `isTradingDay()` returns false — Dhan pre-market data is unreliable.
- Dhan cache is in-memory (instance-level) — lost on server restart. First request after restart fetches fresh data.
