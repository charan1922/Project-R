import { NextRequest, NextResponse } from 'next/server';
import { liveManager } from '../../../../lib/historify/live-manager';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    let controllerRef: ReadableStreamDefaultController | null = null;

    const stream = new ReadableStream({
        start(controller) {
            controllerRef = controller;
            liveManager.addClient(controller);
        },
        cancel() {
            if (controllerRef) {
                liveManager.removeClient(controllerRef);
            }
        }
    });

    req.signal.addEventListener('abort', () => {
        if (controllerRef) {
            liveManager.removeClient(controllerRef);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
