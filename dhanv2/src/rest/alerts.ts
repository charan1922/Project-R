/**
 * Conditional Triggers (Alerts) REST API
 * Create, modify, and manage price/technical alerts that auto-place orders.
 */

import type { AxiosInstance } from 'axios';
import type {
    AlertOrderRequest,
    AlertModifyRequest,
    AlertOrderResponse,
    GetAlertResponse,
} from '../types';

export class AlertsApi {
    constructor(
        private readonly http: AxiosInstance,
        private readonly clientId: string,
    ) {}

    /**
     * Get all conditional triggers for the account.
     * GET /alerts/orders
     */
    async getAlertOrders(): Promise<GetAlertResponse[]> {
        const resp = await this.http.get<GetAlertResponse[]>('/alerts/orders');
        return resp.data;
    }

    /**
     * Create a new conditional trigger.
     * POST /alerts/orders
     *
     * Conditions support price comparisons and technical indicators
     * (SMA, EMA, RSI, MACD, Bollinger Bands, etc.) on equities and indices.
     */
    async createAlertOrder(
        req: Omit<AlertOrderRequest, 'dhanClientId'>,
    ): Promise<AlertOrderResponse> {
        const payload: AlertOrderRequest = { ...req, dhanClientId: this.clientId };
        const resp = await this.http.post<AlertOrderResponse>('/alerts/orders', payload);
        return resp.data;
    }

    /**
     * Get a specific conditional trigger by ID.
     * GET /alerts/orders/{alertId}
     */
    async getAlertOrder(alertId: string): Promise<GetAlertResponse> {
        const resp = await this.http.get<GetAlertResponse>(`/alerts/orders/${alertId}`);
        return resp.data;
    }

    /**
     * Modify an existing conditional trigger.
     * PUT /alerts/orders/{alertId}
     */
    async modifyAlertOrder(
        alertId: string,
        req: Omit<AlertModifyRequest, 'dhanClientId' | 'alertId'>,
    ): Promise<AlertOrderResponse> {
        const payload: AlertModifyRequest = { ...req, dhanClientId: this.clientId, alertId };
        const resp = await this.http.put<AlertOrderResponse>(`/alerts/orders/${alertId}`, payload);
        return resp.data;
    }

    /**
     * Delete a conditional trigger.
     * DELETE /alerts/orders/{alertId}
     */
    async deleteAlertOrder(alertId: string): Promise<AlertOrderResponse> {
        const resp = await this.http.delete<AlertOrderResponse>(`/alerts/orders/${alertId}`);
        return resp.data;
    }
}
