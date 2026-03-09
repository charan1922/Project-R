/**
 * BinaryParser — Little Endian binary packet parser for DhanHQ Market Feed v2.
 *
 * Dhan V2 Binary Protocol (all Little Endian):
 *
 * Header (8 Bytes):
 *   Byte 0:   Feed Response Code (1B)
 *   Bytes 1-2: Total Frame Length (int16 LE) — includes header
 *   Byte 3:   Exchange Segment Code (1B)
 *   Bytes 4-7: Security ID (int32 LE)
 *
 * Quote Payload (42 Bytes, total frame = 50):
 *   0-3:   LTP (float32)
 *   4-5:   LTQ (int16) — Last Traded Quantity
 *   6-9:   LTT (int32) — Last Trade Time (epoch)
 *   10-13: Avg Trade Price (float32)
 *   14-17: Volume (int32)
 *   18-21: Total Sell Qty (int32)
 *   22-25: Total Buy Qty (int32)
 *   26-29: Open (float32)
 *   30-33: Close (float32)
 *   34-37: High (float32)
 *   38-41: Low (float32)
 *
 * Ticker Payload (8 Bytes, total frame = 16):
 *   0-3: LTP (float32)
 *   4-7: LTT (int32)
 */

import { TickerData, QuoteData, FeedResponseCode } from '../types';

export type ParsedFeedPacket = TickerData | QuoteData | null;

const HEADER_SIZE = 8;

export class BinaryParser {

    static parse(buffer: Buffer): ParsedFeedPacket[] {
        const results: ParsedFeedPacket[] = [];
        let offset = 0;

        while (offset < buffer.length) {
            if (buffer.length - offset < HEADER_SIZE) break;

            const respCode = buffer.readUInt8(offset);
            const frameLen = buffer.readUInt16LE(offset + 1);
            const segment = buffer.readUInt8(offset + 3);
            const securityId = buffer.readInt32LE(offset + 4);

            // frameLen is total frame size (header + payload)
            // Sanity: frameLen must be at least header size and fit in buffer
            if (frameLen < HEADER_SIZE || offset + frameLen > buffer.length) {
                break;
            }

            const payload = buffer.subarray(offset + HEADER_SIZE, offset + frameLen);
            results.push(BinaryParser._parseByCode(respCode, payload, segment, securityId));

            offset += frameLen;
        }

        return results;
    }

    private static _parseByCode(code: number, payload: Buffer, segment: number, securityId: number): ParsedFeedPacket {
        switch (code) {
            case FeedResponseCode.TICKER:
                return BinaryParser._parseTicker(payload, segment, securityId);
            case FeedResponseCode.QUOTE:
                return BinaryParser._parseQuote(payload, segment, securityId);
            case FeedResponseCode.PREV_CLOSE:
                // Prev close packet: float32 prevClose + int32 OI — skip for now
                return null;
            default:
                return null;
        }
    }

    private static _parseTicker(payload: Buffer, exchangeSegment: number, securityId: number): TickerData {
        const ltp = payload.length >= 4 ? payload.readFloatLE(0) : 0;
        const ltt = payload.length >= 8 ? payload.readInt32LE(4) : undefined;

        return { type: 'ticker', exchangeSegment, securityId, ltp, ltt };
    }

    private static _parseQuote(payload: Buffer, exchangeSegment: number, securityId: number): QuoteData {
        const readF = (off: number) => payload.length >= off + 4 ? payload.readFloatLE(off) : 0;
        const readI = (off: number) => payload.length >= off + 4 ? payload.readInt32LE(off) : 0;
        const readI16 = (off: number) => payload.length >= off + 2 ? payload.readInt16LE(off) : 0;

        return {
            type: 'quote',
            exchangeSegment,
            securityId,
            ltp: readF(0),
            ltq: readI16(4),
            ltt: readI(6),
            avgPrice: readF(10),
            volume: readI(14),
            totalSellQty: readI(18),
            totalBuyQty: readI(22),
            open: readF(26),
            close: readF(30),
            high: readF(34),
            low: readF(38),
        };
    }
}
