/**
 * Market Quotes REST API
 * Snapshot pricing data for up to 1,000 instruments simultaneously.
 * Rate Limit: 1 request per second.
 */

import { AxiosInstance } from 'axios';
import { ExchangeSegment } from '../types';

/** Map of exchange segment → array of security IDs */
export type SecurityMap = Partial<Record<ExchangeSegment, string[]>>;

export interface LtpData {
    securityId: string;
    lastPrice: number;
}

export interface OhlcData {
    securityId: string;
    open: number;
    high: number;
    low: number;
    close: number;
    lastPrice: number;
}

export interface QuoteDepthData {
    securityId: string;
    open: number;
    high: number;
    low: number;
    close: number;
    lastPrice: number;
    avgPrice?: number;
    volume?: number;
    oi?: number;
    upperCircuit?: number;
    lowerCircuit?: number;
    totalBuyQty?: number;
    totalSellQty?: number;
}

export class MarketQuotesApi {
    constructor(private readonly http: AxiosInstance) { }

    /**
     * Get Last Traded Price (LTP) for a map of instruments.
     * POST /marketfeed/ltp
     * Rate limit: 1 request/second, max 1,000 instruments.
     * @example { "NSE_EQ": ["1333", "7097"] }
     */
    async getMarketQuoteLTP(securities: SecurityMap): Promise<Record<string, LtpData>> {
        const resp = await this.http.post<Record<string, LtpData>>('/marketfeed/ltp', securities);
        return resp.data;
    }

    /**
     * Get OHLC data for a map of instruments.
     * POST /marketfeed/ohlc
     */
    async getMarketQuoteOHLC(securities: SecurityMap): Promise<Record<string, OhlcData>> {
        const resp = await this.http.post<Record<string, OhlcData>>('/marketfeed/ohlc', securities);
        return resp.data;
    }

    /**
     * Get full market quote (OHLC + depth metrics) for a map of instruments.
     * POST /marketfeed/quote
     */
    async getMarketQuoteDepth(securities: SecurityMap): Promise<Record<string, QuoteDepthData>> {
        const resp = await this.http.post<Record<string, QuoteDepthData>>('/marketfeed/quote', securities);
        return resp.data;
    }
}
