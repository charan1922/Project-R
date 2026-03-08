# Enterprise Architecture & Practices

Project-R is built with robust, production-grade architectural decisions to ensure high performance, type safety, and maintainability, even when running locally.

## 1. High-Performance Data Layer & Indexing
Instead of a standard ORM that adds overhead, we use `better-sqlite3`. In Node.js, `better-sqlite3` is synchronous and compiles natively, making it the absolute fastest SQLite driver available.

- **Covering Index (The Magic)**: When creating the `historical_data` table, we defined a composite `PRIMARY KEY (symbol, exchange, interval, timestamp)`. In SQLite, this automatically creates a powerful B-Tree index structured exactly in that order. Because all our queries fetch data using those exact columns, SQLite jumps straight to the relevant memory block without having to scan the table row-by-row (an O(logN) lookup instead of O(N)).
- **Built-in Sorting**: The index natively stores rows ordered chronologically by `timestamp` for each symbol. When the chart fetches data using `ORDER BY timestamp DESC`, SQLite doesn't actually have to sort anything in memory — it just reads the index backward.
- **Strict Prefix Filtering**: We strictly filter by all prefix columns (like `exchange = 'NSE'`) in our extraction and export queries. SQLite indexes must be used in left-to-right order, so filtering by the full prefix chain ensures the B-Tree index is used perfectly without falling back to partial table scans.

Whether you're querying a localized 100 rows for the chart, or streaming 200,000 rows for a raw CSV export, `better-sqlite3` will fetch that data in milliseconds directly out of the B-Tree index. You shouldn't hit any performance bottlenecks!

## 2. Type Safety & Predictability
The entire stack is **100% TypeScript** (TypeScript 5.7+ / Node 22). Everything — from the Dhan API calls to the SQLite query outputs and the Backtester strategies — is strictly, statically typed. 
- There are absolutely no `any` types leaking through the core calculation engines, which prevents runtime crashes and ensures predictability.

## 3. Direct Mathematical Computing (Zero Bloat)
Instead of relying on massive, slow Python bridging microservices for the Quant Lab, we meticulously ported the exact VectorBT algorithms into pure TypeScript (`lib/quant/math-utils.ts` and the backtest engine). 
- We wrote our own optimized functions (like Wilder\'s Smoothing for RSI) that run bare-metal in V8, avoiding heavy JavaScript library bloat or cross-network latency.

## 4. Advanced UI Rendering
- **HTML5 Canvas for complex visualizations**: For the Sector Rotation Map (RRG), we chose Canvas over SVG or standard DOM elements because Canvas can render thousands of data points and complex interpolation curves smoothly at 60FPS. 
- **Industry-Standard Charting**: For standard financial charts, we use `lightweight-charts` by TradingView, which is the industry standard for fast, high-performance web charting.

## 5. Robust Error Handling & Rate Limiting
- When pulling data from the Dhan V2 API, we handle HTTP status codes gracefully and automatically manage the `X-Rate-Limit` constraints. 
- The Next.js API Routes correctly isolate connections so that massive file downloads (e.g., streaming 4+ million rows via `/api/historify/export`) stream efficiently without blocking the main UI threads.

## 6. Thorough Documentation (OpenSpec)
We don't just write code; we write specifications. Using the OpenSpec standard, every single feature (like `quant-lab`, `historify-ui-parity`, and `historify-export`) follows an enterprise-style **Proposal, Design Doc, BDD Spec, and Task List**. 
- We rigorously verify all implementations against the original specifications to ensure feature completeness and prevent scope creep.
