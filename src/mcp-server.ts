#!/usr/bin/env ts-node
/**
 * MCP Server for Sensibull Trade Data
 * Allows querying extracted trades via Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { nseService } from '../lib/nse-service';

interface Trade {
  Date: string;
  Symbol: string;
  Option_Type: string;
  Strike: string;
  Expiry: string;
  Qty: string;
  Avg_Price: string;
  LTP: string;
  P_L: string;
  Daily_Total_PnL: string;
  Verification_Timestamp: string;
  Page: number;
}

// Load trade data
function loadTrades(): Trade[] {
  const rootDir = process.cwd();
  const searchPaths = [
    path.join(rootDir, 'data', 'data.json'),
    path.join(rootDir, 'sensibull_trades.json'),
    path.join(rootDir, 'data', 'sensibull_trades.json')
  ];

  for (const filePath of searchPaths) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(data);
        if (json.trades) return json.trades;
        if (Array.isArray(json)) return json;
      }
    } catch (e) {
      console.error(`Error loading from ${filePath}:`, e);
    }
  }
  
  // Fallback to CSV if JSON fails
  try {
    const csvPath = path.join(rootDir, 'sensibull_trades.csv');
    if (fs.existsSync(csvPath)) {
      const csv = fs.readFileSync(csvPath, 'utf-8');
      const lines = csv.split('\n').slice(1);
      return lines.filter(l => l.trim()).map(line => {
        const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"'));
        return {
          Date: cols[0] || '',
          Symbol: cols[1] || '',
          Option_Type: cols[2] || '',
          Strike: cols[3] || '',
          Expiry: cols[4] || '',
          Qty: cols[5] || '',
          Avg_Price: cols[6] || '',
          LTP: cols[7] || '',
          P_L: cols[8] || '',
          Daily_Total_PnL: cols[9] || '',
          Verification_Timestamp: cols[10] || '',
          Page: parseInt(cols[11]) || 0
        };
      });
    }
  } catch (e) {
    console.error('Error loading CSV:', e);
  }

  return [];
}

const server = new Server(
  {
    name: 'sensibull-trades-server',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_total_trades',
        description: 'Get total number of trades extracted',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_trades_by_symbol',
        description: 'Get all trades for a specific symbol (e.g., NIFTY, JKCEMENT)',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string', description: 'Stock/Index symbol' },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_trades_by_date',
        description: 'Get all trades for a specific date (YYYY-MM-DD)',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          },
          required: ['date'],
        },
      },
      {
        name: 'get_trades_by_option_type',
        description: 'Get trades filtered by option type (CE, PE, or STOCK)',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['CE', 'PE', 'STOCK'], description: 'Option type' },
          },
          required: ['type'],
        },
      },
      {
        name: 'get_daily_pnl',
        description: 'Get daily P&L summary for all trading days',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_top_profitable_trades',
        description: 'Get top N most profitable trades',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 10, description: 'Number of trades to return' },
          },
        },
      },
      {
        name: 'get_top_losing_trades',
        description: 'Get top N biggest losing trades',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 10, description: 'Number of trades to return' },
          },
        },
      },
      {
        name: 'get_symbol_statistics',
        description: 'Get trading statistics for a specific symbol',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string', description: 'Stock/Index symbol' },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'search_trades',
        description: 'Search trades by keyword (symbol, date, or option type)',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_overall_statistics',
        description: 'Get overall trading statistics',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_r_factor_signal',
        description: 'Get live R-Factor quantitative signal for a specific symbol',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string', description: 'Stock symbol (e.g., PNB, RELIANCE)' },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'scan_market_r_factor',
        description: 'Scan top F&O symbols for R-Factor signals and Blast trades',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 15, description: 'Number of symbols to scan' },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const trades = loadTrades();
  
  switch (request.params.name) {
    case 'get_total_trades': {
      return {
        content: [{ type: 'text', text: `Total trades extracted: ${trades.length}` }],
      };
    }
    
    case 'get_trades_by_symbol': {
      const symbol = (request.params.arguments as any).symbol.toUpperCase();
      const filtered = trades.filter(t => t.Symbol.toUpperCase() === symbol);
      return {
        content: [{ 
          type: 'text', 
          text: `Found ${filtered.length} trades for ${symbol}:\n\n` +
            filtered.map(t => 
              `${t.Date} | ${t.Option_Type} | Qty: ${t.Qty} | P&L: ₹${parseFloat(t.P_L).toLocaleString()}`
            ).join('\n')
        }],
      };
    }
    
    case 'get_trades_by_date': {
      const date = (request.params.arguments as any).date;
      const filtered = trades.filter(t => t.Date === date);
      return {
        content: [{ 
          type: 'text', 
          text: `Found ${filtered.length} trades on ${date}:\n\n` +
            filtered.map(t => 
              `${t.Symbol} ${t.Option_Type} | Qty: ${t.Qty} | P&L: ₹${parseFloat(t.P_L).toLocaleString()}`
            ).join('\n')
        }],
      };
    }
    
    case 'get_trades_by_option_type': {
      const type = (request.params.arguments as any).type;
      const filtered = trades.filter(t => t.Option_Type === type);
      return {
        content: [{ 
          type: 'text', 
          text: `Found ${filtered.length} ${type} trades:\n\n` +
            filtered.slice(0, 20).map(t => 
              `${t.Date} | ${t.Symbol} | Strike: ${t.Strike || 'N/A'} | P&L: ₹${parseFloat(t.P_L).toLocaleString()}`
            ).join('\n') +
            (filtered.length > 20 ? `\n... and ${filtered.length - 20} more` : '')
        }],
      };
    }
    
    case 'get_daily_pnl': {
      const dailyMap = new Map<string, { pnl: number; count: number }>();
      trades.forEach(t => {
        const current = dailyMap.get(t.Date) || { pnl: 0, count: 0 };
        dailyMap.set(t.Date, { 
          pnl: current.pnl + (parseFloat(t.Daily_Total_PnL) || 0),
          count: current.count + 1 
        });
      });
      const sorted = Array.from(dailyMap.entries())
        .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
      return {
        content: [{ 
          type: 'text', 
          text: `Daily P&L Summary (last 30 days):\n\n` +
            sorted.slice(0, 30).map(([date, data]) => 
              `${date} | Trades: ${data.count} | Daily P&L: ₹${data.pnl.toLocaleString()}`
            ).join('\n')
        }],
      };
    }
    
    case 'get_top_profitable_trades': {
      const limit = (request.params.arguments as any).limit || 10;
      const sorted = [...trades]
        .sort((a, b) => parseFloat(b.P_L) - parseFloat(a.P_L))
        .slice(0, limit);
      return {
        content: [{ 
          type: 'text', 
          text: `Top ${limit} Most Profitable Trades:\n\n` +
            sorted.map((t, i) => 
              `${i + 1}. ${t.Date} | ${t.Symbol} ${t.Option_Type} | P&L: +₹${parseFloat(t.P_L).toLocaleString()}`
            ).join('\n')
        }],
      };
    }
    
    case 'get_top_losing_trades': {
      const limit = (request.params.arguments as any).limit || 10;
      const sorted = [...trades]
        .sort((a, b) => parseFloat(a.P_L) - parseFloat(b.P_L))
        .slice(0, limit);
      return {
        content: [{ 
          type: 'text', 
          text: `Top ${limit} Biggest Losing Trades:\n\n` +
            sorted.map((t, i) => 
              `${i + 1}. ${t.Date} | ${t.Symbol} ${t.Option_Type} | P&L: -₹${Math.abs(parseFloat(t.P_L)).toLocaleString()}`
            ).join('\n')
        }],
      };
    }
    
    case 'get_symbol_statistics': {
      const symbol = (request.params.arguments as any).symbol.toUpperCase();
      const symbolTrades = trades.filter(t => t.Symbol.toUpperCase() === symbol);
      const totalPnL = symbolTrades.reduce((sum, t) => sum + parseFloat(t.P_L), 0);
      const ceCount = symbolTrades.filter(t => t.Option_Type === 'CE').length;
      const peCount = symbolTrades.filter(t => t.Option_Type === 'PE').length;
      const stockCount = symbolTrades.filter(t => t.Option_Type === 'STOCK').length;
      
      return {
        content: [{ 
          type: 'text', 
          text: `Statistics for ${symbol}:\n\n` +
            `Total Trades: ${symbolTrades.length}\n` +
            `Total P&L: ₹${totalPnL.toLocaleString()}\n` +
            `Call Options (CE): ${ceCount}\n` +
            `Put Options (PE): ${peCount}\n` +
            `Stock Trades: ${stockCount}\n\n` +
            `Recent Trades:\n` +
            symbolTrades.slice(-5).map(t => 
              `  ${t.Date} | ${t.Option_Type} | P&L: ₹${parseFloat(t.P_L).toLocaleString()}`
            ).join('\n')
        }],
      };
    }
    
    case 'search_trades': {
      const query = (request.params.arguments as any).query.toLowerCase();
      const filtered = trades.filter(t => 
        t.Symbol.toLowerCase().includes(query) ||
        t.Date.includes(query) ||
        t.Option_Type.toLowerCase().includes(query)
      );
      return {
        content: [{ 
          type: 'text', 
          text: `Found ${filtered.length} trades matching "${query}":\n\n` +
            filtered.slice(0, 20).map(t => 
              `${t.Date} | ${t.Symbol} ${t.Option_Type} | Qty: ${t.Qty} | P&L: ₹${parseFloat(t.P_L).toLocaleString()}`
            ).join('\n') +
            (filtered.length > 20 ? `\n... and ${filtered.length - 20} more results` : '')
        }],
      };
    }
    
    case 'get_overall_statistics': {
      const totalPnL = trades.reduce((sum, t) => sum + parseFloat(t.P_L), 0);
      const uniqueDays = new Set(trades.map(t => t.Date)).size;
      const uniqueSymbols = new Set(trades.map(t => t.Symbol)).size;
      const ceCount = trades.filter(t => t.Option_Type === 'CE').length;
      const peCount = trades.filter(t => t.Option_Type === 'PE').length;
      const stockCount = trades.filter(t => t.Option_Type === 'STOCK').length;
      const profitTrades = trades.filter(t => parseFloat(t.P_L) > 0).length;
      const lossTrades = trades.filter(t => parseFloat(t.P_L) < 0).length;
      
      return {
        content: [{ 
          type: 'text', 
          text: `Overall Trading Statistics:\n\n` +
            `Total Trades: ${trades.length}\n` +
            `Trading Days: ${uniqueDays}\n` +
            `Unique Symbols: ${uniqueSymbols}\n` +
            `Total P&L: ₹${totalPnL.toLocaleString()}\n\n` +
            `Breakdown by Type:\n` +
            `  Call Options (CE): ${ceCount}\n` +
            `  Put Options (PE): ${peCount}\n` +
            `  Stock Trades: ${stockCount}\n\n` +
            `Win Rate:\n` +
            `  Profitable Trades: ${profitTrades} (${((profitTrades/trades.length)*100).toFixed(1)}%)\n` +
            `  Losing Trades: ${lossTrades} (${((lossTrades/trades.length)*100).toFixed(1)}%)`
        }],
      };
    }

    case 'get_r_factor_signal': {
      const symbol = (request.params.arguments as any).symbol.toUpperCase();
      try {
        const signal = await nseService.getRFactorSignal(symbol);
        return {
          content: [{
            type: 'text',
            text: `R-Factor Signal for ${symbol}:\n\n` +
              `Regime: ${signal.regime}\n` +
              `Composite Score: ${signal.compositeRFactor.toFixed(2)}\n` +
              `Blast Trade: ${signal.isBlastTrade ? 'YES 🚀' : 'NO'}\n\n` +
              `Individual Z-Scores:\n` +
              `  Volume: ${signal.zScores.volume.toFixed(2)}σ\n` +
              `  OI: ${signal.zScores.oi.toFixed(2)}σ\n` +
              `  Turnover: ${signal.zScores.turnover.toFixed(2)}σ\n` +
              `  Spread: ${signal.zScores.spread.toFixed(2)}σ`
          }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error calculating R-Factor for ${symbol}: ${(err as Error).message}` }],
          isError: true
        };
      }
    }

    case 'scan_market_r_factor': {
      const limit = (request.params.arguments as any).limit || 15;
      try {
        const signals = await nseService.scanAllSymbols(limit);
        const blastTrades = signals.filter(s => s.isBlastTrade);
        
        return {
          content: [{
            type: 'text',
            text: `Market Scan Results (Limit: ${limit}):\n\n` +
              `Found ${blastTrades.length} Blast Trades!\n` +
              signals.map(s => 
                `${s.symbol} | R:${s.compositeRFactor.toFixed(2)} | ${s.regime} ${s.isBlastTrade ? '🚀' : ''}`
              ).join('\n')
          }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Market scan failed: ${(err as Error).message}` }],
          isError: true
        };
      }
    }
    
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Sensibull MCP Server running on stdio');
}

main().catch(console.error);
