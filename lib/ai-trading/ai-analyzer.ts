/**
 * AI Analyzer — Vercel AI SDK integration for trade analysis.
 *
 * Uses Vercel AI Gateway or direct DeepSeek API to analyze
 * R-Factor + ADX signals and produce trading decisions.
 */

import { generateObject } from 'ai'; // eslint-disable-line -- stable API, deprecation is for experimental overload
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';
import { env } from '@/lib/env';
import type { AIModelProvider, TradeDecision, TradeSignal } from './types';
import { TRADING_SYSTEM_PROMPT, formatSignalPrompt } from './prompts';

/** Zod schema for structured AI output */
const tradeDecisionSchema = z.object({
  action: z.enum(['BUY', 'SELL', 'HOLD']),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  suggestedEntry: z.number().nullable(),
  suggestedStopLoss: z.number().nullable(),
  suggestedTarget: z.number().nullable(),
  timeframe: z.enum(['scalp', 'intraday', 'swing']),
  riskRewardRatio: z.number().nullable(),
});

/** Create AI Gateway provider (supports DeepSeek, OpenAI, Anthropic, etc.) */
function getProvider() {
  const apiKey = env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error('AI_GATEWAY_API_KEY not configured. Add it to .env.local');
  }

  return createOpenAICompatible({
    name: 'ai-gateway',
    baseURL: 'https://ai-gateway.vercel.sh/v1',
    apiKey,
  });
}

/**
 * Analyze a trade signal using AI and return a structured decision.
 *
 * @param signal - Aggregated R-Factor + ADX + market data
 * @param modelId - AI model to use (default: deepseek-chat)
 * @returns Structured TradeDecision
 */
export async function analyzeSignal(
  signal: TradeSignal,
  modelId: AIModelProvider = 'deepseek/deepseek-chat',
): Promise<TradeDecision> {
  const provider = getProvider();

  const { object } = await generateObject({
    model: provider(modelId),
    schema: tradeDecisionSchema,
    system: TRADING_SYSTEM_PROMPT,
    prompt: formatSignalPrompt(signal),
    temperature: 0.3, // Low temperature for consistent trading decisions
  });

  return {
    ...object,
    symbol: signal.symbol,
    modelUsed: modelId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Batch analyze multiple signals.
 * Processes sequentially to respect API rate limits.
 */
export async function analyzeMultipleSignals(
  signals: TradeSignal[],
  modelId: AIModelProvider = 'deepseek/deepseek-chat',
): Promise<TradeDecision[]> {
  const decisions: TradeDecision[] = [];

  for (const signal of signals) {
    try {
      const decision = await analyzeSignal(signal, modelId);
      decisions.push(decision);
    } catch (error) {
      console.error(`[AI Trading] Failed to analyze ${signal.symbol}:`, error);
      // Return HOLD on error
      decisions.push({
        action: 'HOLD',
        confidence: 0,
        symbol: signal.symbol,
        rationale: `Analysis failed: ${(error as Error).message}`,
        suggestedEntry: null,
        suggestedStopLoss: null,
        suggestedTarget: null,
        timeframe: 'intraday',
        riskRewardRatio: null,
        modelUsed: modelId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return decisions;
}

/** Check if AI Gateway is configured */
export function hasAIConfig(): boolean {
  return !!env.AI_GATEWAY_API_KEY;
}
