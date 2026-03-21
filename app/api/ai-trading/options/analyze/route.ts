import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { runOptionCycle, clearDailyPick } from '@/lib/ai-trading/option-engine';
import { hasAIConfig } from '@/lib/ai-trading/ai-analyzer';
import { DEFAULT_RISK_CONFIG } from '@/lib/ai-trading/types';

/**
 * POST /api/ai-trading/options/analyze
 *
 * Run one option analysis cycle:
 * 1. Scan R-Factor for top stock
 * 2. Determine CE/PE from ADX direction
 * 3. Resolve ATM option contract
 * 4. AI analysis for confidence
 * 5. Return pick with charges breakdown
 *
 * Body: { capital?: number, reset?: boolean }
 */
export async function POST(req: Request) {
  try {
    if (!hasAIConfig()) {
      return NextResponse.json(
        { success: false, error: 'AI_GATEWAY_API_KEY not configured' },
        { status: 503 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const capital = body.capital ?? 500000;

    // Reset daily pick if requested
    if (body.reset) {
      clearDailyPick();
    }

    const result = await runOptionCycle(DEFAULT_RISK_CONFIG, capital);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[AI Options] Analysis error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
