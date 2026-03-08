## ADDED Requirements

### Requirement: Local SQLite Cache Priority
The system SHALL attempt to fetch historical price data from the local SQLite `historify.db` before making external API calls.

#### Scenario: Data exists in local DB
- **WHEN** backtester or RRG engine requests `SBIN` data and it exists locally
- **THEN** it returns the data immediately without querying the Dhan API

### Requirement: Dhan V2 Dynamic Fallback
The system SHALL automatically fall back to the Dhan V2 API (`/charts/historical`) when data is missing or out of date.

#### Scenario: Missing data triggers fallback
- **WHEN** `NIFTY` index data is requested and is absent in the local DB
- **THEN** it securely fetches the latest OHLCV data from Dhan and serves it directly

### Requirement: In-Memory Caching
The system SHALL cache fetched symbol data in-memory for 5 minutes.

#### Scenario: Multiple requests for same symbol
- **WHEN** the RRG engine requests `NIFTY` and then 10 seconds later the backtester requests `NIFTY`
- **THEN** the second request is served from the memory cache immediately
