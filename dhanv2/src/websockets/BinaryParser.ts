/**
 * BinaryParser — Little Endian binary packet parser for DhanHQ Market Feed.
 *
 * All data from wss://api-feed.dhan.co is transmitted as Little Endian binary
 * buffers for maximum bandwidth efficiency.
 *
 * ## Standard Feed Packet Layout (8-byte header + payload):
 * | Offset | Size | Type    | Field            |
 * |--------|------|---------|------------------|
 * | 0      | 1B   | int8    | ResponseCode     |
 * | 1-2    | 2B   | int16LE | MessageLength    |
 * | 3      | 1B   | int8    | ExchangeSegment  |
 * | 4-7    | 4B   | int32LE | SecurityId       |
 *
 * ResponseCode 2 = Ticker, 4 = Quote / Full pack.
 */

import { TickerData, QuoteData, FeedResponseCode } from '../types';

export type ParsedFeedPacket = TickerData | QuoteData | null;

export class BinaryParser {

    /**
     * Parse a single raw WebSocket buffer from the market feed.
     * Handles multi-instrument stacked packets within one frame by slicing on MessageLength.
     */
    static parse(buffer: Buffer): ParsedFeedPacket[] {
        const results: ParsedFeedPacket[] = [];
        let offset = 0;

        while (offset < buffer.length) {
            if (buffer.length - offset < 8) break; // insufficient header bytes

            const responseCode = buffer.readInt8(offset);
            const messageLength = buffer.readInt16LE(offset + 1);
            const exchangeSegment = buffer.readInt8(offset + 3);
            const securityId = buffer.readInt32LE(offset + 4);

            if (messageLength <= 0 || offset + messageLength > buffer.length + 8) break;

            const packet = buffer.subarray(offset, offset + 8 + messageLength);

            switch (responseCode) {
                case FeedResponseCode.TICKER:
                    results.push(BinaryParser._parseTicker(packet, exchangeSegment, securityId));
                    break;
                case FeedResponseCode.QUOTE:
                    results.push(BinaryParser._parseQuote(packet, exchangeSegment, securityId));
                    break;
                case FeedResponseCode.OI_DATA:
                case FeedResponseCode.PREV_CLOSE:
                case FeedResponseCode.MARKET_STATUS:
                    // Additional packet types — emit as null (consumer can filter)
                    break;
                default:
                    // Unrecognized packet type — skip
                    break;
            }

            // Advance to next packet: 8-byte header + payload
            offset += 8 + messageLength;
        }

        return results;
    }

    /**
     * Parse Ticker packet (ResponseCode 2).
     * Yields: LTP + LTT.
     */
    private static _parseTicker(buf: Buffer, exchangeSegment: number, securityId: number): TickerData {
        // LTP at offset 8 (float32, 4 bytes)
        const ltp = buf.readFloatLE(8);
        // LTT at offset 12 (int32, 4 bytes) — EPOCH seconds
        const ltt = buf.length >= 16 ? buf.readInt32LE(12) : undefined;

        return {
            type: 'ticker',
            exchangeSegment,
            securityId,
            ltp,
            ltt,
        };
    }

    /**
     * Parse Quote / Full packet (ResponseCode 4).
     * Yields: LTP, avg price, volume, bid/ask totals, OHLC.
     *
     * Byte map (from offset 8):
     * 8  - LTP         float32
     * 12 - LTT         int32
     * 16 - Avg Price   float32
     * 20 - Volume      int32
     * 24 - ?           int32 (reserved)
     * 27 - Sell Qty    int32  ← Note: 3-byte gap per spec (offset 27)
     * 31 - Buy Qty     int32
     * 35 - Open        float32
     * 39 - Close       float32
     * 43 - High        float32
     * 47 - Low         float32
     * 51 - Net Change  float32
     * 55 - % Change    float32
     */
    private static _parseQuote(buf: Buffer, exchangeSegment: number, securityId: number): QuoteData {
        const safeReadFloat = (offset: number): number =>
            buf.length > offset + 3 ? buf.readFloatLE(offset) : 0;
        const safeReadInt32 = (offset: number): number =>
            buf.length > offset + 3 ? buf.readInt32LE(offset) : 0;

        return {
            type: 'quote',
            exchangeSegment,
            securityId,
            ltp: safeReadFloat(8),
            ltt: safeReadInt32(12),
            avgPrice: safeReadFloat(16),
            volume: safeReadInt32(20),
            totalSellQty: safeReadInt32(27),
            totalBuyQty: safeReadInt32(31),
            open: safeReadFloat(35),
            close: safeReadFloat(39),
            high: safeReadFloat(43),
            low: safeReadFloat(47),
            netChange: safeReadFloat(51),
            percentChange: safeReadFloat(55),
        };
    }
}
