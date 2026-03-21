import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const DEFAULTS = {
  batchSize: 10,
  rateLimitMs: 250,
  defaultRange: '30',
  chartHeight: 450,
  autoRefresh: true,
  showTooltips: true,
};

const ALLOWED_FIELDS = new Set(Object.keys(DEFAULTS));
const VALID_RANGES = ['30', '90', '180', '365', '730'];

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function sanitize(body: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    switch (key) {
      case 'batchSize':
        if (typeof val === 'number') clean[key] = clamp(Math.round(val), 1, 50);
        break;
      case 'rateLimitMs':
        if (typeof val === 'number') clean[key] = clamp(Math.round(val), 100, 5000);
        break;
      case 'chartHeight':
        if (typeof val === 'number') clean[key] = clamp(Math.round(val), 200, 800);
        break;
      case 'defaultRange':
        if (typeof val === 'string' && VALID_RANGES.includes(val)) clean[key] = val;
        break;
      case 'autoRefresh':
      case 'showTooltips':
        if (typeof val === 'boolean') clean[key] = val;
        break;
    }
  }
  return clean;
}

export async function GET() {
  const row = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!row) return NextResponse.json(DEFAULTS);
  const { id, dhanClientId, dhanAccessToken, theme, ...rest } = row;
  return NextResponse.json({ ...DEFAULTS, ...rest });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = sanitize(body);
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: 'No valid fields provided' }, { status: 400 });
    }
    await prisma.settings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to save settings' }, { status: 500 });
  }
}
