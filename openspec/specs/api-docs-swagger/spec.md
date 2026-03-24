# Feature Specification: API Documentation & Swagger UI

**Created**: 2026-03-25
**Status**: Implemented

## Overview

Interactive API documentation for Project-R and DhanHQ V2 APIs via Swagger UI. Provides a browser-based interface at `/api-docs` where all 44 Project-R endpoints and 38 Dhan endpoints can be explored, tested, and invoked with live auth tokens injected automatically from environment variables.

## Architecture

### URL Structure

```
/api-docs              → Redirect to /api-docs/ui
/api-docs/ui           → Swagger UI HTML (route handler, not React page)
/api-docs/spec         → Project-R OpenAPI 3.1 JSON (CORS-enabled, no-cache)
/api-docs/dhan-spec    → DhanHQ OpenAPI 3.0.1 JSON (CORS-enabled, no-cache)
/api-docs/proxy/[...path] → Reverse proxy to https://api.dhan.co/v2/*
```

### File Layout

```
app/api-docs/
├── page.tsx                     → next/navigation redirect to /api-docs/ui
├── ui/route.ts                  → Swagger UI HTML (CDN-loaded, server-rendered)
├── spec/route.ts                → Serves public/openapi.json with CORS
├── dhan-spec/route.ts           → Serves public/dhan-api.json with CORS
└── proxy/[...path]/route.ts     → Reverse proxy to Dhan API (GET/POST/PUT/DELETE)

public/
├── openapi.json                 → Project-R OpenAPI 3.1.0 spec (37 paths, 44 ops)
└── dhan-api.json                → DhanHQ OpenAPI 3.0.1 spec (38 paths, 49 schemas)
```

## Design Decisions

### 1. Swagger UI via CDN, not npm

**Decision:** Load Swagger UI JS/CSS from `unpkg.com` CDN instead of `swagger-ui-react` npm package.

**Why:**
- `swagger-ui-react` has peer dependency `react < 19` — incompatible with React 19.2
- Turbopack cannot compile `swagger-ui-dist` bundle (infinite loader)
- CDN approach: zero npm deps, no bundler issues, no SSR/hydration problems
- `swagger-ui-dist` installed for types only (not imported at runtime)

### 2. Route handler (not React page) for Swagger UI

**Decision:** `/api-docs/ui/route.ts` returns raw HTML via `new Response(html)`.

**Why:**
- Swagger UI is a standalone SPA that manages its own DOM
- Wrapping in React layout causes hydration conflicts
- Route handler serves self-contained HTML with CDN scripts
- No interference from Next.js app layout, Sentry, or analytics

### 3. Reverse proxy for Dhan API

**Decision:** All Dhan API calls route through `/api-docs/proxy/*` instead of hitting `api.dhan.co` directly.

**Why:**
- **CORS:** Browser blocks cross-origin requests to `api.dhan.co` from `localhost:5000`
- **Auth injection:** Proxy injects `access-token` and `client-id` headers server-side via `getDhanAccessToken()` (TOTP auto-generation)
- **No secrets in browser:** Tokens never appear in client-side JavaScript

### 4. Separate spec files (not generated from code)

**Decision:** Maintain `public/openapi.json` and `public/dhan-api.json` as static files, not generated from JSDoc or route annotations.

**Why:**
- No runtime overhead or build step
- Full control over schema definitions, descriptions, examples
- Easier to keep in sync — edit JSON directly
- No dependency on annotation parsers

### 5. Spec dropdown for multi-API

**Decision:** Swagger UI `urls` config with two specs, switchable via dropdown.

**Why:**
- Project-R API and Dhan API are separate concerns
- Each has its own auth model (Project-R: none, Dhan: access-token + client-id)
- Dropdown allows quick switching without separate pages

## Project-R OpenAPI Spec (`public/openapi.json`)

### Coverage

**37 paths, 44 operations, 33 component schemas, 8 tags**

| Tag | Paths | Operations | Description |
|-----|-------|------------|-------------|
| R-Factor | 2 | 2 | V4 ensemble signals, history, leaderboard |
| TF Snapshot | 2 | 2 | TradeFinder comparison data import/query |
| Historify | 11 | 17 | Live data, charts, sync, watchlist, jobs, settings, stats |
| Backtest | 3 | 5 | Mock backtest, TF validation (10+ actions), download stream |
| Quant | 2 | 2 | Real backtest engine, Relative Rotation Graph |
| AI Trading | 5 | 7 | AI stock analysis, SSE decision stream, risk config, positions |
| Data Sync | 4 | 4 | Master contracts, bhavcopy sync |
| Market Data | 5 | 5 | Stocks, OI data, option chain, sector scope, cache |

### SSE Endpoints (3)

OpenAPI 3.1 has no native SSE support. Documented with `text/event-stream` content type and `x-sse-events` vendor extension:

| Endpoint | Events |
|----------|--------|
| `GET /api/historify/live-stream` | `tick`, `heartbeat` |
| `GET /api/ai-trading/stream` | `heartbeat`, `status`, `cycle`, `error` |
| `POST /api/backtest/download-stream` | `progress`, `step-done`, `symbol-done`, `complete`, `error` |

### Polymorphic Responses

Routes returning different shapes based on query params use `oneOf`:

| Route | Modes |
|-------|-------|
| `GET /api/r-factor` | single symbol / live bulk / past bulk / auto bulk / dhan-daily |
| `GET /api/r-factor-history` | symbol history / daily leaderboard / available dates |
| `GET /api/tf-snapshot` | by-date / by-symbol / dates list |
| `POST /api/backtest/tf-validate` | 11 actions via `action` discriminator |

### Error Schemas

| Schema | Status | When |
|--------|--------|------|
| `ErrorResponse` | 400/500 | Standard `{ success: false, error: string }` |
| `SyncRequiredError` | 503 | Master contracts or bhavcopy not synced: `{ code: "SYNC_REQUIRED", syncTarget: "master-contracts" \| "bhavcopy" }` |

### Component Schemas (33)

Derived from TypeScript types and Prisma models:

**R-Factor domain:** `SignalOutput`, `ZScores`, `MarketRegime`, `ModelType`, `RFactorSingleResponse`, `RFactorBulkResponse`, `RFactorPastResponse`, `RFactorHistoryResponse`, `RFactorLeaderboardResponse`, `AvailableDatesResponse`

**AI Trading domain:** `TradeSignal`, `TradeDecision`, `ExecutableDecision`, `RiskConfig`, `OptionPosition`

**Quant domain:** `BacktestResult`, `BacktestTrade`, `MockBacktestResult`, `RRGResult`, `SectorRRG`

**Data models (Prisma):** `WatchlistItem`, `ActivityItem`, `MasterContract`, `BhavcopyDay`, `TfSnapshot`, `Settings`

**Market data:** `OHLCVCandle`, `ChartIndicators`, `StrikeData`, `OptionSideData`

**System:** `DashboardStats`, `ErrorResponse`, `SyncRequiredError`

## DhanHQ OpenAPI Spec (`public/dhan-api.json`)

### Source

Built from the official DhanHQ OpenAPI 3.0.1 spec (`document-official.json`) with three enhancements:

### Enhancement 1: Security Schemes

Added global security so Swagger's "Authorize" button works:

```json
"securitySchemes": {
  "accessToken": { "type": "apiKey", "in": "header", "name": "access-token" },
  "clientId": { "type": "apiKey", "in": "header", "name": "client-id" }
}
```

Removed 46 per-endpoint `access-token` parameter definitions (redundant with global security scheme, prevented duplicate input fields in Swagger UI).

### Enhancement 2: Proxy Server URL

```json
"servers": [{ "url": "http://localhost:5000/api-docs/proxy" }]
```

Routes all "Try it out" requests through the reverse proxy, avoiding CORS and keeping tokens server-side.

### Enhancement 3: Market Feed Endpoints (5)

These endpoints are implemented in the dhanv2 SDK and used heavily by Project-R but missing from the official Dhan OpenAPI spec:

| Endpoint | operationId | Description |
|----------|-------------|-------------|
| `POST /marketfeed/ltp` | `getMarketQuoteLTP` | LTP snapshot for multiple instruments |
| `POST /marketfeed/ohlc` | `getMarketQuoteOHLC` | OHLC + volume snapshot |
| `POST /marketfeed/quote` | `getMarketQuoteDepth` | Full quote with depth, OI, VWAP |
| `POST /optionchain` | `getOptionChain` | Per-strike CE/PE volume, OI, greeks |
| `POST /optionchain/expirylist` | `getExpiryList` | Available expiry dates |

Added `MarketFeedRequest` schema and `"Market Feed"` tag.

### Coverage

**38 paths, 49 component schemas, 12 tags**

| Tag | Operations | Description |
|-----|------------|-------------|
| Orders | 7 | Place, modify, cancel, slice orders + trade book |
| Super Order | 4 | Bracket orders (entry + SL + target) |
| Forever Order | 4 | GTT-style persistent triggers |
| Conditional Triggers | 5 | Price/technical alerts (SMA, EMA, RSI, MACD, BB) |
| Positions & Portfolio | 5 | Holdings, positions, eDIS workflow |
| Funds & Margin | 3 | Fund limits, single + multi margin calculator |
| Statements | 2 | Ledger, trade history |
| Trader's Control | 5 | Kill switch, P&L exit, IP setup |
| Data API's | 3 | Historical/intraday charts, expired options |
| EDIS | 4 | T-PIN, authorization forms |
| IP Setup | 3 | Static IP management |
| Market Feed | 5 | Real-time quotes + option chain (SDK-only) |

### Full Request/Response Schemas

The official spec includes complete schemas for all request/response types:

`OrderRequest`, `OrderResponse`, `OrderModifyRequest`, `OrderStatusResponse`, `SuperOrderRequest`, `SuperOrderResponse`, `SuperModifyRequest`, `SuperOrderLeg`, `GTTOrderModel`, `GttModifyRequest`, `GttOrderStatusResponse`, `GttOrderResponse`, `AlertCondition`, `AlertOrder`, `AlertOrderRequest`, `AlertModifyRequest`, `AlertOrderResponse`, `GetAlertResponse`, `PositionResponse`, `PositionConversionRequest`, `HoldingResponse`, `TradeResponse`, `TradeHistoryResponseModel`, `FundLimitResponse`, `KnowYourMarginReq`, `KnowYourMarginResponse`, `MultiScripMarginCalcRequest`, `MultiScripMarginCalcResponse`, `ScriptItem`, `EdisFormRequest`, `EdisFormResponse`, `EdisBulkFormRequest`, `EdisQtyStatusResponse`, `KillSwitchResponse`, `PnlBasedExitRequest`, `PnlExitResponse`, `ExitPnlResponse`, `BoLedgerResponse`, `UserIPRequest`, `UserIPResponse`, `GetIPDetailsResponse`, `ChartsResponse`, `HistoricalChartsRequest`, `IntradayChartsRequest`, `OptionChartRequest`, `OptionChartResponse`, `OptionChartPayload`, `ChartData`, `MarketFeedRequest`

## Reverse Proxy (`app/api-docs/proxy/[...path]/route.ts`)

### How It Works

1. Browser sends request to `http://localhost:5000/api-docs/proxy/holdings`
2. Proxy extracts path (`/holdings`) and query string
3. Calls `getDhanAccessToken()` for fresh TOTP-generated token
4. Forwards to `https://api.dhan.co/v2/holdings` with injected headers:
   - `access-token`: Auto-generated JWT
   - `client-id`: From `DHAN_CLIENT_ID` env var
5. Returns Dhan response to browser with `Access-Control-Allow-Origin: *`

### Supported Methods

`GET`, `POST`, `PUT`, `DELETE` — all proxied with body forwarding for non-GET methods.

### Auth Flow

```
Browser → proxy/[path] → getDhanAccessToken() → Dhan API
                              ↓
                    1. Check disk cache (data/.dhan-token.json)
                    2. Renew if near expiry
                    3. Generate via TOTP if needed
                    4. Fallback to DHAN_ACCESS_TOKEN env var
```

### Query Params

Forwarded as-is: `new URL(req.url).search` appended to Dhan URL.

## Swagger UI Configuration

### Features Enabled

| Feature | Config | Description |
|---------|--------|-------------|
| `tryItOutEnabled: true` | All endpoints have "Try it out" pre-activated |
| `filter: true` | Search box to filter endpoints by keyword |
| `deepLinking: true` | URL hash updates when navigating tags/operations |
| `docExpansion: 'list'` | Tags expanded, operations collapsed by default |
| `defaultModelsExpandDepth: 1` | Schemas visible one level deep |

### Auto-Auth for Dhan

```javascript
requestInterceptor: function(req) {
  if (req.url && req.url.includes('dhan.co')) {
    req.headers['access-token'] = '${accessToken}';  // Server-injected
    req.headers['client-id'] = '${clientId}';
  }
  return req;
}
```

Tokens are injected into the HTML at render time by the route handler (server-side). They never appear in client-side source — the HTML is dynamically generated per request.

## SDK Changes (dhanv2)

### AlertsApi Added (`dhanv2/src/rest/alerts.ts`)

5 methods matching the official Dhan spec's Conditional Triggers endpoints:

| Method | HTTP | Path | Types |
|--------|------|------|-------|
| `getAlertOrders()` | GET | `/alerts/orders` | → `GetAlertResponse[]` |
| `createAlertOrder(req)` | POST | `/alerts/orders` | `AlertOrderRequest` → `AlertOrderResponse` |
| `getAlertOrder(alertId)` | GET | `/alerts/orders/{alertId}` | → `GetAlertResponse` |
| `modifyAlertOrder(alertId, req)` | PUT | `/alerts/orders/{alertId}` | `AlertModifyRequest` → `AlertOrderResponse` |
| `deleteAlertOrder(alertId)` | DELETE | `/alerts/orders/{alertId}` | → `AlertOrderResponse` |

Follows SDK conventions: `Omit<..., 'dhanClientId'>` for requests, clientId injected in constructor.

### Alert Types Added (`dhanv2/src/types/index.ts`)

**Enums:** `AlertComparisonType`, `AlertIndicator` (21 indicators: SMA/EMA 5-200, BB, RSI, ATR, Stochastic, MACD), `AlertOperator` (9 operators), `AlertTimeFrame`, `AlertStatus`

**Interfaces:** `AlertCondition`, `AlertOrder`, `AlertOrderRequest`, `AlertModifyRequest`, `AlertOrderResponse`, `GetAlertResponse`

### P&L Exit Fix (`dhanv2/src/rest/traderControl.ts`)

Fixed JSDoc comment from `PUT /pnlExit` to `POST /pnlExit` to match official spec. The code was already using `this.http.post` (correct).

### 3-Way Comparison Results

| Category | Official Spec | SDK | Gap |
|----------|--------------|-----|-----|
| Orders | 7 endpoints | 7 methods | None |
| Super Orders | 4 endpoints | 4 methods | None |
| Forever Orders | 4 endpoints | 4 methods | None |
| Alerts | 5 endpoints | 5 methods | **Closed** (was missing) |
| Portfolio | 5 endpoints | 5 methods | None |
| Funds | 3 endpoints | 3 methods | None |
| Statements | 2 endpoints | 2 methods | None |
| Trader Control | 5 endpoints | 5 methods | None |
| Data APIs | 3 endpoints | 3 methods | None |
| EDIS | 4 endpoints | 4 methods | None |
| IP Setup | 3 endpoints | 3 methods | None |
| Market Feed | 0 endpoints | 5 methods | Spec incomplete (SDK-only) |
| WebSockets | 0 | 3 sockets | Not in REST spec |

**SDK-only features not in any spec:**
- `MarketFeedSocket` — Binary real-time market data (1000 instruments, auto-batching)
- `FullMarketDepthSocket` — 20-level (50 instruments) or 200-level (1 instrument) depth
- `OrderUpdateSocket` — JSON order execution updates
- `BinaryParser` — Custom little-endian binary protocol decoder

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `swagger-ui-dist` | 5.32.1 | Types only (CSS/JS loaded from CDN at runtime) |
| `@scalar/nextjs-api-reference` | 0.10.4 | Can be removed (superseded by CDN Swagger UI) |

## Verification

All endpoints tested via `curl` through the proxy:

| Endpoint | Method | Result |
|----------|--------|--------|
| `/fundlimit` | GET | Account balance returned |
| `/positions` | GET | `[]` (no open positions) |
| `/orders` | GET | `[]` (no orders today) |
| `/holdings` | GET | `No holdings available` |
| `/alerts/orders` | GET | `[]` (no alerts) |
| `/killswitch` | GET | `INACTIVE` |
| `/ledger?from-date=...&to-date=...` | GET + query | Ledger entries returned |
| `/charts/historical` | POST + body | OHLCV candles returned |
| `/marketfeed/ltp` | POST + body | LTP: HDFC 764.9, TCS 2398.8 |
| `/ip/getIP` | GET | IP config returned |
