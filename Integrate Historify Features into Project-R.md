# **Engineering the Integration of Historify Data Management and Visualization Ecosystem into the Project-R Dhan V2 Framework**

The modernization of retail algorithmic trading in India has transitioned from simple order execution toward comprehensive data-centric ecosystems that facilitate backtesting, real-time analytics, and automated market synchronization. The integration of features from the Historify platform into the existing Project-R repository represents a significant architectural shift, requiring a deep understanding of the Dhan HQ Version 2.0 API, columnar database optimization, and modern web frameworks.1 This report provides an exhaustive technical analysis and a programmatic implementation roadmap for achieving feature parity with Historify within the Project-R environment, specifically leveraging the Dhan V2 stack for historical data acquisition and DuckDB for analytical storage.3

## **Architectural Foundations: Synthesizing Project-R and Historify**

The Historify application is a professional-grade web dashboard designed for the bulk management, visualization, and automated downloading of historical stock market data.1 Its architecture is built upon the OpenAlgo core, which provides a unified API layer across various Indian brokers, though for the purposes of Project-R, this layer will be strictly bound to the Dhan V2 infrastructure.6 The primary objective is to replicate the professional design system and high-performance data pipelines of Historify within the specific tech stack available in Project-R.1

### **Core Feature Matrix and Parity Analysis**

The transition to a Historify-like system requires the implementation of several key functional modules. These modules handle the lifecycle of market data from ingestion to storage and final visualization.1

| Feature Category | Historify Capability | Project-R Dhan V2 Integration Goal |
| :---- | :---- | :---- |
| **Data Acquisition** | OpenAlgo Multi-Broker API | Native Dhan HQ V2.0 Historical API |
| **Bulk Import** | Drag-and-drop CSV/Excel, Clipboard Paste | Security ID Mapping via Dhan Master Contracts |
| **Bulk Export** | Individual/Combined CSV, ZIP Archives | Streamed CSV Generation from DuckDB Storage |
| **Scheduler** | APScheduler with IST Timezone Support | Automated 3:35 PM IST and Interval Downloads |
| **Storage Engine** | SQLite (Metadata) \+ DuckDB (Historical) | Columnar Data Partitioning for OHLC Data |
| **Visualization** | TradingView Lightweight Charts 5.0 | Dynamic Indicator Overlay (EMA, RSI) |
| **Data Integrity** | Incremental Updates & Gap Detection | Bidirectional Checkpoint Synchronization |

The underlying trend in modern trading platforms is the move away from standard relational databases for high-frequency time-series data toward columnar storage engines like DuckDB, which offer superior compression and query performance for analytical workloads.8 Project-R must adopt this hybrid database approach to ensure the system remains responsive as the historical database grows to include thousands of symbols across multiple years.3

## **The Dhan HQ Version 2.0 Ingestion Protocol**

The Dhan HQ API serves as the primary data source for Project-R. The V2.0 release introduces critical changes to the historical and intraday data endpoints, most notably the move to standardized Security IDs and the transition from Julian time to Epoch (Unix) time.4

### **Technical Specifications for Historical Data Fetching**

The Dhan V2 API provides two primary endpoints for data retrieval: /charts/historical for daily candles and /charts/intraday for minute-based intervals.5 These endpoints require specific parameters that must be correctly mapped from the Project-R symbol management system.10

| Parameter | Type | Required | Description |
| :---- | :---- | :---- | :---- |
| securityId | String | Yes | Unique ID provided by Dhan for each instrument. |
| exchangeSegment | Enum | Yes | NSE\_EQ, NSE\_FNO, BSE\_EQ, MCX\_COMM, etc. |
| instrument | Enum | Yes | EQUITY, FUTIDX, OPTIDX, OPTSTK, etc. |
| interval | Integer | Yes (Intraday) | 1, 5, 15, 25, or 60-minute candles. |
| fromDate | String | Yes | Start date (YYYY-MM-DD) or (YYYY-MM-DD HH:MM:SS). |
| toDate | String | Yes | End date of the requested range. |
| oi | Boolean | Optional | Open Interest data for F\&O segments. |

A significant engineering constraint identified in the Dhan documentation is the 90-day limit for intraday data polling in a single request.5 To download the full five years of intraday data supported by Dhan, the Project-R implementation must incorporate a recursive chunking algorithm that segments a long-term request into multiple 90-day windows, respecting the API rate limits while ensuring no data gaps occur between segments.5

### **Handling API Rate Limits and Throughput**

The Dhan V2 API enforces strict rate limits to maintain system stability. For data-intensive applications like Project-R, the downloader logic must be throttled to avoid triggering HTTP 429 (Too Many Requests) errors.7

| API Category | Rate Limit (Per Second) | Rate Limit (Per Day) |
| :---- | :---- | :---- |
| **Data APIs** | 5 | 100,000 |
| **Quote APIs** | 1 | Unlimited |
| **Order APIs** | 10 | 7,000 |

The implication of these limits for a bulk download feature is that a watchlist of 1,000 symbols would require at least 200 seconds for a simple daily data sync, and considerably longer for multi-year intraday downloads due to the 90-day chunking requirement.5 The implementation must therefore use background processing and parallel thread pools, as seen in the Historify architecture, to manage these long-running tasks without blocking the user interface.1

## **Data Storage Engineering: The DuckDB Analytical Engine**

One of the most impactful features of Historify and OpenAlgo is the use of DuckDB for historical market data storage.8 Standard SQLite databases, while excellent for metadata like user settings and watchlists, often suffer from "Database Locked" errors under high concurrency and exhibit poor performance when calculating technical indicators across millions of rows.9

### **The Benefits of Columnar Time-Series Storage**

DuckDB is an analytical database that stores data column-wise rather than row-wise. This is particularly efficient for OHLC (Open, High, Low, Close) data for several reasons:

* **Compression**: Stock price data often has high similarity between consecutive rows; columnar storage allows for advanced compression techniques like Delta encoding or Run-Length Encoding.  
* **Vectorized Execution**: Queries that calculate averages (like SMA) or volatility can be processed using SIMD (Single Instruction, Multiple Data) instructions, significantly reducing CPU cycles.  
* **Zero-Copy Integration**: DuckDB can interact directly with Python's Pandas and NumPy libraries, which are core components of the Project-R/Historify data processing stack.1

### **Hybrid Database Architecture for Project-R**

To align with the OpenAlgo and Historify standard, Project-R should implement a multi-database approach where different types of data are isolated to prevent contention.9

| Database Name | Technology | Purpose |
| :---- | :---- | :---- |
| openalgo.db | SQLite | Main application state (users, watchlists, settings). |
| logs.db | SQLite | API traffic logs and error tracking. |
| historify.duckdb | DuckDB | Historical OHLC data and technical indicators. |
| sandbox.db | SQLite | Isolated database for paper trading and analyzer mode. |

The historify.duckdb file should store tables partitioned by symbol and interval. This allows the system to perform "Incremental Downloads" by querying the maximum timestamp for a given symbol and only requesting data from Dhan for the period between that timestamp and the current time.1

## **Automation and Scheduling: APScheduler Integration**

The Scheduler Manager is a critical component of the Historify ecosystem, allowing traders to automate the synchronization of their local databases with the exchange.1 For Project-R, this requires the integration of APScheduler with support for the India Standard Time (IST) zone.1

### **Market-Aware Scheduling Logic**

The scheduler must be configured to run jobs at specific times that coincide with Indian market events. Historify provides pre-configured schedules for market close (3:35 PM IST) and pre-market (8:30 AM IST).1

* **Daily Sync (3:35 PM IST)**: Once the market closes and final candles are formed, the system should trigger a bulk download for all symbols in the user's active watchlist.1  
* **Interval Sync (N minutes)**: For active strategies, the scheduler can be set to fetch the latest data every 1, 5, or 15 minutes during market hours, ensuring the local database is always up-to-date for real-time analysis.1

### **Job Management and Background Processing**

To handle the complexity of scheduling, Project-R needs a job management interface where users can pause, resume, or delete automated tasks.1 This management layer must interact with a non-blocking background processor. When a job is triggered, the system follows a specific sequence:

1. **Watchlist Retrieval**: The scheduler queries the SQLite database for symbols marked for automated download.1  
2. **State Verification**: For each symbol, the DuckDB database is checked for the "Last Synced" timestamp.5  
3. **API Execution**: The system calls the dhanv2 adapter to fetch only the missing data, adhering to rate limits.7  
4. **Persistence**: New data is appended to the DuckDB tables, and a success status is logged.9

## **Frontend Design and Professional Visualization**

The user experience of Historify is defined by its clean, modern dashboard interface built with Tailwind CSS and DaisyUI.1 This design system provides a professional environment inspired by top-tier fintech applications like Stripe and Supabase.1

### **Integrating TradingView Lightweight Charts**

High-performance visualization is achieved using TradingView Lightweight Charts 5.0.0.1 This library is chosen for its native performance and ability to handle large datasets smoothly on both desktop and mobile devices.

The visualization pipeline in Project-R should function as follows:

* **Data API**: A Flask endpoint /api/chart-data receives a symbol and interval request.  
* **DuckDB Query**: The backend fetches the required OHLC rows from DuckDB.  
* **Indicator Calculation**: Using Pandas and NumPy, technical indicators like EMA (Exponential Moving Average) and RSI (Relative Strength Index) are calculated on-the-fly.1  
* **JSON Response**: The data is returned as a JSON array of objects, which the TradingView library renders into the interactive chart.

### **Modern UI Components for Data Management**

The frontend should incorporate several specific components from the Historify design system 1:

* **Bulk Symbol Importer**: A modal that allows users to drag and drop CSV files or paste symbol lists directly from Excel. It includes real-time validation and duplicate detection.1  
* **Command Palette**: A keyboard-driven navigation tool (accessible via Cmd+K or Ctrl+K) that allows users to quickly search for symbols or jump to different dashboard sections.1  
* **Export Queue**: A tracking interface for large data exports, showing the progress and providing a ZIP archive download once the task is complete.1

## **Implementation Roadmap: Technical Prompts for AI Integration**

The following section provides the specific, high-density prompts requested by the user. These prompts are designed to be used with AI agentic coding tools to implement the Historify features into the Project-R dhanv2 stack.2

### **Module 1: The Enhanced Dhan V2 Data Adapter**

**The Problem**: The existing dhanv2 client may lack the robust error handling, chunking, and rate-limiting required for bulk historical data operations.

**Technical Prompt**: "Update the dhanv2 directory in Project-R to include a comprehensive historical data adapter. This module should leverage the Dhan HQ V2.0 API to fetch daily and intraday OHLC data.4 Implement a DhanHistoricalClient class that includes: 1\) Automatic chunking for intraday requests, splitting ranges longer than 90 days into sequential API calls.5 2\) A rate-limiter that restricts calls to 5 per second for data endpoints and 1 per second for quotes.7 3\) Support for the new Epoch/Unix timestamp format introduced in Dhan V2.4.4 4\) An incremental download mode that first queries a local DuckDB instance for the MAX(timestamp) of a symbol and only requests missing data from the broker.1 Ensure the output is a standardized Pandas DataFrame with columns: time, open, high, low, close, volume, and oi (if applicable)."

### **Module 2: The DuckDB Storage and Analytics Engine**

**The Problem**: Project-R requires a high-performance storage layer to handle Historify-scale datasets.

**Technical Prompt**: "Implement a high-performance storage layer for Project-R using DuckDB for historical market data.8 Create a database/historify\_db.py module that: 1\) Initializes a historify.duckdb file if it doesn't exist. 2\) Defines a schema for OHLC data that utilizes columnar partitioning by symbol and interval for maximum query speed.9 3\) Implements a bulk\_upsert method that handles large data inserts without locking the database. 4\) Integrates with Pandas to allow for rapid calculation of technical indicators like EMA and RSI directly from SQL queries.1 5\) Provides an API for the frontend to fetch chart-ready data in JSON format. Ensure this storage layer is isolated from the main openalgo.db SQLite database used for metadata.9"

### **Module 3: The APScheduler Automation Manager**

**The Problem**: Automated data synchronization is missing from the current Project-R implementation.

**Technical Prompt**: "Integrate a background scheduler into Project-R using APScheduler with IST timezone support.1 This manager should: 1\) Support both daily schedules (e.g., at 15:35 IST for market close) and interval-based schedules (e.g., every 5 minutes during market hours).1 2\) Pull the list of active symbols from the SQLite watchlist and trigger the DhanHistoricalClient for incremental updates. 3\) Implement a job management system with a SQLite backend to store job status, next run time, and execution logs.1 4\) Ensure all scheduled tasks run in a non-blocking background thread pool. 5\) Add a 'Run Now' feature to allow users to manually trigger a scheduled download from the UI."

### **Module 4: The Historify-Style Dashboard Frontend**

**The Problem**: The Project-R frontend needs to adopt the professional design and charting capabilities of Historify.

**Technical Prompt**: "Build a modern, responsive dashboard for Project-R using Tailwind CSS and DaisyUI, mirroring the Historify design system.1 The UI must include: 1\) A Sidebar with links to 'Dashboard', 'Watchlist', 'Downloads', 'Scheduler', and 'Import'. 2\) A Symbol Import page that supports drag-and-drop CSV/Excel uploads and clipboard pasting, with real-time validation against the Dhan master contract list.1 3\) A professional charting interface using TradingView Lightweight Charts 5.0.0, capable of overlaying EMA and RSI indicators fetched from the DuckDB backend.1 4\) A light/dark mode toggle and a Cmd+K command palette for quick navigation.1 5\) Real-time progress bars for bulk download and export tasks using WebSocket or polling updates."

### **Module 5: Bulk Export and Data Management**

**The Problem**: Users need to be able to export their locally stored data in various formats.

**Technical Prompt**: "Implement a bulk data export engine for Project-R. This feature should: 1\) Allow users to select multiple symbols and intervals from their DuckDB storage. 2\) Provide export formats including Individual CSVs, a Combined CSV, and a ZIP archive.1 3\) Use background processing to handle large exports, streaming the data directly from DuckDB to the filesystem to minimize memory usage.1 4\) Implement an export queue management system that tracks the status of current exports and provides a download link once complete. 5\) Support custom date range selection with presets like 'Last 30 Days', 'Year to Date', and 'All Time'."

## **Security, Compliance, and Data Ownership**

A core tenet of the OpenAlgo and Historify ecosystem is the absolute ownership of data and infrastructure by the trader.6 This self-hosted philosophy must be maintained in the Project-R integration.

### **Broker Credential Security**

Security of the Dhan API credentials is paramount. Project-R must ensure that all sensitive tokens are encrypted at rest.3

| Security Measure | Implementation Strategy |
| :---- | :---- |
| **Token Encryption** | Use Fernet symmetric encryption with PBKDF2 key derivation for storage. |
| **Password Hashing** | Utilize Argon2 (the winner of the Password Hashing Competition) for local user accounts. |
| **Environment Isolation** | Store all keys in a .env file that is never committed to version control. |
| **OS Keychain Support** | (Optional) For desktop-specific versions, use the OS Keychain (macOS) or Credential Manager (Windows). |

### **Compliance and Automated Session Management**

Indian broker APIs, including Dhan, typically have 24-hour token validity. For automated systems like Project-R, the software should implement an "Auto-Logout" and session refresh mechanism.4 OpenAlgo Desktop, for instance, automatically logs out sessions at 3:00 AM IST to ensure a fresh, compliant authentication for the next trading day.8

## **Insights into the Future of Personal Trading Infrastructure**

The integration of Historify's features into Project-R is more than a UI upgrade; it is a fundamental shift toward an "Infrastructure-First" approach to trading.13 By building a robust local data repository, the user is preparing for advanced use cases such as AI-driven execution and complex cross-asset backtesting.3

### **The Role of AI in Strategy Development**

The use of agentic coding tools like Windsurf and Claude to build these features mirrors the broader trend of "AI Agentic Coding" in the OpenAlgo universe.2 These tools allow traders to build custom indicators and algo features without deep expertise in every layer of the software stack. The Model Context Protocol (MCP) further extends this by allowing AI assistants to interact directly with the Project-R API to execute trades or analyze market data in natural language.3

### **Scalability and Multi-Broker Potential**

While the current focus is on the Dhan V2 stack, the modular architecture proposed (separating the broker adapter from the storage and scheduling logic) ensures that Project-R can easily expand to other brokers in the future.9 By following the "Broker Integration Pattern" of OpenAlgo, each new broker is simply a new directory containing standardized modules for authentication, orders, and data.9

## **Conclusion: Finalizing the Project-R Transformation**

The successful integration of Historify's bulk data operations, automated scheduling, and advanced visualization into Project-R requires a disciplined adherence to the technical standards set by the OpenAlgo ecosystem.1 By leveraging the Dhan HQ Version 2.0 API and the high-performance DuckDB storage engine, the system will provide a professional-grade environment for the modern Indian trader.5 The provided prompts serve as the blueprint for this transformation, guiding the development of a resilient, secure, and highly efficient algorithmic trading infrastructure.6

The key to long-term success with this implementation lies in the "Incremental Update" logic and the robust background processing of tasks, ensuring that the platform remains stable even as the scope of data tracking expands to thousands of symbols across various exchange segments.1 With these features in place, Project-R will match the capabilities of professional platforms while maintaining the complete data privacy and infrastructure ownership that only a self-hosted solution can provide.6

#### **Works cited**

1. marketcalls/historify: OpenAlgo Full Stack Historical Data Management App \- GitHub, accessed on March 6, 2026, [https://github.com/marketcalls/historify](https://github.com/marketcalls/historify)  
2. OpenAlgo: Open Source Low-Code Algorithmic Trading Platform \- FOSS United, accessed on March 6, 2026, [https://forum.fossunited.org/t/openalgo-open-source-low-code-algorithmic-trading-platform/3287](https://forum.fossunited.org/t/openalgo-open-source-low-code-algorithmic-trading-platform/3287)  
3. marketcalls/openalgo: Open Source Algo Trading Platform for Everyone \- GitHub, accessed on March 6, 2026, [https://github.com/marketcalls/openalgo](https://github.com/marketcalls/openalgo)  
4. Releases \- DhanHQ Ver 2.0 / API Document, accessed on March 6, 2026, [https://dhanhq.co/docs/v2/releases/](https://dhanhq.co/docs/v2/releases/)  
5. Historical Data \- DhanHQ Ver 2.0 / API Document, accessed on March 6, 2026, [https://dhanhq.co/docs/v2/historical-data/](https://dhanhq.co/docs/v2/historical-data/)  
6. marketcalls/openalgo-docs: OpenAlgo Docs \- GitHub, accessed on March 6, 2026, [https://github.com/marketcalls/openalgo-docs](https://github.com/marketcalls/openalgo-docs)  
7. Introduction \- DhanHQ Ver 2.0 / API Document, accessed on March 6, 2026, [https://dhanhq.co/docs/v2/](https://dhanhq.co/docs/v2/)  
8. marketcalls/openalgo-desktop: Open Source Algo Trading Platform for Everyone \- GitHub, accessed on March 6, 2026, [https://github.com/marketcalls/openalgo-desktop](https://github.com/marketcalls/openalgo-desktop)  
9. CLAUDE.md \- marketcalls/openalgo \- GitHub, accessed on March 6, 2026, [https://github.com/marketcalls/openalgo/blob/main/CLAUDE.md](https://github.com/marketcalls/openalgo/blob/main/CLAUDE.md)  
10. DhanHQ Historical Data API Guide | PDF | Integer (Computer Science) \- Scribd, accessed on March 6, 2026, [https://www.scribd.com/document/821015477/Historical-Data-DhanHQ-Ver-2-0-API-Document](https://www.scribd.com/document/821015477/Historical-Data-DhanHQ-Ver-2-0-API-Document)  
11. Version 2.0.0.1 Released \- What is OpenAlgo? | Documentation, accessed on March 6, 2026, [https://docs.openalgo.in/change-log/release/version-2.0.0.1-released](https://docs.openalgo.in/change-log/release/version-2.0.0.1-released)  
12. AJ1e6/openalgo-by-marketcalls: Open Source Algo Trading Platform for Everyone \- GitHub, accessed on March 6, 2026, [https://github.com/AJ1e6/openalgo-by-marketcalls](https://github.com/AJ1e6/openalgo-by-marketcalls)  
13. why-to-build-with-openalgo.md \- GitHub, accessed on March 6, 2026, [https://github.com/marketcalls/openalgo-docs/blob/main/why-to-build-with-openalgo.md](https://github.com/marketcalls/openalgo-docs/blob/main/why-to-build-with-openalgo.md)  
14. marketcalls/openalgo-mcp: Documentation \- GitHub, accessed on March 6, 2026, [https://github.com/marketcalls/openalgo-mcp](https://github.com/marketcalls/openalgo-mcp)  
15. Releases · marketcalls/openalgo \- GitHub, accessed on March 6, 2026, [https://github.com/marketcalls/openalgo/releases](https://github.com/marketcalls/openalgo/releases)  
16. CONTRIBUTING.md \- marketcalls/openalgo \- GitHub, accessed on March 6, 2026, [https://github.com/marketcalls/openalgo/blob/main/CONTRIBUTING.md](https://github.com/marketcalls/openalgo/blob/main/CONTRIBUTING.md)