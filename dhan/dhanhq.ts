import { DhanHTTP, DhanResponse } from './http_client';
import { DhanValidationError } from './errors';
import {
    ExchangeSegment,
    TransactionType,
    ProductType,
    OrderType,
    Validity,
    AmoTime,
    OrderFlag,
    LegName,
    ExpiryCode,
    ExpiryFlag,
    OptionType,
    KillSwitchAction,
    IpFlag,
    PlaceOrderRequest,
    ModifyOrderRequest,
    PlaceForeverRequest,
    ModifyForeverRequest,
    PlaceSuperOrderRequest,
    ModifySuperOrderRequest,
    ConvertPositionRequest,
    MarginCalculatorRequest,
    MultiMarginOrder,
    ExpiredOptionsRequest,
    AlertOrderRequest,
    PnlExitRequest,
    SetIpRequest,
    FeedInstrument,
} from './sdk-types';

// ─── Constants (kept for backward-compat alongside enum exports) ──────────────
const VALID_EXPIRY_CODES = [0, 1, 2, 3] as const;
const VALID_INTERVALS = [1, 5, 15, 25, 60] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function upper(s: string): string {
    return s.toUpperCase();
}

function validate(condition: boolean, message: string): void {
    if (!condition) throw new DhanValidationError(message);
}

// Wraps a synchronous validation + async call so validation errors become rejected Promises
function asyncValidated<T>(
    fn: () => Promise<DhanResponse<T>>
): Promise<DhanResponse<T>> {
    try {
        return fn();
    } catch (err) {
        return Promise.reject(err);
    }
}

// ─── DhanHQ ──────────────────────────────────────────────────────────────────

/**
 * DhanHQ — TypeScript SDK for the Dhan trading API (v2).
 *
 * @example
 * ```ts
 * import { DhanHQ, ExchangeSegment, TransactionType, ProductType, OrderType } from './index';
 * const dhan = new DhanHQ('YOUR_CLIENT_ID', 'YOUR_ACCESS_TOKEN');
 * const result = await dhan.placeOrder({
 *   securityId: '1333',
 *   exchangeSegment: ExchangeSegment.NSE,
 *   transactionType: TransactionType.BUY,
 *   quantity: 1,
 *   orderType: OrderType.MARKET,
 *   productType: ProductType.CNC,
 *   price: 0,
 * });
 * ```
 */
export class DhanHQ {
    private readonly dhan_http: DhanHTTP;

    // ── Enum re-exports as static members (backward-compat shim) ──────────────
    public static readonly NSE = ExchangeSegment.NSE;
    public static readonly BSE = ExchangeSegment.BSE;
    public static readonly CUR = ExchangeSegment.CUR;
    public static readonly MCX = ExchangeSegment.MCX;
    public static readonly FNO = ExchangeSegment.FNO;
    public static readonly NSE_FNO = ExchangeSegment.NSE_FNO;
    public static readonly BSE_FNO = ExchangeSegment.BSE_FNO;
    public static readonly INDEX = ExchangeSegment.INDEX;

    public static readonly BUY = TransactionType.BUY;
    public static readonly SELL = TransactionType.SELL;

    public static readonly CNC = ProductType.CNC;
    public static readonly INTRA = ProductType.INTRA;
    public static readonly MARGIN = ProductType.MARGIN;
    public static readonly CO = ProductType.CO;
    public static readonly BO = ProductType.BO;
    public static readonly MTF = ProductType.MTF;

    public static readonly LIMIT = OrderType.LIMIT;
    public static readonly MARKET = OrderType.MARKET;
    public static readonly SL = OrderType.SL;
    public static readonly SLM = OrderType.SLM;

    public static readonly DAY = Validity.DAY;
    public static readonly IOC = Validity.IOC;

    constructor(
        clientId: string,
        accessToken: string,
        environment: 'sandbox' | 'prod' = 'prod',
        timeoutMs?: number
    ) {
        this.dhan_http = new DhanHTTP(clientId, accessToken, environment, timeoutMs);
    }

    // ── Utility ───────────────────────────────────────────────────────────────

    /**
     * Convert an UNIX epoch (seconds) to an IST Date.
     */
    static convertToDateTime(epoch: number): Date {
        return new Date(epoch * 1000);
    }

    // ─── ORDERS ───────────────────────────────────────────────────────────────

    /**
     * Retrieve all orders for the current trading day.
     */
    public getOrderList(): Promise<DhanResponse<unknown[]>> {
        return this.dhan_http.get('/orders');
    }

    /**
     * Get details for a specific order by its order ID.
     */
    public getOrderById(orderId: string): Promise<DhanResponse<unknown>> {
        return this.dhan_http.get(`/orders/${orderId}`);
    }

    /**
     * Retrieve an order using the correlation ID supplied at placement time.
     */
    public getOrderByCorrelationId(correlationId: string): Promise<DhanResponse<unknown>> {
        return this.dhan_http.get(`/orders/external/${correlationId}`);
    }

    /**
     * Place a new order.
     * For slicing, pass `slice: true` in the request object.
     */
    public placeOrder(req: PlaceOrderRequest & { slice?: boolean }): Promise<DhanResponse<unknown>> {
        return asyncValidated(() => {
            const amo = req.afterMarketOrder ?? false;
            const amoTime = req.amoTime ?? AmoTime.OPEN;

            if (amo) {
                validate(
                    Object.values(AmoTime).includes(amoTime as AmoTime),
                    `amoTime must be one of ${Object.values(AmoTime).join(', ')}`
                );
            }

            const payload: Record<string, unknown> = {
                transactionType: upper(req.transactionType),
                exchangeSegment: upper(req.exchangeSegment),
                productType: upper(req.productType),
                orderType: upper(req.orderType),
                validity: upper(req.validity ?? Validity.DAY),
                securityId: req.securityId,
                quantity: Math.floor(req.quantity),
                disclosedQuantity: Math.floor(req.disclosedQuantity ?? 0),
                price: Number(req.price),
                triggerPrice: Number(req.triggerPrice ?? 0),
                afterMarketOrder: amo,
            };

            if (amo) payload['amoTime'] = amoTime;
            if (req.boProfitValue !== undefined) payload['boProfitValue'] = Number(req.boProfitValue);
            if (req.boStopLossValue !== undefined) payload['boStopLossValue'] = Number(req.boStopLossValue);
            if (req.tag) payload['correlationId'] = req.tag;

            const endpoint = req.slice ? '/orders/slicing' : '/orders';
            return this.dhan_http.post(endpoint, payload);
        });
    }

    /**
     * Place a slice order (splits a large order into exchange-permitted lot sizes).
     */
    public placeSliceOrder(req: PlaceOrderRequest): Promise<DhanResponse<unknown>> {
        return this.placeOrder({ ...req, slice: true });
    }

    /**
     * Modify a pending order.
     */
    public modifyOrder(orderId: string, req: ModifyOrderRequest): Promise<DhanResponse<unknown>> {
        const payload: Record<string, unknown> = {
            orderId: String(orderId),
            orderType: req.orderType,
            legName: req.legName,
            quantity: req.quantity,
            price: req.price,
            disclosedQuantity: req.disclosedQuantity,
            triggerPrice: req.triggerPrice,
            validity: req.validity,
        };
        return this.dhan_http.put(`/orders/${orderId}`, payload);
    }

    /**
     * Cancel a pending order.
     */
    public cancelOrder(orderId: string): Promise<DhanResponse<unknown>> {
        return this.dhan_http.delete(`/orders/${orderId}`);
    }

    // ─── FOREVER ORDERS ───────────────────────────────────────────────────────

    /**
     * Place a Forever (GTT-style) order.
     */
    public placeForever(req: PlaceForeverRequest): Promise<DhanResponse<unknown>> {
        const payload: Record<string, unknown> = {
            orderFlag: req.orderFlag ?? OrderFlag.SINGLE,
            transactionType: upper(req.transactionType),
            exchangeSegment: upper(req.exchangeSegment),
            productType: upper(req.productType),
            orderType: upper(req.orderType),
            validity: upper(req.validity ?? Validity.DAY),
            tradingSymbol: req.symbol ?? '',
            securityId: req.securityId,
            quantity: Math.floor(req.quantity),
            disclosedQuantity: Math.floor(req.disclosedQuantity ?? 0),
            price: Number(req.price),
            triggerPrice: Number(req.triggerPrice),
            price1: Number(req.price1 ?? 0),
            triggerPrice1: Number(req.triggerPrice1 ?? 0),
            quantity1: Math.floor(req.quantity1 ?? 0),
        };
        if (req.tag) payload['correlationId'] = req.tag;
        return this.dhan_http.post('/forever/orders', payload);
    }

    /**
     * Modify a pending Forever order.
     */
    public modifyForever(orderId: string, req: ModifyForeverRequest): Promise<DhanResponse<unknown>> {
        const payload: Record<string, unknown> = {
            orderId: String(orderId),
            orderFlag: req.orderFlag,
            orderType: req.orderType,
            legName: req.legName,
            quantity: req.quantity,
            disclosedQuantity: req.disclosedQuantity,
            price: req.price,
            triggerPrice: req.triggerPrice,
            validity: req.validity,
        };
        return this.dhan_http.put(`/forever/orders/${orderId}`, payload);
    }

    /**
     * Get all Forever orders.
     */
    public getForever(): Promise<DhanResponse<unknown[]>> {
        return this.dhan_http.get('/forever/orders');
    }

    /**
     * Cancel a Forever order.
     */
    public cancelForever(orderId: string): Promise<DhanResponse<unknown>> {
        return this.dhan_http.delete(`/forever/orders/${orderId}`);
    }

    // ─── SUPER ORDERS ─────────────────────────────────────────────────────────

    /**
     * Retrieve all Super Orders for the current trading day.
     */
    public getSuperOrderList(): Promise<DhanResponse<unknown[]>> {
        return this.dhan_http.get('/super/orders');
    }

    /**
     * Place a new Super Order (bracket order with target and stop-loss legs).
     */
    public placeSuperOrder(req: PlaceSuperOrderRequest): Promise<DhanResponse<unknown>> {
        return asyncValidated(() => {
            const txn = upper(req.transactionType);
            const price = Number(req.price);
            const targetPrice = Number(req.targetPrice ?? 0);
            const stopLossPrice = Number(req.stopLossPrice ?? 0);

            validate(price > 0, 'price must be > 0');
            validate(
                targetPrice > 0 || stopLossPrice > 0,
                'At least one of targetPrice or stopLossPrice must be > 0'
            );

            if (txn === 'BUY') {
                validate(
                    targetPrice === 0 || targetPrice > price,
                    'For BUY: targetPrice must be > price'
                );
                validate(
                    stopLossPrice === 0 || stopLossPrice < price,
                    'For BUY: stopLossPrice must be < price'
                );
            } else if (txn === 'SELL') {
                validate(
                    targetPrice === 0 || targetPrice < price,
                    'For SELL: targetPrice must be < price'
                );
                validate(
                    stopLossPrice === 0 || stopLossPrice > price,
                    'For SELL: stopLossPrice must be > price'
                );
            } else {
                throw new DhanValidationError('transactionType must be BUY or SELL');
            }

            const payload: Record<string, unknown> = {
                transactionType: txn,
                exchangeSegment: upper(req.exchangeSegment),
                productType: upper(req.productType),
                orderType: upper(req.orderType),
                securityId: req.securityId,
                quantity: Math.floor(req.quantity),
                price,
                targetPrice,
                stopLossPrice,
                trailingJump: Number(req.trailingJump ?? 0),
            };
            if (req.tag) payload['correlationId'] = req.tag;
            return this.dhan_http.post('/super/orders', payload);
        });
    }

    /**
     * Modify a leg of a pending Super Order.
     */
    public modifySuperOrder(
        orderId: string,
        req: ModifySuperOrderRequest
    ): Promise<DhanResponse<unknown>> {
        return asyncValidated(() => {
            validate(!!orderId, 'orderId must be provided');
            validate(
                Object.values(LegName).includes(req.legName as LegName),
                `Invalid legName: ${req.legName}. Must be one of ${Object.values(LegName).join(', ')}`
            );

            let payload: Record<string, unknown>;
            const leg = upper(req.legName);

            if (leg === LegName.ENTRY_LEG) {
                payload = {
                    orderId: String(orderId),
                    orderType: req.orderType,
                    legName: LegName.ENTRY_LEG,
                    quantity: Math.floor(req.quantity ?? 0),
                    price: Number(req.price ?? 0),
                    targetPrice: Number(req.targetPrice ?? 0),
                    stopLossPrice: Number(req.stopLossPrice ?? 0),
                    trailingJump: Number(req.trailingJump ?? 0),
                };
            } else if (leg === LegName.TARGET_LEG) {
                payload = {
                    orderId: String(orderId),
                    legName: LegName.TARGET_LEG,
                    targetPrice: Number(req.targetPrice ?? 0),
                };
            } else {
                payload = {
                    orderId: String(orderId),
                    legName: LegName.STOP_LOSS_LEG,
                    stopLossPrice: Number(req.stopLossPrice ?? 0),
                    trailingJump: Number(req.trailingJump ?? 0),
                };
            }
            return this.dhan_http.put(`/super/orders/${orderId}`, payload);
        });
    }

    /**
     * Cancel a specific leg of a Super Order.
     */
    public cancelSuperOrder(
        orderId: string,
        orderLeg: LegName | string
    ): Promise<DhanResponse<unknown>> {
        return asyncValidated(() => {
            validate(!!orderId, 'orderId must be provided');
            validate(
                Object.values(LegName).includes(orderLeg as LegName),
                `Invalid orderLeg: ${orderLeg}`
            );
            return this.dhan_http.delete(`/super/orders/${orderId}/${orderLeg}`);
        });
    }

    // ─── PORTFOLIO ────────────────────────────────────────────────────────────

    /**
     * Get current portfolio holdings (previous session stocks).
     */
    public getHoldings(): Promise<DhanResponse<unknown[]>> {
        return this.dhan_http.get('/holdings');
    }

    /**
     * Get all open positions for the current trading day.
     */
    public getPositions(): Promise<DhanResponse<unknown[]>> {
        return this.dhan_http.get('/positions');
    }

    /**
     * Exit ALL open positions and cancel all open orders.
     */
    public exitAllPositions(): Promise<DhanResponse<unknown>> {
        return this.dhan_http.delete('/positions');
    }

    /**
     * Convert an open position between intraday and delivery.
     */
    public convertPosition(req: ConvertPositionRequest): Promise<DhanResponse<unknown>> {
        return this.dhan_http.post('/positions/convert', req as unknown as Record<string, unknown>);
    }

    // ─── FUNDS ────────────────────────────────────────────────────────────────

    /**
     * Get account fund and margin details.
     */
    public getFundLimits(): Promise<DhanResponse<unknown>> {
        return this.dhan_http.get('/fundlimit');
    }

    /**
     * Calculate margin for a single order.
     */
    public marginCalculator(req: MarginCalculatorRequest): Promise<DhanResponse<unknown>> {
        const payload: Record<string, unknown> = {
            securityId: req.securityId,
            exchangeSegment: upper(req.exchangeSegment),
            transactionType: upper(req.transactionType),
            quantity: Math.floor(req.quantity),
            productType: upper(req.productType),
            price: Number(req.price),
        };
        if (req.triggerPrice !== undefined) payload['triggerPrice'] = Number(req.triggerPrice);
        return this.dhan_http.post('/margincalculator', payload);
    }

    /**
     * Calculate margin for multiple scripts in one request.
     */
    public multiMarginCalculator(orders: MultiMarginOrder[]): Promise<DhanResponse<unknown>> {
        const payload = orders.map((o) => ({
            securityId: o.securityId,
            exchangeSegment: upper(o.exchangeSegment),
            transactionType: upper(o.transactionType),
            quantity: Math.floor(o.quantity),
            productType: upper(o.productType),
            orderType: upper(o.orderType),
            price: Number(o.price),
            ...(o.triggerPrice !== undefined ? { triggerPrice: Number(o.triggerPrice) } : {}),
        }));
        return this.dhan_http.post('/margincalculator/multi', { orders: payload });
    }

    // ─── STATEMENT ────────────────────────────────────────────────────────────

    /**
     * Get all trades for the current day.
     * Pass an `orderId` to retrieve trades for a specific order.
     */
    public getTradeBook(orderId?: string): Promise<DhanResponse<unknown>> {
        const endpoint = orderId ? `/trades/${orderId}` : '/trades';
        return this.dhan_http.get(endpoint);
    }

    /**
     * Get trade history within a date range (paginated).
     * @param fromDate  - Format: YYYY-MM-DD
     * @param toDate    - Format: YYYY-MM-DD
     * @param pageNumber - 0-indexed page
     */
    public getTradeHistory(
        fromDate: string,
        toDate: string,
        pageNumber = 0
    ): Promise<DhanResponse<unknown[]>> {
        return this.dhan_http.get(`/trades/${fromDate}/${toDate}/${pageNumber}`);
    }

    /**
     * Get the account ledger for a date range.
     * @param fromDate  - Format: YYYY-MM-DD
     * @param toDate    - Format: YYYY-MM-DD
     */
    public ledgerReport(fromDate: string, toDate: string): Promise<DhanResponse<unknown>> {
        return this.dhan_http.get(`/ledger?from-date=${fromDate}&to-date=${toDate}`);
    }

    // ─── MARKET FEED (REST) ───────────────────────────────────────────────────

    /**
     * Get Last Traded Price (LTP) for a list of securities.
     * @param securities - Map of `ExchangeSegment` → array of security IDs
     */
    public tickerData(
        securities: Partial<Record<ExchangeSegment | string, string[]>>
    ): Promise<DhanResponse<unknown>> {
        return this.dhan_http.post('/marketfeed/ltp', securities as Record<string, unknown>);
    }

    /**
     * Get OHLC data for a list of securities.
     */
    public ohlcData(
        securities: Partial<Record<ExchangeSegment | string, string[]>>
    ): Promise<DhanResponse<unknown>> {
        return this.dhan_http.post('/marketfeed/ohlc', securities as Record<string, unknown>);
    }

    /**
     * Get full quote data for a list of securities.
     */
    public quoteData(
        securities: Partial<Record<ExchangeSegment | string, string[]>>
    ): Promise<DhanResponse<unknown>> {
        return this.dhan_http.post('/marketfeed/quote', securities as Record<string, unknown>);
    }

    // ─── HISTORICAL DATA ──────────────────────────────────────────────────────

    /**
     * Retrieve intraday minute-candle OHLC data for the current day.
     */
    public intradayMinuteData(
        securityId: string,
        exchangeSegment: ExchangeSegment | string,
        instrumentType: string,
        fromDate: string,
        toDate: string,
        interval = 1,
        oi = false
    ): Promise<DhanResponse<unknown>> {
        const payload: Record<string, unknown> = {
            securityId,
            exchangeSegment,
            instrument: instrumentType,
            interval,
            oi,
            fromDate,
            toDate,
        };
        return this.dhan_http.post('/charts/intraday', payload);
    }

    /**
     * Retrieve historical daily candle (OHLC) data.
     * @param expiryCode - 0=all, 1=near, 2=mid, 3=far (for F&O).
     */
    public historicalDailyData(
        securityId: string,
        exchangeSegment: ExchangeSegment | string,
        instrumentType: string,
        fromDate: string,
        toDate: string,
        expiryCode: ExpiryCode | 0 | 1 | 2 | 3 = 0,
        oi = false
    ): Promise<DhanResponse<unknown>> {
        if (!VALID_EXPIRY_CODES.includes(expiryCode as 0 | 1 | 2 | 3)) {
            return Promise.reject(
                new DhanValidationError(`expiryCode must be one of ${VALID_EXPIRY_CODES.join(', ')}`)
            );
        }
        const payload: Record<string, unknown> = {
            securityId,
            exchangeSegment,
            instrument: instrumentType,
            expiryCode,
            oi,
            fromDate,
            toDate,
        };
        return this.dhan_http.post('/charts/historical', payload);
    }

    /**
     * Retrieve minute-wise rolling option chart data for expired contracts.
     */
    public expiredOptionsData(req: ExpiredOptionsRequest): Promise<DhanResponse<unknown>> {
        return asyncValidated(() => {
            const interval = req.interval ?? 1;
            validate(
                (VALID_INTERVALS as readonly number[]).includes(interval),
                `interval must be one of ${VALID_INTERVALS.join(', ')}`
            );
            validate(
                Object.values(ExpiryFlag).includes(req.expiryFlag as ExpiryFlag),
                `expiryFlag must be one of ${Object.values(ExpiryFlag).join(', ')}`
            );
            validate(
                Object.values(OptionType).includes(req.drvOptionType as OptionType),
                `drvOptionType must be CALL or PUT`
            );

            const validFields: string[] = [
                'open', 'high', 'low', 'close', 'iv', 'volume', 'strike', 'oi', 'spot',
            ];
            validate(
                req.requiredData.every((f: string) => validFields.includes(f)),
                `requiredData contains invalid fields. Valid fields: ${validFields.join(', ')}`
            );

            const payload: Record<string, unknown> = {
                securityId: req.securityId,
                exchangeSegment: req.exchangeSegment,
                instrument: req.instrumentType,
                expiryFlag: req.expiryFlag,
                expiryCode: req.expiryCode,
                strike: req.strike,
                drvOptionType: req.drvOptionType,
                requiredData: req.requiredData,
                fromDate: req.fromDate,
                toDate: req.toDate,
                interval,
            };
            return this.dhan_http.post('/charts/rollingoption', payload);
        });
    }

    // ─── OPTION CHAIN ─────────────────────────────────────────────────────────

    /**
     * Get the full option chain for an underlying security.
     */
    public optionChain(
        underSecurityId: number,
        underExchangeSegment: ExchangeSegment | string,
        expiry: string
    ): Promise<DhanResponse<unknown>> {
        const payload: Record<string, unknown> = {
            UnderlyingScrip: underSecurityId,
            UnderlyingSeg: underExchangeSegment,
            Expiry: expiry,
        };
        return this.dhan_http.post('/optionchain', payload);
    }

    /**
     * Get all available expiry dates for an underlying security.
     */
    public expiryList(
        underSecurityId: number,
        underExchangeSegment: ExchangeSegment | string
    ): Promise<DhanResponse<unknown>> {
        const payload: Record<string, unknown> = {
            UnderlyingScrip: underSecurityId,
            UnderlyingSeg: underExchangeSegment,
        };
        return this.dhan_http.post('/optionchain/expirylist', payload);
    }

    // ─── eDIS ─────────────────────────────────────────────────────────────────

    /**
     * Send OTP to registered mobile to generate a T-PIN for eDIS authorization.
     */
    public async generateTpin(): Promise<DhanResponse<unknown>> {
        const response = await this.dhan_http.get('/edis/tpin');
        if (response.status === 'success') {
            return { status: 'success', data: { message: 'OTP sent to registered mobile' } };
        }
        return response;
    }

    /**
     * Generate the eDIS HTML form to authorize stock delivery.
     * @param isin     - ISIN of the security
     * @param qty      - Quantity to authorize
     * @param exchange - Exchange where the stock is held
     * @param bulk     - If true, generates bulk eDIS form
     */
    public edisForm(
        isin: string,
        qty: number,
        exchange: string,
        bulk = false
    ): Promise<DhanResponse<unknown>> {
        const endpoint = bulk ? '/edis/bulkform' : '/edis/form';
        const payload: Record<string, unknown> = { isin, qty, exchange };
        return this.dhan_http.post(endpoint, payload);
    }

    /**
     * Check eDIS authorization status for a security.
     * @param isin - ISIN of the security, or 'ALL' to check all holdings
     */
    public edisInquiry(isin: string): Promise<DhanResponse<unknown>> {
        return this.dhan_http.get(`/edis/inquire/${isin}`);
    }

    // ─── ALERTS (Conditional Triggers) ───────────────────────────────────────

    /**
     * Get all conditional trigger alerts.
     */
    public getAlerts(): Promise<DhanResponse<unknown[]>> {
        return this.dhan_http.get('/alerts/orders');
    }

    /**
     * Get a specific alert by ID.
     */
    public getAlertById(alertId: string): Promise<DhanResponse<unknown>> {
        return this.dhan_http.get(`/alerts/orders/${alertId}`);
    }

    /**
     * Place a new conditional trigger alert.
     */
    public placeAlert(req: AlertOrderRequest): Promise<DhanResponse<unknown>> {
        return this.dhan_http.post('/alerts/orders', req as unknown as Record<string, unknown>);
    }

    /**
     * Modify an existing alert.
     */
    public modifyAlert(
        alertId: string,
        req: Partial<AlertOrderRequest>
    ): Promise<DhanResponse<unknown>> {
        return this.dhan_http.put(`/alerts/orders/${alertId}`, req as unknown as Record<string, unknown>);
    }

    /**
     * Delete a conditional trigger alert.
     */
    public deleteAlert(alertId: string): Promise<DhanResponse<unknown>> {
        return this.dhan_http.delete(`/alerts/orders/${alertId}`);
    }

    // ─── P&L BASED EXIT ───────────────────────────────────────────────────────

    /**
     * Get the currently active P&L-based exit configuration.
     */
    public getPnlExit(): Promise<DhanResponse<unknown>> {
        return this.dhan_http.get('/pnlExit');
    }

    /**
     * Configure automatic exit when cumulative P&L thresholds are breached.
     */
    public setPnlExit(req: PnlExitRequest): Promise<DhanResponse<unknown>> {
        return this.dhan_http.post('/pnlExit', req as unknown as Record<string, unknown>);
    }

    /**
     * Disable the active P&L-based exit configuration.
     */
    public stopPnlExit(): Promise<DhanResponse<unknown>> {
        return this.dhan_http.delete('/pnlExit');
    }

    // ─── IP MANAGEMENT ────────────────────────────────────────────────────────

    /**
     * Get the current primary/secondary IP addresses configured for the account.
     */
    public getIP(): Promise<DhanResponse<unknown>> {
        return this.dhan_http.get('/ip/getIP');
    }

    /**
     * Set the primary or secondary static IP for order placement.
     */
    public setIP(req: SetIpRequest): Promise<DhanResponse<unknown>> {
        return this.dhan_http.post('/ip/setIP', req as unknown as Record<string, unknown>);
    }

    /**
     * Modify the configured static IP addresses.
     */
    public modifyIP(req: SetIpRequest): Promise<DhanResponse<unknown>> {
        return this.dhan_http.put('/ip/modifyIP', req as unknown as Record<string, unknown>);
    }

    // ─── TRADER CONTROL ───────────────────────────────────────────────────────

    /**
     * Get current kill switch status (trading enabled/disabled).
     */
    public statusKillSwitch(): Promise<DhanResponse<unknown>> {
        return this.dhan_http.get('/killswitch');
    }

    /**
     * Activate or deactivate the kill switch to halt / resume trading.
     * @param action - 'ACTIVATE' to halt trading, 'DEACTIVATE' to resume
     */
    public killSwitch(action: KillSwitchAction | string): Promise<DhanResponse<unknown>> {
        return asyncValidated(() => {
            const act = upper(action);
            validate(
                Object.values(KillSwitchAction).includes(act as KillSwitchAction),
                `action must be 'ACTIVATE' or 'DEACTIVATE', got: '${action}'`
            );
            return this.dhan_http.post(`/killswitch?killSwitchStatus=${act}`, {});
        });
    }
}
