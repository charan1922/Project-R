/**
 * Portfolio REST API
 * Holdings, Positions, Position Conversion, Exit All, eDIS workflow.
 */

import { AxiosInstance } from 'axios';
import {
    HoldingResponse,
    PositionResponse,
    PositionConversionRequest,
    EdisFormRequest,
} from '../types';

export class PortfolioApi {
    constructor(private readonly http: AxiosInstance, private readonly clientId: string) { }

    // ─── Holdings ──────────────────────────────────────────────────────────────

    /**
     * Get portfolio holdings (settled stocks in demat).
     * GET /holdings
     */
    async getHoldings(): Promise<HoldingResponse[]> {
        const resp = await this.http.get<HoldingResponse[]>('/holdings');
        return resp.data;
    }

    // ─── Positions ─────────────────────────────────────────────────────────────

    /**
     * Get all open positions for the current trading day.
     * GET /positions
     */
    async getPositions(): Promise<PositionResponse[]> {
        const resp = await this.http.get<PositionResponse[]>('/positions');
        return resp.data;
    }

    /**
     * Convert a position from intraday to delivery or vice versa.
     * POST /positions/convert
     */
    async convertPosition(req: Omit<PositionConversionRequest, 'dhanClientId'>): Promise<unknown> {
        const payload: PositionConversionRequest = { ...req, dhanClientId: this.clientId };
        const resp = await this.http.post<unknown>('/positions/convert', payload);
        return resp.data;
    }

    /**
     * Exit ALL open positions and cancel all pending orders for the session.
     * DELETE /positions
     *
     * @warning This is irreversible — all open positions will be squared off.
     */
    async exitAllPositions(): Promise<unknown> {
        const resp = await this.http.delete<unknown>('/positions');
        return resp.data;
    }

    // ─── eDIS Workflow ─────────────────────────────────────────────────────────

    /**
     * Step 1: Generate T-PIN via OTP sent to registered mobile.
     * GET /edis/tpin
     */
    async generateTpin(): Promise<unknown> {
        const resp = await this.http.get<unknown>('/edis/tpin');
        return resp.data;
    }

    /**
     * Step 2: Generate eDIS HTML form for CDSL delivery authorization.
     * POST /edis/form
     * @returns The escaped HTML string to render in the user's browser.
     */
    async generateEdisForm(req: EdisFormRequest): Promise<{ edisFormHtml: string }> {
        const resp = await this.http.post<{ edisFormHtml: string }>('/edis/form', req);
        return resp.data;
    }

    /**
     * Step 2 (bulk): Generate bulk eDIS form to authorize the entire portfolio.
     * POST /edis/bulkform
     */
    async generateBulkEdisForm(req: EdisFormRequest): Promise<{ edisFormHtml: string }> {
        const resp = await this.http.post<{ edisFormHtml: string }>('/edis/bulkform', { ...req, bulk: true });
        return resp.data;
    }

    /**
     * Step 3: Verify eDIS authorization status for a given ISIN.
     * GET /edis/inquire/{isin}
     */
    async edisInquiry(isin: string): Promise<unknown> {
        const resp = await this.http.get<unknown>(`/edis/inquire/${isin}`);
        return resp.data;
    }
}
