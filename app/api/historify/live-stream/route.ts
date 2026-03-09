import { NextRequest } from 'next/server';
import { liveManager } from '@/lib/historify/live-manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    console.log('[LiveStreamRoute] SSE connection request');

    const encoder = new TextEncoder();
    let controllerRef: ReadableStreamDefaultController | null = null;

    const stream = new ReadableStream({
        start(controller) {
            controllerRef = controller;
            // Flush initial SSE event so the browser knows the connection is live
            controller.enqueue(encoder.encode(`: connected\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: 'info', data: { status: 'connected' } })}\n\n`));
            liveManager.addClient(controller);
        },
        cancel() {
            if (controllerRef) liveManager.removeClient(controllerRef);
        },
    });

    req.signal.onabort = () => {
        if (controllerRef) {
            liveManager.removeClient(controllerRef);
            try { controllerRef.close(); } catch {}
        }
    };

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
