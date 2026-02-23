/**
 * Funds REST API
 * Fund limits and margin calculators.
 */

import { AxiosInstance } from 'axios';
import {
    FundLimitResponse,
    MarginCalculatorRequest,
    MarginCalculatorResponse,
    MultiMarginRequest,
    MultiMarginResponse,
    MultiMarginScript,
} from '../types';

export class FundsApi {
    constructor(private readonly http: AxiosInstance, private readonly clientId: string) { }

    /**
     * Get account fund and margin details.
     * GET /fundlimit
     */
    async getFundLimits(): Promise<FundLimitResponse> {
        const resp = await this.http.get<FundLimitResponse>('/fundlimit');
        return resp.data;
    }

    /**
     * Calculate margin required for a single order before placing.
     * POST /margincalculator
     */
    async calculateMargin(req: Omit<MarginCalculatorRequest, 'dhanClientId'>): Promise<MarginCalculatorResponse> {
        const payload: MarginCalculatorRequest = { ...req, dhanClientId: this.clientId };
        const resp = await this.http.post<MarginCalculatorResponse>('/margincalculator', payload);
        return resp.data;
    }

    /**
     * Calculate consolidated margin for a basket of orders (strategy-level analysis).
     * POST /margincalculator/multi
     * Includes hedge_benefit computation when existing positions offset margin requirements.
     */
    async calculateMultiMargin(
        orderList: MultiMarginScript[],
        includePosition = false,
        includeOrders = false
    ): Promise<MultiMarginResponse> {
        const payload: MultiMarginRequest = {
            dhanClientId: this.clientId,
            orderList,
            includePosition,
            includeOrders,
        };
        const resp = await this.http.post<MultiMarginResponse>('/margincalculator/multi', payload);
        return resp.data;
    }
}
