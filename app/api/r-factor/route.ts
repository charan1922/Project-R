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

    // Bulk scan — mode=live (Dhan) or mode=past (bhavcopy)
    const mode = searchParams.get('mode') ?? 'auto';
    const useOC = searchParams.get('useOC') !== 'false';
    const stockList = searchParams.get('stockList') === 'tf' ? ('tf' as const) : ('all' as const);
    const date = searchParams.get('date') || undefined;

    // Engine config overrides
    const preset = searchParams.get('preset'); // 'sq-dominant' | 'balanced'
    const robustParam = searchParams.get('robust'); // 'true' | 'false'
    const engineOverrides: Record<string, unknown> = {};
    if (preset === 'balanced') {
      engineOverrides.ensembleWeights = { ols: 0.50, spreadQuad: 0.30, momentum: 0.20 };
    }
    // sq-dominant is the default (0.05/0.90/0.05)
    if (robustParam === 'true') {
      engineOverrides.robustRegression = { enabled: true, huberEpsilon: 1.35 };
    } else if (robustParam === 'false') {
      engineOverrides.robustRegression = { enabled: false, huberEpsilon: 1.35 };
    }
    if (Object.keys(engineOverrides).length > 0) {
      rFactorService.setEngineOverrides(engineOverrides);
    } else {
      rFactorService.clearEngineOverrides();
    }

    if (mode === 'live') {
      const result = await rFactorService.scanLive({ useOptionChain: useOC, stockList });
      return NextResponse.json({
        success: true,
        count: result.signals.length,
        data: result.signals,
        dataSource: result.dataSource,
        latestDate: result.latestDate,
        marketOpen: result.marketOpen,
        timestamp: new Date().toISOString(),
      });
    }

    if (mode === 'past') {
      const result = await rFactorService.scanPast({ date, stockList });
      return NextResponse.json({
        success: true,
        count: result.signals.length,
        data: result.signals,
        dataSource: result.dataSource,
        latestDate: result.latestDate,
        marketOpen: result.marketOpen,
        availableDates: result.availableDates,
        timestamp: new Date().toISOString(),
      });
    }

    // mode=auto — backward compatible with existing behavior
    const limit = parseInt(searchParams.get('limit') || '206', 10);
    const result = await rFactorService.scanAllSymbols(limit, { useOptionChain: useOC, stockList });

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
