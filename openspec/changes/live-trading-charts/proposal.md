## Why

Project-R currently excels at historical data analysis and algorithmic backtesting using DuckDB and Parquet. However, to operate as a true enterprise-grade algorithmic trading platform, it requires real-time market monitoring capabilities. Integrating Dhan's Live WebSockets with the existing Lightweight Charts library will allow users to track tick-by-tick price action, executing trades precisely when quantitative conditions are met in real-time.

## What Changes

- Introduce a new "Live Trading" section in the application navigation.
- Implement a robust WebSocket client connection manager to interface with the Dhan V2 Live Market Feed API.
- Develop a real-time reactive charting component using TradingView's `lightweight-charts` v5.
- Implement features such as real-time candlestick rendering, volume histogram updates, and dynamic price lines.
- Ensure the WebSocket connection handles reconnection logic, subscription limits, and throttling gracefully to maintain enterprise stability.

## Capabilities

### New Capabilities
- `live-market-feed`: Management of the Dhan WebSocket connection, authentication, and payload parsing.
- `realtime-charts`: The React generic component wrapper for Lightweight Charts designed for sub-second tick updates without React re-render penalties.
- `live-trading-dashboard`: The UI layout incorporating the charts, watchlist selector, and live order execution panes.

### Modified Capabilities
- `historify-charts`: May need refactoring to share core Lightweight Chart components with the new real-time system to ensure DRY principles.

## Impact

- **Dependencies**: Utilizes the existing `lightweight-charts` package. No new major dependencies.
- **APIs**: Will heavily utilize the Dhan API Key and Secret (rather than just the Access Token) as WebSockets require different authentication flows.
- **Architecture**: Introduces an event-driven, asynchronous streaming architecture to the frontend, requiring careful state management (Zustand or React Context) to prevent memory leaks from unclosed WebSocket connections.
