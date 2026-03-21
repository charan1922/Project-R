import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { type RiskConfig, DEFAULT_RISK_CONFIG } from '@/lib/ai-trading/types';

// In-memory config (persists across requests within the same server process)
const g = globalThis as unknown as { __aiTradingConfig?: RiskConfig };

function getConfig(): RiskConfig {
  return g.__aiTradingConfig ?? DEFAULT_RISK_CONFIG;
}

function setConfig(config: RiskConfig): void {
  g.__aiTradingConfig = config;
}

/**
 * GET /api/ai-trading/config
 *
 * Returns current AI trading configuration.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    config: getConfig(),
    defaults: DEFAULT_RISK_CONFIG,
  });
}

/**
 * PUT /api/ai-trading/config
 *
 * Update AI trading configuration.
 * Body: partial RiskConfig (merged with current config)
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const current = getConfig();
    const updated: RiskConfig = { ...current, ...body };

    // Validate critical fields
    if (updated.maxCapitalPerTrade < 0.5 || updated.maxCapitalPerTrade > 10) {
      return NextResponse.json({ success: false, error: 'maxCapitalPerTrade must be 0.5-10%' }, { status: 400 });
    }
    if (updated.maxOpenPositions < 1 || updated.maxOpenPositions > 20) {
      return NextResponse.json({ success: false, error: 'maxOpenPositions must be 1-20' }, { status: 400 });
    }
    if (updated.minADXThreshold < 10 || updated.minADXThreshold > 50) {
      return NextResponse.json({ success: false, error: 'minADXThreshold must be 10-50' }, { status: 400 });
    }

    setConfig(updated);

    return NextResponse.json({ success: true, config: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 },
    );
  }
}
