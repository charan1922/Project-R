# ADX (Average Directional Index)

> Created by J. Welles Wilder in 1978. Measures **trend strength**, not direction.

---

## 1. What ADX Tells You

ADX answers one question: **"Is this stock trending or chopping?"**

| ADX Value | Meaning | Action |
|-----------|---------|--------|
| 0-15 | No trend (dead market) | Avoid — no edge |
| 15-20 | Trend developing | Watch — not confirmed yet |
| 20-25 | Weak trend | Caution — can reverse |
| **25-40** | **Strong trend** | **Trade it — momentum confirmed** |
| **40-50** | **Very strong trend** | **High conviction — ride it** |
| 50+ | Extreme trend | Be careful — may exhaust soon |

**Key insight**: ADX does NOT tell you if the stock is going UP or DOWN. ADX = 40 means "strong trend" — could be strongly bullish OR strongly bearish. Direction comes from +DI and -DI.

---

## 2. The Three Lines

### ADX Line (trend strength)
- Smoothed average of directional movement
- Rising ADX = trend getting stronger (regardless of direction)
- Falling ADX = trend weakening (doesn't mean reversal — just losing momentum)

### +DI Line (bullish direction)
- Measures upward price movement
- **+DI > -DI = bullish trend**
- Rising +DI = bulls getting stronger

### -DI Line (bearish direction)
- Measures downward price movement
- **-DI > +DI = bearish trend**
- Rising -DI = bears getting stronger

---

## 3. Trading Signals

### Signal 1: Trend Confirmation
```
BUY when:  ADX > 25 AND +DI > -DI   (strong bullish trend)
SELL when: ADX > 25 AND -DI > +DI   (strong bearish trend)
AVOID:     ADX < 20                   (no trend — choppy)
```

### Signal 2: DI Crossover
```
BULLISH: +DI crosses ABOVE -DI (bears losing, bulls taking over)
BEARISH: -DI crosses ABOVE +DI (bulls losing, bears taking over)
```
Best when ADX is also > 25 (confirms the crossover has trend backing).

### Signal 3: ADX Rising from Below 20
When ADX rises from below 20 to above 25, a NEW trend is starting. This is the earliest entry signal — catch the trend before it's obvious.

### Signal 4: ADX Declining from Above 40
When ADX falls from above 40, the trend is EXHAUSTING. Don't enter new positions — the easy money has been made. Book profits on existing trades.

---

## 4. Timeframes for Day Trading

| Chart | ADX Period | Covers | Best For |
|-------|-----------|--------|----------|
| **5-min** | **3** | Last 15 min | Scalping — very fast signals |
| **5-min** | **7** | Last 35 min | **Best for intraday (9:45-11:00 entry)** |
| **15-min** | **14** | Last 3.5 hours | Confirms intraday direction |
| **Daily** | **14** | Last 14 days | Swing trading / position trading |
| **Weekly** | **14** | Last 14 weeks | Long-term trend analysis |

### For Indian F&O Intraday Trading
- **Use 5-min chart with ADX period 7** for entry decisions
- **Use 15-min chart with ADX period 14** for trend confirmation
- **Daily ADX** is too slow for intraday — by the time it confirms, the move is done

### Does ADX Change During the Day?
**Yes.** Intraday ADX (5-min) changes every 5 minutes. A stock can go from ADX=15 (no trend) at 9:30 to ADX=35 (strong trend) by 10:00 as the morning move develops.

Daily ADX changes only at end of day — it reflects the cumulative multi-day trend.

---

## 5. Calculation (Wilder's Method)

### Step 1: Directional Movement (+DM, -DM)
```
+DM = today_high - yesterday_high  (if positive AND > -DM, else 0)
-DM = yesterday_low - today_low    (if positive AND > +DM, else 0)
```
Only ONE can be positive per day. The larger move wins.

### Step 2: True Range (TR)
```
TR = max(high-low, |high-prev_close|, |low-prev_close|)
```
Captures gap moves (when open is outside yesterday's range).

### Step 3: Smoothed Values (Wilder Smoothing, 14-period)
```
First value: simple sum of first 14 bars
Subsequent:  smoothed = prev_smoothed - (prev_smoothed / 14) + current_value
```
This is NOT a simple moving average — it's exponential with alpha = 1/14.

### Step 4: Directional Indicators
```
+DI = (smoothed_+DM / smoothed_TR) × 100
-DI = (smoothed_-DM / smoothed_TR) × 100
```

### Step 5: DX (Directional Index)
```
DX = |+DI - -DI| / (+DI + -DI) × 100
```

### Step 6: ADX (smoothed DX)
```
First ADX: simple average of first 14 DX values
Subsequent: ADX = (prev_ADX × 13 + current_DX) / 14
```

### Warm-up Period
ADX needs **~150 bars** to fully converge (Wilder's recommendation). With only 42 bars (our bhavcopy), the ADX is approximate but directionally correct.

---

## 6. ADX + R-Factor (Our System)

### How We Use ADX
| R-Factor | ADX | +DI vs -DI | What It Means |
|----------|-----|-----------|---------------|
| R > 2.0, ADX > 28 | Strong trend | +DI > -DI | **HOT BUY** — institutions pushing up with momentum |
| R > 2.0, ADX > 28 | Strong trend | -DI > +DI | **HOT SHORT** — institutions pushing down with momentum |
| R > 2.0, ADX < 20 | No trend | — | Activity spike but no trend — could be noise, wait |
| R < 1.5, ADX > 28 | Strong trend | — | Trend exists but no institutional interest — retail driven |

### Why ADX Doesn't Predict R-Factor
ADX and R-Factor measure different things:
- **R-Factor** = institutional ACTIVITY (are big players trading this stock?)
- **ADX** = trend STRENGTH (is the price moving consistently in one direction?)

A stock can have:
- High R + Low ADX = institutions accumulating but price hasn't moved yet (Elephant regime)
- Low R + High ADX = strong trend driven by retail momentum (no institutional edge)
- **High R + High ADX = the sweet spot** — institutions are active AND price is trending

Cross-day correlation between ADX and TF R-Factor: **-0.004 (zero)**. They're independent signals — that's why combining them is powerful.

---

## 7. Common Mistakes

1. **Using ADX for direction** — ADX only tells strength. Use +DI/-DI for direction.
2. **Buying because ADX is high** — ADX = 40 could mean "strongly falling." Always check +DI vs -DI.
3. **Ignoring falling ADX** — When ADX drops from 40 to 25, the trend is dying. Take profits.
4. **Using daily ADX for intraday** — Too slow. Use 5-min or 15-min for day trading.
5. **Entering when ADX is already > 40** — Late to the party. Best entries are when ADX rises FROM 20 to 25+.

---

## 8. Implementation in Project-R

### Current (V4.2)
- **Source**: `trading-signals` npm library (v7.4.3)
- **Period**: 14 (daily)
- **Data**: Bhavcopy OHLC (42 days history)
- **Usage**: Display column in Intraday Boost + R-Factor History. HOT badge when ADX >= 28 + R >= 2.0 + |%chg| >= 1%.

### Planned
- **Intraday ADX**: 5-min chart, period 7, from Dhan `/v2/charts/intraday` API
- **Longer history**: Fetch 200+ daily candles from Dhan `/v2/charts/historical` for better daily ADX convergence
- **AI Trading**: ADX >= 28 is mandatory for entry in the AI trading decision engine

---

## Sources

- [Wilder, J.W. (1978) "New Concepts in Technical Trading Systems"](https://en.wikipedia.org/wiki/Average_directional_movement_index)
- [StockCharts ADX Guide](https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/average-directional-index-adx)
- [TradingView ADX Definition](https://www.tradingview.com/support/solutions/43000589099-average-directional-index-adx/)
- [ADX for Intraday Trading (Indian Markets)](https://stockpathshala.com/how-to-use-adx-for-intraday-trading/)
- [Best ADX Strategy by Pro Traders](https://tradingstrategyguides.com/best-adx-strategy/)
- [ADX Indicator Settings: Best Timeframes](https://therobusttrader.com/adx-indicator-settings-best/)
