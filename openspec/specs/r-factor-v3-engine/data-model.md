# Data Model: R-Factor V3

## Prisma Models (prisma/schema.prisma)

### `MasterContract` (master_contracts)

Dhan instrument mappings. Synced daily from Dhan CSV. Filtered to ~24K rows (EQUITY + FUTSTK + FUTIDX from NSE only).

| Field | Type | Description |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| securityId | String | Dhan security ID (e.g. "2885" for RELIANCE equity) |
| symbol | String | Trading symbol (e.g. "RELIANCE" or "RELIANCE-Mar2026-FUT") |
| exchange | String | "NSE" (BSE filtered out) |
| segment | String | "NSE_EQ" or "NSE_FNO" |
| instrument | String | "EQUITY", "FUTSTK", or "FUTIDX" |
| name | String | Full instrument name from CSV |
| underlying | String? | For FUTSTK: extracted from symbol (e.g. "RELIANCE" from "RELIANCE-Mar2026-FUT"). NULL for EQUITY. |
| expiryDate | DateTime? | Futures expiry date. NULL for EQUITY. |
| syncDate | String | YYYY-MM-DD (IST) when synced |

**Indexes:**
- `@@unique([securityId, segment])` — prevents duplicates
- `@@index([exchange, symbol])` — for `resolveSymbol()` lookups
- `@@index([segment, instrument, underlying])` — for `batchResolveFutures()` lookups
- `@@index([syncDate])` — for sync freshness check

### `BhavcopyDay` (bhavcopy_days)

NSE daily equity + F&O data per stock. ~206 stocks × 25+ trading days = ~5,000+ rows.

| Field | Type | Description |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| date | String | YYYY-MM-DD |
| symbol | String | Stock symbol (e.g. "RELIANCE") |
| eqVolume | Float | Equity trading volume |
| eqTurnover | Float | Equity turnover (₹) |
| eqHigh | Float | Day high price |
| eqLow | Float | Day low price |
| eqClose | Float | Closing price |
| futVolume | Float | Near-month futures volume (only near-month, not mid/far) |
| futOi | Float | Futures open interest |
| futOiChange | Float | OI change from previous day |
| futTurnover | Float | Futures turnover (₹) |
| optVolume | Float | Total options volume (all strikes, all expiries) |
| optOi | Float | Total options OI |
| optTurnover | Float | Options turnover (₹) |
| ceVolume | Float | Call option volume only (for PCR computation) |
| peVolume | Float | Put option volume only (for PCR computation) |

**Indexes:**
- `@@unique([date, symbol])` — one row per stock per day
- `@@index([symbol])` — for `getHistoricalData()` per-stock lookups
- `@@index([date])` — for per-date queries on bhavcopy page

## TypeScript Types (lib/r-factor/types.ts)

### `DailyStockData`

Raw daily data for a single stock. Maps 1:1 to BhavcopyDay fields (snake_case):

```typescript
interface DailyStockData {
  eq_volume: number;
  eq_turnover: number;
  eq_high: number;
  eq_low: number;
  eq_close: number;
  fut_volume: number;     // Near-month futures only
  fut_oi: number;
  fut_oi_change: number;
  fut_turnover: number;
  opt_volume: number;     // All strikes aggregated
  opt_oi: number;
  opt_turnover: number;
  ce_volume: number;      // Call options only
  pe_volume: number;      // Put options only
}
```

### `FactorData`

Computed from `DailyStockData` via `transformToFactorData()`:

| Field | Computation | Used By OLS? |
|-------|-------------|-------------|
| `spread` | `(eq_high - eq_low) / eq_close` ÷ 20-day rolling avg spread | Yes (as ratio, coeff 0.625) |
| `pcr` | `pe_volume / ce_volume` (0 if ce_volume=0) | Yes (Z-scored, coeff 0.077) |
| `fut_turnover` | Raw futures turnover | Yes (Z-scored, coeff 1.415) |
| `fut_volume` | Raw futures volume | Yes (Z-scored, coeff -1.733) |
| `opt_volume` | Raw options volume | No (vestigial from V2) |
| `eq_trade_size` | `eq_turnover / eq_volume` (0 if volume=0) | No (vestigial from V2) |
| `oi_change` | `abs(fut_oi_change)` | No (used for regime classification only) |

### `SignalOutput`

Engine output for a single stock:

```typescript
interface SignalOutput {
  symbol: string;
  compositeRFactor: number;  // OLS regression score
  regime: 'Elephant' | 'Cheetah' | 'Hybrid' | 'Defensive';
  isBlastTrade: boolean;     // compositeRFactor >= 2.8
  zScores: {
    fut_turnover: number;
    fut_volume: number;
    opt_volume: number;
    eq_trade_size: number;
    oi_change: number;
    spread: number;          // This is actually a RATIO, not Z-score
    pcr: number;
  };
  timestamp: string;
}
```

### `BoostSignal` (lib/r-factor/data-service.ts)

Extends `SignalOutput` with live price data:

```typescript
interface BoostSignal extends SignalOutput {
  pctChange?: number; // ((lastPrice - close) / close) * 100, from Dhan equity OHLC
}
```

### `SecurityEntry` / `FuturesEntry` (lib/historify/master-contracts.ts)

```typescript
type SecurityEntry = {
  securityId: string;
  symbol: string;
  exchange: string;
  segment: string;
  name: string;
  instrument: string;
};

type FuturesEntry = SecurityEntry & {
  expiry: Date;
  underlying: string;
};
```

### `EngineConfig` / `DEFAULT_CONFIG` (lib/r-factor/types.ts)

```typescript
const DEFAULT_CONFIG = {
  lookbackPeriod: 20,
  weights: { ... },        // VESTIGIAL — NOT used by OLS engine
  thresholds: {
    blastTrade: 2.8,       // R-Factor >= 2.8 = blast trade
    regimeSwitch: 1.5,     // Spread threshold for Cheetah regime
  },
};
```

## Dhan Market Feed Response Format

```typescript
// POST /v2/marketfeed/ohlc (equity)
// Body: { NSE_EQ: [2885, 11536, ...] }  ← NUMERIC IDs required
{
  data: {
    NSE_EQ: {
      "2885": { last_price: 1372.3, ohlc: { open: 1380, close: 1380.7, high: 1389.3, low: 1363.5 } }
    }
  },
  status: "success"
}

// POST /v2/marketfeed/quote (futures depth)
// Body: { NSE_FNO: [52023, ...] }
{
  data: {
    NSE_FNO: {
      "52023": {
        last_price: 1372.5,
        volume: 5149500,
        oi: 97616000,
        ohlc: { open: 1382.5, close: 1381.6, high: 1390.5, low: 1364.2 },
        oi_day_high: 97616000,
        oi_day_low: 96603000,
        sell_quantity: 873500,
        buy_quantity: 431000
      }
    }
  },
  status: "success"
}
```

**Note:** SDK sends string IDs → API returns 400 "Invalid Request". Must send numeric. We bypass SDK with raw `fetch()` in `dhanMarketFeed()`.

## NSE Bhavcopy CSV Column Reference

### Equity CSV (BhavCopy_NSE_CM_...)

| Column | Description | Used For |
|--------|-------------|----------|
| `TckrSymb` | Symbol | Stock identification |
| `SctySrs` | Series | Filter: only "EQ" |
| `HghPric` | Day high | Spread ratio |
| `LwPric` | Day low | Spread ratio |
| `ClsPric` | Closing price | Spread ratio |
| `TtlTradgVol` | Total volume | eq_volume |
| `TtlTrfVal` | Total turnover | eq_turnover |

### F&O CSV (BhavCopy_NSE_FO_...)

| Column | Description | Used For |
|--------|-------------|----------|
| `TckrSymb` | Symbol | Stock identification |
| `FinInstrmTp` | Instrument type | "STF"=stock futures, "STO"=stock options |
| `XpryDt` | Expiry date | Near-month futures selection |
| `OpnIntrst` | Open interest | fut_oi, opt_oi |
| `ChngInOpnIntrst` | OI change | fut_oi_change |
| `TtlTradgVol` | Volume | fut_volume, opt_volume |
| `TtlTrfVal` | Turnover | fut_turnover, opt_turnover |
| `OptnTp` | Option type | "CE" or "PE" for PCR split |

## Dhan Master CSV Column Reference

| Column | Description | Used For |
|--------|-------------|----------|
| `SEM_EXM_EXCH_ID` | Exchange | "NSE" or "BSE" |
| `SEM_SEGMENT` | Segment code | "E"=equity, "D"=derivatives |
| `SEM_SMST_SECURITY_ID` | Security ID | Numeric ID for API calls |
| `SEM_TRADING_SYMBOL` | Trading symbol | "RELIANCE", "RELIANCE-Mar2026-FUT" |
| `SEM_INSTRUMENT_NAME` | Instrument | "FUTSTK", "OPTSTK", "FUTIDX" |
| `SEM_EXCH_INSTRUMENT_TYPE` | Exchange type | "ES", "FUT", "OP" (normalized) |
| `SEM_EXPIRY_DATE` | Expiry | ISO datetime string |
