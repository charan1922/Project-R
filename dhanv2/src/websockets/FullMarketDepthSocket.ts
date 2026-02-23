/**
 * FullMarketDepthSocket — Level 3 Order Book Depth WebSocket.
 *
 * Two endpoints:
 * - 20-level depth:  wss://depth-api-feed.dhan.co/twentydepth  (50 instruments max)
 * - 200-level depth: wss://full-depth-api.dhan.co/twohundreddepth (1 instrument max)
 *
 * ## Depth Packet Header (12 bytes, different from standard feed!):
 * | Offset | Size | Type     | Field         |
 * |--------|------|----------|---------------|
 * | 0-1    | 2B   | int16LE  | MessageLength |
 * | 2      | 1B   | int8     | ResponseCode  |
 * | 3      | 1B   | int8     | ExchangeSeg   |
 * | 4-7    | 4B   | int32LE  | SecurityId    |
 * | 8-11   | 4B   | uint32LE | NumRows       |
 *
 * ## Per-depth-level (16 bytes each, after the 12-byte header):
 * | Offset | Size | Type     | Field      |
 * |--------|------|----------|------------|
 * | 0-7    | 8B   | float64  | Price      |
 * | 8-11   | 4B   | uint32   | Quantity   |
 * | 12-15  | 4B   | uint32   | NumOrders  |
 *
 * ResponseCode 41 = Bid packets, 51 = Ask packets.
 *
 * @example
 * ```typescript
 * const depth = new FullMarketDepthSocket('CLIENT', 'TOKEN', '20');
 * depth.on('depth', (data) => console.log(data.bid, data.ask));
 * depth.connect();
 * depth.on('connect', () => {
 *   depth.subscribe([{ exchangeSegment: ExchangeSegment.NSE_EQ, securityId: '1333' }]);
 * });
 * ```
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { FeedInstrument, FullDepthData, DepthLevel, FeedResponseCode } from '../types';

const DEPTH_URL_20 = 'wss://depth-api-feed.dhan.co/twentydepth';
const DEPTH_URL_200 = 'wss://full-depth-api.dhan.co/twohundreddepth';
const SUBSCRIBE_REQUEST_CODE = 23;
const UNSUBSCRIBE_REQUEST_CODE = 24;
const DEPTH_HEADER_SIZE = 12;
const DEPTH_PACKET_SIZE = 16;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1_000;

export type DepthLevel_ = '20' | '200';

export declare interface FullMarketDepthSocket {
    on(event: 'connect', listener: () => void): this;
    on(event: 'depth', listener: (data: FullDepthData) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'close', listener: () => void): this;
}

export class FullMarketDepthSocket extends EventEmitter {
    private ws: WebSocket | null = null;
    private reconnectAttempt = 0;
    private _shouldReconnect = true;
    private readonly url: string;

    constructor(
        private readonly clientId: string,
        private readonly accessToken: string,
        depthLevel: DepthLevel_ = '20'
    ) {
        super();
        this.url = `${depthLevel === '200' ? DEPTH_URL_200 : DEPTH_URL_20}`;
    }

    /** Connect to the full market depth stream. */
    public connect(): void {
        this._shouldReconnect = true;
        this._establish();
    }

    /** Gracefully close the connection. */
    public close(): void {
        this._shouldReconnect = false;
        this.ws?.close();
        this.ws = null;
    }

    /** Subscribe to instruments using RequestCode 23. */
    public subscribe(instruments: FeedInstrument[]): void {
        this._send({
            RequestCode: SUBSCRIBE_REQUEST_CODE,
            InstrumentCount: instruments.length,
            InstrumentList: instruments.map((i) => ({
                ExchangeSegment: i.exchangeSegment,
                SecurityId: i.securityId,
            })),
        });
    }

    /** Unsubscribe from instruments. */
    public unsubscribe(instruments: FeedInstrument[]): void {
        this._send({
            RequestCode: UNSUBSCRIBE_REQUEST_CODE,
            InstrumentCount: instruments.length,
            InstrumentList: instruments.map((i) => ({
                ExchangeSegment: i.exchangeSegment,
                SecurityId: i.securityId,
            })),
        });
    }

    private _establish(): void {
        // Auth via query params (same as market feed)
        const url = `${this.url}?token=${this.accessToken}&clientId=${this.clientId}`;
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'nodebuffer';

        this.ws.on('open', () => {
            this.reconnectAttempt = 0;
            this.emit('connect');
        });

        this.ws.on('ping', () => {
            this.ws?.pong();
        });

        this.ws.on('message', (data: WebSocket.RawData) => {
            if (!Buffer.isBuffer(data)) return;

            const packets = this._parseDepthBuffer(data);
            for (const pkt of packets) {
                this.emit('depth', pkt);
            }
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

    /**
     * Parse the 12-byte depth header and iterate over 16-byte depth-level packets.
     *
     * Handles stacked multi-instrument frames where Bid and Ask packets for multiple
     * instruments are sequentially concatenated in one WebSocket frame.
     */
    private _parseDepthBuffer(buffer: Buffer): FullDepthData[] {
        // Accumulate bid/ask per securityId across packets in the same frame
        const depthMap = new Map<number, { bid: DepthLevel[]; ask: DepthLevel[]; exchangeSegment: number }>();

        let frameOffset = 0;

        while (frameOffset < buffer.length) {
            if (buffer.length - frameOffset < DEPTH_HEADER_SIZE) break;

            // 12-byte header
            const messageLength = buffer.readInt16LE(frameOffset);
            const responseCode = buffer.readInt8(frameOffset + 2);
            const exchangeSeg = buffer.readInt8(frameOffset + 3);
            const securityId = buffer.readInt32LE(frameOffset + 4);
            // numRows at offset 8 (uint32) — used for loop bounds cross-check
            // const numRows = buffer.readUInt32LE(frameOffset + 8);

            if (!depthMap.has(securityId)) {
                depthMap.set(securityId, { bid: [], ask: [], exchangeSegment: exchangeSeg });
            }
            const entry = depthMap.get(securityId)!;

            // Parse 16-byte depth-level packets starting at header end
            let currentOffset = frameOffset + DEPTH_HEADER_SIZE;
            const endOffset = frameOffset + messageLength;

            while (currentOffset + DEPTH_PACKET_SIZE <= endOffset && currentOffset + DEPTH_PACKET_SIZE <= buffer.length) {
                const price = buffer.readDoubleLE(currentOffset);         // float64, 8 bytes
                const quantity = buffer.readUInt32LE(currentOffset + 8);    // uint32, 4 bytes
                const numOrders = buffer.readUInt32LE(currentOffset + 12);   // uint32, 4 bytes

                const level: DepthLevel = { price, quantity, numOrders };

                if (responseCode === FeedResponseCode.BID_PACKET) {
                    entry.bid.push(level);
                } else if (responseCode === FeedResponseCode.ASK_PACKET) {
                    entry.ask.push(level);
                }

                currentOffset += DEPTH_PACKET_SIZE;
            }

            // Advance frame offset: header + total payload
            frameOffset = endOffset > frameOffset ? endOffset : frameOffset + DEPTH_HEADER_SIZE;
        }

        // Convert accumulated map to FullDepthData array
        const results: FullDepthData[] = [];
        for (const [securityId, entry] of depthMap) {
            results.push({
                type: 'depth',
                exchangeSegment: entry.exchangeSegment,
                securityId,
                bid: entry.bid,
                ask: entry.ask,
            });
        }
        return results;
    }

    private _send(data: unknown): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
}
