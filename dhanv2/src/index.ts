/**
 * dhanhq-ts — DhanHQ TypeScript SDK
 * Production-grade 1:1 migration of the Python SDK (v2.2.0).
 *
 * @example
 * ```typescript
 * import { DhanHQClient, ExchangeSegment, TransactionType, ProductType, OrderType, Validity } from 'dhanhq-ts';
 *
 * const dhan = new DhanHQClient('YOUR_CLIENT_ID', 'YOUR_ACCESS_TOKEN');
 *
 * // Place an order
 * const result = await dhan.orders.placeOrder({
 *   transactionType: TransactionType.BUY,
 *   exchangeSegment: ExchangeSegment.NSE_EQ,
 *   productType: ProductType.CNC,
 *   orderType: OrderType.MARKET,
 *   validity: Validity.DAY,
 *   securityId: '1333',
 *   quantity: 1,
 *   price: 0,
 * });
 *
 * // Real-time market feed
 * const feed = dhan.createMarketFeed();
 * feed.on('quote', (tick) => console.log(tick));
 * feed.connect();
 * feed.on('connect', () => {
 *   feed.subscribe([{ exchangeSegment: ExchangeSegment.NSE_EQ, securityId: '1333' }]);
 * });
 * ```
 */

import { DhanHQ, APIError } from './core/DhanHQ';
import { OrdersApi } from './rest/orders';
import { SuperOrdersApi } from './rest/superOrders';
import { ForeverOrdersApi } from './rest/foreverOrders';
import { PortfolioApi } from './rest/portfolio';
import { FundsApi } from './rest/funds';
import { StatementsApi } from './rest/statements';
import { MarketQuotesApi } from './rest/marketQuotes';
import { HistoricalApi } from './rest/historical';
import { TraderControlApi } from './rest/traderControl';
import { OrderUpdateSocket } from './websockets/OrderUpdateSocket';
import { MarketFeedSocket } from './websockets/MarketFeedSocket';
import { FullMarketDepthSocket, DepthLevel_ } from './websockets/FullMarketDepthSocket';

// ─── Composited client ───────────────────────────────────────────────────────

/**
 * Full DhanHQ SDK client — all REST modules and WebSocket factories composed.
 *
 * Mirrors the Python SDK's modularity while preserving the DhanContext
 * credential isolation pattern.
 */
export class DhanHQClient {
    private readonly core: DhanHQ;

    /** Standard & slice order management. */
    public readonly orders: OrdersApi;
    /** Bracket orders (entry + target + stop-loss). */
    public readonly superOrders: SuperOrdersApi;
    /** Forever / GTT orders. */
    public readonly foreverOrders: ForeverOrdersApi;
    /** Holdings, positions, eDIS workflow. */
    public readonly portfolio: PortfolioApi;
    /** Fund limits and margin calculators. */
    public readonly funds: FundsApi;
    /** Ledger and trade history statements. */
    public readonly statements: StatementsApi;
    /** Snapshot market quotes (LTP, OHLC, full depth). */
    public readonly marketQuotes: MarketQuotesApi;
    /** Historical OHLC charts and option chain analytics. */
    public readonly historical: HistoricalApi;
    /** Kill switch, P&L exit, and IP setup. */
    public readonly traderControl: TraderControlApi;

    constructor(
        clientId: string,
        accessToken: string,
        environment: 'prod' | 'sandbox' = 'prod'
    ) {
        this.core = new DhanHQ(clientId, accessToken, environment);
        const http = this.core.http;

        this.orders = new OrdersApi(http, clientId);
        this.superOrders = new SuperOrdersApi(http, clientId);
        this.foreverOrders = new ForeverOrdersApi(http, clientId);
        this.portfolio = new PortfolioApi(http, clientId);
        this.funds = new FundsApi(http, clientId);
        this.statements = new StatementsApi(http);
        this.marketQuotes = new MarketQuotesApi(http);
        this.historical = new HistoricalApi(http);
        this.traderControl = new TraderControlApi(http, clientId);
    }

    // ─── WebSocket factories ─────────────────────────────────────────────────

    /**
     * Create a new real-time order update WebSocket.
     * The socket is not connected until you call `.connect()`.
     */
    createOrderUpdateSocket(): OrderUpdateSocket {
        return new OrderUpdateSocket(this.core.clientId, this._accessToken);
    }

    /**
     * Create a new high-frequency binary market feed WebSocket.
     * - Max 5 simultaneous connections.
     * - Max 1,000 instruments per connection.
     * - Subscription payloads are auto-batched to 100 instruments each.
     */
    createMarketFeed(): MarketFeedSocket {
        return new MarketFeedSocket(this.core.clientId, this._accessToken);
    }

    /**
     * Create a new full market depth WebSocket.
     * @param depthLevel - '20' for 20-level depth (50 instruments), '200' for premium 200-level (1 instrument).
     */
    createMarketDepthFeed(depthLevel: DepthLevel_ = '20'): FullMarketDepthSocket {
        return new FullMarketDepthSocket(this.core.clientId, this._accessToken, depthLevel);
    }

    /** @internal Expose token only to factories, not as a public API. */
    private get _accessToken(): string {
        return (this.core as unknown as { context: { accessToken: string } }).context.accessToken;
    }
}

// ─── Re-exports ──────────────────────────────────────────────────────────────

// Core
export { DhanHQ, APIError };

// REST APIs (for advanced / standalone use)
export { OrdersApi } from './rest/orders';
export { SuperOrdersApi } from './rest/superOrders';
export { ForeverOrdersApi } from './rest/foreverOrders';
export { PortfolioApi } from './rest/portfolio';
export { FundsApi } from './rest/funds';
export { StatementsApi } from './rest/statements';
export { MarketQuotesApi } from './rest/marketQuotes';
export { HistoricalApi } from './rest/historical';
export { TraderControlApi } from './rest/traderControl';
export type { SecurityMap, LtpData, OhlcData, QuoteDepthData } from './rest/marketQuotes';
export type { OhlcCandle, HistoricalDataResponse } from './rest/historical';

// WebSockets
export { OrderUpdateSocket } from './websockets/OrderUpdateSocket';
export { MarketFeedSocket } from './websockets/MarketFeedSocket';
export { FullMarketDepthSocket } from './websockets/FullMarketDepthSocket';
export { BinaryParser } from './websockets/BinaryParser';
export type { ParsedFeedPacket } from './websockets/BinaryParser';
export type { DepthLevel_ } from './websockets/FullMarketDepthSocket';

// All enums, types, and interfaces
export * from './types';
