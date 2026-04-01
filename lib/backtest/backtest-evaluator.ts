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
import { calculateOptionCharges, type ChargesBreakdown } from '@/lib/ai-trading/commissions';
import { batchResolveFutures } from '@/lib/historify/master-contracts';

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

/**
 * Parse "10:17:46 AM" or "03:25:32 PM" → minutes since midnight in IST.
 * Then find the 5-min bar whose IST time range contains this time.
 */
function findBarByTime(bars: { timestamp: number }[], timeStr: string): number {
  // Parse "10:17:46 AM" → 24h minutes
  const match = timeStr.match(/(\d+):(\d+):?(\d+)?\s*(AM|PM)/i);
  if (!match) return -1;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[4].toUpperCase();
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  const targetMinutes = hours * 60 + minutes; // e.g., 10:17 AM = 617

  // Find bar where target time falls within [barTime, barTime+5min)
  for (let i = 0; i < bars.length; i++) {
    const barIST = unixToIST(bars[i].timestamp);
    const barMinutes = barIST.getUTCHours() * 60 + barIST.getUTCMinutes();
    // Bar covers [barMinutes, barMinutes+5)
    if (targetMinutes >= barMinutes && targetMinutes < barMinutes + 5) {
      return i;
    }
  }

  // Fallback: find closest bar
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < bars.length; i++) {
    const barIST = unixToIST(bars[i].timestamp);
    const barMinutes = barIST.getUTCHours() * 60 + barIST.getUTCMinutes();
    const diff = Math.abs(targetMinutes - barMinutes);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
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
  const rows = (await queryRows(`
    SELECT date, MAX(high) as day_high, MIN(low) as day_low,
           (SELECT close FROM backtest_equity e2 WHERE e2.symbol = '${symbol}' AND e2.date = e.date ORDER BY timestamp DESC LIMIT 1) as last_close
    FROM backtest_equity e
    WHERE symbol = '${symbol}' AND date < '${beforeDate}'
    GROUP BY date
    ORDER BY date DESC
    LIMIT ${days}
  `)) as { date: string; day_high: number; day_low: number; last_close: number }[];

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
async function getEquityBars(
  symbol: string,
  date: string,
): Promise<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }[]> {
  const rows = (await queryRows(`
    SELECT timestamp, open, high, low, close, volume
    FROM backtest_equity
    WHERE symbol = '${symbol}' AND date = '${date}'
    ORDER BY timestamp ASC
  `)) as { timestamp: number; open: number; high: number; low: number; close: number; volume: number }[];
  return rows.map((r) => ({
    timestamp: Number(r.timestamp),
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: Number(r.volume),
  }));
}

/**
 * Get option 5-min bars for a stock on a specific date.
 */
async function getOptionBars(
  symbol: string,
  optionType: string,
  date: string,
): Promise<{ timestamp: number; open: number; high: number; low: number; close: number }[]> {
  const rows = (await queryRows(`
    SELECT timestamp, open, high, low, close
    FROM backtest_options
    WHERE symbol = '${symbol}' AND option_type = '${optionType}' AND date = '${date}'
    ORDER BY timestamp ASC
  `)) as { timestamp: number; open: number; high: number; low: number; close: number }[];
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
  const rows = (await queryRows(`SELECT DISTINCT symbol FROM backtest_equity`)) as { symbol: string }[];
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
        tfStock: trade.symbol,
        tfCePe: trade.optionType,
        tfStrike: trade.strike,
        tfPnl: trade.pnl,
        ourTopStock: '?',
        ourRank: 0,
        ourSpread: 0,
        ourDirection: 'CE',
        ourADX: 0,
        stockMatch: false,
        directionMatch: false,
        tfInTop10: false,
        entryTime: '',
        entryPrice: 0,
        exitTime: '',
        exitPrice: 0,
        exitReason: `Error: ${(error as Error).message}`,
        lotSize: 0,
        grossPnl: 0,
        charges: 0,
        netPnl: 0,
        profitable: false,
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
  const SL_PCT = 0.3; // 30% stop-loss on option premium
  const LOT_SIZE_FALLBACK = 1000; // Fallback lot size if not found

  // Step 1: Load equity bars for ALL symbols on this date and rank by spread
  const stockSignals: { symbol: string; spreadRatio: number; adx: number; plusDI: number; minusDI: number }[] = [];

  for (const sym of allSymbols) {
    const bars = await getEquityBars(sym, trade.date);
    if (bars.length < ENTRY_BAR_INDEX + 1) continue;

    const avgSpreadHistory = await getDailySpreadHistory(sym, trade.date, 20);
    const avgDailySpread =
      avgSpreadHistory.length > 0 ? avgSpreadHistory.reduce((a, b) => a + b, 0) / avgSpreadHistory.length : 0;

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
      tfStock: trade.symbol,
      tfCePe: trade.optionType,
      tfStrike: trade.strike,
      tfPnl: trade.pnl,
      ourTopStock: ourTop.symbol,
      ourRank: tfRank,
      ourSpread: ourTop.spreadRatio,
      ourDirection,
      ourADX: ourTop.adx,
      stockMatch: ourTop.symbol === trade.symbol,
      directionMatch: ourDirection === trade.optionType,
      tfInTop10: tfRank > 0 && tfRank <= 10,
      entryTime: '',
      entryPrice: 0,
      exitTime: '',
      exitPrice: 0,
      exitReason: 'No option data for this date',
      lotSize: 0,
      grossPnl: 0,
      charges: 0,
      netPnl: 0,
      profitable: false,
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

// ─── Trade Detail API (for real-data backtesting) ────────────────────────────

export interface TradeDetailSignal {
  timestamp: number;
  time: string;
  spreadRatio: number;
  rFactor: number;
  adx: number;
  plusDI: number;
  minusDI: number;
  direction: 'CE' | 'PE';
  isHot: boolean;
  optionClose: number;
  equityClose: number;
}

export interface TradeDetail {
  optionBars: {
    timestamp: number;
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    oi: number;
  }[];
  equityBars: { timestamp: number; time: string; open: number; high: number; low: number; close: number }[];
  futuresBars: { timestamp: number; time: string; close: number; oi: number }[];
  signals: TradeDetailSignal[];
  tf: { spotPrice: number | null; pnl: number; strike: number; optionType: string; expiry: string | null };
  estimatedEntry: { barIndex: number; timestamp: number; time: string; optionPrice: number; method: string } | null;
  estimatedExit: { barIndex: number; timestamp: number; time: string; optionPrice: number; method: string } | null;
  pnlCurve: { timestamp: number; time: string; optionPrice: number; pnl: number; pnlPct: number }[];
  lotSize: number;
  symbol: string;
  date: string;
  dataAvailable: boolean;
}

export interface SimulationResult {
  entryPrice: number;
  exitPrice: number;
  lotSize: number;
  grossPnl: number;
  charges: ChargesBreakdown;
  netPnl: number;
  pnlPct: number;
  tfPnl: number;
  pnlDifference: number;
}

/** Get option bars WITH strike filter (fixes existing bug) */
async function getFullOptionBars(symbol: string, optionType: string, strike: number, date: string) {
  const rows = (await queryRows(`
    SELECT timestamp, open, high, low, close, volume, oi
    FROM backtest_options
    WHERE symbol = '${symbol}' AND option_type = '${optionType}' AND CAST(strike AS REAL) = ${strike} AND date = '${date}'
    ORDER BY timestamp ASC
  `)) as { timestamp: number; open: number; high: number; low: number; close: number; volume: number; oi: number }[];
  return rows.map((r) => ({
    timestamp: Number(r.timestamp),
    time: formatTime(Number(r.timestamp)),
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: Number(r.volume),
    oi: Number(r.oi),
  }));
}

/** Get futures bars with OI */
async function getFullFuturesBars(symbol: string, date: string) {
  const rows = (await queryRows(`
    SELECT timestamp, open, high, low, close, volume, oi
    FROM backtest_futures
    WHERE symbol = '${symbol}' AND date = '${date}'
    ORDER BY timestamp ASC
  `)) as { timestamp: number; open: number; high: number; low: number; close: number; volume: number; oi: number }[];
  return rows.map((r) => ({
    timestamp: Number(r.timestamp),
    time: formatTime(Number(r.timestamp)),
    close: Number(r.close),
    oi: Number(r.oi),
  }));
}

/** Get lot size from master_contracts */
async function getLotSize(symbol: string): Promise<number> {
  try {
    const map = await batchResolveFutures([symbol]);
    const fut = map.get(symbol);
    return fut?.lotSize ?? 1000;
  } catch {
    return 1000;
  }
}

/**
 * Get full trade detail — bar-by-bar data, signals, P&L curve.
 * This is the core function for the real-data backtest view.
 */
export async function getTradeDetail(params: {
  symbol: string;
  date: string;
  optionType: 'CE' | 'PE';
  strike: number;
  spotPrice?: number | null;
  tfPnl?: number;
  tfExpiry?: string | null;
  // Verified execution data (from broker screenshots)
  tfEntryTime?: string; // "10:17:46 AM"
  tfEntryPrice?: number; // Option premium at entry
  tfExitTime?: string; // "03:25:32 PM"
  tfExitPrice?: number; // Option premium at exit
  tfQuantity?: number;
}): Promise<TradeDetail> {
  const { symbol, date, optionType, strike } = params;

  // Load bars
  const equityBarsRaw = await getEquityBars(symbol, date);
  const optionBarsRaw = await getFullOptionBars(symbol, optionType, strike, date);
  const futuresBarsRaw = await getFullFuturesBars(symbol, date);
  const lotSize = await getLotSize(symbol);

  const dataAvailable = equityBarsRaw.length > 0 && optionBarsRaw.length > 0;

  // Format equity bars with time
  const equityBars = equityBarsRaw.map((b) => ({ ...b, time: formatTime(b.timestamp) }));

  // Get 20-day spread history for R-Factor baseline
  const avgSpreadHistory = await getDailySpreadHistory(symbol, date, 20);
  const avgDailySpread =
    avgSpreadHistory.length > 0 ? avgSpreadHistory.reduce((a, b) => a + b, 0) / avgSpreadHistory.length : 0;

  // Compute signals at EVERY equity bar
  const signals: TradeDetailSignal[] = [];
  for (let i = 0; i < equityBarsRaw.length; i++) {
    const sig = computeSignals(equityBarsRaw, i, avgDailySpread);
    const rFactor = Math.max(1.0, 1.5596 * sig.spreadRatio);
    const direction: 'CE' | 'PE' = sig.plusDI > sig.minusDI ? 'CE' : 'PE';
    const isHot = rFactor >= 2.0 && sig.adx >= 28;

    // Find matching option bar (closest timestamp)
    const optBar = optionBarsRaw.find((o) => o.timestamp === equityBarsRaw[i].timestamp);

    signals.push({
      timestamp: equityBarsRaw[i].timestamp,
      time: formatTime(equityBarsRaw[i].timestamp),
      spreadRatio: Math.round(sig.spreadRatio * 100) / 100,
      rFactor: Math.round(rFactor * 100) / 100,
      adx: Math.round(sig.adx),
      plusDI: Math.round(sig.plusDI),
      minusDI: Math.round(sig.minusDI),
      direction,
      isHot,
      optionClose: optBar?.close ?? 0,
      equityClose: equityBarsRaw[i].close,
    });
  }

  // Determine entry bar — use verified data if available, else estimate
  let estimatedEntry: TradeDetail['estimatedEntry'] = null;

  if (params.tfEntryTime && params.tfEntryPrice && params.tfEntryPrice > 0) {
    // VERIFIED: find bar by TIME, not by price
    // Parse "10:17:46 AM" → hours:minutes in 24h format
    const entryBarIdx = findBarByTime(optionBarsRaw, params.tfEntryTime);
    const idx = entryBarIdx >= 0 ? entryBarIdx : 0;
    estimatedEntry = {
      barIndex: idx,
      timestamp: optionBarsRaw[idx].timestamp,
      time: formatTime(optionBarsRaw[idx].timestamp),
      optionPrice: params.tfEntryPrice,
      method: `verified (₹${params.tfEntryPrice} @ ${params.tfEntryTime})`,
    };
  } else if (params.spotPrice && params.spotPrice > 0 && equityBarsRaw.length > 0) {
    // ESTIMATED: match equity price to TF's spot_price
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < equityBarsRaw.length; i++) {
      const diff = Math.abs(equityBarsRaw[i].close - params.spotPrice);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    const optBar = optionBarsRaw.find((o) => o.timestamp === equityBarsRaw[bestIdx].timestamp);
    estimatedEntry = {
      barIndex: bestIdx,
      timestamp: equityBarsRaw[bestIdx].timestamp,
      time: formatTime(equityBarsRaw[bestIdx].timestamp),
      optionPrice: optBar?.close ?? 0,
      method: `spot-match (₹${params.spotPrice})`,
    };
  } else if (equityBarsRaw.length > 6) {
    const idx = 6;
    const optBar = optionBarsRaw.find((o) => o.timestamp === equityBarsRaw[idx].timestamp);
    estimatedEntry = {
      barIndex: idx,
      timestamp: equityBarsRaw[idx].timestamp,
      time: formatTime(equityBarsRaw[idx].timestamp),
      optionPrice: optBar?.close ?? 0,
      method: 'default-945',
    };
  }

  // Determine exit bar — use verified data if available, else estimate
  let estimatedExit: TradeDetail['estimatedExit'] = null;

  if (params.tfExitTime && params.tfExitPrice && params.tfExitPrice > 0 && optionBarsRaw.length > 0) {
    // VERIFIED: find bar by TIME
    const exitBarIdx = findBarByTime(optionBarsRaw, params.tfExitTime);
    const idx = exitBarIdx >= 0 ? exitBarIdx : optionBarsRaw.length - 1;
    estimatedExit = {
      barIndex: idx,
      timestamp: optionBarsRaw[idx].timestamp,
      time: formatTime(optionBarsRaw[idx].timestamp),
      optionPrice: params.tfExitPrice,
      method: `verified (₹${params.tfExitPrice} @ ${params.tfExitTime})`,
    };
  } else if (estimatedEntry && params.tfPnl && lotSize > 0 && optionBarsRaw.length > 0) {
    // ESTIMATED: reverse-engineer from P&L
    const entryPrice = estimatedEntry.optionPrice;
    if (entryPrice > 0) {
      const impliedExitPrice = entryPrice + params.tfPnl / lotSize;
      let bestIdx = optionBarsRaw.length - 1;
      let bestDiff = Infinity;
      for (let i = estimatedEntry.barIndex + 1; i < optionBarsRaw.length; i++) {
        const diff = Math.abs(optionBarsRaw[i].close - impliedExitPrice);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      }
      estimatedExit = {
        barIndex: bestIdx,
        timestamp: optionBarsRaw[bestIdx].timestamp,
        time: formatTime(optionBarsRaw[bestIdx].timestamp),
        optionPrice: optionBarsRaw[bestIdx].close,
        method: `pnl-match (implied ₹${impliedExitPrice.toFixed(1)})`,
      };
    }
  }

  // P&L curve from entry to end of day
  const pnlCurve: TradeDetail['pnlCurve'] = [];
  if (estimatedEntry && estimatedEntry.optionPrice > 0) {
    const entryPrice = estimatedEntry.optionPrice;
    for (let i = estimatedEntry.barIndex; i < optionBarsRaw.length; i++) {
      const price = optionBarsRaw[i].close;
      const pnl = Math.round((price - entryPrice) * lotSize);
      const pnlPct = entryPrice > 0 ? Math.round(((price - entryPrice) / entryPrice) * 10000) / 100 : 0;
      pnlCurve.push({
        timestamp: optionBarsRaw[i].timestamp,
        time: formatTime(optionBarsRaw[i].timestamp),
        optionPrice: price,
        pnl,
        pnlPct,
      });
    }
  }

  return {
    optionBars: optionBarsRaw.map((b) => ({ ...b, time: formatTime(b.timestamp) })),
    equityBars,
    futuresBars: futuresBarsRaw,
    signals,
    tf: {
      spotPrice: params.spotPrice ?? null,
      pnl: params.tfPnl ?? 0,
      strike,
      optionType,
      expiry: params.tfExpiry ?? null,
    },
    estimatedEntry,
    estimatedExit,
    pnlCurve,
    lotSize,
    symbol,
    date,
    dataAvailable,
  };
}

/**
 * Simulate a trade with custom entry/exit timestamps.
 */
export async function simulateTrade(params: {
  symbol: string;
  date: string;
  optionType: 'CE' | 'PE';
  strike: number;
  entryTimestamp: number;
  exitTimestamp: number;
  tfPnl?: number;
}): Promise<SimulationResult> {
  const optBars = await getFullOptionBars(params.symbol, params.optionType, params.strike, params.date);
  const lotSize = await getLotSize(params.symbol);

  const entryBar = optBars.find((b) => b.timestamp === params.entryTimestamp) ?? optBars[0];
  const exitBar = optBars.find((b) => b.timestamp === params.exitTimestamp) ?? optBars[optBars.length - 1];

  if (!entryBar || !exitBar) {
    return {
      entryPrice: 0,
      exitPrice: 0,
      lotSize,
      grossPnl: 0,
      charges: { brokerage: 0, stt: 0, exchangeTxn: 0, gst: 0, sebi: 0, stampDuty: 0, total: 0 },
      netPnl: 0,
      pnlPct: 0,
      tfPnl: params.tfPnl ?? 0,
      pnlDifference: 0,
    };
  }

  const entryPrice = entryBar.close;
  const exitPrice = exitBar.close;
  const grossPnl = Math.round((exitPrice - entryPrice) * lotSize);
  const charges = calculateOptionCharges({
    numOrders: 2,
    buyTurnover: entryPrice * lotSize,
    sellTurnover: exitPrice * lotSize,
  });
  const netPnl = Math.round(grossPnl - charges.total);
  const pnlPct = entryPrice > 0 ? Math.round(((exitPrice - entryPrice) / entryPrice) * 10000) / 100 : 0;

  return {
    entryPrice,
    exitPrice,
    lotSize,
    grossPnl,
    charges,
    netPnl,
    pnlPct,
    tfPnl: params.tfPnl ?? 0,
    pnlDifference: netPnl - (params.tfPnl ?? 0),
  };
}
