/**
 * MarketFeedSocket — High-frequency binary market data WebSocket.
 * Endpoint: wss://api-feed.dhan.co?version=2&token=JWT&clientId=ID&authType=2
 *
 * ## Key Protocol Details:
 * - Server pings every 10 seconds; client must pong within 40 seconds.
 * - Max 5 simultaneous connections, 1,000 instruments per connection.
 * - Max 100 instruments per single subscription payload.
 * - All responses are binary Little Endian packets (parsed by BinaryParser).
 *
 * @example
 * ```typescript
 * import { MarketFeedSocket, ExchangeSegment, FeedRequestCode } from 'dhanhq-ts';
 * const feed = new MarketFeedSocket('CLIENT_ID', 'ACCESS_TOKEN');
 * feed.on('ticker', (tick) => console.log(tick));
 * feed.connect();
 * feed.on('connect', () => {
 *   feed.subscribe([{ exchangeSegment: ExchangeSegment.NSE_EQ, securityId: '1333' }], FeedRequestCode.SUBSCRIBE_TICKER);
 * });
 * ```
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { FeedInstrument, FeedRequestCode, TickerData, QuoteData } from '../types';
import { BinaryParser, ParsedFeedPacket } from './BinaryParser';

const FEED_BASE_URL = 'wss://api-feed.dhan.co';
const MAX_INSTRUMENTS_PER_PAYLOAD = 100;
const PING_INTERVAL_MS = 25_000; // Server pings every 10s; we reping every 25s for safety
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1_000;

export declare interface MarketFeedSocket {
    on(event: 'connect', listener: () => void): this;
    on(event: 'ticker', listener: (data: TickerData) => void): this;
    on(event: 'quote', listener: (data: QuoteData) => void): this;
    on(event: 'packet', listener: (data: ParsedFeedPacket) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'close', listener: () => void): this;
}

export class MarketFeedSocket extends EventEmitter {
    private ws: WebSocket | null = null;
    private pingIntervalId: ReturnType<typeof setInterval> | null = null;
    private reconnectAttempt = 0;
    private _shouldReconnect = true;
    private _pendingSubscriptions: Array<{ instruments: FeedInstrument[]; requestCode: FeedRequestCode }> = [];

    constructor(
        private readonly clientId: string,
        private readonly accessToken: string
    ) {
        super();
    }

    /**
     * Connect to the market feed WebSocket.
     * The 'connect' event fires after the TCP connection is opened.
     * Subscribe to instruments in the 'connect' handler.
     */
    public connect(): void {
        this._shouldReconnect = true;
        this._establish();
    }

    /**
     * Gracefully close the connection and stop reconnection attempts.
     */
    public close(): void {
        this._shouldReconnect = false;
        this._clearPing();
        this.ws?.close();
        this.ws = null;
    }

    /**
     * Subscribe to a list of instruments.
     * Automatically batches into payloads of 100 instruments (exchange limit).
     * @param requestCode - Use FeedRequestCode.SUBSCRIBE_TICKER (15), SUBSCRIBE_QUOTE (17), or SUBSCRIBE_DEPTH (19).
     */
    public subscribe(instruments: FeedInstrument[], requestCode: FeedRequestCode = FeedRequestCode.SUBSCRIBE_QUOTE): void {
        for (let i = 0; i < instruments.length; i += MAX_INSTRUMENTS_PER_PAYLOAD) {
            const batch = instruments.slice(i, i + MAX_INSTRUMENTS_PER_PAYLOAD);
            this._send({
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
    public unsubscribe(instruments: FeedInstrument[], requestCode: FeedRequestCode = FeedRequestCode.UNSUBSCRIBE_QUOTE): void {
        for (let i = 0; i < instruments.length; i += MAX_INSTRUMENTS_PER_PAYLOAD) {
            const batch = instruments.slice(i, i + MAX_INSTRUMENTS_PER_PAYLOAD);
            this._send({
                RequestCode: requestCode,
                InstrumentCount: batch.length,
                InstrumentList: batch.map((inst) => ({
                    ExchangeSegment: inst.exchangeSegment,
                    SecurityId: inst.securityId,
                })),
            });
        }
    }

    private _establish(): void {
        const url = `${FEED_BASE_URL}?version=2&token=${this.accessToken}&clientId=${this.clientId}&authType=2`;
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'nodebuffer';

        this.ws.on('open', () => {
            this.reconnectAttempt = 0;
            this._startPing();
            this.emit('connect');
        });

        this.ws.on('ping', () => {
            // Automatically reply with pong to keep the connection alive (40s server timeout)
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

    private _send(data: unknown): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
}
