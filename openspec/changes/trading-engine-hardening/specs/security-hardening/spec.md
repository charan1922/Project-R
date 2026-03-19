# Spec: Security Hardening

## Overview

Addresses security gaps identified in the external audit: SQL injection vulnerability, missing CSP header, unmasked secrets in Sentry, concurrent sync race conditions, and SSE connection timeouts.

## Changes

### 1. SQL Injection Fix

- Location: `app/api/historify/export/route.ts`
- Problem: `WHERE interval = '${interval}'` uses unsanitized user input in DuckDB query
- Fix: Added `VALID_INTERVALS` whitelist. Returns 400 for unknown values.
- Valid values: `Daily`, `5min`, `15min`, `30min`, `60min`, `1min`

### 2. Content-Security-Policy Header

- Location: `next.config.ts` → `securityHeaders` array
- Policy:

| Directive | Value | Reason |
|-----------|-------|--------|
| `default-src` | `'self'` | Only load resources from same origin |
| `script-src` | `'self' 'unsafe-inline' 'unsafe-eval'` | Required for Next.js hydration and dev mode |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind CSS injects inline styles |
| `img-src` | `'self' data: blob:` | Chart screenshots, data URIs |
| `connect-src` | `'self' wss: https://auth.dhan.co https://*.dhan.co https://*.sentry.io` | Dhan API, WebSocket, Sentry |
| `font-src` | `'self'` | Local fonts only |
| `frame-ancestors` | `'self'` | Prevent clickjacking (supplement to X-Frame-Options) |

### 3. Sentry Secret Masking

- Location: `sentry.server.config.ts`
- `beforeSend` hook with two protections:

**JWT masking in exceptions:**
- Regex: `/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g`
- Replaces with `[REDACTED_JWT]`
- Applied to all `exception.values[].value` strings

**Header scrubbing in breadcrumbs:**
- Scrubbed headers: `authorization`, `access-token`, `client-id`, `cookie`
- Replaces with `[REDACTED]`
- Applied to both `breadcrumb.data` and `breadcrumb.data.headers`

### 4. Sync Locks

- Locations: `app/api/master-contracts/sync/route.ts`, `app/api/bhavcopy/sync/route.ts`
- Pattern: Module-level `let syncing = false` flag
- On concurrent request: returns `409 Conflict` with `{ success: false, error: "Sync already in progress" }`
- Flag reset in `finally` block (guaranteed cleanup)
- Prevents: parallel CSV downloads, duplicate DB writes, rate limit exhaustion on NSE/Dhan APIs

### 5. SSE Heartbeat

- Location: `app/api/historify/live-stream/route.ts`
- Sends `: heartbeat\n\n` SSE comment every 30 seconds
- SSE comments (lines starting with `:`) are silently ignored by `EventSource` — no client-side changes needed
- Prevents: nginx/reverse proxy connection timeouts, browser giving up on idle streams
- Cleanup: `clearInterval` on both `cancel()` and `abort` signal paths via consolidated `cleanup()` function

## What's NOT Implemented

| Feature | Why Deferred |
|---------|-------------|
| API authentication middleware | Single-user local app; would add complexity without current need |
| Rate limiting | Low priority for local deployment; sync locks handle the worst case |
| Token encryption on disk | `data/.dhan-token.json` is gitignored; filesystem access = bigger problem |
| CORS enforcement | Same-origin by default in Next.js; no cross-origin consumers |

## Files Modified

- `app/api/historify/export/route.ts` — SQL injection fix
- `next.config.ts` — CSP header
- `sentry.server.config.ts` — beforeSend hook
- `app/api/master-contracts/sync/route.ts` — Sync lock
- `app/api/bhavcopy/sync/route.ts` — Sync lock
- `app/api/historify/live-stream/route.ts` — SSE heartbeat
