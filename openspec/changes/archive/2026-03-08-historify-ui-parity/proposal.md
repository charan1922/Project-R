## Why

Project-R's Historify section (`/app/historify/**`) is a Next.js TypeScript port of the original Python Flask `historify-master` app. The following pages already exist and partially work:

- ✅ **Dashboard** (`/historify`) — stats, quick actions, activity log
- ✅ **Watchlist** — CRUD, status tabs (synced/stale/never), search
- ✅ **Download** — bulk sync via `POST /api/historify/sync` hitting Dhan V2
- ✅ **Import** — file drop, paste, manual modes with client-side validation
- ✅ **Export** — format/interval/preset selector + export queue UI
- ✅ **Charts** — TradingView lightweight-charts with EMA 20/50, candle + volume
- ✅ **Scheduler** — job creation, templates (3:35 PM IST, 8:30 AM IST), execution log

However after comparing against `historify-master` source page-by-page, several UI features are missing or non-functional. This change fills those gaps.

## What Changes

- **New Settings page** (`/historify/settings`) — doesn't exist at all; Historify has a full settings.html
- **New Settings API** (`/api/historify/settings`) — GET/POST to `data/historify-settings.json`. Credentials (`DHAN_CLIENT_ID`, `DHAN_ACCESS_TOKEN`) come from `.env.local`; this page creates an editable override
- **Dashboard** — missing: 4th "Data Quality" stat card, inline Quick Data Download form, colored icon badges in activity list
- **Import** — validation UI works but the "Import Valid Symbols" button never calls the API; also missing exchange selector in manual mode, CSV column mapping, data preview table, and import progress modal
- **Download** — interval always hardcoded to "Daily"; missing symbol checkbox list, date range dropdown, custom date pickers — these pass through to `HistorifyDhanClient` in `lib/historify/dhan-client.ts`
- **Charts** — RSI toggle exists but does nothing; needs a second `lightweight-charts` instance; RSI computed server-side from `historical_data` table rows using `mathjs` (already installed)
- **Sidebar** — `layout.tsx` is a passthrough stub; needs a nav sidebar with Settings link

## Capabilities

### New Capabilities
- `historify-settings`: Settings page + API for Dhan API credentials, download config, display preferences
- `historify-settings-api`: `GET/POST /api/historify/settings` backed by `data/historify-settings.json`

### Modified Capabilities
- `historify-dashboard`: Data Quality card, Quick Download form, colored activity icons
- `historify-import`: Exchange dropdown, CSV column mapping + preview, functional batch save to watchlist via `POST /api/historify/watchlist`
- `historify-download`: Symbol checklist, interval selector, date range with custom pickers; passes interval/fromDate/toDate to `POST /api/historify/sync`
- `historify-charts`: RSI sub-panel — second `createChart` + server-side 14-period Wilder RSI via `mathjs`

## Impact

- **Stack**: Next.js 16, React 19, TypeScript 5, pnpm, **better-sqlite3** (NOT DuckDB), Tailwind v4, lucide-react, lightweight-charts
- **Modified**: `app/historify/page.tsx`, `import/page.tsx`, `download/page.tsx`, `charts/page.tsx`, `layout.tsx`, `app/api/historify/chart-data/route.ts`
- **New**: `app/historify/settings/page.tsx`, `app/api/historify/settings/route.ts`
- **No DB schema changes** — settings use `data/historify-settings.json`; RSI computed on-the-fly from existing `historical_data` rows
- **No breaking changes** to existing routes, `lib/historify/` modules, or `dhanv2/` SDK
