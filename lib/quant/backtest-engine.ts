/**
 * Backtest Engine — Lightweight Portfolio Simulator
 * Signal-based portfolio construction with realistic Indian fee modeling.
 */

import { getDailyPrices, type OHLCVRow } from './data-loader';
import { inferSegment, SEGMENT_FEES, type TradingSegment } from './fees';
import { emaCrossoverSignals, DEFAULT_EMA_PARAMS, type EMAParams } from './strategies/ema-crossover';
import { rsiAccumulationSignals, DEFAULT_RSI_ACC_PARAMS, type RSIAccParams } from './strategies/rsi-accumulation';

// ── Types ────────────────────────────────────────────────────────────────────

export type StrategyType = 'ema_crossover' | 'dual_momentum' | 'rsi_accumulation' | 'buy_hold_75_25';

export interface BacktestConfig {
  strategy: StrategyType;
  symbol: string;
  interval: string; // "Daily", "5min", etc.
  startDate: string;
  endDate: string;
  initialCash: number;
  allocation: number; // fraction of capital per trade (e.g. 0.75)
  params: Record<string, number>;
  /** Slippage in basis points per trade (default: 5 bps = 0.05%). Set 0 to disable. */
  slippageBps?: number;
  /** Max drawdown threshold (%) to pause new entries. 0 = disabled. */
  maxDrawdownLimit?: number;
}

export interface Trade {
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  shares: number;
  pnl: number;
  pnlPercent: number;
  fees: number;
}

export interface BacktestResult {
  strategy: StrategyType;
  symbol: string;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  cagr: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  /** 95% daily Value at Risk as a negative percentage (e.g., -2.1 means 5% chance of losing >2.1% in a day) */
  dailyVaR95: number;
  trades: Trade[];
  equityCurve: { date: string; value: number }[];
  benchmarkCurve: { date: string; value: number }[];
}

// ── Portfolio Simulation ─────────────────────────────────────────────────────

function simulateFromSignals(
  data: OHLCVRow[],
  allocations: number[], // 0 means no entry, >0 means fraction of capital to deploy
  exits: boolean[],
  initialCash: number,
  globalAllocation: number, // used as fallback or baseline
  segment: TradingSegment,
  slippageBps = 5, // default 5 bps slippage per trade
  maxDrawdownLimit = 0, // 0 = disabled
): { trades: Trade[]; equityCurve: { date: string; value: number }[] } {
  const trades: Trade[] = [];
  const equityCurve: { date: string; value: number }[] = [];

  // We need to track average entry price to calculate PnL correctly when accumulating
  let cash = initialCash;
  let shares = 0;
  let totalInvested = 0; // Tracks total cost basis

  let entryDate = '';
  const feeRate = SEGMENT_FEES[segment];
  const slippageRate = slippageBps / 10000; // convert bps to decimal

  // Drawdown circuit breaker state
  let peakValue = initialCash;
  let circuitBreakerActive = false;
  let cooldownBarsLeft = 0;
  const COOLDOWN_BARS = 10; // pause entries for 10 bars after max DD breach

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const currentAlloc = allocations[i];

    // Update drawdown circuit breaker
    const currentValue = cash + shares * row.close;
    if (currentValue > peakValue) peakValue = currentValue;
    if (maxDrawdownLimit > 0) {
      const currentDD = ((peakValue - currentValue) / peakValue) * 100;
      if (currentDD >= maxDrawdownLimit && !circuitBreakerActive) {
        circuitBreakerActive = true;
        cooldownBarsLeft = COOLDOWN_BARS;
      }
      if (circuitBreakerActive) {
        cooldownBarsLeft--;
        if (cooldownBarsLeft <= 0) circuitBreakerActive = false;
      }
    }

    if (currentAlloc > 0 && cash > 0 && !circuitBreakerActive) {
      // Accumulate (Buy) — apply slippage: buy at worse (higher) price
      const buyPrice = row.close * (1 + slippageRate);
      // Use specific allocation if provided (like RSI slabs), otherwise fallback to global
      const investAmount = cash * (currentAlloc === 1 ? globalAllocation : currentAlloc);
      const buyFee = investAmount * feeRate;
      const newShares = Math.floor((investAmount - buyFee) / buyPrice);

      if (newShares > 0) {
        if (shares === 0) entryDate = row.date; // record first entry date
        shares += newShares;
        totalInvested += newShares * buyPrice;
        cash -= newShares * buyPrice + buyFee;
      }
    } else if (exits[i] && shares > 0) {
      // Sell all — apply slippage: sell at worse (lower) price
      const sellPrice = row.close * (1 - slippageRate);
      const avgEntryPrice = totalInvested / shares;
      const sellValue = shares * sellPrice;
      const sellFee = sellValue * feeRate;

      // Total fees = buy fees (approx via avg entry) + sell fee
      const estimatedBuyFees = totalInvested * feeRate;
      const totalFees = estimatedBuyFees + sellFee;

      const pnl = sellPrice * shares - totalInvested - totalFees;
      const pnlPct = ((sellPrice - avgEntryPrice) / avgEntryPrice) * 100;

      trades.push({
        entryDate,
        entryPrice: +avgEntryPrice.toFixed(2),
        exitDate: row.date,
        exitPrice: +sellPrice.toFixed(2),
        shares,
        pnl: +pnl.toFixed(2),
        pnlPercent: +pnlPct.toFixed(2),
        fees: +totalFees.toFixed(2),
      });

      cash += sellValue - sellFee;
      shares = 0;
      totalInvested = 0;
    }

    const portfolioValue = cash + shares * row.close;
    equityCurve.push({ date: row.date, value: +portfolioValue.toFixed(2) });
  }

  // Force close open position at last bar
  if (shares > 0) {
    const lastRow = data[data.length - 1];
    const sellPrice = lastRow.close * (1 - slippageRate);
    const avgEntryPrice = totalInvested / shares;
    const sellValue = shares * sellPrice;
    const sellFee = sellValue * feeRate;
    const estimatedBuyFees = totalInvested * feeRate;
    const totalFees = estimatedBuyFees + sellFee;

    const pnl = sellPrice * shares - totalInvested - totalFees;

    trades.push({
      entryDate,
      entryPrice: +avgEntryPrice.toFixed(2),
      exitDate: lastRow.date,
      exitPrice: +sellPrice.toFixed(2),
      shares,
      pnl: +pnl.toFixed(2),
      pnlPercent: +(((sellPrice - avgEntryPrice) / avgEntryPrice) * 100).toFixed(2),
      fees: +totalFees.toFixed(2),
    });

    cash += sellValue - sellFee;
    shares = 0;
    totalInvested = 0;

    // Update last equity point
    equityCurve[equityCurve.length - 1].value = +cash.toFixed(2);
  }

  return { trades, equityCurve };
}

// ── Metrics Calculation ──────────────────────────────────────────────────────

function calcMetrics(
  trades: Trade[],
  equityCurve: { date: string; value: number }[],
  initialCash: number,
): Omit<BacktestResult, 'strategy' | 'symbol' | 'trades' | 'equityCurve' | 'benchmarkCurve'> {
  const finalValue = equityCurve[equityCurve.length - 1]?.value || initialCash;
  const totalReturn = ((finalValue - initialCash) / initialCash) * 100;

  // CAGR
  const years = equityCurve.length / 252;
  const cagr = years > 0 ? (Math.pow(finalValue / initialCash, 1 / years) - 1) * 100 : 0;

  // Max Drawdown
  let peak = equityCurve[0]?.value || initialCash;
  let maxDD = 0;
  for (const pt of equityCurve) {
    if (pt.value > peak) peak = pt.value;
    const dd = ((peak - pt.value) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  }

  // Win rate & profit factor
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Sharpe Ratio (annualized, daily returns)
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    dailyReturns.push((equityCurve[i].value - equityCurve[i - 1].value) / equityCurve[i - 1].value);
  }
  const avgReturn = dailyReturns.reduce((s, r) => s + r, 0) / (dailyReturns.length || 1);
  const stdReturn = Math.sqrt(dailyReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / (dailyReturns.length || 1));
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

  // 95% Historical VaR — sort daily returns, take the 5th percentile
  const sortedReturns = [...dailyReturns].sort((a, b) => a - b);
  const varIndex = Math.floor(sortedReturns.length * 0.05);
  const dailyVaR95 = sortedReturns.length > 0 ? sortedReturns[varIndex] * 100 : 0;

  return {
    totalReturn: +totalReturn.toFixed(2),
    sharpeRatio: +sharpeRatio.toFixed(2),
    maxDrawdown: +(-maxDD).toFixed(2),
    cagr: +cagr.toFixed(2),
    winRate: +winRate.toFixed(1),
    totalTrades: trades.length,
    profitFactor: +profitFactor.toFixed(2),
    dailyVaR95: +dailyVaR95.toFixed(2),
  };
}

// ── Main Backtest Runner ─────────────────────────────────────────────────────

export async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  const { strategy, symbol, interval, startDate, endDate, initialCash, allocation, params } = config;

  // Fetch OHLCV data
  const data = await getDailyPrices(symbol, startDate, endDate);
  if (data.length < 30) {
    throw new Error(`Insufficient data for ${symbol}: only ${data.length} bars (need 30+)`);
  }

  const closes = data.map((r) => r.close);
  const dates = data.map((r) => r.date);
  const segment = inferSegment(interval);

  let allocations: number[];
  let exits: boolean[];

  switch (strategy) {
    case 'ema_crossover': {
      const p: EMAParams = {
        fastPeriod: params.fastPeriod || DEFAULT_EMA_PARAMS.fastPeriod,
        slowPeriod: params.slowPeriod || DEFAULT_EMA_PARAMS.slowPeriod,
      };
      const highs = data.map((r) => r.high);
      const lows = data.map((r) => r.low);
      const signals = emaCrossoverSignals(
        closes,
        {
          ...p,
          atrPeriod: params.atrPeriod || 0,
          atrMultiplier: params.atrMultiplier || 2.0,
        },
        highs,
        lows,
      );
      allocations = signals.entries.map((e) => (e ? 1 : 0)); // 1 flags to use global allocation
      exits = signals.exits;
      break;
    }
    case 'rsi_accumulation': {
      // RSI accumulation generates buy signals at slab levels
      const rsiSignals = rsiAccumulationSignals(closes, dates);
      allocations = new Array(closes.length).fill(0);
      exits = new Array(closes.length).fill(false);

      for (const sig of rsiSignals) {
        allocations[sig.index] = sig.allocation; // push specific fraction (0.05, 0.10, 0.20)
      }

      // Generate exit signals when RSI > 70
      const { rsi } = await import('./math-utils');
      const rsiVals = rsi(closes, params.rsiPeriod || 14);
      let inPos = false;
      for (let i = 0; i < closes.length; i++) {
        if (allocations[i] > 0) inPos = true;
        if (inPos && !isNaN(rsiVals[i]) && rsiVals[i] > 70) {
          exits[i] = true;
          inPos = false;
        }
      }
      break;
    }
    default:
      // Default to simple buy & hold
      allocations = new Array(closes.length).fill(0);
      exits = new Array(closes.length).fill(false);
      allocations[0] = 1;
      exits[closes.length - 1] = true;
  }

  const slippageBps = config.slippageBps ?? 5;
  const maxDrawdownLimit = config.maxDrawdownLimit ?? 0;
  const { trades, equityCurve } = simulateFromSignals(
    data,
    allocations,
    exits,
    initialCash,
    allocation,
    segment,
    slippageBps,
    maxDrawdownLimit,
  );

  // Build benchmark curve (buy & hold of same symbol)
  const benchmarkCurve = data.map((r) => ({
    date: r.date,
    value: +((r.close / data[0].close) * initialCash).toFixed(2),
  }));

  const metrics = calcMetrics(trades, equityCurve, initialCash);

  return {
    strategy,
    symbol,
    ...metrics,
    trades,
    equityCurve,
    benchmarkCurve,
  };
}
