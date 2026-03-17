import { NextResponse } from 'next/server';
import { MasterContractsNotSyncedError } from '@/lib/historify/master-contracts';
import { getHeatmapData } from '@/lib/sector/heatmap-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getHeatmapData();
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof MasterContractsNotSyncedError) {
      return NextResponse.json(
        { success: false, error: error.message, code: 'SYNC_REQUIRED', syncTarget: 'master-contracts' },
        { status: 503 },
      );
    }
    console.error('[SectorScope] API Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Failed to fetch sector data' },
      { status: 500 },
    );
  }
}

