import { NextRequest, NextResponse } from 'next/server';
import { liveManager } from '../../../../lib/historify/live-manager';

export async function POST(req: NextRequest) {
    try {
        const { action, symbol } = await req.json();

        if (!symbol || typeof symbol !== 'string') {
            return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
        }

        if (action === 'subscribe') {
            await liveManager.subscribeSymbol(symbol);
        } else if (action === 'unsubscribe') {
            await liveManager.unsubscribeSymbol(symbol);
        } else {
            return NextResponse.json({ error: 'Invalid action. Use subscribe or unsubscribe.' }, { status: 400 });
        }

        return NextResponse.json({ success: true, symbol, action });
    } catch (e: any) {
        console.error("[LiveFeedAPI] Error:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
