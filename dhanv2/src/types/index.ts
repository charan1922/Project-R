/**
 * DhanHQ TypeScript SDK — Type Definitions
 * Complete enumeration and interface mapping for DhanHQ API v2.
 */

// ─── Exchange Segments ────────────────────────────────────────────────────────

export enum ExchangeSegment {
    NSE_EQ = 'NSE_EQ',
    NSE_FNO = 'NSE_FNO',
    NSE_CURRENCY = 'NSE_CURRENCY',
    BSE_EQ = 'BSE_EQ',
    BSE_FNO = 'BSE_FNO',
    BSE_CURRENCY = 'BSE_CURRENCY',
    MCX_COMM = 'MCX_COMM',
    IDX_I = 'IDX_I',
}

// Numeric exchange segment codes used in binary WebSocket protocol
export enum ExchangeSegmentCode {
    NSE_EQ = 1,
    NSE_FNO = 2,
    NSE_CURRENCY = 3,
    BSE_EQ = 4,
    MCX_COMM = 5,
    BSE_FNO = 7,
    BSE_CURRENCY = 8,
    IDX_I = 13,
}

// ─── Product Types ────────────────────────────────────────────────────────────

export enum ProductType {
    CNC = 'CNC',
    INTRADAY = 'INTRADAY',
    MARGIN = 'MARGIN',
    MTF = 'MTF',
    CO = 'CO',
    BO = 'BO',
}

// ─── Order Execution ─────────────────────────────────────────────────────────

export enum TransactionType {
    BUY = 'BUY',
    SELL = 'SELL',
}

export enum OrderType {
    LIMIT = 'LIMIT',
    MARKET = 'MARKET',
    STOP_LOSS = 'STOP_LOSS',
    STOP_LOSS_MARKET = 'STOP_LOSS_MARKET',
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

// ─── Order / Position State ───────────────────────────────────────────────────

export enum OrderStatus {
    TRANSIT = 'TRANSIT',
    PENDING = 'PENDING',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED',
    PART_TRADED = 'PART_TRADED',
    TRADED = 'TRADED',
    EXPIRED = 'EXPIRED',
    MODIFIED = 'MODIFIED',
    TRIGGERED = 'TRIGGERED',
    INACTIVE = 'INACTIVE',
}

export enum PositionType {
    LONG = 'LONG',
    SHORT = 'SHORT',
    CLOSED = 'CLOSED',
}

export enum LegName {
    ENTRY_LEG = 'ENTRY_LEG',
    TARGET_LEG = 'TARGET_LEG',
    STOP_LOSS_LEG = 'STOP_LOSS_LEG',
}

export enum OrderFlag {
    SINGLE = 'SINGLE',
    OCO = 'OCO',
}

// ─── Instrument / Data Types ──────────────────────────────────────────────────

export enum InstrumentType {
    EQUITY = 'EQUITY',
    OPTIDX = 'OPTIDX',
    FUTIDX = 'FUTIDX',
    OPTSTK = 'OPTSTK',
    FUTSTK = 'FUTSTK',
    FUTCUR = 'FUTCUR',
    OPTCUR = 'OPTCUR',
    FUTCOM = 'FUTCOM',
    INDEX = 'INDEX',
}

export enum OptionType {
    CALL = 'CALL',
    PUT = 'PUT',
}

export enum ExpiryFlag {
    WEEK = 'WEEK',
    MONTH = 'MONTH',
}

export enum IpFlag {
    PRIMARY = 'PRIMARY',
    SECONDARY = 'SECONDARY',
}

// ─── WebSocket Feed Protocol ──────────────────────────────────────────────────

/**
 * RequestCode values sent to the server to subscribe/unsubscribe instruments.
 */
export enum FeedRequestCode {
    CONNECT = 11,
    DISCONNECT = 12,
    SUBSCRIBE_TICKER = 15,
    SUBSCRIBE_QUOTE = 17,
    SUBSCRIBE_DEPTH = 19,
    SUBSCRIBE_FULL_DEPTH = 23,
    UNSUBSCRIBE_TICKER = 16,
    UNSUBSCRIBE_QUOTE = 18,
    UNSUBSCRIBE_DEPTH = 20,
}

/**
 * ResponseCode values in the binary header indicating packet type.
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

export enum KillSwitchAction {
    ACTIVATE = 'ACTIVATE',
    DEACTIVATE = 'DEACTIVATE',
}

// ─── Error Codes ──────────────────────────────────────────────────────────────

/**
 * Known Dhan API error codes.
 * Trading API: DH-prefix; Data API: numeric.
 */
export const DhanErrorCodes = {
    // Trading API errors
    DH_901: 'Invalid Authentication — Access token expired or invalid.',
    DH_902: 'Invalid Access — Segment not subscribed.',
    DH_904: 'Rate Limit Exceeded.',
    DH_905: 'Input Exception — Missing or invalid required fields.',
    DH_906: 'Order Error — Exchange-level rejection.',
    // Data API errors
    ERROR_800: 'Internal Server Error.',
    ERROR_804: 'Max subscribed instruments exceeded.',
    ERROR_805: 'Max simultaneous WebSocket connections exceeded (limit: 5).',
    ERROR_807: 'Access token expired.',
} as const;

/**
 * Rate limit reference table (per the DhanHQ documentation).
 */
export const RateLimits = {
    ORDER_PER_SECOND: 10,
    ORDER_PER_MINUTE: 250,
    ORDER_PER_HOUR: 1_000,
    ORDER_PER_DAY: 7_000,
    ORDER_MODIFY_MAX_PER_ORDER: 25,
    DATA_PER_SECOND: 5,
    DATA_PER_DAY: 100_000,
    MARKET_QUOTE_PER_SECOND: 1,
    OPTION_CHAIN_EVERY_SECONDS: 3,
    NON_TRADING_PER_SECOND: 20,
    WS_MAX_CONNECTIONS: 5,
    WS_INSTRUMENTS_PER_CONNECTION: 1_000,
    WS_INSTRUMENTS_PER_PAYLOAD: 100,
} as const;

// ─── Request Interfaces ───────────────────────────────────────────────────────

export interface OrderRequest {
    dhanClientId: string;
    correlationId?: string;
    transactionType: TransactionType;
    exchangeSegment: ExchangeSegment;
    productType: ProductType;
    orderType: OrderType;
    validity: Validity;
    securityId: string;
    quantity: number;
    disclosedQuantity?: number;
    price: number;
    triggerPrice?: number;
    afterMarketOrder?: boolean;
    amoTime?: AmoTime;
    boProfitValue?: number;
    boStopLossValue?: number;
}

export interface OrderModifyRequest {
    dhanClientId: string;
    orderId: string;
    orderType: OrderType;
    legName: LegName;
    /**
     * @important Must be the TOTAL PLACED quantity, NOT the remaining/pending quantity.
     * This is a breaking change documented in Python SDK v2.0.2 changelog.
     */
    quantity: number;
    price: number;
    disclosedQuantity: number;
    triggerPrice: number;
    validity: Validity;
}

export interface SuperOrderRequest {
    dhanClientId: string;
    correlationId?: string;
    transactionType: TransactionType;
    exchangeSegment: ExchangeSegment;
    productType: ProductType;
    orderType: OrderType;
    securityId: string;
    quantity: number;
    price: number;
    targetPrice: number;
    stopLossPrice: number;
    trailingJump?: number;
}

export interface SuperModifyRequest {
    dhanClientId: string;
    orderId: string;
    orderType?: OrderType;
    legName: LegName;
    quantity?: number;
    price?: number;
    targetPrice?: number;
    stopLossPrice?: number;
    trailingJump?: number;
}

export interface ForeverOrderRequest {
    dhanClientId: string;
    orderFlag: OrderFlag;
    transactionType: TransactionType;
    exchangeSegment: ExchangeSegment;
    productType: ProductType;
    orderType: OrderType;
    validity: Validity;
    tradingSymbol?: string;
    securityId: string;
    quantity: number;
    disclosedQuantity?: number;
    price: number;
    triggerPrice: number;
    correlationId?: string;
    // OCO leg (required when orderFlag is OCO)
    price1?: number;
    triggerPrice1?: number;
    quantity1?: number;
}

export interface ForeverModifyRequest {
    dhanClientId: string;
    orderId: string;
    orderFlag: OrderFlag;
    orderType: OrderType;
    legName: LegName;
    quantity: number;
    price: number;
    triggerPrice: number;
    disclosedQuantity: number;
    validity: Validity;
}

export interface PositionConversionRequest {
    dhanClientId: string;
    fromProductType: ProductType;
    toProductType: ProductType;
    exchangeSegment: ExchangeSegment;
    positionType: PositionType;
    securityId: string;
    convertQty: number;
}

export interface EdisFormRequest {
    isin: string;
    qty: number;
    exchange: string;
    segment?: string;
    bulk?: boolean;
}

export interface MarginCalculatorRequest {
    dhanClientId: string;
    exchangeSegment: ExchangeSegment;
    transactionType: TransactionType;
    quantity: number;
    productType: ProductType;
    securityId: string;
    price: number;
    triggerPrice?: number;
}

export interface MultiMarginScript {
    exchangeSegment: ExchangeSegment;
    transactionType: TransactionType;
    quantity: number;
    productType: ProductType;
    orderType: OrderType;
    securityId: string;
    price: number;
}

export interface MultiMarginRequest {
    dhanClientId: string;
    orderList: MultiMarginScript[];
    includePosition?: boolean;
    includeOrders?: boolean;
}

export interface OptionChainRequest {
    UnderlyingScrip: number;
    UnderlyingSeg: ExchangeSegment;
    Expiry: string; // YYYY-MM-DD
}

export interface HistoricalDataRequest {
    securityId: string;
    exchangeSegment: ExchangeSegment;
    instrument: InstrumentType;
    expiryCode?: 0 | 1 | 2 | 3;
    oi?: boolean;
    fromDate: string; // YYYY-MM-DD
    toDate: string;   // YYYY-MM-DD
}

export interface IntradayDataRequest {
    securityId: string;
    exchangeSegment: ExchangeSegment;
    instrument: InstrumentType;
    interval: 1 | 5 | 15 | 25 | 60;
    oi?: boolean;
    fromDate: string; // YYYY-MM-DD
    toDate: string;   // YYYY-MM-DD
}

export interface ExpiredOptionsRequest {
    securityId: string;
    exchangeSegment: ExchangeSegment;
    instrument: InstrumentType;
    expiryFlag: ExpiryFlag;
    expiryCode: number;
    strike: string;
    drvOptionType: OptionType;
    requiredData: Array<'open' | 'high' | 'low' | 'close' | 'iv' | 'volume' | 'strike' | 'oi' | 'spot'>;
    fromDate: string;
    toDate: string;
    interval?: 1 | 5 | 15 | 25 | 60;
}

export interface PnlExitRequest {
    profitValue?: number;
    lossValue?: number;
    productType?: 'INTRADAY' | 'DELIVERY';
    enableKillSwitch?: boolean;
}

export interface SetIpRequest {
    dhanClientId: string;
    ip: string;
    ip2?: string;
    ipFlag: IpFlag;
}

// ─── Response Interfaces ──────────────────────────────────────────────────────

export interface OrderStatusResponse {
    orderId: string;
    orderStatus: OrderStatus;
}

export interface OrderResponse {
    dhanClientId: string;
    orderId: string;
    correlationId?: string;
    orderStatus: OrderStatus;
    transactionType: TransactionType;
    exchangeSegment: ExchangeSegment;
    productType: ProductType;
    orderType: OrderType;
    validity: Validity;
    tradingSymbol: string;
    securityId: string;
    quantity: number;
    disclosedQuantity: number;
    price: number;
    triggerPrice: number;
    afterMarketOrder: boolean;
    boProfitValue: number;
    boStopLossValue: number;
    legName?: LegName;
    createTime: string;
    updateTime: string;
    exchangeTime: string;
    drvExpiryDate?: string;
    drvOptionType?: OptionType;
    drvStrikePrice?: number;
    omsErrorCode?: string;
    omsErrorDescription?: string;
    filledQty?: number;
    remainingQuantity?: number;
    averageTradedPrice?: number;
}

export interface SuperOrderResponse extends OrderResponse {
    legDetails?: OrderResponse[];
}

export interface TradeResponse {
    dhanClientId: string;
    orderId: string;
    exchangeOrderId: string;
    exchangeTradeId: string;
    transactionType: TransactionType;
    exchangeSegment: ExchangeSegment;
    productType: ProductType;
    orderType: OrderType;
    tradingSymbol: string;
    securityId: string;
    tradedQuantity: number;
    tradedPrice: number;
    isin?: string;
    createTime: string;
    updateTime: string;
    exchangeTime: string;
    drvExpiryDate?: string;
    drvOptionType?: OptionType;
    drvStrikePrice?: number;
}

export interface TradeHistoryResponse {
    dhanClientId: string;
    orderId: string;
    exchangeOrderId: string;
    exchangeTradeId: string;
    transactionType: TransactionType;
    exchangeSegment: ExchangeSegment;
    productType: ProductType;
    orderType: OrderType;
    tradingSymbol: string;
    securityId: string;
    tradedQuantity: number;
    tradedPrice: number;
    isin?: string;
    createTime: string;
    updateTime: string;
    exchangeTime: string;
    drvExpiryDate?: string;
    drvOptionType?: OptionType;
    drvStrikePrice?: number;
    sebiTax?: number;
    stt?: number;
    brokerageCharges?: number;
    stampDuty?: number;
}

export interface HoldingResponse {
    dhanClientId: string;
    tradingSymbol: string;
    securityId: string;
    exchangeSegment: ExchangeSegment;
    isin: string;
    totalQty: number;
    dpQty: number;
    t1Qty: number;
    availableQty: number;
    collateralQty: number;
    avgCostPrice: number;
    currentPrice?: number;
    unrealizedProfit?: number;
    realizedProfit?: number;
}

export interface PositionResponse {
    dhanClientId: string;
    tradingSymbol: string;
    securityId: string;
    exchangeSegment: ExchangeSegment;
    productType: ProductType;
    positionType: PositionType;
    buyAvg: number;
    buyQty: number;
    costPrice: number;
    sellAvg: number;
    sellQty: number;
    netQty: number;
    realizedProfit: number;
    unrealizedProfit: number;
    rbiReferenceRate?: number;
    multiplier?: number;
    carryForwardBuyQty?: number;
    carryForwardSellQty?: number;
    dayBuyQty?: number;
    daySellQty?: number;
    drvExpiryDate?: string;
    drvOptionType?: OptionType;
    drvStrikePrice?: number;
}

export interface FundLimitResponse {
    dhanClientId: string;
    availableBalance: number;
    sodLimit: number;
    collateralAmount: number;
    receiveableAmount: number;
    utilizedAmount: number;
    blockedPayoutAmount: number;
    withdrawableBalance: number;
}

export interface MarginCalculatorResponse {
    totalMargin: number;
    spanMargin: number;
    exposureMargin: number;
    variableMargin: number;
    brokerage: number;
    leverage: string;
    availableBalance: number;
    insufficientBalance: number;
}

export interface MultiMarginResponse {
    totalMargin: number;
    equityMargin: number;
    commodityMargin: number;
    foMargin: number;
    hedgeBenefit: number;
    availableBalance: number;
}

export interface LedgerEntry {
    dhanClientId: string;
    voucherdate: string;
    exchange: string;
    voucherdesc: string;
    vouchernumber: string;
    debit: number;
    credit: number;
    runbal: number;
}

export interface OptionGreeks {
    delta: number;
    theta: number;
    gamma: number;
    vega: number;
}

export interface OptionData {
    last_price: number;
    oi: number;
    iv: number;
    volume: number;
    greeks?: OptionGreeks;
}

export interface OptionStrike {
    strike_price: number;
    ce?: OptionData;
    pe?: OptionData;
}

export interface OptionChainResponse {
    underlyingPrice: number;
    expiryList: string[];
    data: OptionStrike[];
}

export interface KillSwitchResponse {
    killSwitchStatus: string;
}

export interface IpResponse {
    dhanClientId: string;
    primaryIp?: string;
    secondaryIp?: string;
}

export interface ForeverOrderResponse {
    orderId: string;
    orderStatus: OrderStatus;
    dhanClientId?: string;
    orderFlag?: OrderFlag;
    tradingSymbol?: string;
    securityId?: string;
    quantity?: number;
    price?: number;
    triggerPrice?: number;
    transactionType?: TransactionType;
    exchangeSegment?: ExchangeSegment;
    productType?: ProductType;
    orderType?: OrderType;
    validity?: Validity;
}

// ─── WebSocket Types ──────────────────────────────────────────────────────────

export interface FeedInstrument {
    exchangeSegment: ExchangeSegment;
    securityId: string;
}

export interface TickerData {
    type: 'ticker';
    exchangeSegment: number;
    securityId: number;
    ltp: number;
    ltt?: number;
}

export interface QuoteData {
    type: 'quote';
    exchangeSegment: number;
    securityId: number;
    ltp: number;
    ltq?: number;
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

export interface DepthLevel {
    price: number;
    quantity: number;
    numOrders: number;
}

export interface FullDepthData {
    type: 'depth';
    exchangeSegment: number;
    securityId: number;
    bid: DepthLevel[];
    ask: DepthLevel[];
}

export interface OrderUpdateMessage {
    orderId: string;
    orderStatus: OrderStatus;
    txnType?: string;
    orderType?: string;
    tradedQty?: number;
    remainingQuantity?: number;
    tradedPrice?: number;
    avgTradedPrice?: number;
    [key: string]: unknown;
}
