/**
 * OrderUpdateSocket — Real-time order execution reporting via JSON WebSocket.
 * Endpoint: wss://api-order-update.dhan.co
 *
 * Unlike the high-frequency market feed, this connection communicates in JSON.
 * Authorization uses MsgCode: 42 with UserType: "SELF".
 *
 * @example
 * ```typescript
 * import { OrderUpdateSocket } from 'dhanhq-ts';
 * const socket = new OrderUpdateSocket('CLIENT_ID', 'ACCESS_TOKEN');
 * socket.on('order', (update) => console.log('Update:', update));
 * socket.on('error', (err) => console.error(err));
 * socket.connect();
 * ```
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { OrderUpdateMessage } from '../types';

const ORDER_UPDATE_URL = 'wss://api-order-update.dhan.co';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1_000;

export declare interface OrderUpdateSocket {
    /** Fires when authentication is confirmed and the stream is ready. */
    on(event: 'connect', listener: () => void): this;
    /** Fires on every order status update pushed by the server. */
    on(event: 'order', listener: (update: OrderUpdateMessage) => void): this;
    /** Fires on WebSocket-level errors. */
    on(event: 'error', listener: (error: Error) => void): this;
    /** Fires when the connection is permanently closed after all reconnect attempts. */
    on(event: 'close', listener: () => void): this;
    /** Fires on every raw message (for debugging). */
    on(event: 'message', listener: (data: unknown) => void): this;
}

export class OrderUpdateSocket extends EventEmitter {
    private ws: WebSocket | null = null;
    private reconnectAttempt = 0;
    private _shouldReconnect = true;

    constructor(
        private readonly clientId: string,
        private readonly accessToken: string
    ) {
        super();
    }

    /**
     * Connect to the order update stream and begin receiving real-time updates.
     */
    public connect(): void {
        this._shouldReconnect = true;
        this._establish();
    }

    /**
     * Gracefully close the connection and stop all reconnect attempts.
     */
    public close(): void {
        this._shouldReconnect = false;
        this.ws?.close();
        this.ws = null;
    }

    private _establish(): void {
        this.ws = new WebSocket(ORDER_UPDATE_URL);
        this.ws.binaryType = 'nodebuffer';

        this.ws.on('open', () => {
            this.reconnectAttempt = 0;
            // Send authorization payload as per spec (MsgCode: 42, UserType: SELF)
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

        this.ws.on('message', (data: WebSocket.RawData) => {
            const raw = data.toString();
            let parsed: unknown;

            try {
                parsed = JSON.parse(raw);
            } catch {
                this.emit('message', raw);
                return;
            }

            this.emit('message', parsed);

            // Detect auth confirmation — any message without order-specific fields
            const msg = parsed as Record<string, unknown>;
            if (msg['type'] === 'connection' || msg['MsgCode'] !== undefined) {
                this.emit('connect');
                return;
            }

            // Treat as an order_alert update
            this.emit('order', parsed as OrderUpdateMessage);
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
