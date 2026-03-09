# Specification: DuckDB Parquet Migration

## Feature
As a quantitative developer,
I want to store my historical ticks in a high-compression Parquet format,
So that I can commit millions of rows to GitHub without hitting size limits and query them with standard SQL.

## Scenario 1: Initial Data Sync creates a new Parquet file
Given the user requests data for `ADANIGREEN`
When the sync API downloads 20,000 JSON rows from Dhan
Then DuckDB should create `data/parquet/historify/ADANIGREEN.parquet`
And the file size should be highly compressed (< 500KB).

## Scenario 2: Data Retrieval from Parquet
Given `ADANIGREEN.parquet` exists
When the `day-chart` API queries historical data
Then DuckDB should execute `SELECT * FROM read_parquet(...)`
And return the identical OHLCV JSON payload structure to the frontend.

## Scenario 3: Watchlist and Logs stay in SQLite
Given the massive tick data moves to Parquet
When the user adds a symbol to the watchlist
Then the symbol is saved in a lightweight `data/historify-config.db` SQLite file.
