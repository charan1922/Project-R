# Design: R-Factor Enhancements

## Context

The R-Factor engine (OLS regression: `R = 1.11 + 0.625×spread + 0.077×pcr + 0.226×(spread×fut_turn) + 1.415×fut_turn - 1.733×fut_vol`) powers the Intraday Boost page. It scans 206 F&O stocks from NSE bhavcopy + Dhan live data. This design covers four enhancements: sector integration, post-market data, historical tracking, and modular refactor.

## Goals

- Show sector context (filter + column + activity score) matching TradeFinder's sector dropdown
- Always show today's data on trading days, even after market close
- Provide historical R-Factor views (per-stock and per-date)
- Make the codebase modular — shared helpers, extracted hooks, thin page components

## Non-Goals

- Sector-level aggregated R-Factor from raw bhavcopy data (too expensive; use per-stock average instead)
- Auto-syncing bhavcopy after market close (remains user-triggered per project convention)
- Market-cap-weighted sector scores (no live market cap data available)

## Decisions

### D1: Sector Activity Score = Average Spread Z-Score

**Choice**: Use the mean of `zScores.spread` (floored at 0) across stocks in a sector as the sector "X multiplier".

**Rationale**: Spread ratio has the largest OLS coefficient (0.625) and directly measures "activity relative to normal." A simple average of `compositeRFactor` would compress sector differences due to the constant intercept (1.11). Spread Z-score naturally gives a 0–3+ range matching TradeFinder's "X times" notation.

### D2: `isTradingDay()` Over `isMarketHours()`

**Choice**: Introduce `isTradingDay()` (weekday AND after 9:15 IST) for Dhan fetch decisions. Keep `isMarketHours()` for the UI badge only.

**Rationale**: Dhan's OHLC endpoint returns the day's final values even after 15:30. Restricting to `isMarketHours()` discards valid closing data, forcing a fallback to yesterday's bhavcopy. `isTradingDay()` captures the full trading day window.

### D3: Rolling Window for History API

**Choice**: For stock history, compute R-Factor at each date position using all prior data as the Z-score baseline (sliding window from index 14 to end).

**Rationale**: Each day's R-Factor depends on its historical context. A fixed 20-day lookback would miss edge cases where a stock has fewer history points. The rolling window naturally adapts.

### D4: Shared `_lib/r-factor-ui.ts` Module

**Choice**: Extract `getRFactorColor`, `getRegimeBadgeClass`, `REGIME_BADGE`, `shortDate`, `fullDate` into `app/trading-lab/_lib/r-factor-ui.ts`.

**Rationale**: These helpers were duplicated across Intraday Boost and R-Factor History pages. The `_lib/` convention (underscore-prefixed) follows the project's pattern for co-located non-route files.

### D5: Sector Map Loaded in `data-service.ts`

**Choice**: Read `fno_sectors.json` in `RFactorDataService.getSectorMap()` and attach sector to each signal server-side via `attachSectors()`.

**Rationale**: Client components can't read the filesystem. Including sector in the API response means no extra fetch. The sector map is small (206 entries) and read once per scan.

### D6: Dhan Response Cache (Post-Market Only)

**Choice**: Cache Dhan equity OHLC + futures depth per trading day. Only use cache when `!isMarketHours()` — during market hours, always fetch fresh.

**Rationale**: Dhan's API returns slightly different OHLC values on each post-market call (suspected post-market price adjustments or CDN caching). Without caching, the same page shows different R-Factor values on each refresh (e.g., WAAREEENER: 3.07 → 2.62 → 3.79). Cache is instance-level (`this.dhanCache` on `RFactorDataService`), keyed by IST date. Cleared automatically on new trading day.

### D7: `todayIST()` Replaces `en-CA` Locale Hack

**Choice**: Single `todayIST()` function in `lib/dhan/market-feed.ts` exported and used by all modules. Manual `YYYY-MM-DD` formatting with `getIST()`.

**Rationale**: The codebase used `toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })` as a trick to get ISO date format. This is brittle (locale-dependent) and confusing in an Indian trading app. Replaced with explicit IST date math across 5 files.

### D8: Retry Before Bhavcopy Fallback

**Choice**: 2 attempts with 2-second delay before falling back to bhavcopy. `MasterContractsNotSyncedError` and `BhavcopyNotSyncedError` are re-thrown immediately (no retry).

**Rationale**: Dhan API has transient failures (rate limits, timeouts) that resolve in seconds. Without retry, a single timeout would silently switch the entire page from live data to bhavcopy — a completely different data source with different values, which the user experiences as "random numbers."

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Dhan API may return stale data on holidays (e.g., Republic Day on a weekday) | `isTradingDay()` only checks weekday + time, not market holidays. Dhan will return Friday's data on Monday morning before 9:15 — acceptable since bhavcopy would show the same. |
| History API computes R-Factor for 206 stocks × 25 days on each leaderboard request | SQLite queries are fast (~2ms each). Leaderboard is requested per-date, not on page load. Could add caching later if needed. |
| Sector stats use simple average, not market-cap-weighted | No live market cap data. Simple average is a reasonable proxy — top IT stocks (TCS, INFY) naturally have high spread when the sector is active. |
| Dhan cache is instance-level (in-memory), lost on server restart | Acceptable — first request after restart fetches fresh data, all subsequent requests use cache. No disk persistence needed. |
| `todayIST()` uses manual UTC+5:5 offset, doesn't handle DST | India doesn't observe DST. IST is always UTC+5:30. Safe. |
