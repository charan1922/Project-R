import { getDhanAccessToken } from '@/lib/dhan/auth';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DHAN_BASE = 'https://api.dhan.co/v2';

async function proxyToDhan(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const dhanPath = `/${path.join('/')}`;
  const queryString = new URL(req.url).search;
  const url = `${DHAN_BASE}${dhanPath}${queryString}`;

  let accessToken = '';
  const clientId = process.env.DHAN_CLIENT_ID ?? '';
  try {
    accessToken = await getDhanAccessToken();
  } catch {
    accessToken = process.env.DHAN_ACCESS_TOKEN ?? '';
  }

  const headers: Record<string, string> = {
    'access-token': accessToken,
    'client-id': clientId,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const fetchOpts: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      const body = await req.text();
      if (body) fetchOpts.body = body;
    } catch {
      // no body
    }
  }

  const resp = await fetch(url, fetchOpts);
  const data = await resp.text();

  return new NextResponse(data, {
    status: resp.status,
    headers: {
      'Content-Type': resp.headers.get('Content-Type') ?? 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export const GET = proxyToDhan;
export const POST = proxyToDhan;
export const PUT = proxyToDhan;
export const DELETE = proxyToDhan;
