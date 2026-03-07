# Spec: historify-dashboard

## Overview

Enhance the existing Historify dashboard (`app/historify/page.tsx`) to match the feature set of `dashboard.html` from historify-master. Three distinct additions: a Data Quality stat card, a Quick Data Download inline form, and color-coded activity icons.

## User Stories

- As a user, I see a "Data Quality %" stat card on the dashboard showing the percentage of watchlist symbols that have been synced, with a visual progress bar
- As a user, I can trigger a quick download for selected symbols directly from the dashboard without navigating to the Download page
- As a user, I can distinguish activity event types (download, import, scheduler) at a glance via colored icon badges in the Recent Activity section

## Feature Details

### Data Quality Stat Card
- 4th stat card in the grid (after WATCHLIST SYMBOLS, TOTAL CANDLES, LAST SYNC)
- Label: `DATA QUALITY`
- Value: percentage of watchlist symbols with `status === "synced"`, computed from `/api/historify/watchlist` response
- Sub: `Watchlist coverage`
- Icon: `CheckCircle2`, color: `text-emerald-400`
- Mini horizontal progress bar below the number (same width as card, height 4px, bg-slate-800 / bg-emerald-500 filled portion)

### Quick Data Download Form
Below the Quick Actions grid, add a collapsible card: "Quick Data Download"
- Symbol selection: checkbox list from watchlist (select all / deselect all toggle), max-height 160px scrollable
- Interval: select dropdown (1min, 5min, 15min, 30min, 1hour, Daily — default Daily)
- Date range: select dropdown (Last 5 Days, Last 30 Days, Last 90 Days, Last 1 Year, Last 2 Years, Last 5 Years, Today, Custom)
- Mode: Fresh Download / Continue (radio group)
- Start Download button → calls `POST /api/historify/sync` for each selected symbol, shows inline progress

### Activity Icon Badges
Replace the plain dot indicator in Recent Activity with colored icon boxes:
- `action === "download"` → sky/blue icon box with `Download` icon
- `action === "import"` → teal icon box with `Upload` icon  
- `action === "scheduled_sync"` → emerald icon box with `Clock` icon
- `action === "error"` → red icon box with `AlertCircle` icon
- Default → slate icon box with `Activity` icon

## API Dependencies
- `GET /api/historify/watchlist` — for quality % and symbol list
- `GET /api/historify/stats` — existing
- `GET /api/historify/activity` — existing
- `POST /api/historify/sync` — existing (for quick download)

## Constraints

- Must not break existing stat cards or activity list
- Data Quality % is client-computed (no new API endpoint)
- Quick Download form collapse/expand state is local React state
