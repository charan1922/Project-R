## Why

The purpose of this change is to implement a Quant Lab section within the Project-R platform. The user requires a self-hosted, enterprise-grade analytical experience, encompassing a Sector Rotation Map (Relative Rotation Graph) and a robust Backtesting Engine, natively built with TypeScript inside the Next.js application, avoiding any Python microservices. This empowers complex strategy simulation and market money flow visualization over live Indian market data fetched via the Dhan V2 API.

## What Changes

- **Quant Lab Navigation Section**: Adds a new category and links in the application sidebar.
- **Sector Rotation Map (RRG)**: Creates an interactive 4-quadrant UI component that mathematically maps 12 NSE sectors against customizable benchmarks using exponential trailing momentum and normalized Z-scores.
- **Backtesting Engine**: Implements a signal-based portfolio simulator modeling realistic Indian market fee segments (Delivery, Intraday, F&O).
- **Embedded Trading Strategies**: Transpiles popular Python `vectorbt` strategies (EMA Crossover, RSI Slab Accumulation, Dual Momentum ETF Rotation, Buy & Hold) into pure TypeScript.
- **Data Loaders**: Adds SQLite caching and Dhan V2 API fallback capabilities for historical OHLCV data.
- **API Endpoints**: Introduces Next.js server routes `/api/quant/rrg` and `/api/quant/backtest` for high-performance computation.

## Capabilities

### New Capabilities
- `sector-rotation-map`: Computing, normalizing, and visualizing trailing relative strength ratios and momentum for various sectors vs a benchmark.
- `vectorbt-engine`: A signal-to-portfolio simulation framework supporting additive slab accumulation, Indian 4-segment fees, and advanced KPI metrics (Sharpe, CAGR, Max Drawdown).
- `quant-data-loader`: Mechanisms for resolving symbols, accessing local SQLite datasets, and dynamically fetching missing intraday/daily history from Dhan.

### Modified Capabilities


## Impact

- Adds new math utilities, fee model definitions, and `mathjs` logical implementations replacing pandas/numpy.
- Integrates directly with the existing `historify.db` for instant access to pre-synchronized data, lowering the Dhan API rate limit exposure.
- Introduces substantial mathematical computation loads directly onto the Node.js API layer.
