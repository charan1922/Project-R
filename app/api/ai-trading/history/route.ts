import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import type { ExecutableDecision } from '@/lib/ai-trading/types';

// In-memory decision history (persists within server process, lost on restart)
// TODO: Migrate to Prisma DB for persistence
const g = globalThis as unknown as { __aiDecisionHistory?: ExecutableDecision[] };

export function addDecision(decision: ExecutableDecision): void {
  if (!g.__aiDecisionHistory) g.__aiDecisionHistory = [];
  g.__aiDecisionHistory.push(decision);
  // Keep last 500 decisions
  if (g.__aiDecisionHistory.length > 500) {
    g.__aiDecisionHistory = g.__aiDecisionHistory.slice(-500);
  }
}

export function getHistory(): ExecutableDecision[] {
  return g.__aiDecisionHistory ?? [];
}

/**
 * GET /api/ai-trading/history
 *
 * Returns past AI trading decisions (most recent first).
 * Query params: ?limit=50&action=BUY
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
  const actionFilter = url.searchParams.get('action')?.toUpperCase();

  let history = getHistory();

  if (actionFilter && ['BUY', 'SELL', 'HOLD'].includes(actionFilter)) {
    history = history.filter((d) => d.action === actionFilter);
  }

  // Most recent first
  const sorted = [...history].reverse().slice(0, limit);

  return NextResponse.json({
    success: true,
    count: sorted.length,
    total: history.length,
    data: sorted,
  });
}
