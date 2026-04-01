import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { isMarketHours } from '@/lib/dhan/market-feed';
import { runDecisionCycle } from '@/lib/ai-trading/decision-engine';
import { hasAIConfig } from '@/lib/ai-trading/ai-analyzer';
import { DEFAULT_RISK_CONFIG } from '@/lib/ai-trading/types';
import type { AIModelProvider } from '@/lib/ai-trading/types';

/**
 * GET /api/ai-trading/stream
 *
 * SSE stream of AI trading decisions. Runs a decision cycle every 60s
 * during market hours. Clients connect via EventSource.
 */
export async function GET(req: NextRequest) {
  if (!hasAIConfig()) {
    return NextResponse.json({ success: false, error: 'AI_GATEWAY_API_KEY not configured' }, { status: 503 });
  }

  const modelId = (req.nextUrl.searchParams.get('model') ?? 'deepseek/deepseek-chat') as AIModelProvider;
  const intervalMs = 60_000; // 60 seconds between cycles

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let stopped = false;

      const sendEvent = (data: unknown) => {
        if (stopped) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          stopped = true;
        }
      };

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        sendEvent({ type: 'heartbeat', timestamp: new Date().toISOString() });
      }, 30_000);

      // Decision cycle
      const runCycle = async () => {
        if (stopped) return;

        if (!isMarketHours()) {
          sendEvent({
            type: 'status',
            message: 'Market closed. Waiting for market hours (9:15-15:30 IST).',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        try {
          const result = await runDecisionCycle(
            DEFAULT_RISK_CONFIG,
            { totalCapital: 500000, usedCapital: 0, dailyPnL: 0, openPositions: [] },
            modelId,
          );

          sendEvent({ type: 'cycle', ...result });
        } catch (error) {
          sendEvent({
            type: 'error',
            message: (error as Error).message,
            timestamp: new Date().toISOString(),
          });
        }
      };

      // Run immediately + then every interval
      runCycle();
      const interval = setInterval(runCycle, intervalMs);

      // Cleanup on disconnect
      req.signal.addEventListener('abort', () => {
        stopped = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
