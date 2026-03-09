import { NextRequest } from 'next/server';
import { liveManager } from '../../../../lib/historify/live-manager';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    console.log(`[LiveStreamRoute] Incoming request from ${req.ip || 'unknown'}`);

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Standard controller interface for LiveManager
    const controller = {
        enqueue: (data: Uint8Array) => writer.write(data),
        close: () => writer.close(),
        error: (err: any) => writer.abort(err),
    } as unknown as ReadableStreamDefaultController;

    liveManager.addClient(controller);

    req.signal.onabort = () => {
        console.log("[LiveStreamRoute] Client aborted connection");
        liveManager.removeClient(controller);
        writer.close().catch(() => {});
    };

    return new Response(readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
