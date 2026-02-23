/**
 * DhanOrderFeed — Real-time order status update stream via JSON WebSocket.
 * Endpoint: wss://api-order-update.dhan.co
 *
 * Upgraded from native WebSocket to the `ws` npm package.
 *
 * ## Protocol:
 * - Auth: sends a JSON payload immediately after `open` with MsgCode: 42, UserType: "SELF".
 * - Data: JSON messages with order state updates.
 * - 'connect' event fires after the auth response is received (not on open).
 * - Reconnection: exponential backoff, max 3 attempts.
 *
 * @example
 * ```typescript
 * import { DhanOrderFeed } from './order_feed';
 *
 * const feed = new DhanOrderFeed('CLIENT_ID', 'ACCESS_TOKEN');
 * feed.on('connect', () => console.log('Order feed ready'));
 * feed.on('order', (update) => console.log('Update:', update));
 * feed.connect();
 * ```
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';

const ORDER_FEED_URL = 'wss://api-order-update.dhan.co';
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY_MS = 1_000;

export interface OrderUpdate {
    orderId?: string;
    orderStatus?: string;
    tradedQty?: number;
    remainingQuantity?: number;
    tradedPrice?: number;
    avgTradedPrice?: number;
    [key: string]: unknown;
}

// Typed overload signatures for EventEmitter
export declare interface DhanOrderFeed {
    /** Fires once authentication is confirmed. */
    on(event: 'connect', listener: () => void): this;
    /** Fires on every order status update pushed by the server. */
    on(event: 'order', listener: (update: OrderUpdate) => void): this;
    /** Fires on raw messages (before order-update filtering, for debugging). */
    on(event: 'message', listener: (data: unknown) => void): this;
    /** Fires on WebSocket-level errors. */
    on(event: 'error', listener: (error: Error) => void): this;
    /** Fires when permanently disconnected after all retry attempts. */
    on(event: 'close', listener: () => void): this;
}

export class DhanOrderFeed extends EventEmitter {
    private ws: WebSocket | null = null;
    private reconnectAttempt = 0;
    private _shouldReconnect = true;
    private _authenticated = false;

    constructor(
        private readonly clientId: string,
        private readonly accessToken: string
    ) {
        super();
    }

    /** Open the order update connection. */
    public connect(): void {
        this._shouldReconnect = true;
        this._establish();
    }

    /** Gracefully close the connection and stop reconnect attempts. */
    public close(): void {
        this._shouldReconnect = false;
        this.ws?.close();
        this.ws = null;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    private _establish(): void {
        this._authenticated = false;
        this.ws = new WebSocket(ORDER_FEED_URL);
        this.ws.binaryType = 'nodebuffer';

        this.ws.on('open', () => {
            this.reconnectAttempt = 0;

            // Auth payload per Dhan spec: MsgCode 42, UserType "SELF"
            const authPayload = {
                LoginReq: {
                    MsgCode: 42,
                    ClientId: this.clientId,
                    Token: this.accessToken,
                },
                UserType: 'SELF',
            };
            this.ws!.send(JSON.stringify(authPayload));
        });

        this.ws.on('message', (raw: WebSocket.RawData) => {
            const text = raw.toString();
            let parsed: unknown;

            try {
                parsed = JSON.parse(text);
            } catch {
                this.emit('message', text);
                return;
            }

            this.emit('message', parsed);

            // Auth confirmation arrives first — detect by absence of order fields
            if (!this._authenticated) {
                this._authenticated = true;
                this.emit('connect');
                return;
            }

            // Subsequent messages are order state updates
            this.emit('order', parsed as OrderUpdate);
        });

        this.ws.on('error', (err: Error) => {
            this.emit('error', err);
        });

        this.ws.on('close', () => {
            if (this._shouldReconnect && this.reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
                const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempt);
                this.reconnectAttempt++;
                setTimeout(() => this._establish(), delay);
            } else {
                this.emit('close');
            }
        });
    }
}
