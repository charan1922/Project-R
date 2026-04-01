/**
 * Risk Manager — Position sizing, stop-loss, and portfolio risk checks.
 *
 * Ensures no single trade can blow up the account.
 * All decisions pass through risk checks before execution.
 */

import type { ExecutableDecision, ExecutionResult, RiskConfig, TradeDecision } from './types';

/** Current portfolio state for risk calculations */
export interface PortfolioState {
  totalCapital: number; // Total trading capital in ₹
  usedCapital: number; // Capital currently in open positions
  dailyPnL: number; // Today's realized + unrealized P&L
  openPositions: { symbol: string; sector: string | null; capitalUsed: number }[];
}

/**
 * Check a trade decision against risk rules and compute position size.
 *
 * @returns ExecutableDecision with approved/rejected status
 */
export function checkRisk(
  decision: TradeDecision,
  portfolio: PortfolioState,
  config: RiskConfig,
  lotValue: number | null,
  sector: string | null,
): ExecutableDecision {
  const base: ExecutableDecision = {
    ...decision,
    positionSize: 0,
    capitalRequired: 0,
    riskAmount: 0,
    approved: false,
  };

  // HOLD decisions are always approved (no execution needed)
  if (decision.action === 'HOLD') {
    return { ...base, approved: true, rejectReason: 'HOLD — no action' };
  }

  // Paper trading mode — approve but flag
  if (config.paperTrading) {
    const sized = computePositionSize(decision, portfolio, config, lotValue);
    return {
      ...base,
      ...sized,
      approved: true,
      rejectReason: 'PAPER MODE — not executing',
    };
  }

  // Check: daily loss limit
  const dailyLossPct = (Math.abs(Math.min(0, portfolio.dailyPnL)) / portfolio.totalCapital) * 100;
  if (dailyLossPct >= config.maxDailyLoss) {
    return {
      ...base,
      rejectReason: `Daily loss limit reached (${dailyLossPct.toFixed(1)}% >= ${config.maxDailyLoss}%)`,
    };
  }

  // Check: max open positions
  if (portfolio.openPositions.length >= config.maxOpenPositions) {
    return {
      ...base,
      rejectReason: `Max positions reached (${portfolio.openPositions.length}/${config.maxOpenPositions})`,
    };
  }

  // Check: already have position in this symbol
  if (portfolio.openPositions.some((p) => p.symbol === decision.symbol)) {
    return { ...base, rejectReason: `Already holding ${decision.symbol}` };
  }

  // Check: sector exposure
  if (sector) {
    const sectorCapital = portfolio.openPositions
      .filter((p) => p.sector === sector)
      .reduce((sum, p) => sum + p.capitalUsed, 0);
    const sectorPct = (sectorCapital / portfolio.totalCapital) * 100;
    if (sectorPct >= config.maxSectorExposure) {
      return {
        ...base,
        rejectReason: `Sector ${sector} exposure ${sectorPct.toFixed(0)}% >= ${config.maxSectorExposure}%`,
      };
    }
  }

  // Check: minimum risk-reward ratio
  if (decision.riskRewardRatio !== null && decision.riskRewardRatio < config.minRiskReward) {
    return { ...base, rejectReason: `R:R ratio ${decision.riskRewardRatio.toFixed(1)} < ${config.minRiskReward}` };
  }

  // Compute position size
  const sized = computePositionSize(decision, portfolio, config, lotValue);
  if (sized.positionSize === 0) {
    return { ...base, rejectReason: 'Position size computed as 0 (insufficient capital or lot value too high)' };
  }

  return { ...base, ...sized, approved: true };
}

/** Compute position size based on capital allocation and risk */
function computePositionSize(
  decision: TradeDecision,
  portfolio: PortfolioState,
  config: RiskConfig,
  lotValue: number | null,
): { positionSize: number; capitalRequired: number; riskAmount: number } {
  const maxCapital = portfolio.totalCapital * (config.maxCapitalPerTrade / 100);
  const availableCapital = portfolio.totalCapital - portfolio.usedCapital;
  const capital = Math.min(maxCapital, availableCapital);

  if (!lotValue || lotValue <= 0 || capital <= 0) {
    return { positionSize: 0, capitalRequired: 0, riskAmount: 0 };
  }

  // F&O margin is ~20-25% of notional
  const marginFactor = 0.25;
  const maxLots = Math.floor(capital / (lotValue * marginFactor));
  const positionSize = Math.max(1, maxLots); // At least 1 lot

  const capitalRequired = positionSize * lotValue * marginFactor;

  // Risk amount = SL distance × position size
  const entry = decision.suggestedEntry ?? 0;
  const sl = decision.suggestedStopLoss ?? entry * (1 - config.defaultStopLossPct / 100);
  const riskPerUnit = Math.abs(entry - sl);
  const riskAmount = riskPerUnit * positionSize;

  return { positionSize, capitalRequired, riskAmount };
}

/** Track session P&L from executions */
export function computeSessionPnL(executions: ExecutionResult[]): number {
  let pnl = 0;
  const positions = new Map<string, { side: string; price: number; qty: number }>();

  for (const exec of executions) {
    if (exec.status !== 'filled') continue;
    const price = exec.filledPrice ?? exec.price;

    const existing = positions.get(exec.symbol);
    if (existing && existing.side !== exec.side) {
      // Closing trade — compute P&L
      const entryPrice = existing.price;
      const exitPrice = price;
      const qty = Math.min(existing.qty, exec.quantity);
      pnl += existing.side === 'BUY' ? (exitPrice - entryPrice) * qty : (entryPrice - exitPrice) * qty;
      positions.delete(exec.symbol);
    } else {
      // Opening trade
      positions.set(exec.symbol, { side: exec.side, price, qty: exec.quantity });
    }
  }

  return pnl;
}
