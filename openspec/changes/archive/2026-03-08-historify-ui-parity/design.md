## Architecture

All changes live within the Next.js App Router at `app/historify/**` and `app/api/historify/**`. The stack is:
- **Next.js 16** (App Router), **React 19**, **TypeScript 5.7+**, package manager **pnpm**
- **Database**: `better-sqlite3` (SQLite) — file at `data/historify.db`, schema managed in `lib/historify/db.ts`
  - Tables: `watchlist`, `historical_data`, `activity_log`
  - **NOT DuckDB** — replaced due to native module issues in Next.js build
- **Dhan V2 API**: in-repo TypeScript SDK at `dhanv2/src` wrapping the official DhanHQ V2 REST API
  - `lib/historify/dhan-client.ts` exports `HistorifyDhanClient` with built-in 250ms rate limiter and 90-day intraday chunking
  - Credentials: `DHAN_CLIENT_ID` + `DHAN_ACCESS_TOKEN` in `.env.local`
- **Styling**: Tailwind CSS v4 — dark `bg-slate-950` base, teal/sky/amber/violet/emerald accents
- **Icons**: `lucide-react` exclusively
- **Charts**: `lightweight-charts` v5 (already installed)
- No new npm dependencies

## Design Decisions

### Settings Persistence
Settings are stored in `data/historify-settings.json` (read/write via Node.js `fs` in the API route). The `data/` directory already exists (created by `lib/historify/db.ts`). On first GET, if the file doesn't exist, the API returns hardcoded defaults. On POST, it merges and writes.

**Why not DB?** The settings (Dhan credentials, UI prefs) are a flat key-value bag, not relational. A JSON file is simpler, faster to read, and avoids altering the existing `historify.db` schema.

**Note**: `DHAN_CLIENT_ID` and `DHAN_ACCESS_TOKEN` in `.env.local` are the live production credentials. The Settings page shows them as editable fields but the UI must never expose them in plain text without the show/hide toggle. Saving from Settings writes to `data/historify-settings.json`; the `HistorifyDhanClient` in `lib/historify/dhan-client.ts` will need to prefer the JSON file over `.env.local` when present (or this can be a follow-up).

### Import → Watchlist Save
The current `import/page.tsx` validates symbols against a hardcoded `KNOWN` set client-side, but the "Import Valid Symbols" button is disabled with no API call. The fix: call `POST /api/historify/watchlist` (which wraps `lib/historify/db.ts → addToWatchlist()`) for each valid symbol. The existing API accepts `{ symbol, exchange }`.

### Exchange Selector for Manual Import
The exchange dropdown will match the values used by `HistorifyDhanClient` and stored in the `watchlist` table: `NSE`, `NSE_INDEX`, `NFO`, `BSE`, `BFO`, `BCD`, `BSE_INDEX`, `MCX`, `CDS`.

### Download Page Selectors
The existing download page hardcodes `interval: "Daily"` in the sync body. The fixed version passes the chosen interval. Date presets are computed client-side using `Date` arithmetic. When sent to `POST /api/historify/sync`, the route passes them to `HistorifyDhanClient`:
- Daily: `client.fetchDaily()` → `/charts/historical`
- Intraday: `client.fetchIntradayChunked()` → `/charts/intraday` with auto 90-day chunking

### RSI Sub-Panel
The RSI chart is a second `lightweight-charts` `createChart` instance. RSI values are computed server-side in the `/api/historify/chart-data` route using a simple 14-period Wilder RSI formula (can use the already-installed `mathjs` library for the calculation). The RSI line uses `violet-400` colour.

### Settings API Route
```
GET  /api/historify/settings  →  returns current settings JSON (or defaults)
POST /api/historify/settings  →  merges and writes to data/historify-settings.json
```

### Sidebar in Layout
The current `app/historify/layout.tsx` is a minimal passthrough (`export default function Layout({ children }) { return children; }`). We add a left sidebar with nav links to all 8 Historify pages using the same accent colours established per-page.

## File Map

| File | Change | Notes |
|---|---|---|
| `openspec/config.yaml` | Updated | Full project context added |
| `app/historify/layout.tsx` | Modify | Add sidebar nav with Settings link |
| `app/historify/page.tsx` | Modify | Data Quality card, Quick Download form, colored activity icons |
| `app/historify/import/page.tsx` | Modify | Exchange dropdown, column mapping, CSV preview, working save, progress modal |
| `app/historify/download/page.tsx` | Modify | Symbol checkboxes, interval selector, date range dropdown + custom pickers |
| `app/historify/charts/page.tsx` | Modify | RSI sub-panel chart (second `createChart` instance) |
| `app/historify/settings/page.tsx` | **New** | 4 settings sections + danger zone |
| `app/api/historify/settings/route.ts` | **New** | GET/POST settings JSON |
| `app/api/historify/chart-data/route.ts` | Modify | Add RSI calculation to indicators response |

## API Layer Existing Reference

All existing routes live in `app/api/historify/`:
- `stats/route.ts` — DB stats
- `watchlist/route.ts` — CRUD for watchlist
- `sync/route.ts` — triggers `HistorifyDhanClient` download + `insertOHLC()`
- `chart-data/route.ts` — returns OHLCV candles + indicator data for charts
- `activity/route.ts` — recent activity log
- `jobs/route.ts` — scheduler jobs
