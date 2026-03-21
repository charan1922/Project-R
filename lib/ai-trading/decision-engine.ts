/**
 * Decision Engine — Orchestrates the AI trading pipeline.
 *
 * Flow: Signal Collection → AI Analysis → Risk Check → Execute/Log
 *
 * Entry rules:
 *   - Only between 9:45 AM - 11:00 AM IST (configurable)
 *   - Must pass R-Factor + ADX thresholds
 *   - Must pass risk manager checks
 *
 * Exit rules (configurable):
 *   - 'ai': AI decides when to exit
 *   - 'fixed-profit': Auto-exit when profit reaches target (e.g., ₹5,000)
 *   - 'fixed-time': Force-exit at specific time (e.g., 15:10)
 *   - 'trailing-sl': Trailing stop-loss
 */

import { rFactorService } from '@/lib/r-factor/data-service';
import { isMarketHours } from '@/lib/dhan/market-feed';
import { analyzeSignal, hasAIConfig } from './ai-analyzer';
import { getTopCandidates, toTradeSignal } from './signal-collector';
import { checkRisk, type PortfolioState } from './risk-manager';
import type { AIModelProvider, ExecutableDecision, RiskConfig, TradeDecision, TradeSignal } from './types';
import { DEFAULT_RISK_CONFIG } from './types';

/** Check if current time is within entry window (IST) */
function isInEntryWindow(config: RiskConfig): boolean {
  const now = new Date();
  const istHour = now.getUTCHours() + 5;
  const istMin = now.getUTCMinutes() + 30;
  const adjustedHour = istMin >= 60 ? istHour + 1 : istHour;
  const adjustedMin = istMin >= 60 ? istMin - 60 : istMin;
  const istTime = adjustedHour * 100 + adjustedMin; // HHMM format

  const [startH, startM] = config.entryWindowStart.split(':').map(Number);
  const [endH, endM] = config.entryWindowEnd.split(':').map(Number);
  const start = startH * 100 + startM;
  const end = endH * 100 + endM;

  return istTime >= start && istTime <= end;
}

/** Check if it's time to force-exit positions */
export function isForceExitTime(config: RiskConfig): boolean {
  const now = new Date();
  const istHour = now.getUTCHours() + 5;
  const istMin = now.getUTCMinutes() + 30;
  const adjustedHour = istMin >= 60 ? istHour + 1 : istHour;
  const adjustedMin = istMin >= 60 ? istMin - 60 : istMin;
  const istTime = adjustedHour * 100 + adjustedMin;

  const [exitH, exitM] = config.fixedExitTime.split(':').map(Number);
  const exitTime = exitH * 100 + exitM;

  return istTime >= exitTime;
}

export interface DecisionCycleResult {
  timestamp: string;
  inEntryWindow: boolean;
  marketOpen: boolean;
  candidatesScanned: number;
  decisions: ExecutableDecision[];
  errors: string[];
}

/**
 * Run one decision cycle — scan market, analyze top stocks, produce decisions.
 *
 * Called every 60s during market hours by the SSE stream.
 */
export async function runDecisionCycle(
  config: RiskConfig = DEFAULT_RISK_CONFIG,
  portfolio: PortfolioState,
  modelId: AIModelProvider = 'deepseek/deepseek-chat',
): Promise<DecisionCycleResult> {
  const result: DecisionCycleResult = {
    timestamp: new Date().toISOString(),
    inEntryWindow: false,
    marketOpen: isMarketHours(),
    candidatesScanned: 0,
    decisions: [],
    errors: [],
  };

  // Check prerequisites
  if (!result.marketOpen) {
    result.errors.push('Market is closed');
    return result;
  }

  if (!hasAIConfig()) {
    result.errors.push('AI Gateway not configured (missing AI_GATEWAY_API_KEY)');
    return result;
  }

  result.inEntryWindow = isInEntryWindow(config);

  try {
    // Step 1: Fetch all R-Factor signals
    const scanResult = await rFactorService.scanLive({ useOptionChain: false });
    if (scanResult.signals.length === 0) {
      result.errors.push('No signals available');
      return result;
    }

    // Step 2: Filter top candidates
    const candidates = getTopCandidates(scanResult.signals, config, 10);
    result.candidatesScanned = candidates.length;

    if (candidates.length === 0) {
      return result; // No candidates meet thresholds — that's fine
    }

    // Step 3: Analyze each candidate with AI (only during entry window for new trades)
    for (const boost of candidates) {
      try {
        const signal: TradeSignal = toTradeSignal(boost);

        // AI analysis
        const decision: TradeDecision = await analyzeSignal(signal, modelId);

        // Skip new entries outside entry window
        if (!result.inEntryWindow && decision.action !== 'HOLD') {
          result.decisions.push({
            ...decision,
            action: 'HOLD',
            positionSize: 0,
            capitalRequired: 0,
            riskAmount: 0,
            approved: false,
            rejectReason: `Outside entry window (${config.entryWindowStart}-${config.entryWindowEnd} IST)`,
          });
          continue;
        }

        // Step 4: Risk check
        const executable = checkRisk(
          decision,
          portfolio,
          config,
          boost.lotValue ?? null,
          boost.sector ?? null,
        );

        result.decisions.push(executable);
      } catch (error) {
        result.errors.push(`${boost.symbol}: ${(error as Error).message}`);
      }
    }
  } catch (error) {
    result.errors.push(`Scan failed: ${(error as Error).message}`);
  }

  return result;
}

/**
 * Check if any open position should be exited based on exit mode.
 */
export function shouldExit(
  config: RiskConfig,
  position: { symbol: string; entryPrice: number; currentPrice: number; quantity: number; peakPrice: number },
): { shouldExit: boolean; reason: string } {
  const pnl = (position.currentPrice - position.entryPrice) * position.quantity;

  switch (config.exitMode) {
    case 'fixed-profit':
      if (pnl >= config.fixedProfitTarget) {
        return { shouldExit: true, reason: `Profit target ₹${config.fixedProfitTarget} reached (P&L: ₹${pnl.toFixed(0)})` };
      }
      break;

    case 'fixed-time':
      if (isForceExitTime(config)) {
        return { shouldExit: true, reason: `Force exit time ${config.fixedExitTime} reached` };
      }
      break;

    case 'trailing-sl': {
      const trailingSL = position.peakPrice * (1 - config.trailingSlPct / 100);
      if (position.currentPrice <= trailingSL) {
        return { shouldExit: true, reason: `Trailing SL hit (${config.trailingSlPct}% from peak ₹${position.peakPrice.toFixed(0)})` };
      }
      break;
    }

    case 'ai':
      // AI exit decisions handled in the next analysis cycle
      return { shouldExit: false, reason: 'AI will decide' };
  }

  // Always force-exit near market close regardless of mode
  if (isForceExitTime(config)) {
    return { shouldExit: true, reason: `Market close exit at ${config.fixedExitTime}` };
  }

  // Stop-loss hit (universal)
  const slPct = config.defaultStopLossPct;
  const slPrice = position.entryPrice * (1 - slPct / 100);
  if (position.currentPrice <= slPrice) {
    return { shouldExit: true, reason: `Stop-loss hit (${slPct}% below entry)` };
  }

  return { shouldExit: false, reason: '' };
}
