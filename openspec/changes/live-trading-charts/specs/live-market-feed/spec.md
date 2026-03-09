## ADDED Requirements

### Requirement: Dhan WebSocket Authentication
The system SHALL securely authenticate with the Dhan V2 Live Market WebSocket using the `DHAN_CLIENT_ID` and Access Token.

#### Scenario: Successful connection
- **WHEN** the Live Trading Dashboard mounts
- **THEN** the WebSocket manager establishes a wss:// connection and transmits the authentication payload containing the JWT token.

### Requirement: Real-time Tick Parsing
The system SHALL parse incoming binary/JSON blobs from the Dhan WebSocket into a structured `{ time, open, high, low, close, volume }` format compatible with Lightweight Charts.

#### Scenario: Receiving a trade tick
- **WHEN** a new trade occurs on the exchange for a subscribed symbol
- **THEN** the system decodes the WebSocket message and pushes the updated price tick to the Zustand state store.

### Requirement: Automatic Reconnection
The system SHALL automatically attempt to reconnect to the Dhan WebSocket if the connection drops unexpectedly.

#### Scenario: Network drop
- **WHEN** the WebSocket connection closes with a non-normal error code
- **THEN** the system waits for an exponential backoff period and attempts to initialize a new connection without crashing the app.
