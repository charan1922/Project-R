import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import { MarketQuotesApi } from '../../src/rest/marketQuotes.js';
import { ExchangeSegment } from '../../src/types/index.js';

function mockHttp(): AxiosInstance {
    return {
        post: vi.fn().mockResolvedValue({ data: {} }),
    } as unknown as AxiosInstance;
}

describe('MarketQuotesApi', () => {
    let http: AxiosInstance;
    let api: MarketQuotesApi;

    beforeEach(() => {
        http = mockHttp();
        api = new MarketQuotesApi(http);
    });

    const securities = { [ExchangeSegment.NSE_EQ]: ['1333', '500325'] };

    it('getMarketQuoteLTP() POSTs to /marketfeed/ltp with the security map', async () => {
        await api.getMarketQuoteLTP(securities);
        expect(http.post).toHaveBeenCalledWith('/marketfeed/ltp', securities);
    });

    it('getMarketQuoteOHLC() POSTs to /marketfeed/ohlc', async () => {
        await api.getMarketQuoteOHLC(securities);
        expect(http.post).toHaveBeenCalledWith('/marketfeed/ohlc', securities);
    });

    it('getMarketQuoteDepth() POSTs to /marketfeed/quote', async () => {
        await api.getMarketQuoteDepth(securities);
        expect(http.post).toHaveBeenCalledWith('/marketfeed/quote', securities);
    });
});
