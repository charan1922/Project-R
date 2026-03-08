## ADDED Requirements

### Requirement: CSV Data Extraction
The system SHALL export historical OHLCV data from the SQLite database as a well-formed CSV string.

#### Scenario: Successful export
- **WHEN** a user requests an export for a valid symbol and interval
- **THEN** the API returns a CSV file with columns: Symbol, Exchange, Interval, Timestamp, DateTime_IST, Open, High, Low, Close, Volume

### Requirement: Independent Database Connection
The system SHALL directly query `better-sqlite3` in read-only mode during exports.

#### Scenario: Preventing application crashes
- **WHEN** the export route is hit
- **THEN** it explicitly instantiates its own `Database` handle to the `historify.db` file, extracts the rows, and safely closes the connection without relying on the internal singleton router

### Requirement: Client-Side Blob Parsing
The system SHALL keep the user on the export page while downloading multiple files.

#### Scenario: Individual vs Combined CSV downloads
- **WHEN** the user selects "Individual CSV" for 3 symbols
- **THEN** it iterates over them, fetches Blobs sequentially, updates the UI progress, and triggers invisible Anchor tag downloads for each symbol
