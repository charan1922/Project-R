/**
 * Forever Orders REST API
 * GTT-style persistent triggers (SINGLE or OCO).
 */

import { AxiosInstance } from 'axios';
import {
    ForeverOrderRequest,
    ForeverModifyRequest,
    ForeverOrderResponse,
    OrderStatusResponse,
} from '../types';

export class ForeverOrdersApi {
    constructor(private readonly http: AxiosInstance, private readonly clientId: string) { }

    /**
     * Get all Forever orders.
     * GET /forever/orders
     */
    async getForeverOrders(): Promise<ForeverOrderResponse[]> {
        const resp = await this.http.get<ForeverOrderResponse[]>('/forever/orders');
        return resp.data;
    }

    /**
     * Place a Forever (GTT) order.
     * POST /forever/orders
     * @param req.orderFlag - SINGLE or OCO. For OCO, price1/triggerPrice1/quantity1 are required.
     */
    async placeForeverOrder(req: Omit<ForeverOrderRequest, 'dhanClientId'>): Promise<OrderStatusResponse> {
        const payload: ForeverOrderRequest = { ...req, dhanClientId: this.clientId };
        const resp = await this.http.post<OrderStatusResponse>('/forever/orders', payload);
        return resp.data;
    }

    /**
     * Modify a pending Forever order.
     * PUT /forever/orders/{order-id}
     */
    async modifyForeverOrder(
        orderId: string,
        req: Omit<ForeverModifyRequest, 'dhanClientId' | 'orderId'>
    ): Promise<OrderStatusResponse> {
        const payload: ForeverModifyRequest = { ...req, dhanClientId: this.clientId, orderId };
        const resp = await this.http.put<OrderStatusResponse>(`/forever/orders/${orderId}`, payload);
        return resp.data;
    }

    /**
     * Cancel / delete a Forever order.
     * DELETE /forever/orders/{order-id}
     */
    async deleteForeverOrder(orderId: string): Promise<OrderStatusResponse> {
        const resp = await this.http.delete<OrderStatusResponse>(`/forever/orders/${orderId}`);
        return resp.data;
    }
}
