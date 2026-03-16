import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.toUpperCase() || '';
    const segment = searchParams.get('segment') || '';
    const instrument = searchParams.get('instrument') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const where: Record<string, unknown> = {};
    if (q) where.symbol = { contains: q };
    if (segment) where.segment = segment;
    if (instrument) where.instrument = instrument;

    const [data, total, syncRow, segments, instruments] = await Promise.all([
      prisma.masterContract.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { symbol: 'asc' },
      }),
      prisma.masterContract.count({ where }),
      prisma.masterContract.findFirst({ select: { syncDate: true }, orderBy: { id: 'desc' } }),
      prisma.masterContract.findMany({ select: { segment: true }, distinct: ['segment'] }),
      prisma.masterContract.findMany({ select: { instrument: true }, distinct: ['instrument'] }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      total,
      syncDate: syncRow?.syncDate || null,
      filters: {
        segments: segments.map((s) => s.segment).sort(),
        instruments: instruments.map((i) => i.instrument).sort(),
      },
    });
  } catch (error) {
    console.error('Master Contracts API Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
