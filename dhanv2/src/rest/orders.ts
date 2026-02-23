/**
 * Orders REST API — Standard & Slice Orders
 */

import { AxiosInstance } from 'axios';
import {
    OrderRequest,
    OrderModifyRequest,
    OrderResponse,
    OrderStatusResponse,
    TradeResponse,
    TradeHistoryResponse,
} from '../types';

export class OrdersApi {
    constructor(private readonly http: AxiosInstance, private readonly clientId: string) { }

    /**
     * Place a new order.
     * POST /orders
     */
    async placeOrder(req: Omit<OrderRequest, 'dhanClientId'>): Promise<OrderStatusResponse> {
        const payload: OrderRequest = { ...req, dhanClientId: this.clientId };
        const resp = await this.http.post<OrderStatusResponse>('/orders', payload);
        return resp.data;
    }

    /**
     * Place a slice order (splits large orders into exchange-allowed lot sizes).
     * POST /orders/slicing — returns array of orders, each with its own orderId.
     */
    async placeSliceOrder(req: Omit<OrderRequest, 'dhanClientId'>): Promise<OrderStatusResponse[]> {
        const payload: OrderRequest = { ...req, dhanClientId: this.clientId };
        const resp = await this.http.post<OrderStatusResponse[]>('/orders/slicing', payload);
        return resp.data;
    }

    /**
     * Modify a pending order.
     * PUT /orders/{order-id}
     *
     * @important The `quantity` field must be the TOTAL PLACED order quantity,
     * not the remaining/pending quantity. This is a breaking change from v2.0.2
     * of the DhanHQ Python SDK.
     */
    async modifyOrder(orderId: string, req: Omit<OrderModifyRequest, 'dhanClientId' | 'orderId'>): Promise<OrderStatusResponse> {
        const payload: OrderModifyRequest = { ...req, dhanClientId: this.clientId, orderId };
        const resp = await this.http.put<OrderStatusResponse>(`/orders/${orderId}`, payload);
        return resp.data;
    }

    /**
     * Cancel a pending order.
     * DELETE /orders/{order-id}
     * Returns 202 Accepted on success with orderStatus: CANCELLED.
     */
    async cancelOrder(orderId: string): Promise<OrderStatusResponse> {
        const resp = await this.http.delete<OrderStatusResponse>(`/orders/${orderId}`);
        return resp.data;
    }

    /**
     * Get all orders for the current day.
     * GET /orders
     */
    async getOrderList(): Promise<OrderResponse[]> {
        const resp = await this.http.get<OrderResponse[]>('/orders');
        return resp.data;
    }

    /**
     * Get a specific order by its order ID.
     * GET /orders/{order-id}
     */
    async getOrderById(orderId: string): Promise<OrderResponse> {
        const resp = await this.http.get<OrderResponse>(`/orders/${orderId}`);
        return resp.data;
    }

    /**
     * Retrieve an order using the correlation ID set at placement time.
     * GET /orders/external/{correlation-id}
     */
    async getOrderByCorrelationId(correlationId: string): Promise<OrderResponse> {
        const resp = await this.http.get<OrderResponse>(`/orders/external/${correlationId}`);
        return resp.data;
    }

    /**
     * Get all trades executed today.
     * GET /trades
     */
    async getTradeBook(): Promise<TradeResponse[]> {
        const resp = await this.http.get<TradeResponse[]>('/trades');
        return resp.data;
    }

    /**
     * Get all trades for a specific order.
     * GET /trades/{order-id}
     */
    async getTradesByOrderId(orderId: string): Promise<TradeResponse[]> {
        const resp = await this.http.get<TradeResponse[]>(`/trades/${orderId}`);
        return resp.data;
    }

    /**
     * Get paginated trade history within a date range.
     * GET /trades/{from-date}/{to-date}/{page-number}
     * @param fromDate - YYYY-MM-DD
     * @param toDate   - YYYY-MM-DD
     * @param page     - 0-indexed page number
     */
    async getTradeHistory(fromDate: string, toDate: string, page = 0): Promise<TradeHistoryResponse[]> {
        const resp = await this.http.get<TradeHistoryResponse[]>(`/trades/${fromDate}/${toDate}/${page}`);
        return resp.data;
    }
}
