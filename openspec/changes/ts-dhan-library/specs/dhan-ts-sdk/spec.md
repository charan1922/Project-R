## ADDED Requirements

### Requirement: Client Initialization
The system SHALL provide a `dhanhq` class that initializes with `clientId`, `accessToken`, and `environment` (sandbox or prod), matching the authentication method of the Python SDK.

#### Scenario: Successful initialization
- **WHEN** a user instantiates `dhanhq` with valid credentials
- **THEN** the client configures its internal base URL based on the environment and sets up default headers

### Requirement: Order Placement
The system SHALL support placing various order types (limit, market, stop loss, etc.), matching exactly the parameter casing and typing defined in the Python `dhanhq.py` `place_order` equivalent.

#### Scenario: Submitting limit order
- **WHEN** the user calls `placeOrder` with a limit price and quantity
- **THEN** the system issues a POST request to `/orders` and returns the order status response

### Requirement: Portfolio Fetch
The system SHALL support fetching current positions, holdings, and funds.

#### Scenario: Fetching holdings
- **WHEN** the user calls `getHoldings`
- **THEN** the system issues a GET request to `/holdings` and returns an array of holding responses

### Requirement: Historic Data
The system SHALL allow fetching historical minute or daily data for a given security.

#### Scenario: Fetching historical quotes
- **WHEN** the user calls `getHistoricalData` with a symbol and date range
- **THEN** the system issues a POST request to `/charts/historical` and parses the OHLCV JSON response
