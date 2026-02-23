import { describe, it, expect } from 'vitest';
import { BinaryParser } from '../../src/websockets/BinaryParser.js';

// ─── Helpers to build binary test packets ────────────────────────────────────

/**
 * Build a Ticker packet (ResponseCode = 2).
 * Layout: [int8 code][int16LE msgLen][int8 seg][int32LE secId][float32 ltp][int32LE ltt]
 * Total = 1+2+1+4 = 8 header bytes + 8 payload = 16 bytes
 */
function buildTickerPacket(options: {
    exchangeSegment?: number;
    securityId?: number;
    ltp?: number;
    ltt?: number;
}): Buffer {
    const { exchangeSegment = 1, securityId = 1333, ltp = 1800.5, ltt = 1700000000 } = options;
    const buf = Buffer.alloc(16);
    buf.writeInt8(2, 0);              // ResponseCode = Ticker
    buf.writeInt16LE(8, 1);           // MessageLength = 8 payload bytes
    buf.writeInt8(exchangeSegment, 3);
    buf.writeInt32LE(securityId, 4);
    buf.writeFloatLE(ltp, 8);
    buf.writeInt32LE(ltt, 12);
    return buf;
}

/**
 * Build a Quote packet (ResponseCode = 4) — minimal 64-byte packet.
 */
function buildQuotePacket(options: {
    exchangeSegment?: number;
    securityId?: number;
    ltp?: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
}): Buffer {
    const { exchangeSegment = 1, securityId = 1333, ltp = 1850, open = 1800, high = 1900, low = 1790, close = 1840 } = options;
    const payloadLen = 56; // 64 total - 8 header
    const buf = Buffer.alloc(8 + payloadLen, 0);
    buf.writeInt8(4, 0);              // ResponseCode = Quote
    buf.writeInt16LE(payloadLen, 1);
    buf.writeInt8(exchangeSegment, 3);
    buf.writeInt32LE(securityId, 4);
    buf.writeFloatLE(ltp, 8);
    buf.writeInt32LE(1700000001, 12);  // ltt
    buf.writeFloatLE(1820, 16);        // avg price
    buf.writeInt32LE(50000, 20);       // volume
    // gap bytes 24-26
    buf.writeInt32LE(1000, 27);        // totalSellQty
    buf.writeInt32LE(2000, 31);        // totalBuyQty
    buf.writeFloatLE(open, 35);
    buf.writeFloatLE(close, 39);
    buf.writeFloatLE(high, 43);
    buf.writeFloatLE(low, 47);
    buf.writeFloatLE(50, 51);          // netChange
    buf.writeFloatLE(2.78, 55);        // percentChange
    return buf;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BinaryParser.parse()', () => {
    describe('Ticker packets (ResponseCode 2)', () => {
        it('parses exchangeSegment and securityId from header', () => {
            const buf = buildTickerPacket({ exchangeSegment: 3, securityId: 2885 });
            const packets = BinaryParser.parse(buf);
            expect(packets).toHaveLength(1);
            expect(packets[0]).toMatchObject({ type: 'ticker', exchangeSegment: 3, securityId: 2885 });
        });

        it('parses LTP as float32', () => {
            const buf = buildTickerPacket({ ltp: 1800.5 });
            const [pkt] = BinaryParser.parse(buf);
            if (pkt?.type !== 'ticker') throw new Error('Expected ticker');
            expect(pkt.ltp).toBeCloseTo(1800.5, 1);
        });

        it('parses LTT (epoch seconds) as int32', () => {
            const buf = buildTickerPacket({ ltt: 1700000000 });
            const [pkt] = BinaryParser.parse(buf);
            if (pkt?.type !== 'ticker') throw new Error('Expected ticker');
            expect(pkt.ltt).toBe(1700000000);
        });
    });

    describe('Quote packets (ResponseCode 4)', () => {
        it('parses type as "quote"', () => {
            const buf = buildQuotePacket({});
            const [pkt] = BinaryParser.parse(buf);
            expect(pkt?.type).toBe('quote');
        });

        it('parses OHLC values', () => {
            const buf = buildQuotePacket({ open: 1800, high: 1920, low: 1770, close: 1860 });
            const [pkt] = BinaryParser.parse(buf);
            if (pkt?.type !== 'quote') throw new Error('Expected quote');
            expect(pkt.open).toBeCloseTo(1800, 0);
            expect(pkt.high).toBeCloseTo(1920, 0);
            expect(pkt.low).toBeCloseTo(1770, 0);
            expect(pkt.close).toBeCloseTo(1860, 0);
        });

        it('parses bid/ask total quantities', () => {
            const buf = buildQuotePacket({});
            const [pkt] = BinaryParser.parse(buf);
            if (pkt?.type !== 'quote') throw new Error('Expected quote');
            expect(pkt.totalSellQty).toBe(1000);
            expect(pkt.totalBuyQty).toBe(2000);
        });

        it('parses volume', () => {
            const buf = buildQuotePacket({});
            const [pkt] = BinaryParser.parse(buf);
            if (pkt?.type !== 'quote') throw new Error('Expected quote');
            expect(pkt.volume).toBe(50000);
        });
    });

    describe('Multi-packet frames (stacked)', () => {
        it('parses two consecutive ticker packets from one buffer', () => {
            const t1 = buildTickerPacket({ securityId: 1333, ltp: 1800 });
            const t2 = buildTickerPacket({ securityId: 2885, ltp: 2500 });
            const combined = Buffer.concat([t1, t2]);
            const packets = BinaryParser.parse(combined);
            expect(packets).toHaveLength(2);
            expect(packets[0]).toMatchObject({ securityId: 1333 });
            expect(packets[1]).toMatchObject({ securityId: 2885 });
        });

        it('parses ticker + quote from one buffer', () => {
            const t1 = buildTickerPacket({});
            const q1 = buildQuotePacket({});
            const combined = Buffer.concat([t1, q1]);
            const packets = BinaryParser.parse(combined);
            expect(packets[0]?.type).toBe('ticker');
            expect(packets[1]?.type).toBe('quote');
        });
    });

    describe('Edge cases', () => {
        it('returns empty array for zero-byte buffer', () => {
            expect(BinaryParser.parse(Buffer.alloc(0))).toEqual([]);
        });

        it('returns empty array for buffer shorter than header (< 8 bytes)', () => {
            expect(BinaryParser.parse(Buffer.alloc(4))).toEqual([]);
        });

        it('skips unknown response codes', () => {
            const buf = Buffer.alloc(16, 0);
            buf.writeInt8(99, 0);  // Unknown code
            buf.writeInt16LE(8, 1);
            const packets = BinaryParser.parse(buf);
            expect(packets).toHaveLength(0);
        });

        it('stops parsing if messageLength causes out-of-bounds read', () => {
            const buf = Buffer.alloc(10);
            buf.writeInt8(2, 0);
            buf.writeInt16LE(200, 1); // claims 200 bytes but buffer only 10
            const packets = BinaryParser.parse(buf);
            expect(packets).toHaveLength(0);
        });
    });
});
