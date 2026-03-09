# Design: DuckDB Parquet Architecture

## Overview
This design outlines the migration from a monolithic SQLite (`better-sqlite3`) database to a distributed Columnar Parquet structure powered by `@duckdb/node-api`. The system must allow high-frequency sequential writes from the Dhan API and massive multi-million row read queries in a Next.js (Node 25) environment.

## File Structure
Instead of one central database, historical data will be saved as Parquet:
`data/parquet/historify/[SYMBOL].parquet`

## Data Ingestion
1. `/api/historify/sync/route.ts` pulls 5-min JSON ticks from Dhan V2 API.
2. DuckDB instantiates an in-memory connection.
3. If an existing `SYMBOL.parquet` file exists, it's loaded into a temporary table.
4. The incoming JSON rows are loaded into an Arrow Table or via JSON `read_json` syntax.
5. The combined table is exported using `COPY ... TO 'data/parquet/historify/SYMBOL.parquet' (FORMAT PARQUET)`.

## Data Queries (Export / Charts / Quant)
1. When `/api/historify/day-chart` requests ADANIGREEN 5-min data.
2. It executes: `SELECT * FROM read_parquet('data/parquet/historify/ADANIGREEN.parquet') WHERE timestamp > ? ORDER BY timestamp ASC`.

## Technology Choice
- `@duckdb/node-api`: Selected for tight Node-API (N-API) integration, avoiding older Gyp compilation errors. Compatible with Node.js LTS and 25.
- `parquet`: The resulting file format natively supports extreme compression integers and float types.

## Fallback
- The `activity_log` and `watchlist` config tables will REMAIN in a tiny `historify-config.db` (SQLite). DuckDB will strictly serve high-volume timeseries data.
