# Intraday Boost Strategy — Beginner's Guide

## What is R-Factor?

R-Factor is a **score that tells you how much institutional (big money) activity is happening in a stock right now**.

Think of it like a thermometer:
- **Low R-Factor (1.0–1.5):** Normal day, nothing unusual
- **Medium R-Factor (1.5–2.5):** Something's happening — institutions are active
- **High R-Factor (2.5+):** Extreme activity — "Blast Trade" territory

When big institutions (mutual funds, FIIs, hedge funds) are buying or selling heavily, they leave footprints in the data. R-Factor detects these footprints.

## What Data Does It Look At?

R-Factor combines **5 signals** from market data. Each signal catches a different type of institutional footprint:

### 1. Spread Ratio (Most Important — 62.5% weight)

**What it is:** How wide the price range is today compared to the last 20 days.

```
Spread = (Today's High - Today's Low) / Today's Close
Spread Ratio = Today's Spread ÷ Average Spread of last 20 days
```

**Why it matters:** When institutions place large orders, they push prices up and down more than usual. A stock that normally moves ₹10 in a day suddenly moving ₹25 means something big is happening.

**Example:**
- RELIANCE normally has a daily range of ₹15 (spread ~1.1%)
- Today its range is ₹35 (spread ~2.5%)
- Spread Ratio = 2.5 / 1.1 = **2.27** → very high, institutions are active

### 2. Futures Turnover (Second Most Important — 141.5% weight)

**What it is:** How much money is flowing through the futures market for this stock, compared to its normal level.

```
Futures Turnover = Futures Volume × Futures Price
Z-Score = (Today's Turnover - 20-day Average) / 20-day Std Deviation
```

**Why it matters:** Institutions use futures (not cash market) for large positions because futures offer leverage. High turnover = big money moving.

**Example:**
- TCS futures normally trade ₹500 crore per day
- Today: ₹1,200 crore → Z-score of +2.1 → institutions are heavily trading

### 3. Futures Volume (Negative Weight — -173.3%)

**Wait, negative?** Yes! This is the most clever part of the model.

**What it is:** The raw number of futures contracts traded.

**Why negative helps:** Imagine two scenarios:
- **Scenario A:** 10,000 contracts × ₹1,000 each = ₹1 crore turnover
- **Scenario B:** 100 contracts × ₹10,000 each = ₹1 crore turnover

Same turnover, but Scenario B has few large orders (institutional block trades). The model subtracts volume and adds turnover — so when turnover is high but volume is low, the score goes UP. This catches **large block trades** that institutions make.

### 4. Spread × Turnover Interaction (22.6% weight)

**What it is:** Spread Ratio multiplied by Futures Turnover Z-score.

**Why it matters:** When BOTH spread is wide AND futures turnover is high at the same time, it signals **urgent institutional activity with conviction**. They're not just testing the waters — they're moving fast and moving big.

### 5. Put-Call Ratio / PCR (Smallest — 7.7% weight)

**What it is:** Ratio of put option volume to call option volume.

```
PCR = Put Volume ÷ Call Volume
```

**Why it matters:**
- PCR > 1.0 → More puts being bought → bearish sentiment (or hedging)
- PCR < 1.0 → More calls being bought → bullish sentiment
- PCR changing sharply → options traders (often institutional) are taking positions

**Note:** This is the weakest signal (only 7.7% weight) because option volume is noisy. It's used from yesterday's data as a proxy.

## The Formula

```
R-Factor = 1.11
         + 0.625 × Spread Ratio
         + 0.077 × PCR Z-score
         + 0.226 × (Spread Ratio × Futures Turnover Z-score)
         + 1.415 × Futures Turnover Z-score
         - 1.733 × Futures Volume Z-score
```

The **1.11 intercept** shifts the scale so scores range from ~1.0 to ~3.5, matching what professional terminals show.

## Market Regimes

R-Factor also classifies HOW the institution is trading:

| Regime | What It Means | How to Trade |
|--------|--------------|-------------|
| **Cheetah** 🐆 | Fast, aggressive. Wide spreads + high volume. | Use market orders, be quick. Momentum play. |
| **Elephant** 🐘 | Slow, heavy. Big OI buildup + steady turnover. | Use limit orders, be patient. Accumulation/distribution. |
| **Hybrid** | Both fast AND heavy (rare). | Highest conviction. Both speed and size. |
| **Defensive** | Nothing unusual. Normal trading day. | No signal. Stay on sidelines. |

### How Regimes Are Detected

- **Cheetah:** Spread Z > 1.5 AND Futures Volume Z > 1.0
- **Elephant:** OI Change Z > 1.0 AND Futures Turnover Z > 0.5

## Blast Trades

When R-Factor ≥ **2.8**, the stock is flagged as a **Blast Trade**. This means:
- Multiple institutional footprints firing simultaneously
- Extremely unusual activity compared to the last 20 days
- Historical win rate for these setups is significantly higher

## Where Does the Data Come From?

### Historical Baseline (last 20 days)
- **NSE Bhavcopy** — End-of-day files published by NSE every evening
- Contains: OHLC prices, volume, turnover, open interest, option volumes for ALL stocks
- Stored in your database (synced from the **Bhavcopy** page)

### Live Data (today, during market hours 9:15–15:30 IST)
- **Dhan API** — Real-time market feed
- **Equity OHLC**: Today's high, low, close, last price → for spread ratio
- **Futures Depth**: Today's futures volume + open interest → for turnover, volume Z-scores
- Updated every 60 seconds on the Intraday Boost page

### Why Both?
- **Historical (20 days)** = "What's normal for this stock?"
- **Live (today)** = "What's happening right now?"
- **R-Factor** = "How abnormal is today compared to normal?" (Z-score concept)

## How to Use the Intraday Boost Page

### Before Market Opens (before 9:15 AM)
1. Go to **Master Contracts** page → click **Re-sync** (downloads today's instrument data from Dhan)
2. Go to **Bhavcopy** page → click **Sync** (downloads latest NSE data)
3. Both take a few seconds

### During Market Hours (9:15 AM – 3:30 PM)
1. Open **Intraday Boost** page
2. Table shows all ~206 F&O stocks ranked by R-Factor (highest first)
3. Auto-refreshes every 60 seconds with live Dhan data
4. Look for:
   - **High R-Factor (>2.0):** Stocks with unusual institutional activity
   - **Blast Trades (≥2.8):** Extreme setups, flagged with ⚡ badge
   - **Cheetah/Elephant regime:** Tells you HOW institutions are trading
   - **Spread > 1.5:** Today's range is 1.5× normal — high urgency
   - **% Change:** Which direction the stock is moving

### Reading the Table

| Column | What It Shows |
|--------|--------------|
| **Symbol** | Stock name + regime badge (Cheetah/Elephant) + blast flag |
| **%** | Today's price change from yesterday's close (live from Dhan) |
| **Spread** | Spread ratio — today's range vs 20-day average. >1.2 = wide. >1.5 = very wide. |
| **PCR** | Put-Call Ratio. >1.0 = more puts (bearish/hedging). <0.7 = more calls (bullish). |
| **R.Factor** | The composite score. Higher = more institutional activity. |
| **Signal** | ↑ (spread > 1.2) or ↓ (spread ≤ 1.2). Quick directional hint. |

### Filters
- **Search:** Type a stock name to find it
- **ALL / UP / DOWN:** Filter by signal direction
- **Column headers:** Click to sort by any column

## Validation

This model was validated against TradeFinder (a professional trading terminal) using 80 F&O stocks:

- **Correlation:** 0.67 (strong positive relationship)
- **Top-10 overlap:** 7 out of 10 top stocks matched
- **Accuracy:** 71 out of 80 stocks within ±0.5 of TradeFinder's score
- **Cross-validation:** LOO (Leave-One-Out) Pearson = 0.60

The full validation journey, including Python scripts and step-by-step methodology, is documented in `derive-r/R_FACTOR_JOURNEY.md`.

## Glossary

| Term | Meaning |
|------|---------|
| **Z-Score** | How many standard deviations a value is from its average. Z=2 means "2 standard deviations above normal" — very unusual. |
| **OI (Open Interest)** | Total number of outstanding futures/options contracts. Rising OI = new positions being created. |
| **Turnover** | Volume × Price = total money flow. Better than volume alone because it accounts for price. |
| **PCR (Put-Call Ratio)** | Put volume ÷ Call volume. Measures sentiment in the options market. |
| **Bhavcopy** | "Bhav" (price) + "Copy" = NSE's end-of-day data file with everything about every stock. |
| **Spread** | High - Low for the day. Wide spread = volatile day. |
| **Near-month futures** | The futures contract expiring soonest (e.g. March futures). Most liquid, most institutional activity. |
| **Suppressor variable** | A variable that improves the model by removing noise from another variable (futures volume suppresses noise in futures turnover). |
| **OLS Regression** | Ordinary Least Squares — a mathematical method to find the best-fit line through data points. Used to find the optimal weights for each signal. |
