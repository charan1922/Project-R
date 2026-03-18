# Spec: r-factor-history

## Overview

New page at `/trading-lab/r-factor-history` with two tabs for historical R-Factor analysis: Stock History (per-symbol trend over 25 days) and Daily Leaderboard (top stocks per date).

## User Stories

- As a user, I can enter a stock symbol and see its R-Factor, spread Z-score, and PCR Z-score over the last 25 trading days in a line chart and table
- As a user, I can select a date from a dropdown and see which stocks had the highest R-Factor on that day
- As a user, I can see blast trade indicators and regime classifications for each historical data point
- As a user, I can access the history page from the sidebar navigation (under v1.0 section)
- As a user, I see a "View History →" link in the Intraday Boost market-closed banner

## Feature Details

### Tab 1: Stock History
- Input: symbol search field (e.g., "RELIANCE")
- Chart: Recharts `LineChart` showing `compositeRFactor` over time (X: date, Y: R-Factor)
- Table: date, R-Factor, Spread Z, PCR Z, Regime badge, Blast indicator
- Table sorted newest-first (reversed from API order)
- Rolling window computation: each date uses all prior data as Z-score baseline

### Tab 2: Daily Leaderboard
- Input: date dropdown populated from available bhavcopy dates (newest first)
- Auto-fetches on date change
- Table: rank (#), symbol, R-Factor, Spread Z, PCR Z, Regime badge, Blast indicator
- Top 20 stocks shown by default
- Loading indicator while computing (206 stocks × engine calculation)

### Navigation
- Sidebar: "R-Factor History" item with Clock icon in v1.0 section
- Market-closed banner on Intraday Boost links to this page

## API Dependencies

### `GET /api/r-factor-history`

Three query modes:

| Query | Response |
|-------|----------|
| `?symbol=RELIANCE&days=25` | `{ success, symbol, data: [{ date, compositeRFactor, spread, pcr, regime, isBlastTrade }] }` |
| `?date=2026-03-17&limit=20` | `{ success, date, data: [{ symbol, compositeRFactor, spread, pcr, regime, isBlastTrade }] }` |
| `?dates=true` | `{ success, dates: ["2026-03-17", "2026-03-14", ...] }` |

### Data Flow

1. **Symbol history**: Query all bhavcopy rows for symbol → rolling window R-Factor computation (min 15 prior days for Z-scores)
2. **Daily leaderboard**: Query all symbols with data for date → for each, get last 25 rows up to date → compute R-Factor → sort by composite descending
3. **Available dates**: `SELECT DISTINCT date FROM bhavcopy_days ORDER BY date DESC`

## Constraints

- Requires bhavcopy data to be synced (user-triggered)
- Minimum 15 days of data per symbol for R-Factor computation
- Leaderboard computation is O(N) where N = number of F&O stocks with data for that date (~206)
- No caching on the API — computed fresh each request (SQLite is fast enough for now)
