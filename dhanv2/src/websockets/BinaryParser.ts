/**
 * BinaryParser — Little Endian binary packet parser for DhanHQ Market Feed v2.
 * 
 * Documentation Reference (v2):
 * - Header Size: 12 Bytes
 * - Byte 1-2: Message Length (int16)
 * - Byte 3: Feed Response Code (int8)
 * - Byte 4: Exchange Segment (int8)
 * - Byte 5-8: Security ID (int32)
 * - Byte 9-12: Message Sequence (int32)
 * 
 * Payload follows the 12-byte header.
 */

import { TickerData, QuoteData, FeedResponseCode } from '../types';

export type ParsedFeedPacket = TickerData | QuoteData | null;

export class BinaryParser {

    /**
     * Parse a raw WebSocket buffer.
     * Handles stacked packets within one frame by slicing on Header (12B) + MessageLength.
     */
    static parse(buffer: Buffer): ParsedFeedPacket[] {
        const results: ParsedFeedPacket[] = [];
        let offset = 0;

        while (offset < buffer.length) {
            // Check for minimum header size (12 bytes)
            if (buffer.length - offset < 12) break;

            const messageLength = buffer.readInt16LE(offset); // Bytes 1-2
            const responseCode = buffer.readInt8(offset + 2); // Byte 3
            const exchangeSegment = buffer.readInt8(offset + 3); // Byte 4
            const securityId = buffer.readInt32LE(offset + 4); // Bytes 5-8
            // Bytes 9-12 are Sequence Number (skipped)

            // The payload starts at offset + 12
            // Total packet size per Dhan V2 = 12 (header) + messageLength (payload)
            const totalPacketSize = 12 + messageLength;
            
            if (offset + totalPacketSize > buffer.length) break;

            const payload = buffer.subarray(offset + 12, offset + totalPacketSize);

            switch (responseCode) {
                case FeedResponseCode.TICKER:
                    results.push(BinaryParser._parseTicker(payload, exchangeSegment, securityId));
                    break;
                case FeedResponseCode.QUOTE:
                    results.push(BinaryParser._parseQuote(payload, exchangeSegment, securityId));
                    break;
                default:
                    // Other types like Depth (20/200 level) or OI
                    break;
            }

            offset += totalPacketSize;
        }

        return results;
    }

    /**
     * Parse Ticker payload.
     */
    private static _parseTicker(payload: Buffer, exchangeSegment: number, securityId: number): TickerData {
        // Ticker Payload usually: LTP (4B Float) + LTT (4B Int)
        const ltp = payload.length >= 4 ? payload.readFloatLE(0) : 0;
        const ltt = payload.length >= 8 ? payload.readInt32LE(4) : undefined;

        return {
            type: 'ticker',
            exchangeSegment,
            securityId,
            ltp,
            ltt,
        };
    }

    /**
     * Parse Quote / Full payload (ResponseCode 4).
     * Byte map within Payload (from offset 0):
     * 0  - LTP         float32
     * 4  - LTT         int32
     * 8  - Avg Price   float32
     * 12 - Volume      int32
     * 16 - ?           int32 (reserved)
     * 20 - Sell Qty    int32
     * 24 - Buy Qty     int32
     * 28 - Open        float32
     * 32 - Close       float32
     * 36 - High        float32
     * 40 - Low         float32
     */
    private static _parseQuote(payload: Buffer, exchangeSegment: number, securityId: number): QuoteData {
        const readF = (off: number) => payload.length >= off + 4 ? payload.readFloatLE(off) : 0;
        const readI = (off: number) => payload.length >= off + 4 ? payload.readInt32LE(off) : 0;

        return {
            type: 'quote',
            exchangeSegment,
            securityId,
            ltp: readF(0),
            ltt: readI(4),
            avgPrice: readF(8),
            volume: readI(12),
            totalSellQty: readI(20),
            totalBuyQty: readI(24),
            open: readF(28),
            close: readF(32),
            high: readF(36),
            low: readF(40),
        };
    }
}
