# API Reference: R-Factor V3

All API routes use `export const dynamic = 'force-dynamic'` (no ISR caching).

## R-Factor

### GET /api/r-factor

Compute R-Factor for stocks. File: `app/api/r-factor/route.ts`.

**Single stock (bhavcopy-only, no live data):**
```
GET /api/r-factor?symbol=RELIANCE
→ 200 { success: true, data: SignalOutput, timestamp: "..." }
```

**Bulk scan with live data (Intraday Boost):**
```
GET /api/r-factor?limit=206
→ 200 { success: true, count: 206, data: BoostSignal[], timestamp: "..." }
```
Default limit: 15. Calls `scanAllSymbols(limit)`.

Additional header: `export const revalidate = 60` (Next.js ISR, 60s stale-while-revalidate).

**Error responses:**

| Status | code | syncTarget | Meaning |
|--------|------|-----------|---------|
| 503 | `SYNC_REQUIRED` | `master-contracts` | Master contracts not synced today |
| 503 | `SYNC_REQUIRED` | `bhavcopy` | No bhavcopy data in DB |
| 500 | — | — | General error (insufficient data, Dhan API failure, etc.) |

Error shape:
```json
{ "success": false, "error": "...", "code": "SYNC_REQUIRED", "syncTarget": "bhavcopy" }
```

**BoostSignal shape:**
```json
{
  "symbol": "RELIANCE",
  "compositeRFactor": 1.604,
  "regime": "Defensive",
  "isBlastTrade": false,
  "zScores": {
    "fut_turnover": 0.216,
    "fut_volume": 0.266,
    "opt_volume": 0.760,
    "eq_trade_size": -1.123,
    "oi_change": 0.005,
    "spread": 1.051,
    "pcr": 0.523
  },
  "pctChange": -0.61,
  "timestamp": "2026-03-16T19:58:20.837Z"
}
```

---

## Master Contracts

### GET /api/master-contracts

Browse master contracts table. File: `app/api/master-contracts/route.ts`.

**Parameters:**

| Param | Type | Default | Max | Description |
|-------|------|---------|-----|-------------|
| `q` | string | — | — | Search by symbol (case-insensitive contains) |
| `segment` | string | — | — | Filter by segment (e.g. "NSE_EQ", "NSE_FNO") |
| `instrument` | string | — | — | Filter by instrument (e.g. "EQUITY", "FUTSTK") |
| `limit` | number | 50 | 200 | Rows per page |
| `offset` | number | 0 | — | Skip rows (pagination) |

**Response:**
```json
{
  "success": true,
  "data": [{ "id": 1, "securityId": "2885", "symbol": "RELIANCE", ... }],
  "total": 23891,
  "syncDate": "2026-03-17",
  "filters": {
    "segments": ["NSE_EQ", "NSE_FNO"],
    "instruments": ["EQUITY", "FUTSTK", "FUTIDX"]
  }
}
```

### POST /api/master-contracts/sync

Force re-sync master contracts from Dhan CSV. File: `app/api/master-contracts/sync/route.ts`.

Calls `forceSync()` which: downloads full CSV → filters to EQUITY+FUTSTK+FUTIDX → deletes all existing rows → bulk inserts.

```
POST /api/master-contracts/sync
→ 200 { "success": true, "count": 23891, "elapsed": "3.2s" }
→ 500 { "success": false, "error": "Failed to fetch master CSV: 403" }
```

---

## Bhavcopy

### GET /api/bhavcopy

Browse bhavcopy data. File: `app/api/bhavcopy/route.ts`.

**Parameters:**

| Param | Type | Default | Max | Description |
|-------|------|---------|-----|-------------|
| `symbol` | string | — | — | Filter by symbol (case-insensitive contains) |
| `date` | string | — | — | Filter by date (YYYY-MM-DD) |
| `limit` | number | 50 | 500 | Rows per page |
| `offset` | number | 0 | — | Skip rows (pagination) |

**Response:**
```json
{
  "success": true,
  "data": [{ "id": 1, "date": "2026-03-16", "symbol": "RELIANCE", "eqHigh": 1395.1, ... }],
  "total": 7858,
  "dates": ["2026-03-16", "2026-03-13", ...],
  "dateRange": { "from": "2026-01-20", "to": "2026-03-16" }
}
```

Sorting: `orderBy: [{ date: 'desc' }, { symbol: 'asc' }]`.

### POST /api/bhavcopy/sync

Sync bhavcopy data from NSE. File: `app/api/bhavcopy/sync/route.ts`.

**Parameters:**

| Param | Type | Default | Max | Description |
|-------|------|---------|-----|-------------|
| `days` | number | 25 | 60 | Number of trading days to sync |

**Behavior:**
1. `importFromCache()` — reads existing JSON files from `lib/cache/rfactor/daily/*.json` (from previous sessions). Inserts any dates not already in DB. Instant, no network.
2. `syncBhavcopy()` — for remaining missing dates, gets NSE session cookie via `getNSECookie()`, downloads equity + F&O bhavcopy ZIPs in parallel per date, parses CSVs, bulk inserts.
3. Skips dates that already exist in DB (incremental sync).
4. Skips holidays (empty response from NSE).

```
POST /api/bhavcopy/sync?days=25
→ 200 { "success": true, "dates": 34, "rows": 7026, "elapsed": "2.8s" }
→ 500 { "success": false, "error": "..." }
```
