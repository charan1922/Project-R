## Context

The Quant Lab introduces advanced financial visualization (Sector Rotation Map/RRG) and algorithmic strategy backtesting to Project-R. Previously, the system relied purely on simple TradingView-style charts and basic data downloading. The new requirements push high-performance array manipulations, complex Z-score standardizations, and iterative portfolio simulations into the Next.js environment, rather than outsourcing to a Python `vectorbt` microservice.

## Goals / Non-Goals

**Goals:**
- Implement a pure TypeScript mathematical engine for Relative Rotation Graphs and Backtesting.
- Re-use the existing SQLite DB (`historify.db`) for instant historical price fetching and implement a dynamic fallback to the Dhan V2 API for missing data to ensure 100% data availability.
- Faithfully replicate multi-entry vectorbt Python strategies (EMA Crossover, RSI Accumulation, Dual Momentum, Buy & Hold) ensuring zero logical deviation.
- Ensure realistic Indian market fee modeling (Delivery, Intraday, Futures, Options) within backtests.

**Non-Goals:**
- Creating a separate Python FastAPI server for quant logic (explicitly excluded by user preference for a unified stack).
- Building an interactive visual drag-and-drop strategy builder (strategies will remain code-level templates).

## Decisions

- **Custom Math Logic**: Decided against heavy external libraries like `mathjs` in favor of custom, lightweight rolling window and exponential smoothing functions (`math-utils.ts`). This maximizes V8 execution speed, simplifies typings, and minimizes the overall deployment bundle.
- **RRG Rendering**: Decided to use a raw HTML5 `<canvas>` for rendering the Relative Rotation Graph instead of standard chart libraries (like `lightweight-charts` or `recharts`). This provides strict, performant control over drawing the trailing momentum "tails", axes, and quadrant color mapping.
- **Backtest Accumulation Engine**: Upgraded the standard signal-to-portfolio processor to allow "additive allocations" over time (e.g., buying in 5%, 10%, 20% slabs based on RSI depth) to exactly mirror `vectorbt`'s `accumulate=True` parameters.

## Risks / Trade-offs

- **Risk: Node.js Thread Blocking**  
  *Mitigation*: Running deep historical backtests or 13-asset RRG combinations involves intense looping. We mitigated this by offloading the math completely to Next.js API Routes (`/api/quant/backtest`, `/api/quant/rrg`) rather than calculating inside the React Client Components, keeping the UI thread fluid.
- **Risk: API Rate Limits during RRG Mapping**  
  *Mitigation*: The RRG requires 2 years of daily data for 12 sectors + 1 benchmark simultaneously. If not cached, 13 instant live API calls would breach Dhan's strict 4 req/sec limit. `data-loader.ts` mitigates this by hitting the local `historify.db` SQLite database *first*, and utilizes a 5-minute memory cache to prevent duplicate fetches.
