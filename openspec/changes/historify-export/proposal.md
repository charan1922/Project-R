## Why

The user needs to be able to extract the synchronized OHLCV market data stored locally in their `historify.db` SQLite database. Previously, the export page was just a mock UI shell with fake loading delays and no real backend logic. This change introduces a fully functional data export pipeline to securely extract historical data into standard CSV files for offline analysis in tools like Excel, Python, or external backtesters.

## What Changes

- **Backend Export API**: A new Next.js Route Handler at `/api/historify/export` that directly hooks into `better-sqlite3`.
- **Dynamic Queries**: Supports filtering exports by a list of symbols, time intervals (e.g., Daily, 5min), and preset date ranges (e.g., "Last 1 Year").
- **CSV Streaming**: Formats rows into an RFC-compliant CSV format with a proper `Content-Disposition` header forcing a browser download attachment.
- **Frontend Integration**: Replaces the `setTimeout` simulation in `app/historify/export/page.tsx` with real `fetch` calls, dynamic error handling, blob parsing, and a "Download Again" feature for completed jobs.

## Capabilities

### New Capabilities
- `historify-export`: The ability to query local SQLite historical data and stream it natively to the client as downloadable CSV files.

### Modified Capabilities

## Impact

- Modifies `app/historify/export/page.tsx` to handle real API interactions and Blob downloads.
- Introduces `app/api/historify/export/route.ts`.
- Bypasses internal wrapper functions in favor of a direct, read-only `better-sqlite3` instance in the route handler to avoid missing exports.
