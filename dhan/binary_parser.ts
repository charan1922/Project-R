/**
 * BinaryParser — Little Endian binary packet parser for DhanHQ Market Feed v2.
 *
 * All data from wss://api-feed.dhan.co is transmitted as Little Endian binary
 * Node.js Buffers for maximum bandwidth efficiency.
 *
 * ## Standard Feed Packet Layout:
 * ```
 * ┌─────────┬───────────┬──────────────────┬────────────┬─────────────────────┐
 * │ Byte 0  │ Bytes 1-2 │ Byte 3           │ Bytes 4-7  │ Bytes 8+            │
 * │ int8    │ int16LE   │ int8             │ int32LE    │ payload (varies)    │
 * │ Code    │ MsgLength │ ExchangeSegment  │ SecurityId │ price/volume etc.   │
 * └─────────┴───────────┴──────────────────┴────────────┴─────────────────────┘
 * ```
 *
 * ## Response codes:
 * - 2  → Ticker (LTP + LTT, 8-byte payload)
 * - 4  → Quote  (LTP, avg, volume, OHLC, etc., ~56-byte payload)
 */

import { TickerData, QuoteData, FeedResponseCode } from './sdk-types';

export type ParsedFeedPacket = TickerData | QuoteData | null;

const HEADER_SIZE = 8; // bytes

export class BinaryParser {
    /**
     * Parse one or more stacked binary packets from a single WebSocket frame.
     * The loop advances by (HEADER_SIZE + MessageLength) per packet to handle
     * multi-instrument frames where packets are concatenated.
     */
    static parse(buffer: Buffer): ParsedFeedPacket[] {
        const results: ParsedFeedPacket[] = [];
        let offset = 0;

        while (offset < buffer.length) {
            if (buffer.length - offset < HEADER_SIZE) break;

            const responseCode = buffer.readInt8(offset);
            const messageLength = buffer.readInt16LE(offset + 1);
            const exchangeSegment = buffer.readInt8(offset + 3);
            const securityId = buffer.readInt32LE(offset + 4);

            if (messageLength <= 0) break;

            const totalPacketEnd = offset + HEADER_SIZE + messageLength;
            if (totalPacketEnd > buffer.length) break;

            const packet = buffer.subarray(offset, totalPacketEnd);

            switch (responseCode as FeedResponseCode) {
                case FeedResponseCode.TICKER:
                    results.push(BinaryParser._parseTicker(packet, exchangeSegment, securityId));
                    break;
                case FeedResponseCode.QUOTE:
                    results.push(BinaryParser._parseQuote(packet, exchangeSegment, securityId));
                    break;
                default:
                    // OI_DATA (6), PREV_CLOSE (8), MARKET_STATUS (50) — skip for now
                    break;
            }

            offset = totalPacketEnd;
        }

        return results;
    }

    /**
     * Ticker packet layout (ResponseCode = 2):
     * Offset 8:  LTP  float32 (4 bytes)
     * Offset 12: LTT  int32   (4 bytes, EPOCH seconds)
     */
    private static _parseTicker(buf: Buffer, exchangeSegment: number, securityId: number): TickerData {
        return {
            type: 'ticker',
            exchangeSegment,
            securityId,
            ltp: buf.length >= HEADER_SIZE + 4 ? buf.readFloatLE(HEADER_SIZE) : 0,
            ltt: buf.length >= HEADER_SIZE + 8 ? buf.readInt32LE(HEADER_SIZE + 4) : undefined,
        };
    }

    /**
     * Quote / Full packet layout (ResponseCode = 4):
     * Offset 8:  LTP         float32
     * Offset 12: LTT         int32
     * Offset 16: Avg Price   float32
     * Offset 20: Volume      int32
     * Offset 24: (reserved)  int32
     * Offset 27: Sell Qty    int32  ← 3-byte gap from spec
     * Offset 31: Buy Qty     int32
     * Offset 35: Open        float32
     * Offset 39: Close       float32
     * Offset 43: High        float32
     * Offset 47: Low         float32
     * Offset 51: Net Change  float32
     * Offset 55: % Change    float32
     */
    private static _parseQuote(buf: Buffer, exchangeSegment: number, securityId: number): QuoteData {
        const rf = (o: number): number => buf.length > o + 3 ? buf.readFloatLE(o) : 0;
        const ri = (o: number): number => buf.length > o + 3 ? buf.readInt32LE(o) : 0;

        return {
            type: 'quote',
            exchangeSegment,
            securityId,
            ltp: rf(8),
            ltt: ri(12),
            avgPrice: rf(16),
            volume: ri(20),
            totalSellQty: ri(27),
            totalBuyQty: ri(31),
            open: rf(35),
            close: rf(39),
            high: rf(43),
            low: rf(47),
            netChange: rf(51),
            percentChange: rf(55),
        };
    }
}
