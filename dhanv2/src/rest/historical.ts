/**
 * Historical Data & Option Chain REST API
 * Daily/intraday OHLC charts, expired options data, option chain analytics.
 */

import { AxiosInstance } from 'axios';
import {
    HistoricalDataRequest,
    IntradayDataRequest,
    ExpiredOptionsRequest,
    OptionChainRequest,
    OptionChainResponse,
    ExchangeSegment,
} from '../types';

export interface OhlcCandle {
    timestamp: number; // EPOCH
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    oi?: number;
}

export interface HistoricalDataResponse {
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
    timestamp: number[];
    oi?: number[];
}

export class HistoricalApi {
    constructor(private readonly http: AxiosInstance) { }

    /**
     * Retrieve daily OHLC candle data.
     * POST /charts/historical
     * @param expiryCode - 0=all, 1=near, 2=mid, 3=far. For F&O instruments only.
     */
    async getDailyHistorical(req: HistoricalDataRequest): Promise<HistoricalDataResponse> {
        const resp = await this.http.post<HistoricalDataResponse>('/charts/historical', {
            securityId: req.securityId,
            exchangeSegment: req.exchangeSegment,
            instrument: req.instrument,
            expiryCode: req.expiryCode ?? 0,
            oi: req.oi ?? false,
            fromDate: req.fromDate,
            toDate: req.toDate,
        });
        return resp.data;
    }

    /**
     * Retrieve intraday minute-candle OHLC data.
     * POST /charts/intraday
     *
     * @important Intraday data is a massive payload. The API is capped at 90 days
     * per request. For longer backtests, paginate by splitting the date range.
     * Supported intervals: 1, 5, 15, 25, 60 minutes.
     */
    async getIntradayHistorical(req: IntradayDataRequest): Promise<HistoricalDataResponse> {
        const resp = await this.http.post<HistoricalDataResponse>('/charts/intraday', {
            securityId: req.securityId,
            exchangeSegment: req.exchangeSegment,
            instrument: req.instrument,
            interval: req.interval,
            oi: req.oi ?? false,
            fromDate: req.fromDate,
            toDate: req.toDate,
        });
        return resp.data;
    }

    /**
     * Get rolling historical data for expired option contracts.
     * POST /charts/rollingoption
     * Provides up to 5 years of pre-processed data relative to ATM strike proximity.
     * @param req.expiryFlag   - WEEK or MONTH
     * @param req.requiredData - Array of data fields to include
     */
    async getExpiredOptionsData(req: ExpiredOptionsRequest): Promise<HistoricalDataResponse> {
        const resp = await this.http.post<HistoricalDataResponse>('/charts/rollingoption', {
            securityId: req.securityId,
            exchangeSegment: req.exchangeSegment,
            instrument: req.instrument,
            expiryFlag: req.expiryFlag,
            expiryCode: req.expiryCode,
            strike: req.strike,
            drvOptionType: req.drvOptionType,
            requiredData: req.requiredData,
            fromDate: req.fromDate,
            toDate: req.toDate,
            interval: req.interval ?? 1,
        });
        return resp.data;
    }

    /**
     * Get full option chain (all strikes, both CE/PE, with Greeks) for an underlying.
     * POST /optionchain
     * Rate limit: 1 unique request every 3 seconds.
     * @param expiry - Format: YYYY-MM-DD
     */
    async getOptionChain(
        underScrip: number,
        underSeg: ExchangeSegment,
        expiry: string
    ): Promise<OptionChainResponse> {
        const payload: OptionChainRequest = {
            UnderlyingScrip: underScrip,
            UnderlyingSeg: underSeg,
            Expiry: expiry,
        };
        const resp = await this.http.post<OptionChainResponse>('/optionchain', payload);
        return resp.data;
    }

    /**
     * Get all available expiry dates for an underlying instrument.
     * POST /optionchain/expirylist
     */
    async getExpiryList(underScrip: number, underSeg: ExchangeSegment): Promise<string[]> {
        const resp = await this.http.post<string[]>('/optionchain/expirylist', {
            UnderlyingScrip: underScrip,
            UnderlyingSeg: underSeg,
        });
        return resp.data;
    }
}
