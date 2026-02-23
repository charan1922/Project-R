/**
 * Unit tests for the DhanHQ TypeScript SDK.
 * Tests focus on payload construction and error handling
 * WITHOUT making real API calls (fetch is mocked).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DhanHQ, ExchangeSegment, TransactionType, ProductType, OrderType, Validity, AmoTime, LegName, KillSwitchAction } from './index';
import { DhanValidationError, DhanApiError, DhanAuthError, DhanNetworkError } from './errors';

// ─── Mock fetch globally ───────────────────────────────────────────────────────

function makeMockFetch(status: number, body: unknown) {
    return vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        text: () => Promise.resolve(JSON.stringify(body)),
    } as unknown as Response);
}

let mockFetch: ReturnType<typeof vi.fn>;
let dhan: DhanHQ;

beforeEach(() => {
    dhan = new DhanHQ('TEST_CLIENT', 'TEST_TOKEN', 'sandbox', 5000);
});

afterEach(() => {
    vi.restoreAllMocks();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function capturePayload(): { body: Record<string, unknown>; url: string } {
    const calls = mockFetch.mock.calls;
    expect(calls.length).toBe(1);
    const [url, init] = calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    return { body, url };
}

// ─── placeOrder ──────────────────────────────────────────────────────────────

describe('placeOrder', () => {
    it('includes amoTime in payload when afterMarketOrder is true', async () => {
        mockFetch = makeMockFetch(200, { orderId: 'O1', orderStatus: 'TRANSIT' });
        vi.stubGlobal('fetch', mockFetch);

        await dhan.placeOrder({
            securityId: '1333',
            exchangeSegment: ExchangeSegment.NSE,
            transactionType: TransactionType.BUY,
            quantity: 1,
            orderType: OrderType.LIMIT,
            productType: ProductType.CNC,
            price: 100,
            afterMarketOrder: true,
            amoTime: AmoTime.OPEN_30,
        });

        const { body } = capturePayload();
        expect(body['afterMarketOrder']).toBe(true);
        expect(body['amoTime']).toBe('OPEN_30');
    });

    it('does NOT include amoTime when afterMarketOrder is false', async () => {
        mockFetch = makeMockFetch(200, { orderId: 'O2', orderStatus: 'TRANSIT' });
        vi.stubGlobal('fetch', mockFetch);

        await dhan.placeOrder({
            securityId: '1333',
            exchangeSegment: ExchangeSegment.NSE,
            transactionType: TransactionType.BUY,
            quantity: 1,
            orderType: OrderType.MARKET,
            productType: ProductType.CNC,
            price: 0,
        });

        const { body } = capturePayload();
        expect(body['afterMarketOrder']).toBe(false);
        expect(body).not.toHaveProperty('amoTime');
    });

    it('rejects with DhanValidationError for invalid amoTime', async () => {
        await expect(
            dhan.placeOrder({
                securityId: '1333',
                exchangeSegment: ExchangeSegment.NSE,
                transactionType: TransactionType.BUY,
                quantity: 1,
                orderType: OrderType.LIMIT,
                productType: ProductType.CNC,
                price: 100,
                afterMarketOrder: true,
                amoTime: 'INVALID_TIME',
            })
        ).rejects.toBeInstanceOf(DhanValidationError);
    });

    it('sets tag as correlationId in payload', async () => {
        mockFetch = makeMockFetch(200, { orderId: 'O3', orderStatus: 'TRANSIT' });
        vi.stubGlobal('fetch', mockFetch);

        await dhan.placeOrder({
            securityId: '500325',
            exchangeSegment: ExchangeSegment.NSE,
            transactionType: TransactionType.SELL,
            quantity: 5,
            orderType: OrderType.LIMIT,
            productType: ProductType.CNC,
            price: 150,
            tag: 'MY_TAG_001',
        });

        const { body } = capturePayload();
        expect(body['correlationId']).toBe('MY_TAG_001');
    });

    it('routes to /orders/slicing when slice=true', async () => {
        mockFetch = makeMockFetch(200, { orderId: 'O4', orderStatus: 'TRANSIT' });
        vi.stubGlobal('fetch', mockFetch);

        await dhan.placeOrder({
            securityId: '1333',
            exchangeSegment: ExchangeSegment.NSE,
            transactionType: TransactionType.BUY,
            quantity: 100,
            orderType: OrderType.MARKET,
            productType: ProductType.CNC,
            price: 0,
            slice: true,
        });

        const { url } = capturePayload();
        expect(url).toContain('/orders/slicing');
    });
});

// ─── getTradeBook ─────────────────────────────────────────────────────────────

describe('getTradeBook', () => {
    it('calls /trades (no trailing slash) when no orderId is given', async () => {
        mockFetch = makeMockFetch(200, []);
        vi.stubGlobal('fetch', mockFetch);

        await dhan.getTradeBook();

        const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toMatch(/\/trades$/);
        expect(url).not.toMatch(/\/trades\/$/);
    });

    it('calls /trades/{orderId} when orderId is provided', async () => {
        mockFetch = makeMockFetch(200, []);
        vi.stubGlobal('fetch', mockFetch);

        await dhan.getTradeBook('ORDER_123');

        const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/trades/ORDER_123');
    });
});

// ─── killSwitch ───────────────────────────────────────────────────────────────

describe('killSwitch', () => {
    it('rejects for invalid action', async () => {
        await expect(dhan.killSwitch('PAUSE')).rejects.toBeInstanceOf(DhanValidationError);
    });

    it('accepts ACTIVATE', async () => {
        mockFetch = makeMockFetch(200, { killSwitchStatus: 'ACTIVATED' });
        vi.stubGlobal('fetch', mockFetch);

        const res = await dhan.killSwitch(KillSwitchAction.ACTIVATE);
        expect(res.status).toBe('success');
    });
});

// ─── placeSuperOrder validation ───────────────────────────────────────────────

describe('placeSuperOrder validation', () => {
    it('rejects when price <= 0', async () => {
        await expect(
            dhan.placeSuperOrder({
                securityId: '1333',
                exchangeSegment: ExchangeSegment.NSE,
                transactionType: TransactionType.BUY,
                quantity: 1,
                orderType: OrderType.LIMIT,
                productType: ProductType.CNC,
                price: 0,
                targetPrice: 110,
            })
        ).rejects.toBeInstanceOf(DhanValidationError);
    });

    it('rejects BUY order where targetPrice < price', async () => {
        await expect(
            dhan.placeSuperOrder({
                securityId: '1333',
                exchangeSegment: ExchangeSegment.NSE,
                transactionType: TransactionType.BUY,
                quantity: 1,
                orderType: OrderType.LIMIT,
                productType: ProductType.CNC,
                price: 100,
                targetPrice: 90,   // wrong: must be > price for BUY
                stopLossPrice: 95,
            })
        ).rejects.toBeInstanceOf(DhanValidationError);
    });

    it('accepts valid BUY super order', async () => {
        mockFetch = makeMockFetch(200, { orderId: 'SO1' });
        vi.stubGlobal('fetch', mockFetch);

        const res = await dhan.placeSuperOrder({
            securityId: '1333',
            exchangeSegment: ExchangeSegment.NSE,
            transactionType: TransactionType.BUY,
            quantity: 1,
            orderType: OrderType.LIMIT,
            productType: ProductType.CNC,
            price: 100,
            targetPrice: 120,
            stopLossPrice: 90,
        });
        expect(res.status).toBe('success');
    });
});

// ─── modifySuperOrder validation ──────────────────────────────────────────────

describe('modifySuperOrder', () => {
    it('rejects for invalid legName', async () => {
        await expect(
            dhan.modifySuperOrder('ORDER_1', {
                orderType: OrderType.LIMIT,
                legName: 'PROFIT_LEG',  // invalid
            })
        ).rejects.toBeInstanceOf(DhanValidationError);
    });
});

// ─── HTTP error handling ──────────────────────────────────────────────────────

describe('HTTP error handling', () => {
    it('throws DhanAuthError on 401', async () => {
        mockFetch = makeMockFetch(401, {
            errorCode: 'TOKEN_EXPIRED',
            errorType: 'ACCESS_TOKEN',
            errorMessage: 'Token is expired',
        });
        vi.stubGlobal('fetch', mockFetch);

        await expect(dhan.getOrderList()).rejects.toBeInstanceOf(DhanAuthError);
    });

    it('throws DhanAuthError on 403', async () => {
        mockFetch = makeMockFetch(403, { errorCode: 'PERMISSION_DENIED', errorType: 'ACCESS' });
        vi.stubGlobal('fetch', mockFetch);

        await expect(dhan.getPositions()).rejects.toBeInstanceOf(DhanAuthError);
    });

    it('throws DhanApiError on 422', async () => {
        mockFetch = makeMockFetch(422, { errorCode: 'OMS_ERROR', errorMessage: 'Invalid security', errorType: 'Order' });
        vi.stubGlobal('fetch', mockFetch);

        await expect(
            dhan.placeOrder({
                securityId: 'INVALID',
                exchangeSegment: ExchangeSegment.NSE,
                transactionType: TransactionType.BUY,
                quantity: 1,
                orderType: OrderType.MARKET,
                productType: ProductType.CNC,
                price: 0,
            })
        ).rejects.toBeInstanceOf(DhanApiError);
    });

    it('throws DhanNetworkError with isTimeout=true on timeout', async () => {
        vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
            const err = new DOMException('signal aborted', 'AbortError');
            return Promise.reject(err);
        }));

        try {
            await dhan.getOrderList();
            expect.fail('should have thrown');
        } catch (err) {
            expect(err).toBeInstanceOf(DhanNetworkError);
            expect((err as DhanNetworkError).isTimeout).toBe(true);
        }
    });
});

// ─── historicalDailyData ─────────────────────────────────────────────────────

describe('historicalDailyData', () => {
    it('rejects for invalid expiryCode', async () => {
        await expect(
            dhan.historicalDailyData('1333', ExchangeSegment.NSE, 'EQUITY', '2024-01-01', '2024-02-01', 5 as never)
        ).rejects.toBeInstanceOf(DhanValidationError);
    });
});
