import { NextRequest } from 'next/server';
import { liveManager } from '@/lib/historify/live-manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HEARTBEAT_INTERVAL_MS = 30_000;

export async function GET(req: NextRequest) {
  console.log('[LiveStreamRoute] SSE connection request');

  const encoder = new TextEncoder();
  let controllerRef: ReadableStreamDefaultController | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const cleanup = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (controllerRef) {
      liveManager.removeClient(controllerRef);
    }
  };

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      // Flush initial SSE event so the browser knows the connection is live
      controller.enqueue(encoder.encode(`: connected\n\n`));
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ event: 'info', data: { status: 'connected' } })}\n\n`),
      );
      liveManager.addClient(controller);

      // Heartbeat: SSE comment every 30s to prevent proxy/browser timeouts
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // Client disconnected — cleanup will handle removal
          cleanup();
        }
      }, HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      cleanup();
    },
  });

  req.signal.onabort = () => {
    cleanup();
    try {
      controllerRef?.close();
    } catch {}
  };

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
