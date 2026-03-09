import { NextRequest, NextResponse } from 'next/server';
import { liveManager } from '@/lib/historify/live-manager';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const { action, symbol } = await req.json();

        if (action === 'subscribe') {
            await liveManager.subscribeSymbol(symbol);
        } else if (action === 'unsubscribe') {
            await liveManager.unsubscribeSymbol(symbol);
        }

        return NextResponse.json({ success: true, symbol, action });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
