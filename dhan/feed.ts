/**
 * DhanFeed — Binary WebSocket market data feed (Market Feed v2).
 * Endpoint: wss://api-feed.dhan.co
 *
 * Upgraded from native WebSocket to the `ws` npm package.
 *
 * ## Protocol:
 * - Auth: token + clientId embedded in URL query params (authType=2).
 * - Data: Little Endian binary packets parsed by `BinaryParser`.
 * - Keep-alive: Server pings every 10s; client must pong within 40s.
 *   This class pings every 25s + auto-replies to server pings.
 * - Subscription payloads: auto-batched to max 100 instruments each.
 * - Reconnection: exponential backoff, max 3 attempts.
 *
 * @example
 * ```typescript
 * import { DhanFeed, ExchangeSegment, FeedRequestCode } from './index';
 *
 * const feed = new DhanFeed('CLIENT_ID', 'ACCESS_TOKEN');
 * feed.on('connect', () => {
 *   feed.subscribe([{ exchangeSegment: ExchangeSegment.NSE, securityId: '1333' }]);
 * });
 * feed.on('ticker', (tick) => console.log('LTP:', tick.ltp));
 * feed.on('quote',  (q) => console.log('OHLC:', q.open, q.close));
 * feed.connect();
 * ```
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { FeedInstrument, FeedRequestCode, TickerData, QuoteData } from './sdk-types';
import { BinaryParser, ParsedFeedPacket } from './binary_parser';

const FEED_URL = 'wss://api-feed.dhan.co';
const MAX_INSTRUMENTS_PER_PAYLOAD = 100;
const PING_INTERVAL_MS = 25_000;   // server times out at 40s
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY_MS = 1_000;

// Typed overload signatures for EventEmitter
export declare interface DhanFeed {
    /** Fires when the WebSocket connection is open and ready. */
    on(event: 'connect', listener: () => void): this;
    /** Fires for every Ticker packet (LTP update). */
    on(event: 'ticker', listener: (data: TickerData) => void): this;
    /** Fires for every Quote/Full packet (OHLC + volume). */
    on(event: 'quote', listener: (data: QuoteData) => void): this;
    /** Fires for every successfully parsed packet (ticker or quote). */
    on(event: 'packet', listener: (data: ParsedFeedPacket) => void): this;
    /** Fires on WebSocket-level errors. */
    on(event: 'error', listener: (error: Error) => void): this;
    /** Fires when the connection is permanently closed. */
    on(event: 'close', listener: () => void): this;
}

export class DhanFeed extends EventEmitter {
    private ws: WebSocket | null = null;
    private pingIntervalId: ReturnType<typeof setInterval> | null = null;
    private reconnectAttempt = 0;
    private _shouldReconnect = true;

    constructor(
        private readonly clientId: string,
        private readonly accessToken: string
    ) {
        super();
    }

    /** Open the market feed connection. Subscribe in the 'connect' handler. */
    public connect(): void {
        this._shouldReconnect = true;
        this._establish();
    }

    /** Gracefully close the connection and stop reconnect attempts. */
    public close(): void {
        this._shouldReconnect = false;
        this._clearPing();
        this.ws?.close();
        this.ws = null;
    }

    /**
     * Subscribe to a list of instruments.
     * Automatically batches into payloads of 100 instruments (exchange hard limit).
     * @param instruments - Array of { exchangeSegment, securityId } objects.
     * @param requestCode - FeedRequestCode.SUBSCRIBE_TICKER (15), SUBSCRIBE_QUOTE (17), or SUBSCRIBE_DEPTH (19).
     * @default requestCode = FeedRequestCode.SUBSCRIBE_QUOTE
     */
    public subscribe(
        instruments: FeedInstrument[],
        requestCode: FeedRequestCode = FeedRequestCode.SUBSCRIBE_QUOTE
    ): void {
        for (let i = 0; i < instruments.length; i += MAX_INSTRUMENTS_PER_PAYLOAD) {
            const batch = instruments.slice(i, i + MAX_INSTRUMENTS_PER_PAYLOAD);
            this._sendJson({
                RequestCode: requestCode,
                InstrumentCount: batch.length,
                InstrumentList: batch.map((inst) => ({
                    ExchangeSegment: inst.exchangeSegment,
                    SecurityId: inst.securityId,
                })),
            });
        }
    }

    /**
     * Unsubscribe from a list of instruments.
     */
    public unsubscribe(
        instruments: FeedInstrument[],
        requestCode: FeedRequestCode = FeedRequestCode.UNSUBSCRIBE_QUOTE
    ): void {
        for (let i = 0; i < instruments.length; i += MAX_INSTRUMENTS_PER_PAYLOAD) {
            const batch = instruments.slice(i, i + MAX_INSTRUMENTS_PER_PAYLOAD);
            this._sendJson({
                RequestCode: requestCode,
                InstrumentCount: batch.length,
                InstrumentList: batch.map((inst) => ({
                    ExchangeSegment: inst.exchangeSegment,
                    SecurityId: inst.securityId,
                })),
            });
        }
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    private _establish(): void {
        // Auth via URL params (version=2, authType=2 per Dhan API docs)
        const url = `${FEED_URL}?version=2&token=${this.accessToken}&clientId=${this.clientId}&authType=2`;
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'nodebuffer';

        this.ws.on('open', () => {
            this.reconnectAttempt = 0;
            this._startPing();
            this.emit('connect');
        });

        // Auto-reply to server pings to avoid 40s timeout disconnect
        this.ws.on('ping', () => {
            this.ws?.pong();
        });

        this.ws.on('message', (data: WebSocket.RawData) => {
            if (!Buffer.isBuffer(data)) return;

            const packets = BinaryParser.parse(data);
            for (const pkt of packets) {
                if (pkt === null) continue;
                this.emit('packet', pkt);
                if (pkt.type === 'ticker') {
                    this.emit('ticker', pkt as TickerData);
                } else if (pkt.type === 'quote') {
                    this.emit('quote', pkt as QuoteData);
                }
            }
        });

        this.ws.on('error', (err: Error) => {
            this.emit('error', err);
        });

        this.ws.on('close', () => {
            this._clearPing();
            if (this._shouldReconnect && this.reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
                const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempt);
                this.reconnectAttempt++;
                setTimeout(() => this._establish(), delay);
            } else {
                this.emit('close');
            }
        });
    }

    private _startPing(): void {
        this._clearPing();
        this.pingIntervalId = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.ping();
            }
        }, PING_INTERVAL_MS);
    }

    private _clearPing(): void {
        if (this.pingIntervalId !== null) {
            clearInterval(this.pingIntervalId);
            this.pingIntervalId = null;
        }
    }

    private _sendJson(data: unknown): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
}
