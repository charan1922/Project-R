/**
 * Backtest Evaluator
 *
 * Replays 5-min historical data for TF's last 20 trades.
 * For each trade date:
 * 1. Rank all stocks by intraday spread ratio at 9:45 AM
 * 2. Compute intraday ADX(7) for direction
 * 3. Simulate option entry at 9:45, exit at profit/SL/time
 * 4. Compare our P&L with TF's actual P&L
 */

import { ADX } from 'trading-signals';
import { queryRows } from './duckdb-schema';
import { TF_TRADES, type TFTrade } from './data-downloader';
import { calculateOptionCharges } from '@/lib/ai-trading/commissions';

export interface BacktestResult {
  date: string;
  // TF's trade
  tfStock: string;
  tfCePe: string;
  tfStrike: number;
  tfPnl: number;
  // Our signal at 9:45 AM
  ourTopStock: string;
  ourRank: number; // TF stock's rank in our list
  ourSpread: number;
  ourDirection: 'CE' | 'PE';
  ourADX: number;
  stockMatch: boolean;
  directionMatch: boolean;
  tfInTop10: boolean;
  // Simulated option trade (using TF's stock for fair comparison)
  entryTime: string;
  entryPrice: number;
  exitTime: string;
  exitPrice: number;
  exitReason: string;
  lotSize: number;
  grossPnl: number;
  charges: number;
  netPnl: number;
  profitable: boolean;
}

export interface BacktestSummary {
  totalTrades: number;
  stockMatchCount: number;
  directionMatchCount: number;
  tfInTop10Count: number;
  ourWins: number;
  ourLosses: number;
  ourTotalPnl: number;
  ourAvgWin: number;
  ourAvgLoss: number;
  tfTotalPnl: number;
  tfWinRate: number;
}

// IST offset: 5h30m = 19800 seconds
const IST_OFFSET = 5.5 * 3600;

function unixToIST(unix: number): Date {
  return new Date((unix + IST_OFFSET) * 1000);
}

function formatTime(unix: number): string {
  const d = unixToIST(unix);
  return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
}

/**
 * Get daily spread for a stock from 5-min bars.
 * Returns (day_high - day_low) / last_close for each trading day.
 */
async function getDailySpreadHistory(symbol: string, beforeDate: string, days = 20): Promise<number[]> {
  // Get distinct dates with their high/low/close from equity bars
  const rows = await queryRows(`
    SELECT date, MAX(high) as day_high, MIN(low) as day_low,
           (SELECT close FROM backtest_equity e2 WHERE e2.symbol = '${symbol}' AND e2.date = e.date ORDER BY timestamp DESC LIMIT 1) as last_close
    FROM backtest_equity e
    WHERE symbol = '${symbol}' AND date < '${beforeDate}'
    GROUP BY date
    ORDER BY date DESC
    LIMIT ${days}
  `) as { date: string; day_high: number; day_low: number; last_close: number }[];

  return rows
    .map((r) => {
      const high = Number(r.day_high);
      const low = Number(r.day_low);
      const close = Number(r.last_close);
      return close > 0 ? (high - low) / close : 0;
    })
    .reverse(); // oldest first
}

/**
 * Get all 5-min equity bars for a stock on a specific date.
 */
async function getEquityBars(symbol: string, date: string): Promise<{ timestamp: number; open: number; high: number; low: number; close: number }[]> {
  const rows = await queryRows(`
    SELECT timestamp, open, high, low, close
    FROM backtest_equity
    WHERE symbol = '${symbol}' AND date = '${date}'
    ORDER BY timestamp ASC
  `) as { timestamp: number; open: number; high: number; low: number; close: number }[];
  return rows.map((r) => ({
    timestamp: Number(r.timestamp),
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
  }));
}

/**
 * Get option 5-min bars for a stock on a specific date.
 */
async function getOptionBars(symbol: string, optionType: string, date: string): Promise<{ timestamp: number; open: number; high: number; low: number; close: number }[]> {
  const rows = await queryRows(`
    SELECT timestamp, open, high, low, close
    FROM backtest_options
    WHERE symbol = '${symbol}' AND option_type = '${optionType}' AND date = '${date}'
    ORDER BY timestamp ASC
  `) as { timestamp: number; open: number; high: number; low: number; close: number }[];
  return rows.map((r) => ({
    timestamp: Number(r.timestamp),
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
  }));
}

/**
 * Get all unique symbols that have data.
 */
async function getAvailableSymbols(): Promise<string[]> {
  const rows = await queryRows(`SELECT DISTINCT symbol FROM backtest_equity`) as { symbol: string }[];
  return rows.map((r) => r.symbol);
}

/**
 * Compute intraday spread ratio and ADX at a specific bar index.
 */
function computeSignals(
  bars: { timestamp: number; high: number; low: number; close: number }[],
  upToIndex: number,
  avgDailySpread: number,
): { spreadRatio: number; adx: number; plusDI: number; minusDI: number } {
  // Running high/low for the day
  let dayHigh = -Infinity;
  let dayLow = Infinity;
  const adxIndicator = new ADX(7);

  for (let i = 0; i <= upToIndex && i < bars.length; i++) {
    dayHigh = Math.max(dayHigh, bars[i].high);
    dayLow = Math.min(dayLow, bars[i].low);
    adxIndicator.update({ high: bars[i].high, low: bars[i].low, close: bars[i].close }, false);
  }

  const currentClose = bars[upToIndex].close;
  const spreadRaw = currentClose > 0 ? (dayHigh - dayLow) / currentClose : 0;
  const spreadRatio = avgDailySpread > 0 ? spreadRaw / avgDailySpread : 0;

  let adx = 0;
  let plusDI = 0;
  let minusDI = 0;
  try {
    adx = Number(adxIndicator.getResult());
    plusDI = Number(adxIndicator.pdi) * 100;
    minusDI = Number(adxIndicator.mdi) * 100;
  } catch {
    // Not enough data for ADX yet
  }

  return { spreadRatio, adx, plusDI, minusDI };
}

/**
 * Run the full backtest across all 20 TF trades.
 */
export async function runFullBacktest(): Promise<{ results: BacktestResult[]; summary: BacktestSummary }> {
  const results: BacktestResult[] = [];
  const allSymbols = await getAvailableSymbols();

  for (const trade of TF_TRADES) {
    try {
      const result = await evaluateSingleTrade(trade, allSymbols);
      results.push(result);
    } catch (error) {
      console.error(`[Backtest] Error on ${trade.date} ${trade.symbol}:`, error);
      results.push({
        date: trade.date,
        tfStock: trade.symbol, tfCePe: trade.optionType, tfStrike: trade.strike, tfPnl: trade.pnl,
        ourTopStock: '?', ourRank: 0, ourSpread: 0, ourDirection: 'CE', ourADX: 0,
        stockMatch: false, directionMatch: false, tfInTop10: false,
        entryTime: '', entryPrice: 0, exitTime: '', exitPrice: 0, exitReason: `Error: ${(error as Error).message}`,
        lotSize: 0, grossPnl: 0, charges: 0, netPnl: 0, profitable: false,
      });
    }
  }

  // Compute summary
  const wins = results.filter((r) => r.netPnl > 0);
  const losses = results.filter((r) => r.netPnl < 0);
  const summary: BacktestSummary = {
    totalTrades: results.length,
    stockMatchCount: results.filter((r) => r.stockMatch).length,
    directionMatchCount: results.filter((r) => r.directionMatch).length,
    tfInTop10Count: results.filter((r) => r.tfInTop10).length,
    ourWins: wins.length,
    ourLosses: losses.length,
    ourTotalPnl: Math.round(results.reduce((s, r) => s + r.netPnl, 0)),
    ourAvgWin: wins.length > 0 ? Math.round(wins.reduce((s, r) => s + r.netPnl, 0) / wins.length) : 0,
    ourAvgLoss: losses.length > 0 ? Math.round(losses.reduce((s, r) => s + r.netPnl, 0) / losses.length) : 0,
    tfTotalPnl: TF_TRADES.reduce((s, t) => s + t.pnl, 0),
    tfWinRate: TF_TRADES.filter((t) => t.pnl > 0).length / TF_TRADES.length,
  };

  return { results, summary };
}

/**
 * Evaluate a single TF trade date.
 */
async function evaluateSingleTrade(trade: TFTrade, allSymbols: string[]): Promise<BacktestResult> {
  const ENTRY_BAR_INDEX = 6; // 9:45 AM = 6th bar after 9:15 (bars at 9:15, 9:20, 9:25, 9:30, 9:35, 9:40, 9:45)
  const SL_PCT = 0.30; // 30% stop-loss on option premium
  const LOT_SIZE_FALLBACK = 1000; // Fallback lot size if not found

  // Step 1: Load equity bars for ALL symbols on this date and rank by spread
  const stockSignals: { symbol: string; spreadRatio: number; adx: number; plusDI: number; minusDI: number }[] = [];

  for (const sym of allSymbols) {
    const bars = await getEquityBars(sym, trade.date);
    if (bars.length < ENTRY_BAR_INDEX + 1) continue;

    const avgSpreadHistory = await getDailySpreadHistory(sym, trade.date, 20);
    const avgDailySpread = avgSpreadHistory.length > 0
      ? avgSpreadHistory.reduce((a, b) => a + b, 0) / avgSpreadHistory.length
      : 0;

    const signals = computeSignals(bars, ENTRY_BAR_INDEX, avgDailySpread);
    stockSignals.push({ symbol: sym, ...signals });
  }

  // Rank by spread ratio (our R-Factor proxy)
  stockSignals.sort((a, b) => b.spreadRatio - a.spreadRatio);

  const ourTop = stockSignals[0] ?? { symbol: '?', spreadRatio: 0, adx: 0, plusDI: 0, minusDI: 0 };
  const ourDirection: 'CE' | 'PE' = ourTop.plusDI > ourTop.minusDI ? 'CE' : 'PE';
  const tfRank = stockSignals.findIndex((s) => s.symbol === trade.symbol) + 1;
  const tfSignal = stockSignals.find((s) => s.symbol === trade.symbol);

  // Step 2: Load option bars for TF's stock on this date
  const optionBars = await getOptionBars(trade.symbol, trade.optionType, trade.date);

  if (optionBars.length < ENTRY_BAR_INDEX + 1) {
    return {
      date: trade.date,
      tfStock: trade.symbol, tfCePe: trade.optionType, tfStrike: trade.strike, tfPnl: trade.pnl,
      ourTopStock: ourTop.symbol, ourRank: tfRank, ourSpread: ourTop.spreadRatio,
      ourDirection, ourADX: ourTop.adx,
      stockMatch: ourTop.symbol === trade.symbol,
      directionMatch: ourDirection === trade.optionType,
      tfInTop10: tfRank > 0 && tfRank <= 10,
      entryTime: '', entryPrice: 0, exitTime: '', exitPrice: 0,
      exitReason: 'No option data for this date',
      lotSize: 0, grossPnl: 0, charges: 0, netPnl: 0, profitable: false,
    };
  }

  // Step 3: Entry at 9:45 bar
  const entryBar = optionBars[ENTRY_BAR_INDEX];
  const entryPrice = entryBar.close;
  const stopLoss = entryPrice * (1 - SL_PCT);

  // Step 4: Step through remaining bars for exit
  let exitPrice = entryPrice;
  let exitTime = entryBar.timestamp;
  let exitReason = 'time-exit';

  for (let i = ENTRY_BAR_INDEX + 1; i < optionBars.length; i++) {
    const bar = optionBars[i];

    // Check stop-loss (hit during bar if low drops below SL)
    if (bar.low <= stopLoss) {
      exitPrice = stopLoss;
      exitTime = bar.timestamp;
      exitReason = 'stop-loss';
      break;
    }

    // Check profit target (option premium doubled = 100% gain)
    if (bar.high >= entryPrice * 2) {
      exitPrice = entryPrice * 2;
      exitTime = bar.timestamp;
      exitReason = 'profit-target';
      break;
    }

    // Last bar = time exit
    if (i === optionBars.length - 1) {
      exitPrice = bar.close;
      exitTime = bar.timestamp;
      exitReason = 'time-exit';
    }
  }

  // Step 5: Compute P&L
  const lotSize = LOT_SIZE_FALLBACK;
  const grossPnl = (exitPrice - entryPrice) * lotSize;
  const charges = calculateOptionCharges({
    numOrders: 2,
    buyTurnover: entryPrice * lotSize,
    sellTurnover: exitPrice * lotSize,
  }).total;
  const netPnl = Math.round(grossPnl - charges);

  return {
    date: trade.date,
    tfStock: trade.symbol,
    tfCePe: trade.optionType,
    tfStrike: trade.strike,
    tfPnl: trade.pnl,
    ourTopStock: ourTop.symbol,
    ourRank: tfRank,
    ourSpread: Math.round(ourTop.spreadRatio * 100) / 100,
    ourDirection,
    ourADX: Math.round(ourTop.adx),
    stockMatch: ourTop.symbol === trade.symbol,
    directionMatch: tfSignal ? (tfSignal.plusDI > tfSignal.minusDI ? 'CE' : 'PE') === trade.optionType : false,
    tfInTop10: tfRank > 0 && tfRank <= 10,
    entryTime: formatTime(entryBar.timestamp),
    entryPrice: Math.round(entryPrice * 100) / 100,
    exitTime: formatTime(exitTime),
    exitPrice: Math.round(exitPrice * 100) / 100,
    exitReason,
    lotSize,
    grossPnl: Math.round(grossPnl),
    charges: Math.round(charges),
    netPnl,
    profitable: netPnl > 0,
  };
}
