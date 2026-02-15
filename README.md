# Sensibull Trade Extractor

Complete solution for extracting and visualizing Sensibull Verified P&L data.

## 📁 Project Structure (Root Level)

```
.
├── app/                      # Next.js 16 App Router
│   ├── layout.tsx
│   ├── page.tsx             # Dashboard page
│   ├── globals.css
│   └── favicon.ico
├── components/              # shadcn/ui components
│   └── ui/
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── separator.tsx
│       ├── table.tsx
│       └── tabs.tsx
├── lib/
│   └── utils.ts             # Utility functions
├── src/                     # Extractor scripts
│   ├── extract.ts           # Main Playwright extractor
│   ├── mcp-server.ts        # MCP server for AI queries
│   └── tsconfig.json        # TypeScript config for scripts
├── data/
│   ├── .gitkeep
│   └── data.json            # Extracted data (symlinked to public)
├── public/
│   └── data.json -> ../data/data.json
├── components.json          # shadcn config
├── next.config.ts           # Next.js config
├── package.json             # All dependencies
├── pnpm-lock.yaml           # pnpm lock file
├── tsconfig.json            # TypeScript config (Next.js)
├── .gitignore
└── README.md
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm install
pnpm install:browsers
```

### 2. Extract Data
```bash
pnpm extract
```

This will:
- Extract all 271 days of trades from Sensibull
- Save to `data/data.json`
- Save CSV to `data/sensibull_trades.csv`

### 3. View Dashboard
```bash
pnpm dev
```
Open http://localhost:6000

Or serve built version:
```bash
pnpm build
pnpm serve
```

## 📊 Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm extract` | Run Playwright extractor |
| `pnpm mcp` | Start MCP server for AI queries |
| `pnpm dev` | Start dashboard dev server (port 6000) |
| `pnpm build` | Build dashboard for production |
| `pnpm serve` | Serve built dashboard (port 6000) |
| `pnpm install:browsers` | Install Playwright browsers |
| `pnpm clean` | Clean all dependencies and builds |

## 🎨 Dashboard Features

- **Stats Overview**: Total P&L, Win Rate, Trade Count, Trading Days
- **Trade History**: Searchable table with all trades
- **Daily Summary**: Day-by-day performance with verification timestamps
- **Top Symbols**: Most traded symbols analysis

## 🤖 MCP Server Tools

Start MCP server: `pnpm mcp`

Available tools for AI queries:
- `get_total_trades` - Total trade count
- `get_trades_by_symbol` - Trades for specific symbol
- `get_trades_by_date` - Trades on specific date
- `get_trades_by_option_type` - Filter by CE/PE/STOCK
- `get_top_profitable_trades` - Best performing trades
- `get_symbol_statistics` - Symbol analysis
- `get_overall_statistics` - Complete stats

## 📝 Data Format

### Trade Object
```typescript
{
  Date: string;                    // YYYY-MM-DD
  Symbol: string;                  // Stock/Index symbol
  Option_Type: 'CE' | 'PE' | 'STOCK';
  Strike: string;                  // Option strike price
  Expiry: string;                  // YYYY-MM-DD
  Qty: string;                     // Quantity
  Avg_Price: string;               // Average price
  LTP: string;                     // Last traded price
  P_L: string;                     // Profit/Loss
  Daily_Total_PnL: string;         // Day's total P&L
  Verification_Timestamp: string;  // Sensibull verification time
  Page: number;                    // Source page number
}
```

## 🛠️ Tech Stack

- **Framework**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Extraction**: Playwright 1.58.2
- **MCP**: Model Context Protocol SDK
- **Package Manager**: pnpm 10.29.2

## 🔧 Adding New Features

The project is organized for easy extension:

- **New UI Components**: Add to `components/ui/`
- **New Dashboard Pages**: Add to `app/`
- **New Data Processing**: Modify `src/extract.ts`
- **New MCP Tools**: Add to `src/mcp-server.ts`

## ⚠️ Notes

- Dashboard reads from `data/data.json` (symlinked to `public/`)
- Run `pnpm extract` before viewing dashboard for latest data
- Browser runs in non-headless mode by default for debugging
