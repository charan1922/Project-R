Already aligned: Next.js 16, React 19, Tailwind 4, shadcn/ui, Zustand, Lucide, pnpm — you're current on the core stack.

  Key gaps to address (3 tiers):

  Tier 1 (Must-have):
  1. Env validation — 7+ files read process.env with silent fallbacks; live-manager.ts has a manual .env.local loader that should
  go
  2. Security headers — zero configured in next.config.ts
  3. Error boundaries — no error.tsx or global-error.tsx anywhere
  4. Biome over ESLint — faster, simpler, next-forge default

  Tier 2 (Should-have):
  5. Sentry error tracking
  6. Middleware (request timing, CORS)
  7. nuqs for URL state (bookmarkable filter states)
  8. next-safe-action for type-safe mutations

  Tier 3 (Nice-to-have):
  9. Vercel Analytics, not-found/loading pages, structured logging

  Not applicable (skipped): Monorepo/Turborepo, Clerk auth, Stripe, Resend email, CMS, i18n, collaboration, notifications,
  webhooks — these are SaaS patterns that don't fit a trading platform.

⏺ User approved Claude's plan
  ⎿  Plan saved to: ~/.claude/plans/idempotent-rolling-fiddle.md · /plan to edit
     Next-Forge Alignment Upgrades for Project-R

     Context

     The project is a Next.js 16 trading platform already aligned with next-forge on core stack (React 19, Tailwind 4, shadcn/ui,
     Zustand, Lucide). However, it lacks several operational/DX patterns that next-forge considers standard: environment
     validation, security headers, error boundaries, modern linting, error tracking, and URL state management. These gaps matter
     more for a trading platform than a typical app.

     ---
     TIER 1: Must-Have (do first)

     1.1 Environment Validation with Zod

     Create lib/env.ts — validate DHAN_CLIENT_ID, DHAN_ACCESS_TOKEN, VERCEL, NODE_ENV using Zod (already a dependency). Fail fast
     with clear error on missing vars.

     Files to modify:
     - lib/env.ts — new file, Zod schema + parse
     - lib/historify/dhan-client.ts — replace process.env.DHAN_CLIENT_ID || "" with env.DHAN_CLIENT_ID
     - lib/historify/live-manager.ts — remove loadEnvLocal() (lines 9-27), use env.*
     - lib/r-factor/data-service.ts — use env.*
     - lib/quant/data-loader.ts — use env.*
     - lib/historify/db.ts — use env.VERCEL
     - lib/historify/duckdb.ts — use env.VERCEL
     - lib/r-factor/bhavcopy-service.ts — use env.*
     - app/api/historify/settings/route.ts — use env.*

     Packages: None (Zod already present)

     1.2 Security Headers

     Add headers() to next.config.ts — 6 standard headers on all routes:
     - Strict-Transport-Security, X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff, X-DNS-Prefetch-Control: on,
     Referrer-Policy: origin-when-cross-origin, Permissions-Policy: camera=(), microphone=(), geolocation=()

     Files to modify: next.config.ts

     1.3 Error Boundaries

     Create app/global-error.tsx and app/error.tsx — catch rendering errors with styled recovery UI matching the dark theme.

     Files to create:
     - app/global-error.tsx — outermost boundary (Client Component)
     - app/error.tsx — page-level boundary

     1.4 Biome Linter (replace ESLint)

     Replace ESLint with Biome for 35x faster linting + formatting in one tool.

     Steps:
     1. pnpm add -D @biomejs/biome
     2. Create biome.json — recommended rules, 2-space indent, ignore node_modules/dist/.next/dhanv2
     3. Update package.json scripts: "lint": "biome check .", add "format": "biome format --write ."
     4. pnpm remove eslint eslint-config-next

     ---
     TIER 2: Should-Have

     2.1 Sentry Error Tracking

     Packages: @sentry/nextjs

     Files to create:
     - sentry.client.config.ts — client init with replay on error
     - sentry.server.config.ts — server init
     - sentry.edge.config.ts — edge init
     - instrumentation.ts — Next.js instrumentation hook

     Files to modify:
     - next.config.ts — wrap with withSentryConfig()
     - app/global-error.tsx — add Sentry.captureException
     - lib/env.ts — add SENTRY_DSN to schema

     2.2 Middleware

     Create middleware.ts with: request timing headers, CORS for API routes, matcher excluding _next and static assets.

     2.3 nuqs (URL State)

     Packages: nuqs

     Add NuqsAdapter to app/layout.tsx. Replace useState with useQueryState for filters/search on key pages:
     - app/trading-lab/intelligence/page.tsx
     - app/trading-lab/scanner/page.tsx
     - app/quant/backtester/page.tsx

     2.4 next-safe-action (Type-Safe Server Actions)

     Packages: next-safe-action

     Convert mutation-only API routes to server actions:
     - app/api/historify/settings/route.ts POST
     - app/api/historify/sync/route.ts POST
     - app/api/historify/watchlist/route.ts POST

     Keep SSE endpoints and GET routes as-is.

     ---
     TIER 3: Nice-to-Have

     3.1 Vercel Analytics

     pnpm add @vercel/analytics, add <Analytics /> to app/layout.tsx.

     3.2 not-found.tsx + loading.tsx

     Create app/not-found.tsx (branded 404) and app/loading.tsx (skeleton).

     3.3 Structured Logging

     Create lib/logger.ts — JSON in production, console in dev. Gradually replace 45+ console.log/error calls.

     ---
     Implementation Order

     1.1 Env Validation → 1.2 Security Headers → 1.3 Error Boundaries → 1.4 Biome
                                                           ↓
                                                     2.1 Sentry
                                                           ↓
                                         2.2 Middleware + 2.3 nuqs (parallel)
                                                           ↓
                                         2.4 Server Actions + Tier 3 (parallel)

     Verification

     After each tier:
     - pnpm build — ensure no build errors
     - pnpm dev — smoke test live data, charts, R-Factor pages
     - pnpm lint — (after 1.4) verify Biome runs clean
     - Check Sentry dashboard for test error (after 2.1)
     - Verify security headers via browser DevTools Network tab (after 1.2)