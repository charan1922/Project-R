# Spec: historify-import

## Overview

Enhance the Import page (`app/historify/import/page.tsx`) with four missing features from `import.html`: exchange selector in manual mode, CSV column-mapping UI, data preview table, a working save-to-watchlist API call, and an import progress modal.

## User Stories

- As a user, I can select the exchange (NSE, NSE_INDEX, NFO, BSE, BFO, BCD, BSE_INDEX, MCX, CDS) when manually entering a symbol
- As a user, when I upload a CSV, I can see a preview of the first 5 rows and map which column contains the symbol and which (optionally) contains the exchange
- As a user, after validating symbols, clicking "Import Valid Symbols" actually adds them to my watchlist via the API and shows progress
- As a user, I see a progress modal with a log while symbols are being imported in bulk

## Feature Details

### Exchange Selector (Manual Mode)
- Add an exchange `<select>` beside the symbol input with options: `NSE` (default), `NSE_INDEX`, `NFO`, `BSE`, `BFO`, `BCD`, `BSE_INDEX`, `MCX`, `CDS`
- Pass the selected exchange in the watchlist POST body: `{ symbol, exchange }`

### CSV Column Mapping (File Mode)
- After a file is dropped/selected, parse the first row as headers
- Show a "Column Mapping" section with two dropdowns:
  - Symbol Column (required) — lists all detected column names
  - Exchange Column (optional, default "None — use NSE")
- Show a data preview table of the first 5 rows from the parsed CSV

### Working Import to Watchlist
- The "Import Valid Symbols" button currently does nothing (no API call)
- On click, open the Import Progress Modal and iterate over valid symbols, calling `POST /api/historify/watchlist` for each:
  - `{ symbol: r.symbol, exchange: r.exchange || "NSE" }`
- Update progress bar and log after each call
- On completion: close modal (or show "Done — X symbols imported"), refresh state

### Import Progress Modal
- Full-screen overlay (fixed inset-0, dark backdrop)
- Inner card: title "Importing Symbols", progress bar (X / total), scrolling log of `✓ RELIANCE added` / `✗ BADGUY failed` entries
- "Close" button appears when import is complete

## API Dependencies
- `POST /api/historify/watchlist` — existing
- No new API routes needed

## Constraints
- CSV parsing is client-side (FileReader + manual split on comma/newline, existing approach)
- Modal must block interaction with the page while importing
- Errors (404, 500 from API) should be logged in the modal, not thrown
