# dhanhq-ts

> Production-grade TypeScript npm library for the [DhanHQ](https://dhanhq.co) trading API v2 — complete 1:1 migration of the Python SDK (v2.2.0).

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

---

## Features

- ✅ **Complete REST API coverage** — orders, super orders, forever orders, portfolio, eDIS, fund limits, margin calculators, market quotes, historical charts, option chain, kill switch, P&L exit, IP management
- ✅ **Fully typed** — strict TypeScript interfaces for every request and response, all enums from the API annexure
- ✅ **Axios-powered HTTP** — centralized interceptors for auth injection and typed `APIError` on failures
- ✅ **Real-time WebSocket streams** — binary market feed, order update stream, and Level 3 full depth feed
- ✅ **Correct binary parser** — Little Endian packet parsing for the Dhan v2 binary protocol
- ✅ **Dual module output** — CommonJS and ESM builds

---

## Installation

```bash
npm install dhanhq-ts
```

---

## Quick Start

```typescript
import {
  DhanHQClient,
  ExchangeSegment,
  TransactionType,
  ProductType,
  OrderType,
  Validity,
} from 'dhanhq-ts';

const dhan = new DhanHQClient('YOUR_CLIENT_ID', 'YOUR_ACCESS_TOKEN');

// Place an order
const result = await dhan.orders.placeOrder({
  transactionType: TransactionType.BUY,
  exchangeSegment: ExchangeSegment.NSE_EQ,
  productType: ProductType.CNC,
  orderType: OrderType.LIMIT,
  validity: Validity.DAY,
  securityId: '1333',   // Infosys
  quantity: 1,
  price: 1800.0,
});

console.log(result.orderId, result.orderStatus);
```

---

## API Reference

### REST Modules

All REST methods are accessible via the `DhanHQClient` instance:

```typescript
const dhan = new DhanHQClient(clientId, accessToken, 'prod' | 'sandbox');
```

| Module | Property | Description |
|---|---|---|
| Orders | `dhan.orders` | Place/modify/cancel orders, slicing, trade history |
| Super Orders | `dhan.superOrders` | Bracket orders with target, stop-loss, and trailing |
| Forever Orders | `dhan.foreverOrders` | GTT/OCO trigger orders |
| Portfolio | `dhan.portfolio` | Holdings, positions, position conversion, exit all, eDIS |
| Funds | `dhan.funds` | Fund limits, margin calculator, multi-margin calculator |
| Statements | `dhan.statements` | Ledger reports and trade history |
| Market Quotes | `dhan.marketQuotes` | LTP, OHLC, full depth snapshots |
| Historical | `dhan.historical` | Daily/intraday OHLC charts, option chain, expired options |
| Trader Control | `dhan.traderControl` | Kill switch, P&L exit, IP whitelisting |

#### Orders

```typescript
// Place order
await dhan.orders.placeOrder({ ... });

// Slice order (for large F&O quantities)
await dhan.orders.placeSliceOrder({ ... });

// Modify order
// ⚠️ quantity must be the TOTAL placed quantity, not pending
await dhan.orders.modifyOrder('ORDER_ID', { quantity: 100, price: 1850, ... });

// Cancel order
await dhan.orders.cancelOrder('ORDER_ID');

// Retrieve
await dhan.orders.getOrderList();
await dhan.orders.getOrderById('ORDER_ID');
await dhan.orders.getOrderByCorrelationId('MY_TAG');
await dhan.orders.getTradeBook();
await dhan.orders.getTradeHistory('2024-01-01', '2024-01-31', 0);
```

#### Super Orders (Bracket)

```typescript
await dhan.superOrders.placeSuperOrder({
  transactionType: TransactionType.BUY,
  exchangeSegment: ExchangeSegment.NSE_EQ,
  productType: ProductType.CNC,
  orderType: OrderType.LIMIT,
  securityId: '1333',
  quantity: 1,
  price: 1800,
  targetPrice: 1900,
  stopLossPrice: 1750,
  trailingJump: 5,  // optional
});

await dhan.superOrders.cancelSuperOrderLeg('ORDER_ID', LegName.TARGET_LEG);
```

#### Portfolio & eDIS

```typescript
await dhan.portfolio.getHoldings();
await dhan.portfolio.getPositions();
await dhan.portfolio.exitAllPositions();  // ⚠️ irreversible

// eDIS 3-step delivery flow
await dhan.portfolio.generateTpin();
const { edisFormHtml } = await dhan.portfolio.generateEdisForm({ isin: 'INE009A01021', qty: 1, exchange: 'NSE' });
await dhan.portfolio.edisInquiry('INE009A01021');
```

#### Market Quotes

```typescript
// SecurityMap: ExchangeSegment → array of security IDs
const securities = { [ExchangeSegment.NSE_EQ]: ['1333', '7097'] };

await dhan.marketQuotes.getMarketQuoteLTP(securities);
await dhan.marketQuotes.getMarketQuoteOHLC(securities);
await dhan.marketQuotes.getMarketQuoteDepth(securities);
```

#### Historical Data & Options

```typescript
// Daily OHLC (timestamps in EPOCH)
await dhan.historical.getDailyHistorical({
  securityId: '1333',
  exchangeSegment: ExchangeSegment.NSE_EQ,
  instrument: InstrumentType.EQUITY,
  fromDate: '2024-01-01',
  toDate: '2024-12-31',
});

// Intraday (max 90 days per request)
await dhan.historical.getIntradayHistorical({
  securityId: '1333',
  exchangeSegment: ExchangeSegment.NSE_EQ,
  instrument: InstrumentType.EQUITY,
  interval: 5,
  fromDate: '2024-01-01',
  toDate: '2024-03-31',
});

// Option Chain (rate limit: 1 unique request every 3 seconds)
await dhan.historical.getOptionChain(13, ExchangeSegment.IDX_I, '2024-12-26');
```

#### Trader Control

```typescript
// Kill switch — halts trading for the rest of the session
await dhan.traderControl.activateKillSwitch(KillSwitchAction.ACTIVATE);

// P&L exit — auto-liquidate on threshold breach
// ⚠️ Setting below current profit causes IMMEDIATE liquidation
await dhan.traderControl.configurePnlExit({
  profitValue: 5000,
  lossValue: 2000,
  enableKillSwitch: true,
});

// IP whitelist
await dhan.traderControl.setStaticIp({ ip: '1.2.3.4', ipFlag: IpFlag.PRIMARY });
```

---

### WebSocket Streams

#### Order Update Stream (JSON)

```typescript
const orderSocket = dhan.createOrderUpdateSocket();

orderSocket.on('connect', () => console.log('Authenticated'));
orderSocket.on('order', (update) => console.log('Order update:', update));
orderSocket.on('error', (err) => console.error(err));
orderSocket.on('close', () => console.log('Disconnected'));

orderSocket.connect();
// orderSocket.close(); // to stop
```

#### Live Market Feed (Binary)

```typescript
import { FeedRequestCode } from 'dhanhq-ts';

const feed = dhan.createMarketFeed();

feed.on('connect', () => {
  // Subscribe (max 100 instruments per call, max 1,000 per connection)
  feed.subscribe(
    [{ exchangeSegment: ExchangeSegment.NSE_EQ, securityId: '1333' }],
    FeedRequestCode.SUBSCRIBE_QUOTE   // or SUBSCRIBE_TICKER / SUBSCRIBE_DEPTH
  );
});

feed.on('ticker', (tick) => console.log('LTP:', tick.ltp));
feed.on('quote', (quote) => console.log('OHLC:', quote.open, quote.high, quote.low, quote.close));
feed.on('error', (err) => console.error(err));

feed.connect();
```

#### Full Market Depth (Level 3 Order Book)

```typescript
// 20-level depth (up to 50 instruments per connection)
const depth = dhan.createMarketDepthFeed('20');

// 200-level depth (1 instrument per connection, premium)
// const depth = dhan.createMarketDepthFeed('200');

depth.on('connect', () => {
  depth.subscribe([{ exchangeSegment: ExchangeSegment.NSE_EQ, securityId: '1333' }]);
});

depth.on('depth', (data) => {
  console.log('Bid levels:', data.bid);   // { price, quantity, numOrders }[]
  console.log('Ask levels:', data.ask);
});

depth.connect();
```

---

## Error Handling

All API errors are thrown as typed `APIError` instances:

```typescript
import { APIError } from 'dhanhq-ts';

try {
  await dhan.orders.placeOrder({ ... });
} catch (err) {
  if (err instanceof APIError) {
    console.error(err.errorCode);    // e.g. 'DH-905'
    console.error(err.errorType);   // e.g. 'INPUT_EXCEPTION'
    console.error(err.message);     // human-readable message
    console.error(err.httpStatus);  // HTTP status code
  }
}
```

### Known Error Codes

| Code | Meaning |
|---|---|
| `DH-901` | Invalid authentication — token expired |
| `DH-902` | Invalid access — segment not subscribed |
| `DH-904` | Rate limit exceeded |
| `DH-905` | Input exception — missing/invalid fields |
| `DH-906` | Order error (exchange rejection) |
| `800` | Internal server error |
| `804` | Max subscribed instruments exceeded |
| `805` | Max WebSocket connections exceeded (limit: 5) |
| `807` | Data access token expired |

---

## Rate Limits

| API Type | Limit |
|---|---|
| Order placement | 10/sec, 250/min, 1,000/hr, 7,000/day |
| Order modification | Max 25 modifications per order |
| Data APIs | 5/sec (max 100,000/day) |
| Market quotes | 1/sec |
| Option chain | 1 unique request per 3 seconds |
| Non-trading APIs | 20/sec |
| WebSocket connections | Max 5 simultaneous |

---

## Project Structure

```
src/
├── core/
│   └── DhanHQ.ts         # DhanContext + axios instance + APIError
├── types/
│   └── index.ts          # All enums, request/response interfaces
├── rest/
│   ├── orders.ts
│   ├── superOrders.ts
│   ├── foreverOrders.ts
│   ├── portfolio.ts
│   ├── funds.ts
│   ├── statements.ts
│   ├── marketQuotes.ts
│   ├── historical.ts
│   └── traderControl.ts
└── websockets/
    ├── BinaryParser.ts         # Little Endian buffer parser
    ├── OrderUpdateSocket.ts    # JSON order update stream
    ├── MarketFeedSocket.ts     # Binary market feed + ping-pong
    └── FullMarketDepthSocket.ts # Level 3 order book depth
```

---

## License

MIT
