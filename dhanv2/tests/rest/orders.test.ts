import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import { OrdersApi } from '../../src/rest/orders.js';
import {
    ExchangeSegment, TransactionType, ProductType, OrderType, Validity, LegName,
} from '../../src/types/index.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function mockHttp(): AxiosInstance {
    return {
        get: vi.fn().mockResolvedValue({ data: {} }),
        post: vi.fn().mockResolvedValue({ data: {} }),
        put: vi.fn().mockResolvedValue({ data: {} }),
        delete: vi.fn().mockResolvedValue({ data: {} }),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    } as unknown as AxiosInstance;
}

const BASE_ORDER = {
    securityId: '1333',
    exchangeSegment: ExchangeSegment.NSE_EQ,
    transactionType: TransactionType.BUY,
    productType: ProductType.CNC,
    orderType: OrderType.LIMIT,
    validity: Validity.DAY,
    quantity: 1,
    price: 1800,
};

// ─── tests ────────────────────────────────────────────────────────────────────

describe('OrdersApi', () => {
    let http: AxiosInstance;
    let api: OrdersApi;

    beforeEach(() => {
        http = mockHttp();
        api = new OrdersApi(http, 'CLIENT_1');
    });

    describe('placeOrder', () => {
        it('POSTs to /orders with the order payload', async () => {
            await api.placeOrder(BASE_ORDER);
            expect(http.post).toHaveBeenCalledWith('/orders', expect.objectContaining({
                securityId: '1333',
                dhanClientId: 'CLIENT_1',
            }));
        });
    });

    describe('placeSliceOrder', () => {
        it('POSTs to /orders/slicing', async () => {
            await api.placeSliceOrder(BASE_ORDER);
            expect(http.post).toHaveBeenCalledWith('/orders/slicing', expect.objectContaining({
                securityId: '1333',
            }));
        });
    });

    describe('modifyOrder', () => {
        it('PUTs to /orders/{id}', async () => {
            await api.modifyOrder('ORD123', {
                orderType: OrderType.LIMIT,
                legName: LegName.ENTRY_LEG,
                quantity: 1,
                price: 1850,
                disclosedQuantity: 0,
                triggerPrice: 0,
                validity: Validity.DAY,
            });
            expect(http.put).toHaveBeenCalledWith('/orders/ORD123', expect.objectContaining({
                dhanClientId: 'CLIENT_1',
            }));
        });
    });

    describe('cancelOrder', () => {
        it('DELETEs /orders/{id}', async () => {
            await api.cancelOrder('ORD123');
            expect(http.delete).toHaveBeenCalledWith('/orders/ORD123');
        });
    });

    describe('getOrderList', () => {
        it('GETs /orders', async () => {
            vi.mocked(http.get).mockResolvedValueOnce({ data: [] } as any);
            const result = await api.getOrderList();
            expect(http.get).toHaveBeenCalledWith('/orders');
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('getOrderById', () => {
        it('GETs /orders/{id}', async () => {
            await api.getOrderById('ORD_XYZ');
            expect(http.get).toHaveBeenCalledWith('/orders/ORD_XYZ');
        });
    });

    describe('getOrderByCorrelationId', () => {
        it('GETs /orders/external/{correlationId}', async () => {
            await api.getOrderByCorrelationId('MY_TAG');
            expect(http.get).toHaveBeenCalledWith('/orders/external/MY_TAG');
        });
    });

    describe('getTradeBook', () => {
        it('GETs /trades and returns array', async () => {
            vi.mocked(http.get).mockResolvedValueOnce({ data: [{ tradeId: 't1' }] } as any);
            const result = await api.getTradeBook();
            expect(http.get).toHaveBeenCalledWith('/trades');
            expect(result[0]).toEqual({ tradeId: 't1' });
        });
    });

    describe('getTradeHistory', () => {
        it('GETs /trades/{from}/{to}/{page}', async () => {
            vi.mocked(http.get).mockResolvedValueOnce({ data: [] } as any);
            await api.getTradeHistory('2026-01-01', '2026-01-31', 0);
            expect(http.get).toHaveBeenCalledWith('/trades/2026-01-01/2026-01-31/0');
        });
    });

    describe('error handling', () => {
        it('re-throws errors from axios', async () => {
            vi.mocked(http.get).mockRejectedValueOnce(new Error('Network fail'));
            await expect(api.getOrderList()).rejects.toThrow('Network fail');
        });
    });
});
