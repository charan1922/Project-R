// Main SDK class
export { DhanHQ } from './dhanhq';

// WebSocket feeds
export { DhanFeed } from './feed';
export { DhanOrderFeed } from './order_feed';
export type { OrderUpdate } from './order_feed';

// Binary parser (for advanced / custom use)
export { BinaryParser } from './binary_parser';
export type { ParsedFeedPacket } from './binary_parser';

// HTTP layer (for advanced use / testing)
export { DhanHTTP, failureResponse } from './http_client';
export type { DhanResponse, DhanSuccess, DhanFailure } from './http_client';

// Error classes
export {
    DhanApiError,
    DhanAuthError,
    DhanNetworkError,
    DhanValidationError,
} from './errors';
export type { DhanErrorRemarks } from './errors';

// Enums — import these directly instead of using DhanHQ.NSE etc.
export {
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
    MarketFeedDataType,
    IpFlag,
    KillSwitchAction,
    // Binary feed protocol
    FeedRequestCode,
    FeedResponseCode,
} from './sdk-types';

// Request / response interfaces + binary feed types
export type {
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
    AlertCondition,
    PnlExitRequest,
    SetIpRequest,
    FeedInstrument,
    OhlcField,
    // Binary feed packet shapes
    TickerData,
    QuoteData,
} from './sdk-types';

// Auto-generated OpenAPI types (full API schema)
export type { paths, components, operations } from './types';
