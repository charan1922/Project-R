## 1. New API Route — Settings

- [x] 1.1 Create `data/` directory in project root (if it doesn't exist)
- [x] 1.2 Create `app/api/historify/settings/route.ts` with GET (read from `data/historify-settings.json`, return defaults if missing) and POST (merge + write settings)
- [x] 1.3 Add `data/historify-settings.json` to `.gitignore`

## 2. New Page — Settings

- [x] 2.1 Create `app/historify/settings/page.tsx` with the four sections: API Configuration, Data Management, Download Settings, Display Settings
- [x] 2.2 API Configuration section: Client ID + Access Token fields (password with toggle), Test Connection button (GET /api/historify/stats), Save button (POST /api/historify/settings)
- [x] 2.3 Data Management section: stat cards for DB size / total records / table count from GET /api/historify/stats; Clear Cache / Optimize DB / Export DB buttons (stub out with toast if endpoints don't exist)
- [x] 2.4 Download Settings section: batch size, rate limit delay, default range — POST /api/historify/settings on save
- [x] 2.5 Display Settings section: theme select, chart height, auto-refresh toggle, show tooltips toggle — POST /api/historify/settings on save
- [x] 2.6 Danger Zone section: Clear All Data + Reset to Defaults — both open a confirmation modal before acting

## 3. Sidebar Navigation

- [x] 3.1 Update `app/historify/layout.tsx` to render a left sidebar nav with links to all 7 Historify pages (Dashboard, Watchlist, Download, Charts, Scheduler, Import, Export, Settings) using lucide icons consistent with each page's accent colour

## 4. Dashboard Enhancements

- [x] 4.1 Fetch watchlist alongside stats on mount; compute `dataQualityPct` = synced count / total count × 100
- [x] 4.2 Add 4th stat card "DATA QUALITY" with `CheckCircle2` icon, `text-emerald-400`, progress bar
- [x] 4.3 Add "Quick Data Download" collapsible card below Quick Actions with: symbol checkboxes (from watchlist), interval select, date range select, Fresh/Continue radio, Start Download button
- [x] 4.4 Replace plain dot in activity rows with colored icon badge boxes (sky/download, teal/import, emerald/scheduled, red/error, slate/default)

## 5. Import Enhancements

- [x] 5.1 Add exchange `<select>` in Manual Entry mode with options: NSE (default), NSE_INDEX, NFO, BSE, BFO, BCD, BSE_INDEX, MCX, CDS
- [x] 5.2 After CSV file drop/select: parse headers, show a Column Mapping section (Symbol Column select, Exchange Column optional select, Default Exchange select)
- [x] 5.3 Show a data preview table of first 5 parsed rows (columns: symbol detected, exchange detected)
- [x] 5.4 "Import Valid Symbols" button: open ImportProgress modal, POST each valid symbol to `/api/historify/watchlist` sequentially, update progress bar and log
- [x] 5.5 ImportProgress component: fixed overlay, progress bar with X/total counter, scrollable log, Close button (shown when done)

## 6. Download Enhancements

- [x] 6.1 Add symbol checkbox list: scrollable container, one checkbox row per watchlist symbol, Select All / Deselect All toggle header
- [x] 6.2 Add Interval `<select>` (1min, 5min, 15min, 30min, 1hour, Daily)
- [x] 6.3 Add Date Range `<select>` (Last 5 Days, Last 30 Days, Last 90 Days, Last 1 Year, Last 2 Years, Last 5 Years, Today, Custom Range)
- [x] 6.4 When "Custom Range" selected: show two-column grid with Start Date and End Date `<input type="date">`
- [x] 6.5 Compute `fromDate`/`toDate` from preset or date pickers and pass them in the sync API call body
- [x] 6.6 Change button label to "Download Selected (N)" and disable when no symbols are checked

## 7. Charts Enhancements

### 7a. Server-side RSI Calculation (`app/api/historify/chart-data/route.ts`)
- [x] 7a.1 After fetching OHLCV rows from `lib/historify/db.ts → getChartData()`, compute 14-period Wilder RSI from the `close` array using `mathjs` (already in `package.json`)
- [x] 7a.2 Return RSI as `indicators.rsi: [{ time: string, value: number }]` in the existing JSON response shape

### 7b. Client-side RSI Chart (`app/historify/charts/page.tsx`)
- [x] 7b.1 Add `rsiChartRef = useRef<HTMLDivElement>(null)` and a second `createChart` instance for RSI
- [x] 7b.2 RSI chart: height 120px, same theme colours as main chart, `LineSeries` in `violet-400` (`#a78bfa`), price range locked 0–100, horizontal price lines at 70 (red dashed) and 30 (green dashed)
- [x] 7b.3 Populate RSI series from `data.indicators.rsi` after each data fetch; show "No RSI data" overlay if absent
- [x] 7b.4 Show/hide RSI chart container `div` via `showRSI` state (CSS `hidden` / block)
- [x] 7b.5 Sync time scales between main chart and RSI chart via `subscribeVisibleTimeRangeChange`
- [x] 7b.6 Resize handler applies `applyOptions({ width })` to both charts
- [x] 7b.7 Destroy RSI chart in `useEffect` cleanup (`rsiChart.remove()`)
