# Project-R (DeepQuant)

## 💡 Simple Explanation of Use Case
**What are we trying to achieve with AI?** 
We are building a trading robot that thinks exactly like a highly profitable human trader. Instead of writing rigid rules for the robot to follow, we are feeding the AI 271 days of the trader's actual [winning trades from Sensibull](https://web.sensibull.com/verified-pnl/fanged-okra/uQmeTrztNOWqFt). By analyzing those trades against 4 key market indicators, the AI will learn the hidden patterns—the "Smart Money Footprints"—and execute trades automatically with the exact same discretion and intuition as the professional trader.

The 4 indicators the AI tracks (detailed in the [Trade Finder Strategy](https://www.youtube.com/watch?v=rdcV5u5cKmg&t=12s)):
- **Volume** (Total shares traded)
- **Open Interest** (Buildup/decline of outstanding option contracts)
- **Bid-Ask Spread** (Urgency and liquidity)
- **Turnover** (Total value of the transactions)

## 🚀 The Mission: AI-Automated "Smart Money" Execution

**Project-R (DeepQuant)** is a sovereign AI-driven algorithmic trading ecosystem designed to reverse-engineer and automate the "Smart Money" execution patterns of high-performance institutional traders.

By synthesizing 271+ days of [verified Sensibull P&L data](https://web.sensibull.com/verified-pnl/fanged-okra/uQmeTrztNOWqFt) with a proprietary 4-factor Z-score engine (Volume, OI, Spread, Turnover), Project-R builds a deterministic AI agent that thinks, scans, and executes like a professional market maker.

### 🤖 The AI Execution Pipeline
To fully automate the discretion of the "Smart Money" strategy (originally sourced from the [Trade Finder YouTube Deep Dive](https://www.youtube.com/watch?v=rdcV5u5cKmg&t=12s)), the hard-coded logic is superseded by a 4-phase Machine Learning pipeline:

1. **Mindset Cloning (Supervised Learning)**: Training XGBoost models on Sensibull PnL data alongside Historify tick data to dynamically predict setup probability instead of relying on static thresholds.
2. **Smart-Money Detection (Unsupervised)**: Using Isolation Forests on a rolling 20-day window of the 4 R-factors to identify mathematical anomalies in capital flow:
    - **Open Interest**: The buildup or decline of outstanding contracts (Directional Compass).
    - **Volumes**: The total number of shares traded (Participation Gate).
    - **Bid-Ask Spread**: The difference between the highest price a buyer is willing to pay and the lowest price a seller is willing to accept (Urgency Metric).
    - **Turnover**: The total value of the transactions (Quality Filter).
3. **Adaptive Execution (Reinforcement Learning)**: PPO agents adapting execution routing (Limits vs. Market Order) dynamically based on the current regime (Elephant vs. Cheetah).
4. **Trader Intuition (LLM Integration)**: Fine-tuned local LLM for post-trade journaling, translating the Z-Scores and OI data into human-readable rationale.

## 🎯 Use Cases & Applications

### 1. AI-Automated Trading Algo (Primary Goal)
An autonomous engine that translates institutional thinking into code (Strategy sourced from [Trade Finder YouTube Deep Dive](https://www.youtube.com/watch?v=rdcV5u5cKmg&t=12s)):
- **R-Factor Triggering**: Detects when large investors are aggressively building positions relative to their normal 20-day activity.
- **AI Filtering**: Uses fine-tuned models to validate setups based on the "Blast Protocol" and seller-side option bias.
- **Low-Latency Execution**: Seamless integration with Dhan V2 for automated market entry and exit.

### 2. Deep Quant Lab (Research & Training)
A specialized "Lab" for mastering market microstructure:
- **Regime Classification**: Dynamically identifies **Elephant** (stable) vs. **Cheetah** (volatile) stocks to optimize execution.
- **Statistical Standardization**: Filters out retail noise by standardizing Volume, OI, and Spread anomalies ($Z > 3.0$).
- **Smart Money Footprinting**: Deep-dive analysis of Cumulative Turnover Integrals to find accelerating flow.

### 3. Historify (Data Lake & Archiving)
Professional-grade infrastructure for high-performance data management:
- **DuckDB Columnar Storage**: Ultra-fast storage for millions of rows of OHLCV and OI data using local `.parquet` generation.
- **Automated Sync Pipelines**: Node architectures (`sync_all_fno`, `sync_5min_fno`) to scrape extensive 90-day chunks from Dhan V2.
- **Cloud Data Lake Integration**: Query 18+ months of F&O data directly from **Hugging Face** datasets ([fno-5min](https://huggingface.co/datasets/charan1922/fno-5min) & [fno-data-18months](https://huggingface.co/datasets/charan1922/fno-data-18months)) using DuckDB's `httpfs` extension—streaming only the required bytes without local downloads.

### 4. Sensibull Performance Extraction
Reverse-engineering winning streaks via verified data (Target: [Sensibull Verified P&L](https://web.sensibull.com/verified-pnl/fanged-okra/uQmeTrztNOWqFt)):
- **Playwright Extractor**: Scrapes and normalizes 271+ days of verified trades from Sensibull.
- **AI-Powered Analysis**: An **MCP Server** that enables natural language querying of trade history to extract tactical insights for model training.

## 📈 Deep Quant Strategy: The AI-Enhanced R-Factor Model

The core engine transitions from static statistical rules to dynamic machine learning models to capture the "Smart Money" footprints modeled after verified sensible trades:

- **AI Phase 1: Mindset Cloning**: Supervised learning (XGBoost/LightGBM) trained on Playwright-extracted Sensibull PnL data integrated with Historify tick data, directly predicting the probability of the trader's setup.
- **AI Phase 2: Dynamic Smart-Money Detection**: Unsupervised learning (Isolation Forests/Autoencoders) on a rolling 20-day window of the 4 R-Factors to identify true market anomalies without hard-coded limits.
    - **Open Interest ($Z_{OI}$)**: Tracking institutional put-selling vs. call-selling (e.g., Rising Put OI + Price > ORB).
    - **Volumes ($Z_{Vol}$)**: Measuring total shares traded to confirm participation.
    - **Bid-Ask Spread ($Z_{Spread}$)**: Calculating urgency and liquidity consumption.
    - **Turnover ($Z_{Turn}$)**: Evaluating total capital commitment.
- **AI Phase 3: The "Blast" Protocol Execution Engine**: Reinforcement Learning (PPO) agent adapting execution logic between "Elephant" (limit orders) and "Cheetah" (market orders) regimes to minimize slippage.
- **AI Phase 4: Trader's Intuition**: Fine-tuned local LLM (e.g., Llama 3) for trade journaling and post-trade natural language analysis, mimicking the trader's thought process.

**Project-R (DeepQuant)** is a sovereign AI-driven algorithmic trading ecosystem designed to reverse-engineer and automate the "Smart Money" execution patterns of high-performance institutional traders.

By synthesizing 271+ days of verified Sensibull P&L data with a proprietary 4-factor Z-score engine, Project-R builds a deterministic AI agent that thinks, scans, and executes like a professional market maker.

## 🚀 The Mission: AI-Automated "Smart Money" Execution

The ultimate goal of Project-R is to "crack" and automate an institutional-grade trading mindset by combining:
1. **Mindset Automation**: Training and fine-tuning AI models on specific historical "Trade Finder" datasets to replicate the logic of elite traders.
2. **The Put OI Compass**: Moving beyond simple volume to track **Put Option Open Interest** as the true indicator of "Smart Money" bias (Put writing = Bullish conviction).
3. **Relative Intelligence (R-Factor)**: Benchmarking every market variable against its **20-day historical mean** to identify high-conviction institutional participation.

## 🏗️ Architecture (OpenClaw Paradigm)

Sovereign, layered architecture inspired by the **OpenClaw topology**:

- **Layer 1: Surfaces**: Next.js 16 Web Dashboard & CLI.
- **Layer 2: Channels**: Dhan WebSocket & Filesystem adapters.
- **Layer 3: Sessions**: State isolation via Zustand.
- **Layer 4: Gateway**: Central control plane for secure ingress/egress.
- **Layer 5: Runtime**: The deterministic R-Factor logic substrate.
- **Layer 6: Tools**: SQLite/DuckDB persistence and technical modules.

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript 5.7+ (Node.js 22+)
- **Database**: SQLite (better-sqlite3) + DuckDB (Parquet)
- **AI Tools**: MCP Server + Playwright (Extraction)
- **Charting**: Lightweight Charts v5 (Real-time)
- **Package Manager**: pnpm 10.x

## ⚡ Getting Started

### Prerequisites

- **Node.js** 22+
- **pnpm** 10.x (`packageManager: pnpm@10.29.2`)
- **Git LFS** — required to fetch the bundled database backup (see the Database section below)

### Installation

```bash
# 1. Clone and fetch LFS-tracked assets (e.g. the DB backup)
git clone https://github.com/charan1922/Project-R.git
cd Project-R
git lfs install
git lfs pull

# 2. Install dependencies
pnpm install

# 3. Generate the Prisma client (REQUIRED — not run automatically by pnpm install)
pnpm db:generate

# 4. Configure environment (see below), then start the dev server
pnpm dev            # http://localhost:5000
```

> **Heads up:** `pnpm install` does **not** generate the Prisma client on this setup
> (pnpm no longer reads the `pnpm` field in `package.json`). If the dev server crashes
> with `Cannot find module '.prisma/client/default'`, run `pnpm db:generate` and restart.

### Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Dev server on port 5000 |
| `pnpm build` | Production build (output: `dist/`) |
| `pnpm start` | Production server on port 5000 |
| `pnpm lint` | Biome check (lint + format) |
| `pnpm format` | Biome format (write) |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:migrate` | Create/apply Prisma migrations |
| `pnpm db:push` | Push schema to the DB (no migration file) |
| `pnpm db:studio` | Open Prisma Studio (visual DB editor) |
| `pnpm mcp` | Start the MCP server for AI queries |
| `pnpm extract` | Run the Playwright data extractor |
| `pnpm install:browsers` | Install Playwright browsers (needed for `extract`) |

### Environment Variables

Create a `.env.local` file in the project root (never commit it):

```bash
DHAN_CLIENT_ID=<client-id>
DHAN_ACCESS_TOKEN=<jwt-token>        # Optional if TOTP is configured
DHAN_PIN=<6-digit-pin>               # For TOTP auto-token generation
DHAN_TOTP_SECRET=<base32-secret>     # From the Dhan authenticator setup
DATABASE_URL=<url>                   # Optional: defaults to SQLite file:data/project-r.db
NEXT_PUBLIC_SENTRY_DSN=<sentry-dsn>  # Optional: error tracking
SENTRY_ORG=<org>                     # Optional: source maps
SENTRY_PROJECT=<project>             # Optional: source maps
```

## 🗄️ Database

- **Engine:** SQLite via Prisma (`@prisma/adapter-better-sqlite3`); large market datasets use DuckDB/Parquet.
- **Location:** `data/project-r.db` (gitignored — never committed directly).
- **Schema:** `prisma/schema.prisma`. After install, run `pnpm db:generate`; apply migrations with `pnpm db:migrate`.
- **Backup via Git LFS:** Database snapshots (`*.db.bak-*`) are tracked with **Git LFS** so the
  ~100 MB+ binaries stay out of regular git history. After cloning, run `git lfs install && git lfs pull`
  to download them. To restore a snapshot, copy it over the active DB:

```bash
cp project-r.db.bak-<timestamp> data/project-r.db
```

## 📚 Resources & References

- **Verified Performance**: [Sensibull Verified P&L (fanged-okra)](https://web.sensibull.com/verified-pnl/fanged-okra/uQmeTrztNOWqFt)
- **Strategy Insights**: [Smart Money & R-Factor Deep Dive (YouTube)](https://www.youtube.com/watch?v=rdcV5u5cKmg&t=12s)
- **Design Docs**: See the `/strategy/` and `/openspec/` directories for detailed architectural and algorithmic specifications.
