/**
 * Super Orders REST API
 * Bracket orders: entry + target + stop-loss (with optional trailing stop).
 */

import { AxiosInstance } from 'axios';
import {
    SuperOrderRequest,
    SuperModifyRequest,
    SuperOrderResponse,
    OrderStatusResponse,
    LegName,
} from '../types';

export class SuperOrdersApi {
    constructor(private readonly http: AxiosInstance, private readonly clientId: string) { }

    /**
     * Get all Super Orders for the current day (with nested legDetails).
     * GET /super/orders
     */
    async getSuperOrderList(): Promise<SuperOrderResponse[]> {
        const resp = await this.http.get<SuperOrderResponse[]>('/super/orders');
        return resp.data;
    }

    /**
     * Place a new Super Order.
     * POST /super/orders
     * @param req.targetPrice   - Required. Target profit exit price.
     * @param req.stopLossPrice - Required. Stop-loss exit price.
     * @param req.trailingJump  - Optional. Trailing stop-loss tick size.
     */
    async placeSuperOrder(req: Omit<SuperOrderRequest, 'dhanClientId'>): Promise<OrderStatusResponse> {
        const payload: SuperOrderRequest = { ...req, dhanClientId: this.clientId };
        const resp = await this.http.post<OrderStatusResponse>('/super/orders', payload);
        return resp.data;
    }

    /**
     * Modify a pending Super Order leg.
     * PUT /super/orders/{order-id}
     *
     * - If the ENTRY_LEG is still PENDING or PART_TRADED, you can modify the full structure.
     * - Once ENTRY_LEG is TRADED, only target/stop-loss/trailing can be changed.
     */
    async modifySuperOrder(
        orderId: string,
        req: Omit<SuperModifyRequest, 'dhanClientId' | 'orderId'>
    ): Promise<OrderStatusResponse> {
        const payload: SuperModifyRequest = { ...req, dhanClientId: this.clientId, orderId };
        const resp = await this.http.put<OrderStatusResponse>(`/super/orders/${orderId}`, payload);
        return resp.data;
    }

    /**
     * Cancel a specific leg of a Super Order.
     * DELETE /super/orders/{order-id}/{order-leg}
     * @param orderLeg - ENTRY_LEG | TARGET_LEG | STOP_LOSS_LEG
     */
    async cancelSuperOrderLeg(orderId: string, orderLeg: LegName): Promise<OrderStatusResponse> {
        const resp = await this.http.delete<OrderStatusResponse>(`/super/orders/${orderId}/${orderLeg}`);
        return resp.data;
    }
}
