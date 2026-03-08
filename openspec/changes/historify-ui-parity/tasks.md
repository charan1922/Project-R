## 1. Layout & Sidebar

- [ ] 1.1 Add Sidebar component to `app/historify/layout.tsx`
- [ ] 1.2 Implement navigation links for Dashboard, Watchlist, Download, Import, Charts, Settings
- [ ] 1.3 Add persistent responsive layout styles using Tailwind CSS v4

## 2. Settings Implementation

- [ ] 2.1 Create `app/api/historify/settings/route.ts` (GET/POST for JSON persistence)
- [ ] 2.2 Build `app/historify/settings/page.tsx` UI with credential and preference fields
- [ ] 2.3 Implement credential visibility toggle (Show/Hide Access Token)
- [ ] 2.4 Add "Save" functionality with success notifications

## 3. Import Enhancements

- [ ] 3.1 Update `app/historify/import/page.tsx` with functional "Import Valid Symbols" button
- [ ] 3.2 Implement progress modal for batch `POST /api/historify/watchlist` calls
- [ ] 3.3 Add real-time symbol validation against the master contract list

## 4. Download & Sync Improvements

- [ ] 4.1 Update `app/historify/download/page.tsx` to pass `interval` and `dateRange` to API
- [ ] 4.2 Implement date range presets (Last 7 Days, Last 30 Days, YTD)
- [ ] 4.3 Add symbol selection checkboxes and "Sync All" vs "Sync Selected" logic

## 5. Advanced Charting

- [ ] 5.1 Update `/api/historify/chart-data` to calculate RSI using `mathjs`
- [ ] 5.2 Implement second `lightweight-charts` instance for RSI in `app/historify/charts/page.tsx`
- [ ] 5.3 Synchronize time scales between price and RSI charts

## 6. Dashboard & Final Polish

- [ ] 6.1 Update `app/historify/page.tsx` with data quality summary (symbol count, last sync)
- [ ] 6.2 Ensure consistent accent colors and "use client" directives across all pages
- [ ] 6.3 Verify all links and API interactions are functional
