import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import { PortfolioApi } from '../../src/rest/portfolio.js';
import { ExchangeSegment, ProductType } from '../../src/types/index.js';

function mockHttp(): AxiosInstance {
    return {
        get: vi.fn().mockResolvedValue({ data: [] }),
        post: vi.fn().mockResolvedValue({ data: {} }),
        put: vi.fn().mockResolvedValue({ data: {} }),
        delete: vi.fn().mockResolvedValue({ data: {} }),
    } as unknown as AxiosInstance;
}

describe('PortfolioApi', () => {
    let http: AxiosInstance;
    let api: PortfolioApi;

    beforeEach(() => {
        http = mockHttp();
        api = new PortfolioApi(http, 'CLIENT_1');
    });

    it('getHoldings() GETs /holdings', async () => {
        vi.mocked(http.get).mockResolvedValueOnce({ data: [{ isin: 'INE001A01036' }] } as any);
        const result = await api.getHoldings();
        expect(http.get).toHaveBeenCalledWith('/holdings');
        expect(result[0].isin).toBe('INE001A01036');
    });

    it('getPositions() GETs /positions', async () => {
        vi.mocked(http.get).mockResolvedValueOnce({ data: [] } as any);
        const result = await api.getPositions();
        expect(http.get).toHaveBeenCalledWith('/positions');
        expect(Array.isArray(result)).toBe(true);
    });

    it('convertPosition() POSTs to /positions/convert with clientId injected', async () => {
        await api.convertPosition({
            fromProductType: ProductType.INTRADAY,
            toProductType: ProductType.CNC,
            exchangeSegment: ExchangeSegment.NSE_EQ,
            positionType: 'LONG' as any,
            securityId: '1333',
            convertQty: 1,
        });
        expect(http.post).toHaveBeenCalledWith('/positions/convert', expect.objectContaining({
            dhanClientId: 'CLIENT_1',
            securityId: '1333',
        }));
    });

    it('exitAllPositions() DELETEs /positions', async () => {
        await api.exitAllPositions();
        expect(http.delete).toHaveBeenCalledWith('/positions');
    });

    it('generateTpin() GETs /edis/tpin', async () => {
        await api.generateTpin();
        expect(http.get).toHaveBeenCalledWith('/edis/tpin');
    });

    it('edisInquiry() GETs /edis/inquire/{isin}', async () => {
        await api.edisInquiry('INE009A01021');
        expect(http.get).toHaveBeenCalledWith('/edis/inquire/INE009A01021');
    });

    it('generateEdisForm() POSTs to /edis/form', async () => {
        await api.generateEdisForm({ isin: 'INE009A01021', qty: 1, exchange: 'NSE', segment: 'EQ', bulk: false });
        expect(http.post).toHaveBeenCalledWith('/edis/form', expect.objectContaining({
            isin: 'INE009A01021',
        }));
    });
});
