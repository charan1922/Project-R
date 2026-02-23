/**
 * Statements REST API
 * Ledger reports and trade history.
 */

import { AxiosInstance } from 'axios';
import { LedgerEntry, TradeHistoryResponse } from '../types';

export class StatementsApi {
    constructor(private readonly http: AxiosInstance) { }

    /**
     * Get the account ledger for a date range.
     * GET /ledger?from-date=&to-date=
     * @param fromDate - YYYY-MM-DD
     * @param toDate   - YYYY-MM-DD
     */
    async getLedger(fromDate: string, toDate: string): Promise<LedgerEntry[]> {
        const resp = await this.http.get<LedgerEntry[]>('/ledger', {
            params: { 'from-date': fromDate, 'to-date': toDate },
        });
        return resp.data;
    }

    /**
     * Get paginated trade history within a date range.
     * GET /trades/{from-date}/{to-date}/{page-number}
     * @param fromDate - YYYY-MM-DD
     * @param toDate   - YYYY-MM-DD
     * @param page     - 0-indexed page number (default 0)
     */
    async getTradeHistory(fromDate: string, toDate: string, page = 0): Promise<TradeHistoryResponse[]> {
        const resp = await this.http.get<TradeHistoryResponse[]>(`/trades/${fromDate}/${toDate}/${page}`);
        return resp.data;
    }
}
