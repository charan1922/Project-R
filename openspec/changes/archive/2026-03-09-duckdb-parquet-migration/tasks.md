# Tasks: DuckDB Parquet Migration

## 1. Setup & Architecture
- [ ] Install `@duckdb/node-api`.
- [ ] Update `.gitignore` to track `data/parquet` outputs.
- [ ] Create `lib/historify/duckdb.ts` to instantiate and manage the DuckDB Node-API connection securely.
- [ ] Refactor `lib/historify/db.ts` to only handle `watchlist` and `activity_log` using a much lighter `historify-config.db` SQLite file.

## 2. Ingestion (Write) Engine
- [ ] Refactor `app/api/historify/sync/route.ts` to replace SQLite inserts with DuckDB JSON table staging.
- [ ] Build the query execution to execute `COPY TO (FORMAT PARQUET)` ensuring files are saved per symbol.
- [ ] Update `mass_sync.js` to clear the old `data/historify.db` logic and monitor the new Parquet generation logic.

## 3. Retrieval (Read) Engine
- [ ] Refactor `app/api/historify/day-chart/route.ts` to use `SELECT * FROM read_parquet` and return JSON OHLCV candles to the frontend chart.
- [ ] Refactor `app/api/historify/export/route.ts` to read the Parquet file and stream JSON/CSV down to the frontend.
- [ ] Verify that the frontend UI (Day Chart, Download, Setting flags) doesn't break due to missing API payload properties.

## 4. Verification & Testing
- [ ] Run `pnpm build` to verify that Next.js perfectly bundles the `@duckdb/node-api` N-API bindings without dying.
- [ ] Test the Day Chart view on DIVISLAB to ensure Parquet speeds are equal or faster than SQLite.
