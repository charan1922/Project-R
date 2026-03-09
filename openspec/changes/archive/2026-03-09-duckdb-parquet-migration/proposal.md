# Proposal: Enterprise Parquet & DuckDB Migration

## Why?
Currently, Project-R uses `better-sqlite3` to store historical tick data. While extremely fast for local usage, the massive 400MB+ monolithic `historify.db` runs afoul of GitHub's strict 100MB file limit. 
To build a truly enterprise-grade quantitative analysis platform, we need to migrate to the industry standard **Columnar Storage Data Lake Architecture**. By moving to **.parquet** files parsed by **@duckdb/node-api**, we will violently compress our data footprint (from 400MB to ~40MB), allowing seamless git commits and lightning-fast analytical queries.

## What Changes?
- **Replace SQLite with DuckDB**: Remove `better-sqlite3` and install `@duckdb/node-api`.
- **Data Lake Structure**: Store incoming 5-min historical data as individual Parquet files per symbol in `data/historify/[SYMBOL].parquet`.
- **Refactor Sync Engine**: Update `api/historify/sync/route.ts` and `mass_sync.js` to write directly to Parquet files using SQL `COPY` commands or Arrow appenders.
- **Refactor API Routes**: Update `api/historify/day-chart`, `api/historify/export`, and `api/quant/backtest` to run SQL queries over the `.parquet` files via DuckDB engine.

## Capabilities
- Read Parquet files natively in Node.js (v25) using standard SQL syntax.
- Store millions of rows in a fraction of the disk footprint.
- Keep the entire historical dataset tracked safely within GitHub without LFS limits.

## Impact
- **Data Footprint**: Reduces full NSE F&O 5-min tracking by approx. 90% (400MB -> 40MB).
- **Architecture**: Transitions from traditional RDBMS to an Enterprise Quant Data Lake model.
