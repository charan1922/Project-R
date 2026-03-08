## Context

Project-R synchronizes millions of rows of minute-level and daily OHLCV data into a local `data/historify.db` via the Dhan V2 API. Users need a reliable way to export this data. The prior UI was a placeholder.

## Goals / Non-Goals

**Goals:**
- Provide a responsive UI that can handle triggering large data downloads.
- Serve valid, well-formatted CSV strings with headers allowing immediate use in Excel/Pandas.
- Streamline database connection by directly instantiating `better-sqlite3` in read-only mode to prevent write-locks while users are downloading massive datasets.

**Non-Goals:**
- Zip compression on the server side (for now, exporting plain CSVs is sufficient).
- Exporting to JSON or Parquet formats.

## Decisions

- **Direct SQLite Instantiation**: Instead of relying on the shared `getDb()` singleton (which caused a build error due to missing export), we explicitly instantiate a read-only `Database` connection in the `/export` API route and close it immediately after querying. This ensures no memory leaks and isolates export loads from active synchronizations.
- **Client-Side Blob Downloads**: We use `URL.createObjectURL(blob)` on the frontend to handle file downloads seamlessly instead of navigating the user to the raw API endpoint. This allows us to keep the user on the React page and show a completed queue state.

## Risks / Trade-offs

- **Memory Limits**: Exporting millions of rows at once (e.g., 10 symbols, 1min data, All Time) could exhaust Node.js V8 memory if dumped entirely into a single string `csvBody`. 
  *Mitigation*: For now, we are building the CSV in memory since `better-sqlite3`'s `.all()` is extremely fast. If data scales to GBs, we will need to refactor the API to use standard Node.js streaming `Readable` streams and `res.write()`.
