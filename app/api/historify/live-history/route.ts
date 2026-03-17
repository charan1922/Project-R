import { NextRequest, NextResponse } from 'next/server';
import { DhanHQClient } from '@/dhanv2/src';
import { resolveSymbol } from '@/lib/historify/master-contracts';
import { env } from '@/lib/env';
import { getDhanAccessToken, hasDhanAuth } from '@/lib/dhan/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const TAG = 'LiveHistoryAPI';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        const resolved = await resolveSymbol(symbol, 'NSE');
        if (!resolved) {
            logger.warn(`Could not resolve symbol: ${symbol}`, { module: TAG, symbol });
            return NextResponse.json({ error: 'Could not resolve symbol' }, { status: 404 });
        }

        if (!hasDhanAuth()) {
            logger.error('Dhan credentials missing in environment', { module: TAG });
            return NextResponse.json({ error: 'Dhan credentials missing' }, { status: 500 });
        }

        const token = await getDhanAccessToken();
        const dhan = new DhanHQClient(env.DHAN_CLIENT_ID!, token);
        const toDate = new Date().toISOString().split('T')[0];
        const fromDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const history = await dhan.historical.getIntradayHistorical({
            securityId: resolved.securityId,
            exchangeSegment: resolved.segment as any,
            instrument: resolved.instrument as any,
            interval: 1,
            fromDate,
            toDate,
        });

        if (!history || !history.timestamp) {
            logger.warn(`No history returned for ${symbol}`, { module: TAG, symbol });
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

        logger.info(`Fetched ${candles.length} candles for ${symbol}`, { module: TAG, symbol });
        return NextResponse.json({ candles });
    } catch (e: any) {
        logger.error(`Fatal: ${e.message}`, { module: TAG, symbol, errorCode: e.errorCode });
        return NextResponse.json({
            error: e.message || 'Internal Server Error',
            details: e.errorCode || undefined
        }, { status: 500 });
    }
}
