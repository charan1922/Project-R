# @dhan/ts-sdk

> Production-grade TypeScript SDK for the [DhanHQ](https://dhanhq.co) trading API v2.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

---

## Features

- ✅ **Full REST API coverage** — orders, super orders, forever orders, portfolio, eDIS, funds, margin, charts, option chain, kill switch, P&L exit, IP management, alerts
- ✅ **Strict TypeScript** — every request/response fully typed; no `any`
- ✅ **Axios-powered HTTP** — centralized interceptors for auth injection and typed error handling
- ✅ **Binary WebSocket feed** — `ws` package + Little Endian binary parser for Dhan market feed v2
- ✅ **Order update stream** — JSON WebSocket with `MsgCode: 42` auth pattern
- ✅ **Typed custom errors** — `DhanApiError`, `DhanAuthError`, `DhanNetworkError`, `DhanValidationError`

---

## Installation

```bash
npm install @dhan/ts-sdk
```

---

## Quick Start

```typescript
import { DhanHQ, ExchangeSegment, TransactionType, ProductType, OrderType, Validity } from '@dhan/ts-sdk';

const dhan = new DhanHQ('CLIENT_ID', 'ACCESS_TOKEN');

// Place a limit order
const result = await dhan.placeOrder({
  securityId: '1333',                           // Infosys
  exchangeSegment: ExchangeSegment.NSE,
  transactionType: TransactionType.BUY,
  productType: ProductType.CNC,
  orderType: OrderType.LIMIT,
  validity: Validity.DAY,
  quantity: 1,
  price: 1800.0,
});

if (result.status === 'success') {
  console.log('Order placed:', result.data.orderId);
}
```

---

## REST API

All methods return a `DhanResponse<T>` — a discriminated union:

```typescript
type DhanResponse<T> = { status: 'success'; data: T } | { status: 'failure'; data: null; remarks: ... }
```

Narrow via `if (result.status === 'success')` or let typed errors propagate via `throw`.

### Orders

```typescript
// Place / slice / modify / cancel
await dhan.placeOrder({ ... });
await dhan.placeSliceOrder({ ... });          // splits large quantities
await dhan.modifyOrder('ORDER_ID', { ... });  // ⚠️ quantity = TOTAL placed, not pending
await dhan.cancelOrder('ORDER_ID');

// Read
await dhan.getOrderList();
await dhan.getOrderById('ORDER_ID');
await dhan.getOrderByCorrelationId('MY_TAG');
await dhan.getTradeBook();
await dhan.getTradeHistory('2024-01-01', '2024-01-31', 0);  // page 0
```

### Super Orders (Bracket)

```typescript
await dhan.placeSuperOrder({
  securityId: '1333',
  exchangeSegment: ExchangeSegment.NSE,
  transactionType: TransactionType.BUY,
  productType: ProductType.CNC,
  orderType: OrderType.LIMIT,
  quantity: 1,
  price: 1800,
  targetPrice: 1900,
  stopLossPrice: 1750,
  trailingJump: 5,
});
await dhan.cancelSuperOrder('ORDER_ID', LegName.TARGET_LEG);
```

### Forever Orders (GTT)

```typescript
await dhan.placeForeverOrder({ orderFlag: OrderFlag.SINGLE, ... });
await dhan.modifyForeverOrder('ORDER_ID', { ... });
await dhan.deleteForeverOrder('ORDER_ID');
await dhan.getForeverOrders();
```

### Portfolio

```typescript
await dhan.getHoldings();
await dhan.getPositions();
await dhan.convertPosition({ fromProductType: ..., toProductType: ..., securityId: '1333', convertQty: 1, ... });
await dhan.exitAllPositions();    // ⚠️ irreversible — squares off ALL open positions
```

### eDIS (Delivery Authorization)

```typescript
await dhan.generateTpin();
const { data } = await dhan.generateEdisForm({ isin: 'INE009A01021', qty: 1, exchange: 'NSE' });
// Render data.edisFormHtml in the user's browser
await dhan.edisInquiry('INE009A01021');
```

### Funds & Margin

```typescript
await dhan.getFundLimits();
await dhan.getMarginCalculator({ securityId: '1333', exchangeSegment: ExchangeSegment.NSE, ... });
await dhan.getMultiMarginCalculator([{ securityId: '1333', ... }]);
```

### Market Quotes (snapshot)

```typescript
// SecurityMap: segment → array of security IDs (max 1,000 instruments, 1 req/sec)
const map = { [ExchangeSegment.NSE]: ['1333', '7097'] };

await dhan.getMarketQuoteLTP(map);
await dhan.getMarketQuoteOHLC(map);
await dhan.getMarketQuoteDepth(map);
```

### Historical Data & Option Chain

```typescript
// Daily OHLC (timestamps in EPOCH)
await dhan.getDailyHistoricalData('1333', ExchangeSegment.NSE, 'EQUITY', '2024-01-01', '2024-12-31');

// Intraday — max 90 days per request; supported intervals: 1, 5, 15, 25, 60 min
await dhan.getIntradayHistoricalData('1333', ExchangeSegment.NSE, 'EQUITY', 5, '2024-01-01', '2024-03-31');

// Option chain (max 1 unique request every 3 seconds)
await dhan.getOptionChain(13, ExchangeSegment.INDEX, '2024-12-26');
await dhan.getExpiryList(13, ExchangeSegment.INDEX);
```

### Trader Control

```typescript
// Kill switch
await dhan.getKillSwitch();
await dhan.activateKillSwitch(KillSwitchAction.ACTIVATE);   // halts trading for the session

// P&L exit — auto-liquidates when profit/loss thresholds are breached
// ⚠️ Setting thresholds below current profit triggers IMMEDIATE liquidation
await dhan.getPnlExit();
await dhan.setPnlExit({ profitThreshold: 5000, lossThreshold: 2000 });
await dhan.stopPnlExit();

// IP whitelist
await dhan.getStaticIp();
await dhan.setStaticIp({ ip: '1.2.3.4', ipFlag: IpFlag.PRIMARY });
await dhan.modifyStaticIp({ ip: '5.6.7.8', ipFlag: IpFlag.PRIMARY });
```

---

## WebSocket Feeds

### Live Market Feed (Binary)

Uses the `ws` npm package. Incoming frames are parsed from Little Endian binary via `BinaryParser`.

```typescript
import { DhanFeed, ExchangeSegment, FeedRequestCode } from '@dhan/ts-sdk';

const feed = new DhanFeed('CLIENT_ID', 'ACCESS_TOKEN');

feed.on('connect', () => {
  // Max 100 instruments per subscribe() call; batching is automatic
  feed.subscribe(
    [{ exchangeSegment: ExchangeSegment.NSE, securityId: '1333' }],
    FeedRequestCode.SUBSCRIBE_QUOTE   // or SUBSCRIBE_TICKER / SUBSCRIBE_DEPTH
  );
});

feed.on('ticker', (tick) => console.log('LTP:', tick.ltp));
feed.on('quote',  (q)    => console.log('OHLC:', q.open, q.high, q.low, q.close));
feed.on('error',  (err)  => console.error(err));
feed.on('close',  ()     => console.log('Disconnected'));

feed.connect();
// feed.unsubscribe([...], FeedRequestCode.UNSUBSCRIBE_QUOTE);
// feed.close();
```

### Order Update Stream (JSON)

```typescript
import { DhanOrderFeed } from '@dhan/ts-sdk';

const orderFeed = new DhanOrderFeed('CLIENT_ID', 'ACCESS_TOKEN');

orderFeed.on('connect', () => console.log('Authenticated — receiving order updates'));
orderFeed.on('order',   (update) => console.log('Status:', update.orderStatus, update.orderId));
orderFeed.on('error',   (err) => console.error(err));

orderFeed.connect();
// orderFeed.close();
```

---

## Error Handling

All API errors throw typed instances — never plain `Error`:

```typescript
import { DhanApiError, DhanAuthError, DhanNetworkError, DhanValidationError } from '@dhan/ts-sdk';

try {
  await dhan.placeOrder({ ... });
} catch (err) {
  if (err instanceof DhanAuthError) {
    // 401 / 403 — token invalid or expired
    console.error('Auth failed:', err.remarks);
  } else if (err instanceof DhanNetworkError) {
    console.error('Timeout?', err.isTimeout, err.message);
  } else if (err instanceof DhanApiError) {
    // All other non-2xx (DH-905, DH-906, etc.)
    const r = err.remarks;
    console.error(`[${r.error_code}] ${r.error_type}: ${r.error_message}`);
  } else if (err instanceof DhanValidationError) {
    // Client-side input validation failure
    console.error(err.message);
  }
}
```

### Known Error Codes

| Code | Meaning |
|---|---|
| `DH-901` | Token expired or invalid |
| `DH-902` | Segment not subscribed |
| `DH-904` | Rate limit exceeded |
| `DH-905` | Input exception — missing/invalid fields |
| `DH-906` | Order error (exchange rejection) |

---

## Rate Limits

| Type | Limit |
|---|---|
| Order placement | 10/sec · 250/min · 1,000/hr · 7,000/day |
| Order modification | Max 25 per order |
| Data APIs (charts) | 5/sec · 100,000/day |
| Market quotes | 1 req/sec |
| Option chain | 1 unique request per 3 seconds |
| WebSocket connections | Max 5 simultaneous |
| WS instruments | Max 1,000 per connection |
| WS subscription payload | Max 100 instruments per message |

---

## Project Structure

```
dhan/
├── dhanhq.ts         # Main DhanHQ class — all REST methods
├── http_client.ts    # Axios HTTP client with auth interceptors
├── feed.ts           # DhanFeed — binary market data WebSocket (ws)
├── order_feed.ts     # DhanOrderFeed — JSON order update WebSocket (ws)
├── binary_parser.ts  # BinaryParser — Little Endian packet parser
├── sdk-types.ts      # All enums, request/response interfaces
├── errors.ts         # Typed error classes
├── index.ts          # Barrel export
└── types.ts          # Auto-generated OpenAPI types
```

---

## AMO Orders

```typescript
import { AmoTime } from '@dhan/ts-sdk';

await dhan.placeOrder({
  ...baseOrder,
  afterMarketOrder: true,
  amoTime: AmoTime.PRE_OPEN,   // PRE_OPEN | OPEN | OPEN_30 | OPEN_60
});
```

---

## License

MIT
