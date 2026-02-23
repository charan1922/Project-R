import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import { FundsApi } from '../../src/rest/funds.js';
import { ExchangeSegment, TransactionType, ProductType, OrderType } from '../../src/types/index.js';

function mockHttp(): AxiosInstance {
    return {
        get: vi.fn().mockResolvedValue({ data: {} }),
        post: vi.fn().mockResolvedValue({ data: {} }),
    } as unknown as AxiosInstance;
}

describe('FundsApi', () => {
    let http: AxiosInstance;
    let api: FundsApi;

    beforeEach(() => {
        http = mockHttp();
        api = new FundsApi(http, 'CLIENT_1');
    });

    it('getFundLimits() GETs /fundlimit', async () => {
        vi.mocked(http.get).mockResolvedValueOnce({ data: { availableBalance: 10000 } } as any);
        const result = await api.getFundLimits();
        expect(http.get).toHaveBeenCalledWith('/fundlimit');
        expect(result.availableBalance).toBe(10000);
    });

    it('calculateMargin() POSTs to /margincalculator with clientId injected', async () => {
        const req = {
            dhanClientId: 'CLIENT_1',
            securityId: '1333',
            exchangeSegment: ExchangeSegment.NSE_EQ,
            transactionType: TransactionType.BUY,
            quantity: 1,
            productType: ProductType.CNC,
            price: 1800,
        };
        await api.calculateMargin(req);
        expect(http.post).toHaveBeenCalledWith('/margincalculator', expect.objectContaining({
            securityId: '1333',
            dhanClientId: 'CLIENT_1',
        }));
    });

    it('calculateMultiMargin() POSTs to /margincalculator/multi with orderList key', async () => {
        const orders = [{
            securityId: '1333',
            exchangeSegment: ExchangeSegment.NSE_EQ,
            transactionType: TransactionType.BUY,
            quantity: 1,
            productType: ProductType.CNC,
            orderType: OrderType.LIMIT,
            price: 1800,
        }];
        await api.calculateMultiMargin(orders);
        expect(http.post).toHaveBeenCalledWith('/margincalculator/multi', expect.objectContaining({
            dhanClientId: 'CLIENT_1',
            orderList: orders,        // actual key in FundsApi payload
            includePosition: false,
            includeOrders: false,
        }));
    });
});
