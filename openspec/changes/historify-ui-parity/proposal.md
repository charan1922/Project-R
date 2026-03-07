## Why

The Project-R Historify module currently has several UI components that are partially implemented or lack functional parity with the original Historify platform. This change completes the implementation of the Settings, Import, Download, and Charting features to provide a fully functional, self-hosted data management and visualization ecosystem.

## What Changes

- **Settings Page**: Full implementation of the Settings UI and API for managing Dhan credentials and application preferences.
- **Import Enhancements**: Functional "Import Valid Symbols" with a backend API call and improved CSV/Excel validation.
- **Download Improvements**: Flexible interval selection (Daily/Intraday) and date range presets.
- **Enhanced Visualization**: Integration of an RSI (Relative Strength Index) sub-panel in the charting interface.
- **Sidebar Navigation**: Implementation of a persistent navigation sidebar in the Historify layout.

## Capabilities

### New Capabilities
- `historify-settings`: Management of Dhan API credentials and UI preferences via a dedicated settings page and JSON-based persistence.
- `historify-import`: Functional bulk symbol import from CSV/Excel with real-time validation and watchlist synchronization.
- `historify-download`: Advanced historical data synchronization with interval support (Daily/Intraday) and date range presets.
- `historify-charts`: Professional visualization with multi-pane support (Price + Indicators like RSI).
- `historify-dashboard`: Centralized activity tracking and quick-sync capabilities.

### Modified Capabilities
- (None)

## Impact

- **Affected Code**: `app/historify/**`, `app/api/historify/**`, `lib/historify/**`.
- **APIs**: New `/api/historify/settings` endpoint.
- **Dependencies**: No new npm dependencies; uses existing `better-sqlite3`, `mathjs`, and `lightweight-charts`.
- **Systems**: Updates `data/historify.db` and introduces `data/historify-settings.json`.
