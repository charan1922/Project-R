import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { rFactorService } from '@/lib/r-factor/data-service';
import { analyzeSignal, hasAIConfig } from '@/lib/ai-trading/ai-analyzer';
import { toTradeSignal } from '@/lib/ai-trading/signal-collector';
import { checkRisk } from '@/lib/ai-trading/risk-manager';
import { DEFAULT_RISK_CONFIG } from '@/lib/ai-trading/types';
import type { AIModelProvider } from '@/lib/ai-trading/types';

/**
 * POST /api/ai-trading/analyze
 *
 * Analyze a single stock or top N stocks with AI.
 *
 * Body: { symbol?: string, topN?: number, model?: string }
 */
export async function POST(req: NextRequest) {
  try {
    if (!hasAIConfig()) {
      return NextResponse.json(
        { success: false, error: 'AI Gateway not configured. Add AI_GATEWAY_API_KEY to .env.local' },
        { status: 503 },
      );
    }

    const body = await req.json();
    const symbol = body.symbol?.toUpperCase() as string | undefined;
    const topN = body.topN ?? 5;
    const modelId = (body.model ?? 'deepseek/deepseek-chat') as AIModelProvider;

    if (symbol) {
      // Single stock analysis
      const scanResult = await rFactorService.scanLive({ useOptionChain: false });
      const boost = scanResult.signals.find((s) => s.symbol === symbol);
      if (!boost) {
        return NextResponse.json({ success: false, error: `Stock ${symbol} not found in scan` }, { status: 404 });
      }

      const signal = toTradeSignal(boost);
      const decision = await analyzeSignal(signal, modelId);
      const executable = checkRisk(
        decision,
        { totalCapital: 500000, usedCapital: 0, dailyPnL: 0, openPositions: [] },
        DEFAULT_RISK_CONFIG,
        boost.lotValue ?? null,
        boost.sector ?? null,
      );

      return NextResponse.json({
        success: true,
        signal,
        decision: executable,
        timestamp: new Date().toISOString(),
      });
    }

    // Top N analysis
    const scanResult = await rFactorService.scanLive({ useOptionChain: false });
    const topStocks = scanResult.signals.sort((a, b) => b.compositeRFactor - a.compositeRFactor).slice(0, topN);

    const results = [];
    for (const boost of topStocks) {
      try {
        const signal = toTradeSignal(boost);
        const decision = await analyzeSignal(signal, modelId);
        results.push({ signal, decision });
      } catch (error) {
        results.push({
          signal: toTradeSignal(boost),
          decision: { action: 'HOLD', error: (error as Error).message },
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AI Trading] Analysis error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
