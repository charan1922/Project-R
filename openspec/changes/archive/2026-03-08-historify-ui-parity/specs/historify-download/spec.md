# Spec: historify-download

## Overview

Enhance the Download page (`app/historify/download/page.tsx`) with symbol checkboxes, interval selector, date range dropdown, and custom date picker — matching the full control set from Historify's `download.html`.

## User Stories

- As a user, I can select individual symbols from my watchlist using checkboxes (with a select-all toggle) before starting a download
- As a user, I can choose the candle interval (1min, 5min, 15min, 30min, 1hour, Daily) for the download
- As a user, I can pick a preset date range (Last 5 Days, Last 30 Days, Last 90 Days, Last 1 Year, Last 2 Years, Last 5 Years, Today, Custom)
- As a user, when I select "Custom Range", two date pickers (Start Date, End Date) appear so I can specify exact bounds
- As a user, the interval and fromDate/toDate are sent to `POST /api/historify/sync` when I start the download

## Feature Details

### Symbol Checkbox List
- Rendered inside a `max-h-48 overflow-y-auto` scrollable container
- Each row: `<input type="checkbox">` + symbol name + exchange badge
- "Select All / Deselect All" toggle at the top
- "Download Selected (N)" button replaces the existing "Download All Watchlist (N)" button
- If no symbols are checked, button is disabled

### Interval Selector
- Placed above the download button in the controls area
- Label: `Data Interval`
- Options: `1min`, `5min`, `15min`, `30min`, `1hour`, `Daily` (default)
- Value passed to sync API as `interval`

### Date Range Dropdown
- Label: `Date Range`
- Options: `Last 5 Days`, `Last 30 Days` (default), `Last 90 Days`, `Last 1 Year`, `Last 2 Years`, `Last 5 Years`, `Today`, `Custom Range`
- When "Custom Range" is selected, a two-column grid with Start Date and End Date `<input type="date">` fields appears below

### API Integration
Update the `POST /api/historify/sync` call body to include:
```json
{ "symbol": "RELIANCE", "exchange": "NSE", "interval": "Daily", "fromDate": "2024-01-01", "toDate": "2025-01-01" }
```
When preset is selected, compute `fromDate`/`toDate` client-side. When "Custom Range", use the date picker values.

## Constraints
- Existing Fresh/Continue mode toggle must remain
- Existing Download History table must remain below
- Only the checked symbols are submitted — not all watchlist symbols
