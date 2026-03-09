## ADDED Requirements

### Requirement: Dhan WebSocket Authentication
The system SHALL securely authenticate with the Dhan V2 Live Market WebSocket using the `DHAN_CLIENT_ID` and Access Token.

#### Scenario: Successful connection
- **WHEN** the Live Trading Dashboard mounts
- **THEN** the WebSocket manager establishes a wss:// connection and transmits credentials via query parameters (v2 protocol).
- **AND** the system SHALL manually load credentials from `.env.local` if they are not already present in the environment.

### Requirement: Real-time Protocol-Accurate Binary Parsing
The system SHALL parse incoming binary blobs from the Dhan V2 WebSocket using a 12-byte header and precise payload field mapping.

#### Scenario: Receiving a quote packet
- **WHEN** a new quote packet (ResponseCode 4) arrives from the exchange
- **THEN** the system decodes the 12-byte header (MessageLength, FeedCode, Segment, SecurityID) and extracts LTP, LTT, and OHLCV from the payload.

### Requirement: Automatic Reconnection
The system SHALL automatically attempt to reconnect to the Dhan WebSocket if the connection drops unexpectedly.

#### Scenario: Network drop
- **WHEN** the WebSocket connection closes with a non-normal error code
- **THEN** the system waits for an exponential backoff period and attempts to initialize a new connection without crashing the app.
