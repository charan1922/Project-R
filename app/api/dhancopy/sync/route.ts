import { NextResponse } from 'next/server';
import { DhanDateUnavailableError, patchDhanOptionsForZeroRows } from '@/lib/r-factor/dhan-daily-service';
import {
  computeAndCacheDhanDate,
  computeAndCacheDhanRange,
  computeAndCacheMissingDhanDates,
} from '@/lib/r-factor/dhan-sync-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === 'compute-dhan' && body.date) {
      const single = await computeAndCacheDhanDate(body.date as string);
      return NextResponse.json({ success: true, ...single });
    }

    if (body.action === 'compute-dhan-range') {
      const result = await computeAndCacheDhanRange(
        body.fromDate as string | undefined,
        body.toDate as string | undefined,
      );
      return NextResponse.json(result.body, result.success ? undefined : { status: result.status });
    }

    if (body.action === 'compute-dhan-missing') {
      const result = await computeAndCacheMissingDhanDates(
        body.fromDate as string | undefined,
        body.toDate as string | undefined,
      );
      return NextResponse.json(result.body, result.success ? undefined : { status: result.status });
    }

    if (body.action === 'patch-options') {
      const result = await patchDhanOptionsForZeroRows(
        body.fromDate as string | undefined,
        body.toDate as string | undefined,
      );
      return NextResponse.json({
        success: true,
        mode: 'patch-options',
        patched: result.patched,
        skipped: result.skipped,
        dates: result.dates,
      });
    }

    return NextResponse.json(
      {
        error:
          'Provide { action: "compute-dhan", date } or { action: "compute-dhan-range", fromDate?, toDate? } or { action: "compute-dhan-missing", fromDate?, toDate? } or { action: "patch-options", fromDate?, toDate? }',
      },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof DhanDateUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          code: 'DHAN_DATE_UNAVAILABLE',
          error: error.message,
          requestedDate: error.requestedDate,
          latestAvailableDate: error.latestAvailableDate,
          probeSymbol: error.probeSymbol,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
