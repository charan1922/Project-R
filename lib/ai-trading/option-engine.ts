/**
 * Option Trading Engine
 *
 * Replicates TradeFinder's strategy:
 * 1. R-Factor picks the stock (highest institutional activity)
 * 2. ADX + DI confirms direction (+DI > -DI → CE, else PE)
 * 3. ATM strike resolution via master contracts
 * 4. AI analysis for confidence + entry/SL/target
 * 5. One pick per day, highest conviction only
 */

import { rFactorService } from '@/lib/r-factor/data-service';
import { isMarketHours } from '@/lib/dhan/market-feed';
import { analyzeSignal, hasAIConfig } from './ai-analyzer';
import { getTopCandidates, toTradeSignal } from './signal-collector';
import { estimateEntryCharges } from './commissions';
import { resolveATMOption, type ResolvedOption } from './option-resolver';
import type { AIModelProvider, OptionExecutableDecision, RiskConfig } from './types';
import { DEFAULT_RISK_CONFIG } from './types';

/** Daily pick state — prevents multiple entries per day */
const g = globalThis as unknown as { __dailyOptionPick?: { date: string; symbol: string } };

function isDailyPickLocked(today: string): boolean {
  return g.__dailyOptionPick?.date === today;
}

function lockDailyPick(today: string, symbol: string): void {
  g.__dailyOptionPick = { date: today, symbol };
}

export function clearDailyPick(): void {
  g.__dailyOptionPick = undefined;
}

export interface OptionCycleResult {
  timestamp: string;
  marketOpen: boolean;
  dailyPickLocked: boolean;
  lockedSymbol: string | null;
  candidatesScanned: number;
  pick: OptionExecutableDecision | null;
  resolvedOption: ResolvedOption | null;
  error: string | null;
}

/**
 * Run one option decision cycle.
 * Picks the top R-Factor stock, resolves the ATM option, runs AI analysis.
 */
export async function runOptionCycle(
  config: RiskConfig = DEFAULT_RISK_CONFIG,
  capitalAvailable: number = 500000,
  modelId: AIModelProvider = 'deepseek/deepseek-chat',
): Promise<OptionCycleResult> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const result: OptionCycleResult = {
    timestamp: new Date().toISOString(),
    marketOpen: isMarketHours(),
    dailyPickLocked: isDailyPickLocked(today),
    lockedSymbol: g.__dailyOptionPick?.date === today ? g.__dailyOptionPick.symbol : null,
    candidatesScanned: 0,
    pick: null,
    resolvedOption: null,
    error: null,
  };

  if (!result.marketOpen) {
    result.error = 'Market is closed';
    return result;
  }

  if (!hasAIConfig()) {
    result.error = 'AI Gateway not configured';
    return result;
  }

  if (result.dailyPickLocked) {
    result.error = `Already picked ${result.lockedSymbol} today. One trade per day.`;
    return result;
  }

  try {
    // Step 1: Scan R-Factor signals
    const scanResult = await rFactorService.scanLive({ useOptionChain: false });
    if (scanResult.signals.length === 0) {
      result.error = 'No signals available';
      return result;
    }

    // Step 2: Filter top candidates (R >= 2.0, ADX >= 28)
    const candidates = getTopCandidates(scanResult.signals, config, 5);
    result.candidatesScanned = candidates.length;

    if (candidates.length === 0) {
      result.error = 'No candidates meet R-Factor + ADX thresholds';
      return result;
    }

    // Step 3: Pick top-1 stock
    const topStock = candidates[0];
    const plusDI = topStock.plusDI ?? 0;
    const minusDI = topStock.minusDI ?? 0;
    const direction: 'CE' | 'PE' = plusDI > minusDI ? 'CE' : 'PE';

    // Step 4: Resolve ATM option
    const resolved = await resolveATMOption(topStock.symbol, direction, 7);
    result.resolvedOption = resolved;

    if (!resolved) {
      result.error = `Could not resolve option for ${topStock.symbol} ${direction}`;
      return result;
    }

    if (resolved.optionPrice <= 0) {
      result.error = `Option premium is 0 for ${resolved.optionSymbol} — market may be closed`;
      return result;
    }

    // Step 5: Check premium cap
    const maxPremium = 500;
    if (resolved.optionPrice > maxPremium) {
      result.error = `Premium ₹${resolved.optionPrice} exceeds cap ₹${maxPremium}`;
      return result;
    }

    // Step 6: Calculate position size
    const maxCost = capitalAvailable * (config.maxCapitalPerTrade / 100);
    const costPerLot = resolved.optionPrice * resolved.lotSize;
    const numLots = Math.max(1, Math.floor(maxCost / costPerLot));
    const quantity = numLots * resolved.lotSize;
    const totalCost = resolved.optionPrice * quantity;

    // Step 7: Estimate charges
    const charges = estimateEntryCharges(resolved.optionPrice, quantity);

    // Step 8: AI analysis
    const signal = toTradeSignal(topStock);
    const aiDecision = await analyzeSignal(signal, modelId);

    // Step 9: Build executable decision
    const pick: OptionExecutableDecision = {
      ...aiDecision,
      action: direction === 'CE' ? 'BUY' : 'BUY', // Always buying options
      optionType: direction,
      strikePrice: resolved.strikePrice,
      optionSecurityId: resolved.securityId,
      optionSymbol: resolved.optionSymbol,
      spotPrice: resolved.spotPrice,
      optionEntryPrice: resolved.optionPrice,
      lotSize: resolved.lotSize,
      quantity,
      expiryDate: resolved.expiryDate,
      dte: resolved.dte,
      positionSize: numLots,
      totalCost,
      estimatedCharges: charges.total,
      approved: aiDecision.confidence >= 0.5 && aiDecision.action !== 'HOLD',
      rejectReason: aiDecision.action === 'HOLD' ? 'AI recommends HOLD' : undefined,
    };

    result.pick = pick;

    // Lock daily pick if approved
    if (pick.approved) {
      lockDailyPick(today, topStock.symbol);
      result.dailyPickLocked = true;
      result.lockedSymbol = topStock.symbol;
    }
  } catch (error) {
    result.error = (error as Error).message;
  }

  return result;
}
