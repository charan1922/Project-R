# R Factor Reverse Engineering — Approach & Findings

## What is R Factor?

A proprietary metric from TradeFinder (tradefinder.in) that measures "smart money flow" into a stock. Per the creator, it uses:

1. **Futures OI** (primary weight)
2. **Options OI**
3. **Turnover**
4. **Bid-Ask spread**
5. **Volume** (minor)

Each metric compares **today's value vs its 20-trading-day average**. The output is a single number (observed range: 1.58 to 3.49). Higher = more unusual activity = potential smart money.

## Data Source

`derive-r/march-13-2026.json` — scraped from TradeFinder on March 13, 2026.

- `intraday_boost`: 80 F&O stocks with R Factor (param_3). This is our ground truth.
- `top_losers`: overlaps with intraday_boost (same R Factor values)
- `breakout_beacon`: different metric (timestamps), not R Factor
- `high_powered_stocks`: different metric (416-4045 range), not R Factor

## Attempt Timeline

### v1 & v2: Equity + Futures Only

- **Features:** equity volume, turnover, futures OI, futures turnover — each as today/20d avg ratio
- **Result:** Spearman ~0.22. Near zero. Not enough signal from just cash + futures.

### v3: Added Options OI + Option Chain

- Pulled historical OI for ATM+/-2 option strikes (10 contracts per stock)
- Pulled option chain snapshot for bid-ask spread and total OI
- 15-stock test: Spearman 0.461 — looked promising
- **80-stock validation: ALL correlations near zero.** The 15-stock result was small-sample noise.
- Best model: R²=0.06, MAE=0.341. Predicts ~2.1 for everything (the mean). No discriminative power.

### v3 Post-Mortem: The Date Mismatch

**Root cause of failure discovered:** We were comparing the wrong day.

- TradeFinder R Factor = computed on **March 13** trading activity
- Dhan historical API = only had data through **March 12** (API hadn't updated at 1:30 AM)
- We compared March 12 market activity against March 13 R Factor values
- March 13 was a major sell-off (JINDALSTEL -6.42%, many stocks -3% to -7%)
- Market behavior on a crash day vs a normal day = completely different metrics

**This invalidates all v3 correlation results.** Need to re-run once March 13 data is available.

### v4: JINDALSTEL Deep Dive + 11-Stock Validation

**Phase 1: JINDALSTEL single-stock**

Focused on one stock to understand data thoroughly. Collected ALL option strikes (92 contracts) for March monthly expiry.

- JINDALSTEL R=3.359: avg(opt_oi_ratio, opt_vol_ratio) = 3.266 — gap of only 0.093!
- Exact fit for JINDALSTEL: R = 0.465*opt_oi_r + 0.535*opt_vol_r
- But this formula **completely fails** for other stocks (BIOCON error +1.4)

**Phase 2: 11-stock comprehensive data collection**

Collected equity (38d), futures (37d), options daily OI+volume for 11 stocks spanning R=1.578 to R=3.486. Total ~2200 API calls, ~13 minutes. Also pulled option chain snapshots for bid-ask spread.

Stocks: BIOCON(3.486), LAURUSLABS(3.444), JINDALSTEL(3.359), LT(3.149), DRREDDY(2.652), SAIL(2.606), CIPLA(2.041), SBIN(1.715), BOSCHLTD(1.610), NESTLEIND(1.586), INDIANB(1.578)

**Phase 3: Formula exploration**

Tested 100+ formula combinations: simple ratios, weighted averages, geometric means, Z-scores, OLS regression, constrained optimization.

### v5 (current): Z-Score + Trade Size Anomaly Model

**Breakthrough insight:** Z-scores work much better than simple ratios for cross-stock comparison, and "trade size anomaly" (turnover/volume Z-score) captures institutional activity.

**Best 2-feature model:**
```
R = 3.14 + 0.72 * fut_turn_z + 0.43 * eq_trade_size_z
```
- In-sample: R²=0.81, MAE=0.255, Spearman=0.75
- LOO CV: Pearson=0.84, Spearman=0.67, MAE=0.335

**Best 3-feature model:**
```
R = 4.94 + 1.66 * fut_vol_z - 1.94 * fut_vol_r + 0.51 * eq_trade_size_z
```
- In-sample: R²=0.91, MAE=0.187, Spearman=0.80
- LOO CV: Pearson=0.89, Spearman=0.76, MAE=0.297

Where:
- `fut_turn_z` = Z-score of futures turnover (today vs 20d)
- `fut_vol_z` = Z-score of futures volume
- `fut_vol_r` = ratio of futures volume (today / 20d avg)
- `eq_trade_size_z` = Z-score of equity avg trade size (turnover/volume)

## Key Correlation Findings

| Feature | Pearson | Spearman | Notes |
|---------|---------|----------|-------|
| fut_turn_z | +0.70 | +0.45 | **Best single predictor** |
| total_turn_z | +0.64 | +0.48 | Equity + futures turnover |
| fut_vol_z | +0.62 | +0.42 | Futures volume Z-score |
| total_vol_z | +0.58 | +0.55 | Best Spearman for single feature |
| opt_vol_z | +0.46 | +0.45 | Options volume matters |
| opt_oi_chg_z | +0.45 | +0.53 | OI CHANGE, not level |
| eq_trade_size_z | +0.37 | +0.33 | Institutional trade size |
| **fut_oi_z** | **-0.13** | **-0.13** | **OI level is ANTI-correlated!** |
| **opt_oi_r** | **+0.01** | **+0.00** | **Options OI has ZERO signal** |

**Critical finding:** OI levels (both futures and options) have zero or negative correlation with R Factor. This contradicts the creator's claim that "Futures OI is the primary weight." The actual driver is VOLUME and TURNOVER, not OI position sizes.

## Persistent Outliers

- **BIOCON** (R=3.486): Highest R but below-average futures activity. Moderate options volume (2.4x). Something else drives its R — possibly intraday patterns or exchange-level data we can't access.
- **SAIL** (R=2.606): Almost zero options volume (0.08x) yet high R. Huge bid-ask spread (1.52 vs avg 0.15). May be driven by spread or intraday order flow.
- **NESTLEIND** (R=1.586): High options volume (3.4x) but lowest R. Contradicts the idea that high options activity = high R.

## Data Files

| File | Contents |
|------|----------|
| `multi_stock_raw_data.json` | 10 stocks: equity daily, futures daily, options daily totals |
| `multi_stock_summary.json` | All ratios for 11 stocks |
| `multi_stock_option_chains.json` | Option chain snapshots with bid-ask |
| `rfactor_analysis_v4.json` | Complete analysis: all Z-scores, ratios, model predictions, correlations |
| `jindalstel_oi_complete.json` | JINDALSTEL: 38 days, all metrics, all 92 option strikes |
| `jindalstel_all_options_oi.json` | JINDALSTEL: per-strike daily OI for all 92 contracts |

## Next Steps

### Step 1: Collect Data for More Stocks
11 data points is barely sufficient for 2-3 feature regression. Need 30-40 stocks minimum. Could pull data for all 80 intraday_boost stocks (but ~6000 API calls, ~30 min).

### Step 2: Investigate Intraday Data
R Factor is likely computed using intraday patterns (TradeFinder shows intraday prices). The Dhan intraday API only serves TODAY's data, so we'd need to capture it live during market hours.

### Step 3: Check NSE Bhavcopy Data
TradeFinder may use exchange-level aggregate data (total F&O turnover per stock from NSE bhavcopy) rather than contract-level data from broker APIs. This would explain discrepancies.

### Step 4: Live Capture
Set up a script to capture during market hours on a trading day, then compare with that day's R Factor from TradeFinder.

## API Reference

| Endpoint | Data | Rate Limit | Notes |
|----------|------|-----------|-------|
| `/v2/charts/historical` | Daily OHLCV + OI | 0.3s/req | Works for EQUITY, FUTSTK, OPTSTK. Lags ~hours after market close. |
| `/v2/charts/intraday` | Minute OHLCV + OI | 0.3s/req | Current day ONLY. Cannot get previous days. |
| `/v2/optionchain` | Snapshot: OI, prev_OI, volume, bid-ask, IV | 3s/req | Needs `client-id` header. Shows today vs yesterday. |
| `/v2/optionchain/expirylist` | Available expiry dates | 3s/req | Call before optionchain to get valid expiry. |
| `/v2/charts/rollingoption` | Rolling option data | 3s/req | Returns EMPTY for OPTSTK. Broken/unsupported. |

## Key Learnings

1. **Always verify the data day matches the target.** The API's last bar date != the date you request. Check timestamps.
2. **Small sample correlations are noise.** 15 stocks showed Spearman 0.46; 80 stocks showed ~0. Always validate at scale.
3. **Option chain snapshot is time-sensitive.** It shows the most recent trading day's data. Capture it before the next trading session.
4. **Intraday API is useless for historical.** Only serves today's data. For previous days, rely on `/charts/historical`.
5. **Monthly expiry options:** identified by `14:30` in SEM_EXPIRY_DATE field of scrip master. Weekly = `15:30`. F&O stocks do NOT have weekly options — weekly is index only.
6. **The R Factor is likely computed intraday**, not at EOD — TradeFinder shows intraday prices (param_0) that differ from close.
7. **Z-scores > ratios for cross-stock comparison.** Z-score normalizes by volatility, so a 2x ratio in a volatile stock isn't the same signal as 2x in a stable stock.
8. **OI levels don't predict R Factor.** Despite the creator saying "Futures OI is primary," our data shows zero correlation. The CHANGE in OI has moderate correlation (0.45), but absolute OI level does not.
9. **Trade size anomaly is informative.** avg_trade_size = turnover/volume. When this is unusually high (positive Z-score), it suggests institutional block orders rather than retail. This correlated 0.37 with R.
10. **The project's own R-Factor engine** (`/lib/r-factor/engine.ts`) uses a Z-score approach: `0.2*vol + 0.5*oi + 0.2*turnover + 0.1*spread`, lookback=20. But the OI weight of 0.5 doesn't match TradeFinder's actual behavior.
11. **The `/lib/cache/` files** contain equity-only daily data (volume, turnover, spread with oi=0) for 50 stocks, 21 days each. These have near-zero correlation with R Factor — confirming F&O data is essential.
