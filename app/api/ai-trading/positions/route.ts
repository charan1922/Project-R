import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Open position tracking */
export interface OpenPosition {
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  quantity: number;
  currentPrice: number;
  peakPrice: number;
  sector: string | null;
  enteredAt: string;
  unrealizedPnL: number;
  pnlPct: number;
}

// In-memory positions (persists within server process)
// TODO: Migrate to Prisma DB for persistence
const g = globalThis as unknown as {
  __openPositions?: Map<string, OpenPosition>;
  __closedPnL?: number;
};

export function getPositions(): OpenPosition[] {
  return Array.from(g.__openPositions?.values() ?? []);
}

export function addPosition(pos: OpenPosition): void {
  if (!g.__openPositions) g.__openPositions = new Map();
  g.__openPositions.set(pos.symbol, pos);
}

export function removePosition(symbol: string): OpenPosition | null {
  const pos = g.__openPositions?.get(symbol) ?? null;
  g.__openPositions?.delete(symbol);
  return pos;
}

export function updatePositionPrice(symbol: string, currentPrice: number): void {
  const pos = g.__openPositions?.get(symbol);
  if (!pos) return;
  pos.currentPrice = currentPrice;
  pos.peakPrice = Math.max(pos.peakPrice, currentPrice);
  pos.unrealizedPnL = (currentPrice - pos.entryPrice) * pos.quantity * (pos.side === 'BUY' ? 1 : -1);
  pos.pnlPct = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100 * (pos.side === 'BUY' ? 1 : -1);
}

export function getClosedPnL(): number {
  return g.__closedPnL ?? 0;
}

export function addClosedPnL(amount: number): void {
  g.__closedPnL = (g.__closedPnL ?? 0) + amount;
}

/**
 * GET /api/ai-trading/positions
 *
 * Returns open positions + session P&L summary.
 */
export async function GET() {
  const positions = getPositions();
  const totalUnrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  const closedPnL = getClosedPnL();

  return NextResponse.json({
    success: true,
    positions,
    summary: {
      openCount: positions.length,
      totalUnrealizedPnL: Math.round(totalUnrealizedPnL),
      closedPnL: Math.round(closedPnL),
      totalPnL: Math.round(totalUnrealizedPnL + closedPnL),
    },
  });
}
