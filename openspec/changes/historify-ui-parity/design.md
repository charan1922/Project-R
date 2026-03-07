## Context

The Project-R Historify module is built with Next.js 16, React 19, and Tailwind CSS v4. It uses `better-sqlite3` for data storage and a custom TypeScript SDK for Dhan V2. Currently, the UI for settings, bulk import, and advanced charting is placeholder-only or partially implemented.

## Goals / Non-Goals

**Goals:**
- Provide a functional Settings page for Dhan credentials and UI preferences.
- Enable functional bulk symbol import with synchronization to the `watchlist` table.
- Implement an RSI sub-panel in the charting interface.
- Add a persistent sidebar for easier navigation between Historify pages.
- Improve the download interface with interval and date presets.

**Non-Goals:**
- Moving to DuckDB (staying with `better-sqlite3`).
- Implementing a full-blown backtesting engine (out of scope for this parity change).
- Adding support for other brokers.

## Decisions

### 1. Settings Persistence with JSON
- **Choice**: Use `data/historify-settings.json` via Node.js `fs` in the API route.
- **Rationale**: Settings are a simple key-value bag, not relational. JSON is lightweight, avoids database migrations, and is easy to read/write without complex ORMs.

### 2. Multi-Pane Charting for RSI
- **Choice**: Create a second `lightweight-charts` `createChart` instance below the main price chart.
- **Rationale**: While `lightweight-charts` supports multiple series on one chart, RSI is best viewed on a separate scale/panel for clarity. A second instance allows for independent scaling.

### 3. Sidebar in Root Historify Layout
- **Choice**: Modify `app/historify/layout.tsx` to include a fixed left sidebar.
- **Rationale**: Provides a consistent "app-like" feel and allows quick navigation between related features (Import, Download, Charts, Settings).

### 4. RSI Calculation on Server
- **Choice**: Calculate RSI in the `/api/historify/chart-data` route using `mathjs`.
- **Rationale**: Keeps the client-side thin and ensures that indicator data is available to any consumer of the API.

## Risks / Trade-offs

- **[Risk] API Rate Limiting** → **Mitigation**: Use the existing `HistorifyDhanClient` which enforces a 250ms delay between calls.
- **[Risk] Sensitive Data in JSON** → **Mitigation**: Ensure `data/` is gitignored and advise users on environment security.
- **[Risk] Multiple Chart Synchronization** → **Mitigation**: Sync the time range of both charts using `timeScale().subscribeVisibleTimeRangeChange`.
