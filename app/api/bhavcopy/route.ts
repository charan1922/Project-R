import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();
    const date = searchParams.get('date');
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50', 10), 500);
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10);

    const where: Record<string, unknown> = {};
    if (symbol) where.symbol = { contains: symbol };
    if (date) where.date = date;

    const [data, total, dates] = await Promise.all([
      prisma.bhavcopyDay.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [{ date: 'desc' }, { symbol: 'asc' }],
      }),
      prisma.bhavcopyDay.count({ where }),
      prisma.bhavcopyDay.findMany({
        select: { date: true },
        distinct: ['date'],
        orderBy: { date: 'desc' },
      }),
    ]);

    const dateList = dates.map((d) => d.date);

    return NextResponse.json({
      success: true,
      data,
      total,
      dates: dateList,
      dateRange: dateList.length > 0 ? { from: dateList[dateList.length - 1], to: dateList[0] } : null,
    });
  } catch (error) {
    console.error('Bhavcopy API Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
