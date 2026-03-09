import { NextRequest, NextResponse } from 'next/server';
import { DhanHQClient } from '@/dhanv2/src';
import { resolveSymbol } from '@/lib/historify/master-contracts';
import path from 'path';
import fs from 'fs';

// Safer manual .env.local parsing to handle JWT tokens which often contain '=' padding
function loadEnvLocal() {
    try {
        const envLocalPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envLocalPath)) {
            const content = fs.readFileSync(envLocalPath, 'utf8');
            content.split('\n').forEach(line => {
                const index = line.indexOf('=');
                if (index !== -1) {
                    const key = line.substring(0, index).trim();
                    const value = line.substring(index + 1).trim().replace(/^["']|["']$/g, '');
                    if (key && value) {
                        process.env[key] = value;
                    }
                }
            });
        }
    } catch (e) {
        console.error("[LiveHistoryAPI] Manual env load failed", e);
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    if (process.env.NODE_ENV !== 'production') {
        loadEnvLocal();
    }

    try {
        const resolved = await resolveSymbol(symbol, 'NSE');
        if (!resolved) {
            console.error(`[LiveHistoryAPI] Could not resolve symbol: ${symbol}`);
            return NextResponse.json({ error: 'Could not resolve symbol' }, { status: 404 });
        }

        console.log(`[LiveHistoryAPI] Resolved ${symbol}:`, {
            id: resolved.securityId,
            segment: resolved.segment,
            instrument: resolved.instrument
        });

        const clientId = process.env.DHAN_CLIENT_ID;
        const accessToken = process.env.DHAN_ACCESS_TOKEN;

        if (!clientId || !accessToken) {
            console.error("[LiveHistoryAPI] Dhan credentials missing in environment");
            return NextResponse.json({ error: 'Dhan credentials missing' }, { status: 500 });
        }

        const dhan = new DhanHQClient(clientId, accessToken);
        const toDate = new Date().toISOString().split('T')[0];
        const fromDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Dhan API expects specific Enum strings for segment and instrument
        const history = await dhan.historical.getIntradayHistorical({
            securityId: resolved.securityId,
            exchangeSegment: resolved.segment as any,
            instrument: resolved.instrument as any,
            interval: 1,
            fromDate,
            toDate,
        });

        if (!history || !history.timestamp) {
            console.warn(`[LiveHistoryAPI] No history returned for ${symbol}`);
            return NextResponse.json({ candles: [] });
        }

        const candles = history.timestamp.map((ts, i) => ({
            time: ts, 
            open: history.open[i],
            high: history.high[i],
            low: history.low[i],
            close: history.close[i],
            volume: history.volume[i],
        }));

        console.log(`[LiveHistoryAPI] Successfully fetched ${candles.length} candles for ${symbol}`);
        return NextResponse.json({ candles });
    } catch (e: any) {
        // Detailed error logging for API failures
        console.error("[LiveHistoryAPI] Fatal Error:", e.toString());
        if (e.errorCode) console.error("Code:", e.errorCode, "Type:", e.errorType);
        
        return NextResponse.json({ 
            error: e.message || 'Internal Server Error',
            details: e.errorCode || undefined
        }, { status: 500 });
    }
}
