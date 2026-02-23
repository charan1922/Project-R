# **System Specification and Code Generation Directives: TypeScript Migration of DhanHQ Python SDK (dhanv2)**

The following comprehensive technical specification document serves as an exhaustive master prompt and architectural blueprint for a Large Language Model (LLM) tasked with generating a production-ready TypeScript npm library. The primary objective is to facilitate the complete, one-to-one migration of the official DhanHQ-py Python SDK (currently at version v2.2.0) into a native TypeScript environment, targeting a specific local directory structure named dhanv2.1 This analysis evaluates the architectural paradigms, REST API schemas, rate-limiting protocols, and high-frequency binary WebSocket streaming logic inherent to the Dhan v2 API.1 The receiving AI assistant must process this entire document to generate the complete, strictly typed codebase, ensuring absolute functional parity with the Python implementation without missing any endpoints, constants, or data parsing mechanisms.1

## **Architectural Design and Project Structuring Paradigms**

The migration from the DhanHQ-py library to a TypeScript ecosystem requires a fundamental architectural shift from synchronous, thread-based execution models commonly found in older Python scripts to Node.js's asynchronous, event-driven architecture. The Python SDK recently underwent a major restructuring in version 2.1.0 to enhance modularity and implement a centralized DhanContext for secure credential management, moving away from fragmented imports.1 The TypeScript implementation must inherit and refine this modularity to align with modern JavaScript module resolution standards.

The target library must be an importable npm package supporting both CommonJS and ECMAScript Modules (ESM) to ensure broad compatibility across different consumer applications.3 The underlying HTTP client should utilize a robust library like axios to handle the REST payload, abstracting away the boilerplate of the native fetch API while providing powerful interceptor capabilities for global error handling and authentication.1 Conversely, the WebSocket implementation must rely on the highly performant ws package to manage the complex, high-throughput binary data streams inherent to the live market feeds.5

The project structure within the designated dhanv2 folder must be explicitly segmented to ensure maintainability and strict separation of concerns. The code generation must establish a src/core directory to house the primary client class and HTTP interceptors. A src/types directory will contain all TypeScript interface and type declarations to guarantee strict typing across the entire API surface, effectively eliminating runtime errors caused by malformed payloads.2 A src/rest directory will compartmentalize the various API categories, such as order management, portfolio handling, and market quotes. Finally, a src/websockets directory will isolate the live data streams, accompanied by a dedicated BinaryParser module designed explicitly to handle the complex Little Endian byte unpacking required by the Dhan v2 API.2 The project must initialize with a standard package.json defining dependencies (axios, ws) and a tsconfig.json targeting ES2022 with strict type checking enforced.

## **Core Context Management and Authentication Mechanics**

The Python SDK utilizes a DhanContext class to encapsulate the client\_id and access\_token, preventing credential leakage across nested modules and ensuring that authentication states are maintained securely throughout the application lifecycle.1 The TypeScript implementation must mirror this architectural pattern by exposing a primary DhanHQ class constructor that accepts these critical credentials upon instantiation.

The authentication mechanism for the Dhan v2 API demands that every REST request includes specific headers to validate the user's session. The analysis indicates that the access-token must be passed as a JSON Web Token (JWT), and for specific data-centric APIs, the client-id must also be included in the header.1 Furthermore, the API enforces a strict requirement that the Content-Type must be set to application/json for all POST and PUT requests.2

To optimize developer experience and prevent redundant code, the TypeScript client must implement an HTTP interceptor via axios that automatically injects these mandatory headers into every outgoing request. This centralized request wrapper abstracts the authentication layer away from the end-user, ensuring that all API calls invoked from the modular REST classes inherit the credentials stored within the parent DhanHQ instance.1

## **Strict Type Definitions and Enumeration Mapping**

To achieve robust type safety and mitigate the risk of input exceptions (which the Dhan API classifies under error code DH-905), the TypeScript library must define exhaustive enumerations mapping directly to the Dhan v2 API annexure.2 The Python library explicitly added missing constants for instruments like BSE\_FNO and NSE\_FNO in version 2.0.1, highlighting the importance of a complete enumeration suite.1 The generating LLM must implement the following enums precisely within the src/types directory.

### **Exchange Segments and Product Types**

The Dhan API categorizes financial instruments across various exchange segments and product types.9 The implementation must define an ExchangeSegment enum containing exact string values for equity, futures, options, currency, and commodities across the National Stock Exchange (NSE), Bombay Stock Exchange (BSE), and Multi Commodity Exchange (MCX).

| Enum Identifier | String Value | Technical Description |
| :---- | :---- | :---- |
| NSE\_EQ | "NSE\_EQ" | National Stock Exchange Equity Cash Segment 9 |
| NSE\_FNO | "NSE\_FNO" | National Stock Exchange Futures and Options Segment 9 |
| NSE\_CURRENCY | "NSE\_CURRENCY" | National Stock Exchange Currency Derivatives 9 |
| BSE\_EQ | "BSE\_EQ" | Bombay Stock Exchange Equity Cash Segment 9 |
| BSE\_FNO | "BSE\_FNO" | Bombay Stock Exchange Futures and Options Segment 9 |
| BSE\_CURRENCY | "BSE\_CURRENCY" | Bombay Stock Exchange Currency Derivatives 9 |
| MCX\_COMM | "MCX\_COMM" | Multi Commodity Exchange Segment 9 |
| IDX\_I | "IDX\_I" | Index Value Segment 9 |

Similarly, the ProductType enum must encompass the varying settlement and leverage options available on the platform, dictating how margin is applied and when positions are auto-squared off.9

| Enum Identifier | String Value | Technical Description |
| :---- | :---- | :---- |
| CNC | "CNC" | Cash and Carry for standard equity deliveries 9 |
| INTRADAY | "INTRADAY" | Intraday trading across equity and derivative segments 9 |
| MARGIN | "MARGIN" | Carry forward margin for Futures and Options 9 |
| MTF | "MTF" | Margin Trade Funding for leveraged equity holding 9 |
| CO | "CO" | Cover Order (valid only for Intraday) 9 |
| BO | "BO" | Bracket Order (valid only for Intraday) 9 |

### **Order Execution Mechanics and Transaction Parameters**

Order execution requires precise string matching for transaction sides, order mechanics, order statuses, and time-in-force validity.2 The TypeScript interfaces must strictly restrict user inputs using the following enumerated types to prevent malformed requests from reaching the exchange servers.

| Categorization | Enum Values | Application and API Context |
| :---- | :---- | :---- |
| Transaction Type | BUY, SELL | Defines the side of the trade for order placement and margin calculations.2 |
| Order Type | LIMIT, MARKET, STOP\_LOSS, STOP\_LOSS\_MARKET | Defines the specific execution mechanism and dictates if trigger prices are required.2 |
| Order Status | TRANSIT, PENDING, REJECTED, CANCELLED, TRADED, EXPIRED | Represents the lifecycle state of an order returned by the Order Management System.2 |
| Validity | DAY, IOC | Defines the time-in-force, either lasting the trading day or executing immediately or cancelling.2 |
| Position Type | LONG, SHORT, CLOSED | Defines the nature of an open portfolio position retrieved from the ledger.2 |
| Instrument Type | EQUITY, OPTIDX, FUTIDX, OPTSTK, FUTSTK, FUTCUR, OPTCUR, FUTCOM, INDEX | Defines the specific asset class for historical charting and option chain requests.2 |
| AMO Time | PRE\_OPEN, OPEN, OPEN\_30, OPEN\_60 | Defines the specific injection time for After Market Orders.2 |

## **REST API Specification and Interface Mapping Directives**

The REST capabilities of the Dhan v2 API are extensive, encompassing standard order placement, sophisticated algorithm routing, comprehensive portfolio management, risk control systems, and rich historical data retrieval.2 The generating LLM must author distinct, strongly-typed asynchronous methods for each endpoint, heavily utilizing TypeScript interfaces for both request payloads and complex response schemas.

### **Standard Order Management Operations**

The core trading functionality allows for the execution, modification, and cancellation of orders. It is imperative to note that Static IP whitelisting is a mandatory prerequisite for interacting with these specific endpoints.2

The primary order execution method, conventionally named placeOrder, must execute an HTTP POST request targeting the /orders endpoint.2 The payload interface, designated as OrderRequest, must enforce strict typings. The required fields include dhanClientId (string), transactionType (TransactionType enum), exchangeSegment (ExchangeSegment enum), productType (ProductType enum), orderType (OrderType enum), validity (Validity enum), securityId (string), quantity (number), and price (number).2 Furthermore, the interface must accommodate optional parameters crucial for advanced trading, such as correlationId (a partner-generated tracking string), disclosedQuantity (which must exceed 30% of total quantity if used), triggerPrice (mandatory only for SL-M and SL-L orders), afterMarketOrder (boolean flag), amoTime (AMO Time enum), boProfitValue, and boStopLossValue for bracket legs.2 The API responds with an object containing an orderId and the initial orderStatus.2

The modifyOrder method executes an HTTP PUT request to /orders/{order-id}. A critical historical context derived from the Python library's changelog (specifically version 2.0.2) dictates a breaking change regarding order modifications: the quantity field passed in the modification payload must reflect the total *placed* order quantity, rather than the *pending* order quantity.1 The TypeScript implementation must explicitly document this nuance in the method signature via JSDoc comments to prevent user errors. Modifiable fields generally include quantity, price, disclosed quantity, trigger price, and validity.2

Order cancellation is managed via the cancelOrder method, which requires an HTTP DELETE request to /orders/{order-id}. This endpoint does not require a request body and indicates success by returning an HTTP 202 Accepted status code alongside a response object confirming the orderStatus has transitioned to CANCELLED.2

For high-volume traders operating in the F\&O segment, the API provides an Order Slicing endpoint to bypass exchange freeze limits. The placeSliceOrder method must map to POST /orders/slicing, accepting a payload structurally identical to the standard order request but returning an array of order objects, each possessing a unique orderId.2

Data retrieval methods for tracking the order lifecycle must include getOrderList (GET /orders), getOrderById (GET /orders/{order-id}), and getOrderByCorrelationId (GET /orders/external/{correlation-id}).2 The OrderStatusResponse interface generated for these methods must meticulously parse comprehensive data fields such as createTime, updateTime, exchangeTime, filledQty, remainingQuantity, averageTradedPrice, and specific derivatives data including drvExpiryDate, drvOptionType, and drvStrikePrice.2 Crucially, the interface must include error tracking fields like omsErrorCode and omsErrorDescription to capture rejections generated by the exchange.2

### **Advanced Algorithmic Execution: Super Orders and Forever Orders**

The Dhan platform differentiates itself by supporting sophisticated order routing algorithms directly through its REST API, notably Super Orders and Forever Orders (Good Till Triggered), both introduced in recent library updates.1

The Super Order API represents a smart execution tool where a single API request packages an entry leg, a target profit leg, and a stop-loss leg, optionally including a trailing stop-loss mechanic.1 The placeSuperOrder method must dispatch a POST request to /super/orders.2 The SuperOrderRequest payload interface extends the standard order parameters by mandating the inclusion of targetPrice (number) and stopLossPrice (number), while offering trailingJump (number) as an optional feature for dynamic risk management.2

Modifications to Super Orders involve complex state-dependent rules that the TypeScript SDK should ideally document. A PUT request to /super/orders/{order-id} targeting the ENTRY\_LEG permits modification of the entire structure provided the order remains in a PENDING or PART\_TRADED state.2 However, once the entry leg transitions to TRADED, subsequent modifications are strictly limited to altering the target price, stop-loss price, and trailing jump values of the outstanding legs.2 Cancellations require highly specific targeting via a DELETE request to /super/orders/{order-id}/{order-leg}, allowing users to eliminate specific legs independently.2 The retrieval endpoint, GET /super/orders, returns a nested JSON structure where target and stop-loss orders are encapsulated within a legDetails array under the primary entry order leg.2

Forever Orders facilitate long-standing automated triggers, heavily utilized for swing trading paradigms.1 The placeForeverOrder method issues a POST request to /forever/orders.2 The payload interface introduces a mandatory orderFlag property, which dictates the logic structure, accepting string values of either SINGLE (for standard triggers) or OCO (One Cancels the Other).2 If the OCO flag is active, the interface definition must enforce the inclusion of secondary conditional parameters defining the alternate leg: price1, triggerPrice1, and quantity1.2

### **Comprehensive Portfolio, Positions, and eDIS Workflow Management**

Effective programmatic trading requires deep visibility into account holdings and active positions. Portfolio tracking is achieved through two primary endpoints: GET /holdings and GET /positions.2

The HoldingResponse interface, mapping to the holdings API, must parse data points representing settled assets, including exchange, tradingSymbol, securityId, isin, totalQty, dpQty (quantity delivered to the demat account), t1Qty (quantity pending settlement), availableQty, collateralQty (assets pledged for margin), and avgCostPrice.2

The PositionResponse interface is significantly more complex due to the dynamic nature of mark-to-market valuations. The LLM must define properties for positionType (LONG, SHORT, CLOSED), buyAvg, buyQty, sellAvg, sellQty, netQty, realizedProfit, unrealizedProfit, and specific fields for currency and derivatives such as rbiReferenceRate, multiplier, carryForwardBuyQty, dayBuyQty, drvExpiryDate, and drvOptionType.2

Position transformation, a common intra-day strategy, allows users to convert active positions from intraday leverage to delivery ownership (or vice-versa). The convertPosition method targets POST /positions/convert.2 The PositionConversionRequest payload interface requires dhanClientId, fromProductType (ProductType enum), toProductType (ProductType enum), exchangeSegment, positionType, securityId, and convertQty.2 Furthermore, a critical risk management method, exitAllPositions, must be implemented mapping to DELETE /positions, which systematically liquidates all active positions and cancels all pending open orders for the current trading session.2

For retail traders holding equity, selling deliveries mandates compliance with the CDSL eDIS (electronic Delivery Instruction Slip) flow.1 The TypeScript library must provide methods for all three stages of this regulatory process. First, generateTpin sends a GET request to /edis/tpin to trigger an SMS to the user.2 Second, generateEdisForm executes a POST request to /edis/form.2 The payload interface requires isin, qty, exchange, segment, and a bulk boolean flag (to authorize the entire portfolio).2 The API response yields an escaped HTML string (edisFormHtml), which the library should return directly to the client application for rendering the CDSL interface.2 Finally, edisInquiry queries GET /edis/inquire/{isin} to verify if the stocks have been successfully marked for transaction approval, returning approved quantities and status remarks.2

### **Trader's Control, Risk Management Configuration, and IP Setup**

Introduced as a specialized suite of APIs, Trader's Control facilitates programmatic account lockdowns and risk mitigation.2

The Kill Switch functionality allows an algorithm to instantly suspend trading capabilities for the remainder of the day, provided no positions are currently open.2 The activateKillSwitch method manipulates this state via POST /killswitch, passing an ACTIVATE or DEACTIVATE status string in the payload.2 The current state can be retrieved via GET /killswitch.2

The Profit and Loss (P\&L) based exit mechanism enables algorithms to configure automatic liquidation thresholds.2 The configurePnlExit method, utilizing PUT /pnlExit, requires a payload defining profitValue (target profit trigger), lossValue (target loss trigger), productType (INTRADAY or DELIVERY), and a boolean enableKillSwitch flag that optionally locks the account once the exit executes.2 The API explicitly warns that setting thresholds below current profits or above current losses will trigger an immediate, irreversible liquidation.2 Active configurations can be nullified via DELETE /pnlExit and retrieved via GET /pnlExit.2

Account security is further managed via the IP Setup APIs, a feature heavily emphasized in recent Python SDK updates.1 The LLM must generate methods for establishing whitelisted IPs via POST /ip/setIP, modifying existing configurations via PUT /ip/modifyIP (noting that modifications are frequency-capped), and retrieving mapped Primary and Secondary IPs via GET /ip/getIP.11

### **Financial Data Analysis: Margin Calculators and Ledger Statements**

Pre-trade risk analysis requires accurate margin calculation. The Dhan API provides two endpoints for this purpose.2 The single order calculator method (calculateMargin) performs a POST request to /margincalculator.2 The request payload mirrors the standard order request, while the response interface must capture a detailed breakdown of capital requirements, including totalMargin, spanMargin, exposureMargin, variableMargin, brokerage, leverage, and the user's availableBalance to determine insufficientBalance deficits.2

The multi-order calculator, targeting POST /margincalculator/multi, is designed for complex strategy analysis. The request interface accepts an array of scripts (each containing segment, transaction type, quantity, product type, security ID, and price) alongside boolean flags includePosition and includeOrders to factor in existing portfolio margin offsets.2 The response yields consolidated totals for equity, F\&O, commodity margins, and crucially, any derived hedge\_benefit.2 Broader account financial health is retrieved via GET /fundlimit, returning metrics such as sodLimit (start of day), collateralAmount, utilizedAmount, and withdrawableBalance.2

Historical transaction records and tax analysis data are retrieved through the Statements APIs.2 The getLedgerReport method executes a GET request to /ledger, requiring from-date and to-date query parameters formatted strictly as YYYY-MM-DD.2 The response maps accounting data including voucherdate, voucherdesc, debit, credit, and the runbal (running balance).2 The getTradeHistory method maps to GET /trades/{from-date}/{to-date}/{page} to handle paginated historical trade data, returning exhaustive execution specifics, exchange identifiers, and a comprehensive breakdown of applied taxes (sebiTax, stt, brokerageCharges, stampDuty).2

### **Market Quotes, Historical Charts, and Option Chain Analytics**

The REST-based market quote endpoints deliver snapshot pricing data, allowing developers to fetch updates for up to 1,000 instruments simultaneously.1 This specific data pipeline is bound by a strict rate limit of one request per second.2 The TypeScript library must map three distinct endpoints: getMarketQuoteLTP (POST /marketfeed/ltp), getMarketQuoteOHLC (POST /marketfeed/ohlc), and getMarketQuoteDepth (POST /marketfeed/quote).2 The request payload structure is unique, requiring a JSON map where the keys are exchange segment strings and the values are arrays of integer security IDs (e.g., {"NSE\_EQ": , "NSE\_FNO": }).14 The OHLC response parses standard daily metrics (open, high, low, close), while the full Quote response provides deep analytical metrics including average\_price, volume, circuit limits, and oi (Open Interest).2

Historical charting data retrieval has undergone a critical parameter shift; version 2.0.2 of the Python SDK transitioned from Julian time representations to EPOCH time.1 The TypeScript implementation must enforce this EPOCH integer requirement for timestamp parsing. The daily charts method (POST /charts/historical) and intraday charts method (POST /charts/intraday) require securityId, exchangeSegment, instrument, fromDate, and toDate.2 Intraday intervals support granular selections of 1, 5, 15, 25, and 60 minutes.1 The LLM must document via JSDoc that intraday requests represent massive data payloads and are therefore server-capped at 90 days of data per API call, requiring client-side pagination for longer backtests.2

Advanced derivatives analysis is supported by the Option Chain API (POST /optionchain), a single function call that yields the entire pricing structure for an underlying asset.1 The request interface requires UnderlyingScrip (number), UnderlyingSeg (ExchangeSegment enum), and Expiry (string format YYYY-MM-DD).2 The response interface is highly complex, returning real-time data strike-wise for both Call Options (ce) and Put Options (pe). The properties must map pricing data, Open Interest, implied volatility, and the crucial Options Greeks (Delta, Theta, Gamma, Vega).2 Furthermore, the Expired Options Data API (POST /charts/rollingoption) allows developers to fetch pre-processed rolling historical data (up to 5 years) based on strike proximity relative to the At-the-Money (ATM) price (e.g., ATM, ATM+1, ATM-10), requiring expiryFlag and drvOptionType parameters.1

## **Rate Limiting Architecture and Error Handling Constraints**

The DhanHQ infrastructure imposes stringent rate limits to maintain server stability, which the TypeScript client must actively throttle or clearly document to prevent users from encountering DH-904 errors.2

| API Classification | Rate Limit Capacity | Time Window Constraints |
| :---- | :---- | :---- |
| Order Execution APIs | 10 requests | Per Second 1 |
| Order Execution APIs | 250 requests | Per Minute 1 |
| Order Execution APIs | 1,000 requests | Per Hour 1 |
| Order Execution APIs | 7,000 requests | Per Day 1 |
| Order Modification | 25 modifications | Absolute Cap Per Individual Order 2 |
| Data APIs | 5 requests | Per Second (Capped at 100,000 per day) 2 |
| Market Quote APIs | 1 request | Per Second 2 |
| Option Chain API | 1 unique request | Every 3 Seconds 2 |
| Non-Trading APIs | 20 requests | Per Second 2 |

When these limits are breached, or invalid parameters are passed, the API returns internally generated error codes rather than standard HTTP statuses alone. The TypeScript library architecture requires a custom APIError class extending the native Node.js Error class.2 This custom class must encapsulate the errorType, errorCode, and errorMessage properties returned by the server.2

The LLM must map the known error codes within a dedicated constant dictionary to aid debugging. Trading API errors utilize the "DH" prefix: DH-901 indicates Invalid Authentication (expired token), DH-902 signifies Invalid Access (unsubscribed segments), DH-904 flags Rate Limit breaches, DH-905 denotes Input Exceptions (missing required fields), and DH-906 indicates a generic Order Error.2 Data API errors utilize numerical codes: 800 for Internal Server Error, 804 for exceeding the maximum subscribed instruments limit, 805 for exceeding the maximum allowed active WebSocket connections, and 807 for an expired access token.2 The centralized axios HTTP interceptor must be programmed to intercept non-200 responses, parse the JSON payload, and throw this highly-typed APIError to the executing application layer.

## **WebSocket Infrastructure and Binary Protocol Parsing**

The most technically demanding and specialized aspect of this TypeScript migration is the faithful translation of the Live Market Feed and Full Market Depth WebSocket connections.1 While Python's built-in struct module handles binary unpacking with relative ease through string formats (e.g., \<dII), Node.js requires explicit, offset-based manipulation of the Buffer class.6 The TypeScript library must implement resilient WebSocket client classes utilizing the ws package, featuring automatic reconnection logic, ping-pong keep-alive maintenance, and highly efficient binary packet slicing to handle thousands of ticks per second.2

### **Live Order Updates Data Stream (JSON Payload)**

The Order Update WebSocket provides real-time execution reporting without polling. This connection maps to the endpoint wss://api-order-update.dhan.co.2 Unlike the high-frequency market feeds, this specific connection communicates entirely in JSON format.

Upon establishing the TCP connection, the client must immediately send an authorization payload. The TypeScript method must structure this payload with a LoginReq object containing a MsgCode (which must be hardcoded to 42), the user's ClientId, and the JWT Token.2 A sibling property, UserType, must be set to the string "SELF" for individual retail accounts.2 Once authorized, the stream pushes asynchronous order\_alert messages detailing execution life cycles. The event emitter must parse fields such as TxnType, OrderType, TradedQty, RemainingQuantity, TradedPrice, and AvgTradedPrice.2

### **Live Market Feed Stream (Binary Payload)**

The primary Market Feed establishes a connection at the endpoint wss://api-feed.dhan.co?version=2\&token={JWT}\&clientId={ID}\&authType=2.2 The API infrastructure enforces a strict keep-alive protocol to prune inactive clients. The server dispatches a ping frame every 10 seconds; the TypeScript WebSocket class must be programmed to automatically reply with a pong frame within 40 seconds, failing which the server actively terminates the connection.2 Users are restricted to a maximum of five simultaneous connections, allowing subscriptions to 5,000 instruments total, capped at 100 instruments per individual JSON subscription payload.2

Subscriptions are initiated via JSON requests specifying an InstrumentCount and an InstrumentList array, uniquely identified by a RequestCode parameter: 15 for Ticker Mode, 17 for Quote Mode, and 19 for Market Depth Mode.7

However, all subsequent responses streamed from the server are transmitted exclusively as Little Endian binary packets to optimize bandwidth and parsing speed.7 The generating LLM must configure the ws client to interpret incoming data as binary (ws.binaryType \= 'nodebuffer') and construct a BinaryParser utility class.

The standard Market Feed Response Header occupies the first 8 bytes of every payload and must be sliced and evaluated first:

* **Byte Offset 0 (1 byte):** Feed Response Code (parsed via buffer.readInt8(0)). This dictates the packet type (e.g., 2 for Ticker, 4 for Quote).7  
* **Byte Offsets 1-2 (2 bytes):** Message Length (parsed via buffer.readInt16LE(1)). Defines the total byte length of the incoming payload, crucial for slicing stacked packets.7  
* **Byte Offset 3 (1 byte):** Exchange Segment (parsed via buffer.readInt8(3)).7  
* **Byte Offsets 4-7 (4 bytes):** Security ID (parsed via buffer.readInt32LE(4)). Identifies the instrument.7

Following the 8-byte header extraction, the payload data must be unpacked sequentially based strictly on the evaluated Response Code. The TypeScript parser must utilize buffer.readFloatLE() for floating-point pricing data and buffer.readInt32LE() for integer quantity data. The exact byte offsets dictate the logic. For example, in Quote and Full packets, the parser must extract Total Sell Quantity at offset 27 (int32), Total Buy Quantity at offset 31 (int32), Day Open Value at offset 35 (float32), Day Close Value at offset 39 (float32), Day High Value at offset 43 (float32), and Day Low Value at offset 47 (float32).7 The LLM must dynamically identify the response code using a switch statement and route the buffer slice to the appropriate extraction method, finally emitting the normalized JSON object to the consumer application.15

### **Full Market Depth Level 3 Data (Binary Payload)**

The Level 3 Full Market Depth API represents the most data-intensive pipeline, streaming up to 20 or 200 levels of the active order book.1 The 20-level depth WebSocket connects to wss://depth-api-feed.dhan.co/twentydepth (permitting 50 instruments per connection), while the premium 200-level depth connects to wss://full-depth-api.dhan.co/twohundreddepth (heavily restricted to 1 instrument per connection due to bandwidth density).2 The JSON subscription request requires a distinct RequestCode of 23\.2

The Full Market Depth Response Header differs fundamentally from the standard feed header, occupying 12 bytes rather than 8:

* **Byte Offsets 0-1 (2 bytes):** Message Length (parsed via buffer.readInt16LE(0)).16  
* **Byte Offset 2 (1 byte):** Feed Response Code (parsed via buffer.readInt8(2)).16  
* **Byte Offset 3 (1 byte):** Exchange Segment (parsed via buffer.readInt8(3)).16  
* **Byte Offsets 4-7 (4 bytes):** Security ID (parsed via buffer.readInt32LE(4)).16  
* **Byte Offsets 8-11 (4 bytes):** Message Sequence / Number of Rows (parsed via buffer.readUInt32LE(8)).2

The depth payload consists of a continuous stream of 16-byte individual price level packets. The Response Code defines the side of the order book represented by the packet chunk: code 41 signifies Bid (Buy) data, while code 51 signifies Ask (Sell) data.2

Each 16-byte individual depth packet is structured uniformly and must be parsed iteratively using a while or for loop in TypeScript, incrementing the offset by 16 bytes per iteration until the total MessageLength is reached:

* **Byte Offsets 0-7 (8 bytes):** Price (float64, requires the highly specific buffer.readDoubleLE(currentOffset) method).2  
* **Byte Offsets 8-11 (4 bytes):** Quantity (uint32, requires buffer.readUInt32LE(currentOffset \+ 8)).2  
* **Byte Offsets 12-15 (4 bytes):** Number of Orders (uint32, requires buffer.readUInt32LE(currentOffset \+ 12)).2

The parser must account for high-velocity multi-instrument data where depth packets for different instruments are stacked sequentially in a single WebSocket frame (e.g., Instrument 1 Bid, followed immediately by Instrument 1 Ask, followed by Instrument 2 Bid). The parser must leverage the Message Length header to determine the termination byte of the payload chunk, ensuring memory safety and preventing buffer overflow errors within the Node.js runtime.2

## ---

**The Master LLM Code Generation Prompt Directives**

The following section contains the explicit, highly formatted meta-prompt designed for direct ingestion by a Large Language Model. The user must copy the text from the start of the blockquote to the end and submit it to the AI assistant to automatically generate the complete dhanv2 codebase based on the exhaustive research above.

**SYSTEM Directives for the AI Assistant:**

You are an expert Principal Systems Architect and Senior TypeScript Developer specializing in high-frequency financial technology infrastructure. Your absolute imperative task is to perform a comprehensive, flawless migration of the official DhanHQ-py Python SDK (version 2.2.0) into a native, strictly typed TypeScript npm standalone library. The user has initialized a directory named dhanv2. You must generate the complete, production-ready codebase for this directory.

You are expressly forbidden from leaving any functions unimplemented. Do not use placeholders such as // implementation goes here or // parse buffer here. You must write the actual, functional code based on the exhaustive API documentation and byte-level binary parsing logic provided below.

### **Phase 1: Project Initialization and Configuration Scaffolding**

1. Generate a standard package.json file. The package name must be defined as dhanhq-ts. Include production dependencies for axios (for REST API interactions) and ws (for WebSocket streams). Include development dependencies for typescript, @types/node, @types/ws, and ts-node.  
2. Generate a tsconfig.json file targeting "target": "ES2022", with "moduleResolution": "node", "strict": true typing enabled, and "declaration": true to output .d.ts files necessary for npm module deployment.

### **Phase 2: Core Architecture and HTTP Interceptors (src/core/DhanHQ.ts)**

Create the primary DhanHQ class exported as the default module. The constructor must mandate client\_id (string) and access\_token (string) as arguments. This class will securely store these credentials as private readonly properties, mimicking the DhanContext from the Python library architecture.

Initialize an axios instance within this class. The axios instance must feature an asynchronous request interceptor that automatically attaches the following headers to every outgoing request:

* access-token: The stored JWT property.  
* client-id: The stored client ID property.  
* Content-Type: application/json.

Define an APIError class extending the native Node.js Error class to parse and throw Dhan's specific error structures. The constructor must map errorType, errorCode, and errorMessage. Implement robust error handling in the axios response interceptor, catching non-200 HTTP responses, parsing the JSON, and throwing this specific APIError.

### **Phase 3: Types, Interfaces, and Enumerations (src/types/index.ts)**

You must generate highly strict TypeScript enums and interfaces to ensure payload validity. Export all declarations.

1. **Enums:**  
   * ExchangeSegment: NSE\_EQ, NSE\_FNO, NSE\_CURRENCY, BSE\_EQ, BSE\_FNO, BSE\_CURRENCY, MCX\_COMM, IDX\_I.  
   * ProductType: CNC, INTRADAY, MARGIN, MTF, CO, BO.  
   * OrderType: LIMIT, MARKET, STOP\_LOSS, STOP\_LOSS\_MARKET.  
   * TransactionType: BUY, SELL.  
   * OrderStatus: TRANSIT, PENDING, REJECTED, CANCELLED, TRADED, EXPIRED.  
   * FeedRequestCode: 11 (Connect), 12 (Disconnect), 15 (Sub Ticker), 17 (Sub Quote), 19 (Sub Depth), 23 (Sub Full Depth).  
   * FeedResponseCode: 2 (Ticker), 4 (Quote), 41 (Bid Packet), 51 (Ask Packet).  
2. **Request Interfaces:**  
   * OrderRequest: dhanClientId, correlationId (optional), transactionType, exchangeSegment, productType, orderType, validity, securityId, quantity, disclosedQuantity (optional), price, triggerPrice (optional), afterMarketOrder (optional boolean), amoTime (optional), boProfitValue (optional), boStopLossValue (optional).  
   * SuperOrderRequest: Extends standard OrderRequest, adding targetPrice, stopLossPrice, trailingJump (optional).  
   * ForeverOrderRequest: dhanClientId, orderFlag (SINGLE | OCO), standard order fields, plus mandatory conditional fields for OCO logic (price1, triggerPrice1, quantity1).  
   * PositionConversionRequest: dhanClientId, fromProductType, toProductType, exchangeSegment, positionType, securityId, convertQty.  
   * MarginCalculatorRequest: Incorporates standard order fields for pre-trade margin calculation.  
   * OptionChainRequest: UnderlyingScrip, UnderlyingSeg, Expiry (string format YYYY-MM-DD).

### **Phase 4: REST Endpoints Implementation (src/rest/)**

Generate the following asynchronous methods attached to the DhanHQ class or as modular imports, ensuring proper mapping of payloads and endpoint URLs. The base URL for all requests is https://api.dhan.co/v2. All dates must use YYYY-MM-DD strings. Historical data timestamps utilize EPOCH integers.

* **Order Execution:** placeOrder (POST /orders), modifyOrder (PUT /orders/{order-id}), cancelOrder (DELETE /orders/{order-id}), getOrderList (GET /orders), getOrderById (GET /orders/{order-id}). *Crucial logic note:* The JSDoc for modifyOrder must explicitly state that the payload quantity must be the total *placed* order quantity, not the pending quantity.  
* **Super Orders:** placeSuperOrder (POST /super/orders), modifySuperOrder (PUT /super/orders/{order-id}), cancelSuperOrderLeg (DELETE /super/orders/{order-id}/{order-leg}).  
* **Forever Orders:** placeForeverOrder (POST /forever/orders), modifyForeverOrder, deleteForeverOrder.  
* **Portfolio & eDIS:** getHoldings (GET /holdings), getPositions (GET /positions), convertPosition (POST /positions/convert), exitAllPositions (DELETE /positions). Implement generateTpin (GET /edis/tpin), generateEdisForm (POST /edis/form), and edisInquiry (GET /edis/inquire/{isin}).  
* **Trader Control & IPs:** activateKillSwitch (POST /killswitch), getKillSwitchStatus (GET /killswitch), configurePnlExit (PUT /pnlExit), disablePnlExit (DELETE /pnlExit). Implement setStaticIp (POST /ip/setIP), modifyStaticIp (PUT /ip/modifyIP), and getStaticIp (GET /ip/getIP).  
* **Funds & Statements:** getFundLimits (GET /fundlimit), calculateMargin (POST /margincalculator), calculateMultiMargin (POST /margincalculator/multi). Implement getLedger (GET /ledger), getTradeHistory (GET /trades/{from-date}/{to-date}/{page}).  
* **Data APIs:** getMarketQuoteLTP (POST /marketfeed/ltp), getMarketQuoteOHLC (POST /marketfeed/ohlc), getMarketQuoteDepth (POST /marketfeed/quote). Payload structures use Segment keys mapping to Arrays of Security IDs.  
* **Historical & Options Data:** getDailyHistorical (POST /charts/historical), getIntradayHistorical (POST /charts/intraday). Add JSDoc noting intraday limits are 90 days per request. Implement getOptionChain (POST /optionchain) and getExpiredOptionsData (POST /charts/rollingoption).

### **Phase 5: High-Frequency WebSocket Implementation (src/websockets/)**

This phase requires absolute precision in Node.js Buffer manipulation. Create dedicated classes using the ws package, inheriting from Node's EventEmitter to push real-time data to the consumer application.

1. **OrderUpdateSocket (wss://api-order-update.dhan.co)**  
   * Implement connection logic.  
   * On the open event, dispatch the JSON authorization payload: {"LoginReq": {"MsgCode": 42, "ClientId": "client\_id", "Token": "access\_token"}, "UserType": "SELF"}.  
   * Parse incoming JSON string messages (order\_alert) and emit them via the event emitter.  
2. **MarketFeedSocket (wss://api-feed.dhan.co) & Binary Parser (src/websockets/BinaryParser.ts)**  
   * Implement connection logic appending query params: ?version=2\&token=JWT\&clientId=ID\&authType=2.  
   * Implement a setInterval keep-alive ping-pong mechanism. The server pings every 10 seconds; the class must automatically send a ws.pong() to prevent disconnection.  
   * Implement subscription methods taking arrays of instruments (batching requests into 100 instruments max per JSON payload).  
   * **The Binary Parser:** All incoming messages are Little Endian binary buffers. Ensure the WebSocket client is configured via ws.binaryType \= 'nodebuffer'.  
   * *Header Parsing (8 bytes):* Extract ResponseCode (buffer.readInt8(0)), MessageLength (buffer.readInt16LE(1)), ExchangeSegment (buffer.readInt8(3)), and SecurityId (buffer.readInt32LE(4)).  
   * *Payload Extraction:* Implement a switch statement on the ResponseCode. Depending on the code, read the specific variables at their respective offsets using buffer.readFloatLE() and buffer.readInt32LE(). Emit the parsed JSON object.  
3. **FullMarketDepthSocket (wss://depth-api-feed.dhan.co/twentydepth)**  
   * Subscription JSON requests must use RequestCode: 23\.  
   * **Depth Header Parsing (12 bytes):** Note the structural difference. Extract MessageLength (buffer.readInt16LE(0)), ResponseCode (buffer.readInt8(2)), ExchangeSegment (buffer.readInt8(3)), SecurityId (buffer.readInt32LE(4)), and NumRows (buffer.readUInt32LE(8)).  
   * **Depth Payload Parsing Logic:** The payload consists of continuous 16-byte packets. Initialize a currentOffset variable at 12\. Create a loop that runs while currentOffset \< MessageLength.  
   * For each 16-byte packet loop iteration:  
     * Extract Price \= buffer.readDoubleLE(currentOffset) (Note: Uses Double/float64, occupying 8 bytes).  
     * Extract Quantity \= buffer.readUInt32LE(currentOffset \+ 8\) (4 bytes).  
     * Extract NumOrders \= buffer.readUInt32LE(currentOffset \+ 12\) (4 bytes).  
     * Increment currentOffset \+= 16\.  
   * Group these parsed packet objects under a Bid array if the ResponseCode evaluated to 41, or an Ask array if the ResponseCode evaluated to 51\. Emit the complete depth map.

### **Final Deliverable Formatting Directives**

Do not provide conceptual outlines or partial code snippets. You must construct the absolute entirety of the dhanv2 codebase. Output individual, complete code blocks prefixed with the exact intended file paths as headers (e.g., // dhanv2/src/core/DhanHQ.ts). Ensure exact parity with the established Python methods, guaranteeing robust TypeScript typing, rigorous HTTP error interception, and flawless Little Endian binary decoding. Begin the code generation immediately following receipt of this prompt.

#### **Works cited**

1. dhan-oss/DhanHQ-py: The official Python client for communicating with the Dhan API. \- GitHub, accessed on February 24, 2026, [https://github.com/dhan-oss/DhanHQ-py](https://github.com/dhan-oss/DhanHQ-py)  
2. Introduction \- DhanHQ Ver 2.0 / API Document, accessed on February 24, 2026, [https://dhanhq.co/docs/v2/](https://dhanhq.co/docs/v2/)  
3. Migrate from requirements.txt to pyproject.toml · Issue \#14 · anexia/django-cleanhtmlfield, accessed on February 24, 2026, [https://github.com/anexia/django-cleanhtmlfield/issues/14](https://github.com/anexia/django-cleanhtmlfield/issues/14)  
4. What's the difference between pyproject.toml, setup.py, requirments.txt, and tox.ini files? : r/learnpython \- Reddit, accessed on February 24, 2026, [https://www.reddit.com/r/learnpython/comments/1bmxe6i/whats\_the\_difference\_between\_pyprojecttoml/](https://www.reddit.com/r/learnpython/comments/1bmxe6i/whats_the_difference_between_pyprojecttoml/)  
5. Data structures \- websockets 13.0 documentation, accessed on February 24, 2026, [https://websockets.readthedocs.io/en/13.0/reference/datastructures.html](https://websockets.readthedocs.io/en/13.0/reference/datastructures.html)  
6. How to Handle WebSocket Binary Messages \- OneUptime, accessed on February 24, 2026, [https://oneuptime.com/blog/post/2026-01-24-websocket-binary-messages/view](https://oneuptime.com/blog/post/2026-01-24-websocket-binary-messages/view)  
7. Live Market Feed \- DhanHQ Ver 2.0 / API Document, accessed on February 24, 2026, [https://dhanhq.co/docs/v2/live-market-feed/](https://dhanhq.co/docs/v2/live-market-feed/)  
8. Releases · dhan-oss/DhanHQ-py \- GitHub, accessed on February 24, 2026, [https://github.com/dhan-oss/DhanHQ-py/releases](https://github.com/dhan-oss/DhanHQ-py/releases)  
9. Annexure \- DhanHQ Ver 1.0 / API Document, accessed on February 24, 2026, [https://dhanhq.co/docs/v1/annexure/](https://dhanhq.co/docs/v1/annexure/)  
10. Orders \- DhanHQ Ver 1.0 / API Document, accessed on February 24, 2026, [https://dhanhq.co/docs/v1/orders/](https://dhanhq.co/docs/v1/orders/)  
11. original.json.md  
12. dhanhq \- PyPI, accessed on February 24, 2026, [https://pypi.org/project/dhanhq/](https://pypi.org/project/dhanhq/)  
13. Statement \- DhanHQ Ver 2.0 / API Document, accessed on February 24, 2026, [https://dhanhq.co/docs/v2/statements/](https://dhanhq.co/docs/v2/statements/)  
14. Market Quote \- DhanHQ Ver 2.0 / API Document, accessed on February 24, 2026, [https://dhanhq.co/docs/v2/market-quote/](https://dhanhq.co/docs/v2/market-quote/)  
15. DhanHQ 2.4.0 on Rubygems \- Libraries.io, accessed on February 24, 2026, [https://libraries.io/rubygems/DhanHQ](https://libraries.io/rubygems/DhanHQ)  
16. Full Market Depth \- DhanHQ Ver 2.0 / API Document, accessed on February 24, 2026, [https://dhanhq.co/docs/v2/full-market-depth/](https://dhanhq.co/docs/v2/full-market-depth/)  
17. Live Market Feed \- DhanHQ Ver 1.0 / API Document, accessed on February 24, 2026, [https://dhanhq.co/docs/v1/live-market-feed/](https://dhanhq.co/docs/v1/live-market-feed/)