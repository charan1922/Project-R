# Enterprise Architecture & Practices

Project-R is built with robust, production-grade architectural decisions to ensure high performance, type safety, and maintainability, even when running locally.

## 1. High-Performance Data Layer & Indexing
Instead of a standard ORM that adds overhead, we use `better-sqlite3` and `DuckDB`. In Node.js, these are compiled natively, making them the absolute fastest drivers available for historical analysis.

- **Covering Index (The Magic)**: When creating the `historical_data` table, we defined a composite `PRIMARY KEY (symbol, exchange, interval, timestamp)`. In SQLite, this automatically creates a powerful B-Tree index structured exactly in that order. Because all our queries fetch data using those exact columns, SQLite jumps straight to the relevant memory block without having to scan the table row-by-row (an O(logN) lookup instead of O(N)).
- **Parquet Data Lakes**: For large-scale quant research, we transition data into Parquet files. This column-oriented storage allows us to scan millions of rows of "Close" prices without ever reading "Open" or "Volume" from disk, resulting in 10x faster backtests.

## 2. Real-Time Event-Driven Architecture
To support sub-second monitoring, Project-R implements a high-frequency streaming pipeline between the Dhan Exchange and the browser.

- **Multiplexed SSE Bridge**: We use a Server-Sent Events (SSE) bridge to decouple the browser from the raw binary WebSocket. This allows the server to manage authentication, handle automatic reconnections, and multiplex data streams across multiple UI tabs without hitting Dhan's 5-connection limit.
- **Protocol-Accurate Binary Parsing**: The `BinaryParser` implements the Dhan V2 protocol natively in Node.js. It handles 12-byte headers and Little Endian payloads (LTP, LTT, OHLCV) with zero-copy buffer slicing, ensuring the lowest possible latency before data reaches the chart.
- **Hybrid Data Seeding**: Upon symbol selection, the dashboard performs a "Flash Sync"—fetching 24 hours of 1-minute historical bars via REST before instantly switching to the live WebSocket tick stream. This ensures the technical context is never empty.

## 3. Advanced UI Rendering
- **HTML5 Canvas for complex visualizations**: For the Sector Rotation Map (RRG), we chose Canvas over SVG or standard DOM elements because Canvas can render thousands of data points and complex interpolation curves smoothly at 60FPS. 
- **Zero-Latency Charting**: For real-time price action, we use `lightweight-charts` v5. By storing the chart instance in a `useRef` and calling the native `.update()` method directly from the WebSocket stream, we bypass the React Virtual DOM entirely. This prevents UI "jank" even during high-volatility market opens.

## 4. Type Safety & Predictability
The entire stack is **100% TypeScript** (TypeScript 5.7+ / Node 22). Everything — from the Dhan API calls to the SQLite query outputs and the Backtester strategies — is strictly, statically typed. 
- There are absolutely no `any` types leaking through the core calculation engines, which prevents runtime crashes and ensures predictability.

## 5. Direct Mathematical Computing (Zero Bloat)
Instead of relying on massive, slow Python bridging microservices for the Quant Lab, we meticulously ported the exact VectorBT algorithms into pure TypeScript (`lib/quant/math-utils.ts` and the backtest engine). 
- We wrote our own optimized functions (like Wilder's Smoothing for RSI) that run bare-metal in V8, avoiding heavy JavaScript library bloat or cross-network latency.

## 6. Robust Error Handling & Rate Limiting
- When pulling data from the Dhan V2 API, we handle HTTP status codes gracefully and automatically manage the `X-Rate-Limit` constraints. 
- The Next.js API Routes correctly isolate connections so that massive file downloads (e.g., streaming 4+ million rows via `/api/historify/export`) stream efficiently without blocking the main UI threads.

## 7. Thorough Documentation (OpenSpec)
We don't just write code; we write specifications. Using the OpenSpec standard, every single feature (like `quant-lab`, `live-trading-dashboard`, and `historify-export`) follows an enterprise-style **Proposal, Design Doc, BDD Spec, and Task List**. 
- We rigorously verify all implementations against the original specifications to ensure feature completeness and prevent scope creep.
