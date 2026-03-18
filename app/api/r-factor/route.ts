import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { MasterContractsNotSyncedError } from '@/lib/historify/master-contracts';
import { BhavcopyNotSyncedError } from '@/lib/r-factor/bhavcopy-service';
import { rFactorService } from '@/lib/r-factor/data-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();

    if (symbol) {
      console.log(`Calculating R-Factor for ${symbol}...`);
      const signal = await rFactorService.getRFactorSignal(symbol);
      return NextResponse.json({
        success: true,
        data: signal,
        timestamp: new Date().toISOString(),
      });
    }

    // If no symbol, run a bulk scan
    console.log('Running bulk R-Factor scan...');
    const limit = parseInt(searchParams.get('limit') || '15', 10);
    const result = await rFactorService.scanAllSymbols(limit);

    return NextResponse.json({
      success: true,
      count: result.signals.length,
      data: result.signals,
      dataSource: result.dataSource,
      latestDate: result.latestDate,
      marketOpen: result.marketOpen,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof MasterContractsNotSyncedError) {
      return NextResponse.json(
        { success: false, error: error.message, code: 'SYNC_REQUIRED', syncTarget: 'master-contracts' },
        { status: 503 },
      );
    }
    if (error instanceof BhavcopyNotSyncedError) {
      return NextResponse.json(
        { success: false, error: error.message, code: 'SYNC_REQUIRED', syncTarget: 'bhavcopy' },
        { status: 503 },
      );
    }
    console.error('R-Factor API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || 'Failed to calculate R-Factor',
      },
      { status: 500 },
    );
  }
}

export const revalidate = 60; // Revalidate every minute
