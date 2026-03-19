# Design: Trading Engine Hardening

## Context

An external AI trading audit document was reviewed against the actual Project-R codebase. Most recommendations were irrelevant (assumed AWS Lambda, Keycloak, Flutter, R language — none of which are in our stack). However, several gaps were real: no slippage in backtesting, zero risk management, unauthenticated APIs, no ATR-based exits, and missing security headers.

## Goals

- Make backtest results realistic by modeling slippage and market friction
- Add risk management primitives (drawdown limits, VaR, ATR stops)
- Harden security posture for deployment readiness
- Improve data pipeline robustness (SSE heartbeat, sync locks)

## Non-Goals

- LLM/NLP sentiment analysis (not part of our quantitative pipeline)
- Order book / Level 2 data (Dhan API doesn't expose this)
- User authentication system (single-user local app for now)
- Automated order execution (R-Factor remains observational)
- Kelly criterion live position sizing (backtest-only for now)

## Decisions

### D1: Slippage Model — Fixed BPS Over Dynamic Volume-Based

**Choice**: Configurable basis points (default 5 bps) applied symmetrically to buy/sell prices.

**Rationale**: Dynamic volume-based slippage requires reliable historical volume data at the bar level. Our Parquet data has volume but it's inconsistent across sources (Dhan vs. bhavcopy). Fixed BPS is simple, configurable, and conservative enough for EOD strategies. Users can increase it for illiquid stocks via the `slippageBps` parameter.

### D2: Drawdown Circuit Breaker — Bar-Based Cooldown

**Choice**: When portfolio drawdown from peak exceeds `maxDrawdownLimit`, pause new entries for 10 bars (not calendar days).

**Rationale**: Bar-based cooldown works for both daily and intraday data. Calendar-based would require date parsing and weekend/holiday handling. 10 bars is ~2 weeks for daily data, which provides enough time for regime stabilization without over-penalizing.

### D3: ATR Trailing Stop — Optional Extension to EMA Strategy

**Choice**: Added `atrPeriod` and `atrMultiplier` as optional params to `EMAParams`. When `atrPeriod > 0`, ATR trailing stop replaces EMA crossdown exit. When 0, original behavior preserved.

**Rationale**: Backwards compatible. ATR stops reduce whipsaw in trending markets but underperform in mean-reverting regimes. Making it optional lets users compare both exit methods via backtest.

### D4: SQL Injection Fix — Whitelist Over Parameterized Query

**Choice**: Validate `interval` against a `VALID_INTERVALS` set before query execution.

**Rationale**: DuckDB's `@duckdb/node-api` `conn.run()` doesn't support parameterized queries the same way as Prisma. A whitelist is simpler and more explicit — the set of valid intervals is finite and known.

### D5: Sync Locks — Module-Level Flag Over External Mutex

**Choice**: `let syncing = false` flag at module scope with `try/finally` cleanup.

**Rationale**: Next.js API routes share a single Node.js process. A module-level flag is sufficient for preventing concurrent sync operations. No external packages needed. Returns 409 Conflict for clarity.

### D6: CSP Header — Permissive For Next.js Compatibility

**Choice**: Allow `unsafe-inline` and `unsafe-eval` in script-src. Lock down connect-src to self + Dhan + Sentry.

**Rationale**: Next.js injects inline scripts for hydration and uses eval in dev mode. Strict CSP would break the app. The main security value is in `connect-src` (prevents XSS from exfiltrating data to arbitrary domains) and `frame-ancestors` (prevents clickjacking).

### D7: Sentry Secret Masking — beforeSend Hook

**Choice**: JWT regex pattern matching in exception values + header scrubbing in breadcrumbs.

**Rationale**: Sentry's built-in `sendDefaultPii: false` only blocks user data, not application secrets. The `beforeSend` hook catches JWTs that appear in error messages (e.g., "401 Unauthorized for token eyJ...") before they leave the server.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Fixed slippage underestimates impact for micro-cap stocks | Users can increase `slippageBps` (e.g., 20-50 for illiquid stocks) |
| ATR stop may exit too early in volatile markets | Configurable `atrMultiplier` — higher values give more room |
| CSP `unsafe-eval` weakens XSS protection | Only needed in dev; can tighten for production build |
| Sync lock doesn't survive server restart mid-sync | `finally` block ensures flag resets; worst case is a 409 on next request |
| VaR assumes normal distribution of returns | Using historical simulation (percentile), not parametric VaR |
