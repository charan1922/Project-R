/**
 * MarketFeedSocket — High-frequency binary market data WebSocket.
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { FeedInstrument, FeedRequestCode, TickerData, QuoteData } from '../types';
import { BinaryParser, ParsedFeedPacket } from './BinaryParser';

const FEED_BASE_URL = 'wss://api-feed.dhan.co';
const MAX_INSTRUMENTS_PER_PAYLOAD = 100;
const PING_INTERVAL_MS = 25_000;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1_000;
const TAG = '[MarketFeedSocket]';

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

    public connect(): void {
        this._shouldReconnect = true;
        this._establish();
    }

    public close(): void {
        this._shouldReconnect = false;
        this._clearPing();
        this.ws?.close();
        this.ws = null;
    }

    public subscribe(instruments: FeedInstrument[], requestCode: FeedRequestCode = FeedRequestCode.SUBSCRIBE_QUOTE): void {
        if (this.ws?.readyState !== WebSocket.OPEN) {
            this._pendingSubscriptions.push({ instruments, requestCode });
            return;
        }

        for (let i = 0; i < instruments.length; i += MAX_INSTRUMENTS_PER_PAYLOAD) {
            const batch = instruments.slice(i, i + MAX_INSTRUMENTS_PER_PAYLOAD);
            const payload = {
                RequestCode: requestCode,
                InstrumentCount: batch.length,
                InstrumentList: batch.map((inst) => ({
                    ExchangeSegment: inst.exchangeSegment,
                    SecurityId: inst.securityId,
                })),
            };
            console.log(`${TAG} subscribe payload:`, JSON.stringify(payload));
            this._send(payload);
        }
    }

    public unsubscribe(instruments: FeedInstrument[], requestCode: FeedRequestCode = FeedRequestCode.UNSUBSCRIBE_QUOTE): void {
        if (this.ws?.readyState !== WebSocket.OPEN) return;

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
            console.log(`${TAG} WebSocket connected`);
            this.reconnectAttempt = 0;
            this._startPing();

            if (this._pendingSubscriptions.length > 0) {
                const subscriptions = [...this._pendingSubscriptions];
                this._pendingSubscriptions = [];
                subscriptions.forEach(sub => this.subscribe(sub.instruments, sub.requestCode));
            }

            this.emit('connect');
        });

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
            console.error(`${TAG} error:`, err.message);
            this.emit('error', err);
        });

        this.ws.on('close', (code) => {
            console.log(`${TAG} closed (code: ${code})`);
            this._clearPing();
            if (this._shouldReconnect && this.reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
                const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempt);
                this.reconnectAttempt++;
                console.log(`${TAG} reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);
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
