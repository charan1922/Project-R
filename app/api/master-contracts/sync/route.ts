import { NextResponse } from 'next/server';
import { forceSync } from '@/lib/historify/master-contracts';

export const dynamic = 'force-dynamic';

let syncing = false;

export async function POST() {
  if (syncing) {
    return NextResponse.json({ success: false, error: 'Sync already in progress' }, { status: 409 });
  }

  syncing = true;
  try {
    console.log('[API] Force re-syncing master contracts...');
    const result = await forceSync();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Master Contracts Sync Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  } finally {
    syncing = false;
  }
}
