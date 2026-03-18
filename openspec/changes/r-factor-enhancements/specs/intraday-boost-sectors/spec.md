# Spec: intraday-boost-sectors

## Overview

Add sector classification, filtering, and activity scoring to the Intraday Boost page. Each stock shows its sector badge, users can filter by sector, and the dropdown displays per-sector activity scores ranked highest-first.

## User Stories

- As a user, I see a "Sector" column in the stock table showing which sector each stock belongs to (e.g., RELIANCE → ENERGY)
- As a user, I can filter the stock list by sector using a dropdown (e.g., show only IT stocks)
- As a user, the sector dropdown shows activity scores like "IT · 2.48 X" so I can quickly identify which sectors have the highest institutional activity today
- As a user, sectors in the dropdown are sorted by activity score (highest first), matching TradeFinder's sector ranking

## Feature Details

### Sector Column
- Position: between Symbol and % Change columns
- Display: small badge with sector name (e.g., `ENERGY`, `IT`, `PVT BANK`)
- Styling: `text-[9px]` muted badge (`bg-slate-800/60 border-slate-700/50`)
- Grid: `grid-cols-[2fr_90px_80px_1fr_1fr_1fr_80px]`

### Sector Dropdown Filter
- Position: after the Signal Filter (ALL/UP/DOWN) buttons
- Default: "All Sectors" (shows all 206 stocks)
- Options: one per sector, format: `{SECTOR_NAME} · {activity.toFixed(2)} X`
- Sorted by activity score descending
- Styling: matches existing input/select styling (`bg-slate-900 border-slate-800`)

### Sector Activity Score
- Metric: average spread Z-score across stocks in the sector, floored at 0
- Formula: `activity = Σ max(0, stock.zScores.spread) / count` for stocks in sector
- Rationale: spread ratio (coefficient 0.625) is the strongest OLS predictor and directly measures "X times above normal activity"

## API Dependencies

- `GET /api/r-factor?limit=206` — each signal now includes `sector?: string` field
- `lib/data/fno_sectors.json` — 206-stock mapping loaded by `RFactorDataService.getSectorMap()`

## Constraints

- Sector data is static (from `fno_sectors.json`), not from Dhan or NSE live data
- 11 sectors available: AUTO, CEMENT, ENERGY, FIN SERVICE, FMCG, IT, METAL, PHARMA, PSU BANK, PVT BANK, REALTY
- Stocks without a sector mapping show "—" in the column
