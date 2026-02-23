/**
 * SDK-specific enums and request/response types for the Dhan TypeScript SDK.
 * These complement the auto-generated OpenAPI types in types.ts.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum ExchangeSegment {
    NSE = 'NSE_EQ',
    BSE = 'BSE_EQ',
    CUR = 'NSE_CURRENCY',
    MCX = 'MCX_COMM',
    FNO = 'NSE_FNO',
    NSE_FNO = 'NSE_FNO',
    BSE_FNO = 'BSE_FNO',
    INDEX = 'IDX_I',
}

export enum TransactionType {
    BUY = 'BUY',
    SELL = 'SELL',
}

export enum ProductType {
    CNC = 'CNC',
    INTRA = 'INTRADAY',
    MARGIN = 'MARGIN',
    CO = 'CO',
    BO = 'BO',
    MTF = 'MTF',
}

export enum OrderType {
    LIMIT = 'LIMIT',
    MARKET = 'MARKET',
    SL = 'STOP_LOSS',
    SLM = 'STOP_LOSS_MARKET',
}

export enum Validity {
    DAY = 'DAY',
    IOC = 'IOC',
}

export enum AmoTime {
    PRE_OPEN = 'PRE_OPEN',
    OPEN = 'OPEN',
    OPEN_30 = 'OPEN_30',
    OPEN_60 = 'OPEN_60',
}

export enum OrderFlag {
    SINGLE = 'SINGLE',
    OCO = 'OCO',
}

export enum LegName {
    ENTRY_LEG = 'ENTRY_LEG',
    TARGET_LEG = 'TARGET_LEG',
    STOP_LOSS_LEG = 'STOP_LOSS_LEG',
}

export enum ExpiryCode {
    ALL = 0,
    NEAR = 1,
    MID = 2,
    FAR = 3,
}

export enum ExpiryFlag {
    WEEK = 'WEEK',
    MONTH = 'MONTH',
}

export enum OptionType {
    CALL = 'CALL',
    PUT = 'PUT',
}

export enum MarketFeedDataType {
    TICKER = 'TICKER',
    QUOTE = 'QUOTE',
    FULL = 'FULL',
}

export enum IpFlag {
    PRIMARY = 'PRIMARY',
    SECONDARY = 'SECONDARY',
}

export enum KillSwitchAction {
    ACTIVATE = 'ACTIVATE',
    DEACTIVATE = 'DEACTIVATE',
}

// ─── Order Requests ──────────────────────────────────────────────────────────

export interface PlaceOrderRequest {
    securityId: string;
    exchangeSegment: ExchangeSegment | string;
    transactionType: TransactionType | string;
    quantity: number;
    orderType: OrderType | string;
    productType: ProductType | string;
    price: number;
    triggerPrice?: number;
    disclosedQuantity?: number;
    afterMarketOrder?: boolean;
    validity?: Validity | string;
    amoTime?: AmoTime | string;
    boProfitValue?: number;
    boStopLossValue?: number;
    /** Correlation ID / tag for the order (max 20 chars) */
    tag?: string;
}

export interface ModifyOrderRequest {
    orderType: OrderType | string;
    legName: LegName | string;
    quantity: number;
    price: number;
    triggerPrice: number;
    disclosedQuantity: number;
    validity: Validity | string;
}

export interface PlaceForeverRequest {
    securityId: string;
    exchangeSegment: ExchangeSegment | string;
    transactionType: TransactionType | string;
    productType: ProductType | string;
    orderType: OrderType | string;
    quantity: number;
    price: number;
    triggerPrice: number;
    orderFlag?: OrderFlag | string;
    disclosedQuantity?: number;
    validity?: Validity | string;
    price1?: number;
    triggerPrice1?: number;
    quantity1?: number;
    tag?: string;
    symbol?: string;
}

export interface ModifyForeverRequest {
    orderFlag: OrderFlag | string;
    orderType: OrderType | string;
    legName: LegName | string;
    quantity: number;
    price: number;
    triggerPrice: number;
    disclosedQuantity: number;
    validity: Validity | string;
}

export interface PlaceSuperOrderRequest {
    securityId: string;
    exchangeSegment: ExchangeSegment | string;
    transactionType: TransactionType | string;
    quantity: number;
    orderType: OrderType | string;
    productType: ProductType | string;
    price: number;
    targetPrice?: number;
    stopLossPrice?: number;
    trailingJump?: number;
    tag?: string;
}

export interface ModifySuperOrderRequest {
    orderType: OrderType | string;
    legName: LegName | string;
    quantity?: number;
    price?: number;
    targetPrice?: number;
    stopLossPrice?: number;
    trailingJump?: number;
}

// ─── Portfolio ───────────────────────────────────────────────────────────────

export interface ConvertPositionRequest {
    fromProductType: ProductType | string;
    exchangeSegment: ExchangeSegment | string;
    positionType: TransactionType | string;
    securityId: string;
    convertQty: number;
    toProductType: ProductType | string;
}

// ─── Funds ───────────────────────────────────────────────────────────────────

export interface MarginCalculatorRequest {
    securityId: string;
    exchangeSegment: ExchangeSegment | string;
    transactionType: TransactionType | string;
    quantity: number;
    productType: ProductType | string;
    price: number;
    triggerPrice?: number;
}

export interface MultiMarginOrder {
    securityId: string;
    exchangeSegment: ExchangeSegment | string;
    transactionType: TransactionType | string;
    quantity: number;
    productType: ProductType | string;
    orderType: OrderType | string;
    price: number;
    triggerPrice?: number;
}

// ─── Historical Data ─────────────────────────────────────────────────────────

export type OhlcField = 'open' | 'high' | 'low' | 'close' | 'iv' | 'volume' | 'strike' | 'oi' | 'spot';

export interface ExpiredOptionsRequest {
    securityId: string;
    exchangeSegment: ExchangeSegment | string;
    instrumentType: string;
    expiryFlag: ExpiryFlag | string;
    expiryCode: number;
    strike: string;
    drvOptionType: OptionType | string;
    requiredData: OhlcField[];
    fromDate: string;
    toDate: string;
    interval?: 1 | 5 | 15 | 25 | 60;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export interface AlertCondition {
    lhsIndicator: string;
    operator: string;
    rhsValue?: number | string;
    rhsIndicator?: string;
}

export interface AlertOrderRequest {
    securityId: string;
    exchangeSegment: ExchangeSegment | string;
    conditions: AlertCondition[];
    /** Orders to place when conditions are met */
    alertOrders?: PlaceOrderRequest[];
    expiry?: string;
    tag?: string;
}

// ─── P&L Exit ────────────────────────────────────────────────────────────────

export interface PnlExitRequest {
    profitThreshold?: number;
    lossThreshold?: number;
}

// ─── IP Management ───────────────────────────────────────────────────────────

export interface SetIpRequest {
    ip: string;
    ip2?: string;
    ipFlag: IpFlag | string;
}

export interface FeedInstrument {
    /** Exchange segment string, e.g. 'NSE_EQ' */
    exchangeSegment: ExchangeSegment | string;
    securityId: string;
}

// ─── Binary Feed Protocol ─────────────────────────────────────────────────────

/**
 * RequestCode values sent by the client to subscribe/unsubscribe instruments
 * on wss://api-feed.dhan.co.
 */
export enum FeedRequestCode {
    CONNECT = 11,
    DISCONNECT = 12,
    SUBSCRIBE_TICKER = 15,
    UNSUBSCRIBE_TICKER = 16,
    SUBSCRIBE_QUOTE = 17,
    UNSUBSCRIBE_QUOTE = 18,
    SUBSCRIBE_DEPTH = 19,
    UNSUBSCRIBE_DEPTH = 20,
    SUBSCRIBE_FULL_DEPTH = 23,
}

/**
 * ResponseCode values in the 8-byte binary header indicating packet type.
 */
export enum FeedResponseCode {
    TICKER = 2,
    QUOTE = 4,
    OI_DATA = 6,
    PREV_CLOSE = 8,
    MARKET_STATUS = 50,
    BID_PACKET = 41,
    ASK_PACKET = 51,
}

/** Parsed ticker data (ResponseCode 2) — LTP + optional last trade time. */
export interface TickerData {
    type: 'ticker';
    exchangeSegment: number;
    securityId: number;
    ltp: number;
    ltt?: number;
}

/** Parsed quote / full data (ResponseCode 4) — LTP, OHLC, volume, bid/ask totals. */
export interface QuoteData {
    type: 'quote';
    exchangeSegment: number;
    securityId: number;
    ltp: number;
    ltt?: number;
    avgPrice?: number;
    volume?: number;
    totalSellQty?: number;
    totalBuyQty?: number;
    open: number;
    close: number;
    high: number;
    low: number;
    netChange?: number;
    percentChange?: number;
}
