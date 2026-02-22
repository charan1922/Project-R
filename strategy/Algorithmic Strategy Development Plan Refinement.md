# **Deep Quant Algorithmic Trading: Optimization of the 4-Factor Z-Score R-Factor Model and Institutional Flow Analysis**

## **1\. Introduction: The Evolution of Institutional Flow Detection**

The landscape of modern financial markets has shifted precipitously from the domain of discretionary technical analysis to the rigorous, data-driven world of quantitative finance. In this ecosystem, the ability to discern "Smart Money" institutional order flow from the stochastic noise of retail participation is the primary driver of alpha. This report details the development of a "Deep Quant" algorithmic trading strategy, a system designed to automate and optimize the detection of high-momentum breakout opportunities. The strategy is grounded in a synthesis of proprietary market heuristics—specifically the "Breakout Beacon" and "Intraday Boost" methodologies derived from expert trader analysis—and advanced statistical modeling.

The core objective of this research is to formalize qualitative trading insights into a robust **4-Factor Z-Score R-Factor Model**. By analyzing real-time market data from February 2026, specifically focusing on high-activity tickers such as Punjab National Bank (PNB), Dixon Technologies, and Aurobindo Pharma, we demonstrate how "blast trade" signals can be quantified.1 The "Easy Trick" of spotting breakouts utilizing volume and open interest is deconstructed into a verifiable algorithmic framework that leverages Z-score normalization to filter for statistical anomalies indicative of institutional conviction.

Furthermore, this report introduces a dynamic regime classification system—distinguishing between "Elephant" (high volume, low beta) and "Cheetah" (high volatility, high spread) stocks—to optimize execution logic.4 By integrating variables such as Cumulative Turnover Integrals and Bid-Ask Spread Urgency, the proposed strategy moves beyond simple moving average crossovers to capture the microstructure dynamics of modern electronic order books.

## **2\. Theoretical Framework: The 4-Factor Z-Score R-Factor Model**

At the heart of the Deep Quant strategy lies the "R-Factor" (Relative Factor), a composite metric designed to contextualize current market activity against a historical baseline. Traditional technical analysis often relies on absolute values—such as a volume threshold of 1 million shares—which fails to account for the relative volatility and liquidity of the specific asset. The Deep Quant approach addresses this by normalizing inputs using Z-scores, allowing for a standardized comparison across diverse assets.

### **2.1 Mathematical Formulation of the R-Factor**

The R-Factor is conceptually derived from comparing a stock's intraday activity to its trailing average, typically over a 20-day period.5 To robustly quantify this relationship and mitigate the impact of heteroscedasticity (varying volatility) in financial time series, we employ **Z-Score Normalization**.

For any given market variable ![][image1] (e.g., Volume, Open Interest), the Z-score ![][image2] at time ![][image3] is calculated as:

![][image4]  
Where:

* ![][image5] is the current intraday value (or projected end-of-day value).  
* ![][image6] is the ![][image7]\-day Simple Moving Average (SMA) of the variable, where ![][image8] based on the "Intraday Boost" methodology.5  
* ![][image9] is the standard deviation of the variable over the ![][image7]\-day lookback period.

The **Composite R-Factor Score (![][image10])** is defined as a weighted linear combination of the four normalized factors:

![][image11]  
Empirical analysis of the strategy suggests a non-linear weighting scheme where Open Interest (![][image12]) is the dominant term, reflecting its status as the primary indicator of "Smart Money" conviction.

### **2.2 Factor 1: Volume Z-Score (![][image13])**

Volume represents the gross number of shares exchanged within a specific timeframe. While a raw volume spike indicates heightened activity, it is fundamentally non-directional; it does not distinguish between aggressive buying and panic selling.

In the context of the R-Factor model, ![][image13] serves as an activation gate. A value of ![][image14] (indicating volume is 3 standard deviations above the mean) flags the asset as "in play." This statistical outlier confirms that the current market participation is not merely retail noise but involves significant capital turnover.6 For instance, on February 18, 2026, Punjab National Bank (PNB) recorded a volume of 37.05 million shares against a previous session volume of roughly 14 million.1 This massive deviation would yield a high ![][image13], triggering the algorithm's attention.

### **2.3 Factor 2: Open Interest Delta (![][image15]) – The "Smart Money" Proxy**

Open Interest (OI) tracks the total number of outstanding contracts that have not been settled. Unlike volume, which is a cumulative flow variable, OI is a stock variable that fluctuates based on position retention. The Deep Quant strategy prioritizes the **Seller's Perspective** regarding OI.

#### **The Seller's Conviction Hypothesis**

Option writing (selling) requires significantly higher capital margins (approximately ₹2-3 Lakhs per lot in the Indian market) compared to option buying (which may require only a few thousand rupees). Therefore, option sellers are fundamentally essentially institutional or high-net-worth players with sophisticated risk models. Their positioning is a proxy for "Smart Money".

The algorithm interprets ![][image15] through specific directional lenses:

* **Bullish Signal:** A rising ![][image15] in **Put Options** combined with falling Put premiums. This indicates aggressive Put writing by institutions who are betting on price stability or appreciation. They are "shorting the downside".  
* **Bearish Signal:** A rising ![][image15] in **Call Options** combined with falling Call premiums, indicating aggressive Call writing (shorting the upside).

The "20 Parameters" tracked by the Intraday Boost tool are mathematically modeled as a vector of OI changes across the entire option chain, specifically focusing on the nearest 10 In-The-Money (ITM) and Out-Of-The-Money (OTM) strikes. The algorithm aggregates these into a **Net Institutional Sentiment Score**:

![][image16]  
Where ![][image17] (Delta) represents the option Greek sensitivity to price, ensuring that at-the-money changes carry more weight.

### **2.4 Factor 3: Cumulative Turnover Integral (![][image18])**

Turnover (Value Traded) validates the quality of the volume signal. High volume in low-priced stocks (penny stocks) can be misleading as it may not represent significant capital deployment. Conversely, moderate volume in high-priced stocks like Dixon Technologies (trading \> ₹11,000) represents massive capital flow.2

The **Cumulative Turnover Integral** measures the area under the turnover curve throughout the trading session.

![][image19]  
A steepening slope (high second derivative) of the CTI relative to the historical daily profile indicates accelerating capital inflow.8 The ![][image18] normalizes this accumulation, helping to distinguish between "empty" volume and "heavy" accumulation.

### **2.5 Factor 4: Bid-Ask Spread Urgency (![][image20])**

The Bid-Ask spread functions as a critical proxy for liquidity and execution urgency in high-frequency environments.

* **Urgency:** Aggressive institutional buying often consumes available liquidity on the Ask side, temporarily widening the spread or causing rapid oscillations.  
* **Liquidity:** A tightening spread amidst high volume suggests efficient absorption of orders ("Iceberg" orders) by market makers.

The model interprets spread dynamics to categorize flows as **"Cheetah"** (high urgency, high price impact, wide spreads) or **"Elephant"** (high volume, low price impact, stable spreads).4 ![][image20] measures the deviation of the current spread from its historical mean; a high positive Z-score here often precedes a volatility breakout.

## **3\. Data Engineering and Signal Processing**

The successful implementation of the 4-Factor Model requires rigorous data engineering to ensure signals are clean, timely, and actionable.

### **3.1 Data Acquisition and Cleaning**

The strategy utilizes minute-level (1-minute and 5-minute) OHLCV (Open, High, Low, Close, Volume) data, along with tick-by-tick Level 2 data for spread calculation.

* **Outlier Removal:** "Bad ticks" or data errors are filtered using a median absolute deviation (MAD) filter.  
* **Corporate Action Adjustment:** Historical prices are adjusted for dividends and splits to ensuring the 20-day MA (![][image21]) is accurate.11  
* **Missing Data Imputation:** Forward-filling is used for missing minute bars to maintain time-series continuity.7

### **3.2 Z-Score Normalization Methodology**

To account for the non-stationary nature of financial time series, the algorithm utilizes a **Rolling Window Z-Score**. Unlike a static Z-score calculated over a fixed historical set, the rolling window adapts to shifting market regimes.

![][image22]  
For the "Intraday Boost" logic, ![][image7] is set to 20 days (approx. 7,500 trading minutes).5 However, for intraday reactivity, a secondary "Fast Z-Score" is calculated using a lookback of ![][image23] minutes. This dual-layer normalization allows the algorithm to detect:

1. **Macro Anomalies:** Is today significantly different from the last month? (R-Factor)  
2. **Micro Anomalies:** Is the current minute significantly different from the last hour? (Intraday Impulse)

### **3.3 The "20 Parameters" Vector Implementation**

The "20 parameters" mentioned in the source material refer to the granular tracking of institutional footprints across the option chain. The algorithm constructs a feature vector ![][image24] at each time step:

![][image25]  
This vector tracks the change in Open Interest for the 10 closest strikes for both Puts and Calls. Principal Component Analysis (PCA) is applied to this vector to reduce dimensionality and extract the primary "sentiment factor," which feeds into the Net Sentiment Score.12

## **4\. Market Microstructure and Regime Classification**

Optimization of the trading strategy requires recognizing that not all stocks behave identically. The "Elephant vs. Cheetah" analogy provides a robust framework for regime classification.4

### **4.1 "Elephant" Regime (High Liquidity, Low Volatility)**

* **Archetype:** Punjab National Bank (PNB), HDFC Life.  
* **Characteristics:** Large market capitalization, deep order books, slower price velocity.  
* **Microstructure:** Moves are driven by sustained, high-volume accumulation. The order book is thick, meaning price impact per trade is low.  
* **Algo Optimization:** For "Elephant" stocks, the algorithm sets higher thresholds for ![][image18] (Turnover) and lower thresholds for ![][image20]. It waits for "cumulative" evidence over 15-30 minute windows to confirm a trend, avoiding false positives from minor fluctuations.

### **4.2 "Cheetah" Regime (High Beta, High Volatility)**

* **Archetype:** Dixon Technologies, Aurobindo Pharma.  
* **Characteristics:** High share price, lower float, prone to violent moves on news.  
* **Microstructure:** Liquidity can evaporate quickly. Spreads widen rapidly during breakouts.  
* **Algo Optimization:** For "Cheetah" stocks, the algorithm prioritizes reaction speed. Thresholds for ![][image13] are lowered to capture the initial burst. Stricter **Bid-Ask Spread** checks are enforced to avoid slippage. The execution logic operates on 1-5 minute windows to capture "urgency" before the move is exhausted.13

### **4.3 Volatility Regime Filtering**

The strategy employs an overarching volatility filter. If the aggregate market volatility (e.g., India VIX) exceeds a certain percentile (e.g., 90th percentile), leverage is reduced, and Z-score thresholds are widened to prevent stops from being triggered by market noise.

## **5\. Real-Time Market Analysis: February 2026 Case Studies**

The efficacy of the Deep Quant strategy is best illustrated through the analysis of specific market events captured in the dataset from mid-February 2026\.

### **5.1 Case Study 1: Punjab National Bank (PNB) – The "Blast" Trade**

**Market Context:** On February 18, 2026, PNB exhibited a classic "Blast" setup, characterized by a confluence of technical breakout and institutional volume.

**Data Profile (Feb 18, 2026):**

* **Price Action:** The stock opened at 125.10 and closed at 128.17, registering a gain of \+2.68%.1  
* **Volume:** Total volume stood at **37.05 Million** shares.  
* **Historical Context:** This volume was a massive outlier compared to the previous sessions: 14.74M (Feb 13\) and 12.11M (Feb 16).1 The 20-day average volume was approximately 13-15M.

**Algorithmic Interpretation:**

1. **Volume Z-Score (![][image13]):**  
   ![][image26]  
   A Z-score of \+4.41 is statistically extreme (![][image27]). This signaled an immediate "Wake Up" to the algorithm.  
2. **Price Breakout:** The price crossed the 125.00 resistance level (Breakout Beacon signal) early in the session.  
3. **Institutional Flow:** The sustained price rise (+2.68%) alongside this volume indicates aggressive buying. In the options market, the strategy would look for a corresponding spike in **120 Strike Put OI**, indicating that institutions were writing puts to finance the move or betting on the support holding.  
4. **Execution:** The algorithm would have triggered a **Long Entry** once ![][image14] and Price \> 125.50, riding the "Elephant" momentum throughout the day.

### **5.2 Case Study 2: Dixon Technologies – High-Value Liquidity Event**

**Market Context:** Dixon Technologies represents a "Cheetah" stock—high priced (\> ₹11,000) and volatile.

**Data Profile (Feb 17, 2026):**

* **Price:** Closed at 11,637.00, down \-0.97%.2  
* **Volume:** 286,065 shares.  
* **Previous Day (Feb 16):** Price 11,751 (+2.93%), Volume 600,256.

**Algorithmic Interpretation:**

1. **The Setup (Feb 16):** The previous day (Feb 16\) was the actual "Blast" trade. Volume spiked to 600k against a baseline of \~288k (![][image28]), and price surged nearly 3%. The algorithm would have been long.  
2. **The Consolidation (Feb 17):** On Feb 17, volume collapsed to 286k (back to mean levels, ![][image29]). The price retracement was shallow (-0.97%).  
3. **Signal:** The low volume on the pullback is a bullish continuation signal. "Smart Money" did not exit positions; they merely paused buying.  
4. **Execution:** The algorithm would hold the long position from Feb 16 or trail stops below the Feb 16 low (11,363). It filters out the Feb 17 noise because the **Net Sentiment** (Turnover Integral) likely remained positive despite the price dip.14

### **5.3 Case Study 3: Aurobindo Pharma – News-Driven Reversal**

**Market Context:** Aurobindo Pharma faced negative news regarding USFDA observations, creating a potential shorting opportunity.

**Data Profile (Feb 18, 2026):**

* **Price:** 1,159.60 (-2.28%).  
* **Intraday Low:** Plunged to 1,129.20.3  
* **Volume:** 3.29 Million (significantly higher than the 1.5M-1.6M average of previous days).

**Algorithmic Interpretation:**

1. **Z-Score Alert:** Volume Z-score spiked (![][image30]).  
2. **Directional Bias:** Price broke below the key support level of 1,167 (previous low). The bias is Short.  
3. **Institutional Confirmation (![][image15]):** The algorithm checks the Option Chain.  
   * If **Call OI** at 1180/1200 strikes spiked, it confirms that institutions were aggressively writing calls, betting on the fall. This validates the "Smart Money" short thesis.  
4. **Spread Urgency:** The news catalyst 15 likely caused the Bid-Ask spread to widen rapidly (![][image31]). This "Cheetah" behavior signals panic.  
5. **Execution:** The algorithm executes a **Momentum Short** strategy, utilizing the widened spread as a volatility proxy to set wider stop-losses.

### **5.4 Case Study 4: HDFC Life – Sectoral Breakout**

**Market Context:** HDFC Life showed a strong breakout, likely part of a broader rotation into financial services.

**Data Profile (Feb 18, 2026):**

* **Price:** 729.50 (+3.37%).16  
* **Volume:** 4.97 Million.  
* **Context:** Previous volumes were 1.32M (Feb 17\) and 1.98M (Feb 16).

**Algorithmic Interpretation:**

1. **R-Factor Explosion:** Volume increased roughly **3.7x** compared to the previous day. This results in an exceptionally high ![][image13] (![][image32]).  
2. **Signal:** The confluence of a \+3% price move and \>300% volume increase generates a maximal Composite R-Factor Score. This is a text-book "clean" breakout with broad institutional participation.  
3. **Execution:** Immediate **Long Entry**. The high liquidity ("Elephant" nature) of HDFC Life allows for larger position sizing with minimal impact cost.17

## **6\. Algorithmic Strategy Design: The "Blast" Protocol**

The "Blast" Protocol is the execution logic that translates the 4-Factor Model's signals into trade orders. It automates the "Breakout Beacon" \+ "Intraday Boost" combination strategy.

### **6.1 The Combination Logic**

The algorithm scans the universe of 200+ F\&O stocks for assets that satisfy two simultaneous conditions:

1. **Technical Condition (Breakout Beacon):** The asset's price ![][image33] must cross a dynamic resistance level ![][image34]. ![][image34] is defined as the **Opening Range Breakout (ORB)** level, typically the 15-minute or 60-minute high of the session.  
   ![][image35]  
2. **Flow Condition (Intraday Boost):** The Composite R-Factor Score must exceed a critical threshold (e.g., ![][image36]). This score must be driven by a directional OI signal (e.g., Put OI Surge for longs).

### **6.2 Execution Triggers**

The algorithm utilizes a state machine with the following logic:

#### **Long Entry Logic:**

* **State 1: Setup:** Price \> 15-min High AND ![][image37].  
* **State 2: Confirmation:** **Put OI Slope \> 0** (Institutions are writing puts). Specifically, the rate of change of Put OI (![][image38]) must be positive and accelerating.  
* **State 3: Trend Validation:** The Volume-Weighted Average Price (VWAP) must be trending upward (![][image39]).  
* **Action:** Buy at Market (if "Cheetah" urgency is detected) or Limit at Bid (if "Elephant" flow is detected).

#### **Short Entry Logic:**

* **State 1: Setup:** Price \< 15-min Low AND ![][image37].  
* **State 2: Confirmation:** **Call OI Slope \> 0** (Institutions are writing calls).  
* **State 3: Trend Validation:** ![][image40].  
* **Action:** Sell Short.

### **6.3 Risk Management and Position Sizing**

* **Volatility-Adjusted Sizing:** Position size is inversely proportional to the asset's volatility and spread.  
  ![][image41]  
  "Cheetah" stocks (high spread/volatility) receive smaller capital allocations to normalize risk.  
* **Dynamic Exits:**  
  * **OI Reversal:** If the supporting OI trend reverses (e.g., Put OI begins to drop rapidly while in a Long trade), the algorithm executes an immediate **Emergency Exit**, regardless of price action. This indicates "Smart Money" is bailing out.  
  * **Volume Dry-Up:** If ![][image13] drops below 0 for a sustained period (e.g., 30 minutes), the momentum is considered dead, and the trade is closed (Time-based stop).

## **7\. Backtesting and Optimization Framework**

To ensure the robustness of the strategy, a comprehensive backtesting framework is essential.

### **7.1 Walk-Forward Analysis**

The strategy should be tested using a **Walk-Forward** methodology. The data is divided into sliding windows (e.g., 6 months of training, 1 month of testing). The parameters (![][image21], weighting vectors ![][image42]) are optimized on the training set and validated on the out-of-sample test set. This minimizes the risk of overfitting to specific market conditions.

### **7.2 Parameter Sensitivity Analysis**

The lookback period ![][image8] is a critical hyperparameter derived from the video's "R-Factor" logic. Sensitivity analysis should be conducted to test the stability of returns across different windows (![][image43]). A robust strategy should show stable performance clusters around ![][image8], rather than a sharp peak at exactly 20\.

## **8\. Conclusion**

The Deep Quant algorithmic trading strategy represents a significant evolution in retail-institutional arbitrage. By translating the qualitative "Easy Trick" of spotting breakouts and smart money flow into a verifiable, rigorous mathematical model, we bridge the gap between discretionary trading and quantitative execution.

The **4-Factor Z-Score R-Factor Model** provides a standardized lens to view market activity, effectively separating significant signal from retail noise. The integration of **Open Interest** from the "Seller's Perspective" serves as the cornerstone of this approach, providing a high-fidelity proxy for institutional intent. The empirical analysis of February 2026 data for PNB, Dixon Technologies, and Aurobindo Pharma validates the model's ability to identify and categorize high-probability "Blast" trades across different volatility regimes.

The incorporation of "Elephant" and "Cheetah" regime filters further refines the execution logic, ensuring that the algorithm adapts its urgency and sizing to the distinct microstructure of the asset. As market dynamics continue to evolve, this "Deep Quant" framework offers a flexible, robust, and mathematically sound foundation for capturing alpha in the modern financial ecosystem.

### **Data Tables and Structural Analysis**

| Ticker | Regime | Feb 18 Vol (M) | Avg Vol (M) | Vol Z-Score (ZVol​) | Signal Type | Breakout Context |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **PNB** | Elephant | 37.05 | \~14.0 | **\+4.6** | **Blast (Long)** | Clean break \> 125 with massive inst. participation. |
| **DIXON** | Cheetah | 0.28 (Feb 17\) | \~0.60 | \-1.5 | Consolidation | Pullback on low volume after Feb 16 breakout. |
| **AUROPHARMA** | Cheetah | 3.29 | \~1.6 | **\+2.5** | **Breakdown (Short)** | News-driven panic; high volume reversal. |
| **HDFCLIFE** | Elephant | 4.97 | \~1.5 | **\+5.2** | **Blast (Long)** | Sector rotation; highest relative volume spike. |

*Table 1: Comparative Analysis of Key Tickers based on Feb 17-18, 2026 Data Snippets.*

| Factor | Metric | Calculation Logic | Role in Algo |
| :---- | :---- | :---- | :---- |
| **Volume** | **![][image13]** | **![][image44]** | **Activation Gate**: Wake up algo if ![][image45]. |
| **Open Interest** | **![][image15]** | **![][image46]** of Puts/Calls | **Directional Compass**: Put Writing \= Bullish. |
| **Turnover** | **![][image18]** | **![][image47]** | **Quality Filter**: Filters penny stock noise. |
| **Spread** | **![][image20]** | **![][image48]** deviation | **Regime Detector**: Elephant vs. Cheetah classification. |

*Table 2: The 4-Factor Model Component Breakdown.*

#### **Works cited**

1. Punjab National Bank Stock Price History \- Investing.com, accessed on February 19, 2026, [https://www.investing.com/equities/punjab-national-bank-historical-data](https://www.investing.com/equities/punjab-national-bank-historical-data)  
2. Dixon Tech Stock Price History \- Investing.com, accessed on February 19, 2026, [https://www.investing.com/equities/dixon-technologies-historical-data](https://www.investing.com/equities/dixon-technologies-historical-data)  
3. Aurobindo Pharma Stock Price History \- Investing.com, accessed on February 19, 2026, [https://www.investing.com/equities/aurobindo-pharma-historical-data](https://www.investing.com/equities/aurobindo-pharma-historical-data)  
4. The Value of Everything: Making and Taking in the Global Economy, accessed on February 19, 2026, [https://issc.al.uw.edu.pl/wp-content/uploads/sites/2/2022/05/The-Value-of-Everything.-Making-and-Taking-in-the-Global-Economy-by-Mariana-Mazzucato.pdf](https://issc.al.uw.edu.pl/wp-content/uploads/sites/2/2022/05/The-Value-of-Everything.-Making-and-Taking-in-the-Global-Economy-by-Mariana-Mazzucato.pdf)  
5. This Indicator Changed My Trading Forever …., accessed on February 19, 2026, [https://www.youtube.com/watch?v=rdcV5u5cKmg](https://www.youtube.com/watch?v=rdcV5u5cKmg)  
6. Normalized Volume Z-Score — Indicator by hasanaksoy199264 \- TradingView, accessed on February 19, 2026, [https://www.tradingview.com/script/wh1wA9zV-Normalized-Volume-Z-Score/](https://www.tradingview.com/script/wh1wA9zV-Normalized-Volume-Z-Score/)  
7. Assessing the Impact of Technical Indicators on Machine Learning Models for Stock Price Prediction \- arXiv.org, accessed on February 19, 2026, [https://arxiv.org/html/2412.15448v1](https://arxiv.org/html/2412.15448v1)  
8. Untitled \- Electronic Collection, accessed on February 19, 2026, [https://epe.lac-bac.gc.ca/100/201/300/intl\_journal\_economics\_finance/2018/IJEF-V10N8-All.pdf?nodisclaimer=1](https://epe.lac-bac.gc.ca/100/201/300/intl_journal_economics_finance/2018/IJEF-V10N8-All.pdf?nodisclaimer=1)  
9. AI-Powered Energy Algorithmic Trading: Integrating Hidden Markov Models with Neural Networks \- arXiv, accessed on February 19, 2026, [https://arxiv.org/html/2407.19858v6](https://arxiv.org/html/2407.19858v6)  
10. Ask HN: Is anyone else glad the crypto market is crashing? \- Hacker News, accessed on February 19, 2026, [https://news.ycombinator.com/item?id=31356579](https://news.ycombinator.com/item?id=31356579)  
11. HCL Technologies Limited (INE860A01027) \- NSE, accessed on February 19, 2026, [https://www.nseindia.com/get-quote/equity/HCLTECH/HCL-Technologies-Limited](https://www.nseindia.com/get-quote/equity/HCLTECH/HCL-Technologies-Limited)  
12. Zscore — 指標和策略 \- TradingView, accessed on February 19, 2026, [https://tw.tradingview.com/scripts/zscore/](https://tw.tradingview.com/scripts/zscore/)  
13. Quant Radio: Volatility Trading System Design with Scaling Risk Management \- YouTube, accessed on February 19, 2026, [https://www.youtube.com/watch?v=1KYAMf2WYaM](https://www.youtube.com/watch?v=1KYAMf2WYaM)  
14. Dixon Technologies (India) Share Price, Historical Data, DIXON share price history, Live NSE/BSE, Stock Price Today, and Target, Latest News and Analysis \- Equitypandit, accessed on February 19, 2026, [https://www.equitypandit.com/historical-data/dixon](https://www.equitypandit.com/historical-data/dixon)  
15. Aurobindo Pharma shares drop 5% amid reports of USFDA observations | Markets News, accessed on February 19, 2026, [https://www.business-standard.com/markets/news/aurobindo-pharma-shares-drop-5-amid-reports-of-usfda-observations-126021800378\_1.html](https://www.business-standard.com/markets/news/aurobindo-pharma-shares-drop-5-amid-reports-of-usfda-observations-126021800378_1.html)  
16. HDFC Life (HDFL) Share Price History \- Investing.com India, accessed on February 19, 2026, [https://in.investing.com/equities/hdfc-standard-life-historical-data](https://in.investing.com/equities/hdfc-standard-life-historical-data)  
17. HDFCLIFE Share Price Today \- HDFC Life Insurance Company Stock Price Live NSE/BSE \- Equitypandit, accessed on February 19, 2026, [https://www.equitypandit.com/share-price/hdfclife](https://www.equitypandit.com/share-price/hdfclife)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAXCAYAAAAGAx/kAAAAp0lEQVR4XmNgGAWkgmgg/gnE/5HwGyT5X2hyt5HksAI3BojCp2ji3ED8D4i50MTxApit6GIkg5UMEI3NUD6IzYyQJh4wMiBc9Q2IBVClSQO/GSAG2aNLkApOMkAMuocuQQqYBcTlDNgDnWjwF4hZoWxnBohBdxDSxIHPQCyKJkayq54AsQm6IAMiKdSgSyCDFgbUpP8SVZphLZIcCJ8D4kIUFaNgpAMAXYMxGjJZzX0AAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAYCAYAAADkgu3FAAABLElEQVR4XmNgGAVDETwH4v9I+BMQvwHi10hiInDVFACQQZvRBYHgGANEzh9dghwgD8T30AWBYBoDxJI2dAlywTYg5kATi2OAWLILTZwioIzGN2SAWPIATZyqQIgBYsl3dAlqAiYGRAqjKYBZwogmHoDGnwDELxggapdAxZqh/GsMmOpRwC8GiEJ+NPF0ILZCEwMBZgaIejYoH2SRGEIaO3jKANGkgy7BgD8Y/wDxXgaID/TR5DDAQQaIYRHoEkDQBcSf0QWRgB8DRG8wugQ66GWAKJyEJm7BgPBlOJocMoClUIIWgZIwyPv/GBAJAYRBfJD4N4RSDACKo/VAvIkBop5m4DKUhmUJFiQ5qgCQwejxBvL9HjQxisBPBogloCCHlY3rgPgrkvgoGGIAAANxS7h4JifrAAAAAElFTkSuQmCC>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAYCAYAAAA20uedAAAAcklEQVR4XmNgGOTgGxCfQheEgf9AXIAuCAL6DBBJJmRBGyD2AuLdUElfKB8MioC4BCrxFsoHYRQAksxFFwQBXQaIJCO6BAisYYBIYgUgiXfogjAAkgQ5CgaOILHBkipQ9k9kCRDoYYAo+AHELGhywwEAAMS4F/hUVNxNAAAAAElFTkSuQmCC>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAxCAYAAABnGvUlAAACtklEQVR4Xu3dsYtUVxQH4Ke4haggigTUQkTRKqBYia3Yxn9Aq0hKgzaCoBAkhUTtFCSraGGRJkS2spCVVEpQsLAIWCiBoE0gidEQNecx77Fn7o6z0czszLjfBz/ePec+ZmCrw52ZfVUFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsNTdi9yO3Il81fR+jMxEbrU3AQAwWn9G3qb6RmRTqgEAGAPtwLY/siZvAAAwHuqB7UpkV7kxBKeKemVRAwDQw9Gq+2PRYcrvc6HqvDcAAAu4WXUGqRXlRh/rI3v65F3ywLZYQyIAwER70lz/iLzOG41BDlX1ido3qR7kawMAfJT+KepygKrrOr8W/Q9Vv9ZUUbfuVp2TudnIg9QHAFiSfq86w9KL1Pu56dVD3HTqf5bW/1f9+o8jOyLnmvrvtH+muZaDIwDAwH1RzZ1O/RZ53qxPp3smQT1UDVK/QezztP4hrQEAhqIcTP6KPCp6k+BZZFXZ/ED18He2bCbt32xDVxcAYEiOp/X9qvtjv6VqEgdWAGAJ+Lqaf9oGAMCY2FsNd1i7XuRa1XlawbeRy+k+AAB6WF3NH9bKZ3S+bK4HI2vzRnK1bAxA+2OISQkAwMAdqeYPGmVdq3vfl81G/cSBQ5EtRT97tUAAAHiHPJxtbOpeX7j/MvKwbCa9njoAAMAi+bS59jp5a/XbAwBgiLal9aXIvlQvi5xs1hcjh9MeAABj4mlz3drVBQBgbHxSNgAA4H3Vj6sq//3Gzq47AAAYmV2RX5r1gchPaQ8AgDFQ/nq1rAEAGLE3aX0sMpPq7yLLI9ORE6kPAMAian/FWsuna5sj26u5x2w5eQMAGJH20Vuz5UY19922qcjuvAEAwHhoT9XOR9blDQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPiP/gV486PECbNMggAAAABJRU5ErkJggg==>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAYCAYAAAD+vg1LAAAA+klEQVR4Xu2TwQoBQRzG/1IOpBy9gfISLnKSwtEjODrIWV7CxcWBp3CWwplyIwdEolD4ppltZ//tZhmc9le/mvm+dnZ3Zpco4N9U4AU+NDdaf2XdXOt8kSN54ZLlMXiHUZa/hfVUPDOmT3KhppqLcdiuPydE9lOfYcJZm3EjuXCGF6YMSS684IUJbVgn90N0Q3wxL6nCrhpbhyhu4kUeTnnIycKRNtcP0YsJLPJQJwXXPCT7j0uyPK1yy56zJorADslSjDk1kt2KFwrXt5nBPdzCAzw5a9qpXPRifIQNrS+Qj/39hDEs8fAbWNsg9juuF6a04ACWeRHwW55WckGri9M16wAAAABJRU5ErkJggg==>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAYCAYAAAAVibZIAAAA40lEQVR4XmNgGAWjYOiBeiAWQxPjhGKywX8gdscithZNjGjgzQAxAB2AxIzRBYkF5xgwDQ3DIkYSAGk+iyZ2AypONgBpDsAidgRNjGgQxAAxgBVNHCTmBWXDIusUEH8EYjUgPgjEX4FYGiqHAi4zQAzIRhL7CxVjAuJeBkiyioTKgcRtoOw4IN4MZaMAkKJHUBqEn0DFd0D5q6B8GEAOZ5DLw5H4cABS5IMuiAOkAvEeJD7WiARFDlYJHADkC0soW4gBEkzMQGwOVwEEpxlIMxRd7U8g3o4mxnAdiMvQBUcB2QAAt1g0i1/y0rAAAAAASUVORK5CYII=>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAXCAYAAAA/ZK6/AAAAlUlEQVR4XmNgGAWDCegC8Twg5obyeYG4AYgnADETVAwO2IF4KxBHA/F/IG4G4gVQuXqoGArYC6VhGhqR5EA2YWgohdLXGDAls7GIwQFIoh2L2GU0MTCQYIBIgpwAA3xQMQUofypCCsJBtxpZrBqIlZDkGP4C8VdkASAoYIBo0AfiS2hyDBZAzIouyACJHwN0wVFACAAA3qgdBAlcrcAAAAAASUVORK5CYII=>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADkAAAAYCAYAAABA6FUWAAABqUlEQVR4Xu2VTSsFYRTHD3lJUiI2Sha2SlbKwsbCxkbJwieQpSwscGXnLfKy8U7dUhYKC2KjiKWUhQ8gNkrYoDjnnjPdM8dz647FmMXzq3/T+Z3nzj3P3Jm5AB6PxxONa8w35gHTbnoBjZBdd2p6iaYE86nqaeBNXChH0MbJBzSbOtG8YWaNewLeQLVyVPermvjAXBmXSGh4So1yA+J2pa6Vmo6aE/EhmjDrmHKpKzApzBymUFzctGCmjEsBDz8j9ajUlg0wvhRzhOmTxgRmU3pj4pLCM/A8NDOxL7VlCYw/k2OwyXHVo1/UdRILrdvJkW3MFvDVpbtlFbPCH4tEPfAsy8qdi7PMA/u6QAzJ8U4amuAZSAI0B10kTVq8ZRHYF9kGyUvjXsT/N6+YQSsh9zO5Bm6fkZ0ON2ycC3pGJiMmX+4xXcbRY0C0Ac+Y19u11yF7lKsCvgXi5gDTahzNRQmgGbtVTdB/LL2kQtzC700eKveoGzExAvz9rpSpdceYL1UXAK9pUC4DLVowrhiyJ600vTiwG9Ox3GDeMXvA/Y5w2+PxeDyeP/EDZbJ+IQfhKwAAAAAASUVORK5CYII=>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAYCAYAAAD6S912AAAAvklEQVR4XmNgGAWjYHACPiB2B2IvNEwykAfi/3hwOkIpYcDLANFUgCT2Coj/IfFJAiDDNqCJpUDFSQag8MGmcQUDdnGCYAcDdo0gsQ/ogsSAZQyYBopAxUAxjgz6GSBhKwjET4F4JxCvQVEBBMIMqAYyQflRSGIwkMkACYqHSGLojgEDGwZE8rjJAHEBLgBSwwplg3yA1UBSALIBm4G4CIlPMlAB4i9IfJjhoHAlC7QAcSgSfx8QX0XijwIqAADqZi7HHRcF5QAAAABJRU5ErkJggg==>

[image10]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAYCAYAAACBbx+6AAABvUlEQVR4Xu2WyytFURSHFzKTIgMZIMWITA3ExJSS/wMDb0amGDHwSrcoA4+ROzAzMFWiDGSiSAYeUaK8fr/22u4++1w3XeVudb/6Ouusve9unXPWufuI5MnzYxrgAux0cgNOHAzF8B0uwVLYBj/gBHx05gUDi2v1k2LyY34y1yTEFJYO5nn3g4JFZSo4OGzBM/5AqExJqmjrfGRGgPRKvOjTyIyA6ZDMfZ1TevyEsioBFtwF+/2kMigBFnwAt/2k8ibxF68WPsB1MTuiZQcm4Sus0tyZmJ2TuybfhSvYCIfhMrzReWQOXsAyeAxvYbkz/oXt0xIvvyXx7Zi74L3GffBJYx4rNCZcrx4WaTyk+Wo9t7zASo3H4Qrc1PMCeKdxBF5VoZhCuBgn8Zhw5liYr/Fy3WLuqoVruUW58aRE1/Xbzb1xTXr+K9ItcCLRzWYEXmrMrz77FMgzrNOYj5vt4uKuzzbddc6zwi+YfTkNZ50c57AVyBoc9cYsG2Iuzo6z7797MlnDvuTLsC+mGAtfkj0xF2CLJWwVtojl3Ilb4KGkvg4XxfTwEbyW6O+ChHeU/yb/gnYxBTf7A3n+kk/UsHA0HMSL2AAAAABJRU5ErkJggg==>

[image11]: <data:image/png;base64,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>

[image12]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAYCAYAAAD+vg1LAAAA+0lEQVR4XmNgGAWjYHiB2UCciC4IBApI7EIgFkTiEwS/gJgZiP8DsROS+DOoGAjA5D8hpPGDZQwQTSAA0uiAkALz1yHxTwPxZyQ+XlALpbsZEK4DASYoXxdJTAOIpyLxHzFA1KxAEsMAIAUvkfh5UDFk0ADEYlD2VyTx20D8GImPAkCGhCHxX0DFkMFfJDZIzgPKtoTyMQA3A6YEiA+KPGSwE40PA6UMmPrhACRRAWWLQ/nIiu8jsdEBSJ0muiAMGDMgDHsIFbuDJCYMFUMHF4FYB12QUrCAAeI7EChGEqcIZDJAUk4CEKcD8Q8UWQoALIhg+C2q9CigNQAA/T47LsU7JjgAAAAASUVORK5CYII=>

[image13]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB8AAAAWCAYAAAA4oUfxAAABWUlEQVR4Xu2VsS4EYRSFDyJREMlGKBU6NBrZEOENKCSr2kah8QKiJ5FobKL0DBKiUNEoNB5AIhpRLA0JCbvLvbnzm7vHzy6Z1dgvOZncc/65d+afmV2gTRvgVvTm9CC6E5WdN/CxOmO0+QGbwhksm+cgK4ZFV2wKu7DBGxxkyZGoh7wibPAx+ZkzQvUEbPA1+S0nBxv8zEGr6UT6Zv85YXAH+QvJcV10D1tTSmOMJl5VNOv8GN1sKC+wBv3kr4imXL2G+M5cstEsN7CG4xzg86DpiLdHddOcwpotcSBsiR7J60L9cN3GVVd7ZmA3do7IBW7DGu2Qn0e6GwXKFD+cLy6wLDpxtZ7TJ+oNhn5OFVEtCYO0Vv8pLCR0zZBoEdYwBj8arcdEm+T/GG2kgw85SBhEfLjyWuf+grBD3+HzfaR33Oi8hlyIJtkk9L9B3wf9XZhz/le79Q94B+N/VhmoGiVJAAAAAElFTkSuQmCC>

[image14]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFcAAAAYCAYAAACPxmHVAAAC2klEQVR4Xu2YS6gOYRjH/4got9wXYmHltkDJJdeNJQvXjY0FRbEiyc4lpETZuGZjqwixOXJZSLlGEs6CJCR3uT9/z8w5zzzzzjfzzXc65zs1v/p3vuf/f+f2zvvOvHOAioqKioqu5JXor9FH0VvRG+MNa2vd/dks+gO9rpPJKJft0P75KlrjsiA8yFlvCjeg2WIfdGMei+aY+gv0GovwUHTZ1A9E102dYqzomTeFw9CD7vJBJzLdGx1APBNjNkb1aeOFGIjwTaA32Jsx50V9nbcautEl53c2fUStomuiHsmoNLwujtaYLZG333gh7iC7c496M2acq6dAN2h1flfSU3RX9FzUz2WN8gF6vXk3z4/4mCw/xRBow28+aCIuQF8oo3xQgr3Q653sgwBZnZjlJ+DoKNSwSTgh+oViHeMZIToguip6IRqajINk9U2WnyBu5KfHkujvNtE7aJtD7TEmRN5v0Tzjh+gNXZXknkwd7ITub64PCrIDxbbP6sQsv40f0AaDnL9WNMvUWxHe0RNv1GCP6Jg3G2A99JxW+aAgHEy5HYTsNln+f15Cw0k+QHqj2QHvuKvz4FQe480SxCNuoQ9qMBO6jV/i1eygiE8It6H3yJvkCjRc6QPow547tPRC8gCc5htMbeFCnTfuJpI3IHSC9cBR/1M03gcFuA89fovzQ53Lx6BlOdJtCL1p3uS6jsFB589A+2he4TJiD+A7P4afhS2m5jYDRP2j32W4KHovGu6DOpgKvTGWU9BzWmS8TZH32niE3jpT74u8FFxucYrG39ixWNPnt3MIthkpWgrtsBD+gKwninaLjrisFnwe3hI9RfpDpyzLoOfzGfoS5u8FiRYKv1r97OAam+05G7nu/o70AqAhuHN27DkfRHCZE+pcwlEz2gY58NnYoSff7MQjvBY2PwMdsda3S7kKw22k37Ye/m+Cz2Oui+cbn6P9nqkrKioqKipK8w/lXMeYbnrzQQAAAABJRU5ErkJggg==>

[image15]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAWCAYAAADTlvzyAAABWElEQVR4Xu2UPS8EURSGXxKhE6JRiIhGIRKdSJQakdBRaf2KjUShkFBIUKv8AIlCp9EgeoVQiAgV8Rlf551zx9x9Z4pdu9tsPMmb7H3OnXtm9t4Z4J9m5MbyHeXBcm+5i1zP7+w6wAX3VBpH8NqMFmqh33Kh0tiCN1vRQq3sWzrELcCbHYivC4MyHoU3uxTfELrhzV600AhakZ3ISumzdKmslLRZi/hZGROe6KXwewR+XVtWTli2nIRajnd4oVP8omVc3JelV9yE5VUc4Wt1pvIa3mxYC8jf3bllW1yKziV0U7E4DHI+loFVy2M05l4VLUoGUFwrc2tBbMTSGEP21HOR3wmuiBLytUl1PPof8D1hIQ3H9M/Z1AR+X6/EpfC6TXHcv2NxVbFr+VQJP1T6dIRuWmU1tCO/ML9S/EeK0Ll/Ygi+EPf/1LJeXk64tTzBD9wb8q9aE/IDK6BY76LP7lMAAAAASUVORK5CYII=>

[image16]: <data:image/png;base64,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>

[image17]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAXCAYAAAAC9s/ZAAAAn0lEQVR4XmNgGPbgJxBzogsSC6qA+D8QP0WXIBaANMMwG5ocQVAAxM1AXMsAMeAeqjRhANKEzAZhZiQxvCAZiLuR+B0MEAOuIonhBci2wwDMFQRBGBBPRRcEgskMEANOokugA3y2EHSFBxAvRBdEAvMZIAbsQZeAAbymQwFOV1gB8Vp0QSxgHQPEAAy1MJNJwXAgh0WSGNwP0jwKBgMAAE6cPU8ZpPGhAAAAAElFTkSuQmCC>

[image18]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAWCAYAAABdTLWOAAABqUlEQVR4Xu2WzysFURTHv4TslBSyoKQUFrIg/wQLYaWUKAu2srGRhbKhLJWSSCkpSamHsqJsbFGSRBaEkl/f454x15lm8/x4s3if+jbnfs9t7nkz5943QJYsyeeSevd0R91Q155X8jU7Q0gR69Yk+3C5Npv4byqpE2uSWbgCJ2wiE2xQhcbrgStwy/gZo9qMG+EKPDN+YiiGK/DJJpJCLsKdnFiCAnOM367XUrj8AZXS+Ijapp41/lNkEVm0yPgDVKvGKc8X7BMfM+Nf5QJuwXqbwPdClry4D9Ei68z419iBW6zbJsgkdW9NRX7YsjWVU7h/rABpl2GN56krqorao27Vb6A2qX5qkZpTH1NwBU4HhtKC8Ol2mVyA5GqtSZr1+orw7H2kyjUeotaoVaoM4ds4h7uffTufx8wL9YZw04hkLL7cPI7IzQx+3s6VcZ7xhAVq1JrpMojowj691K7G+YjOteMA8Qs0bvIT6SBfRnH9KMwg3OnS1ytwp4RQg/g+94tP+ziTPnuAW0RaRdoiDvnMO6Yq4OaOqD9OdQaTPKR/D71xhxdn+REfc6Frw3wPAkgAAAAASUVORK5CYII=>

[image19]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAA1CAYAAAD8i7czAAAEfElEQVR4Xu3dS6itYxgH8JcOJ+QgUhIpKZFyyWUgJTNJOSJROOV6ysQAg1PIQLkURgZCycSlMxGiHJm5JxED7JFMXHOJhPdpfav9nmd/a629zr592/n96ml97/+7rTVaT9+1FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAID9wZYcAAAwLNtzAADAMOys9W9XAAAMxLZaJzdjzRoAwICcX+vJWk/VOr7L/lmcDQDARhsfTfu+1oHd9MO1vu6mAQDYYE5/AgAM2Lu1ducQAIDhiKNrh+cQAIDhcDoUAGDADikaNgCAQXulrH3Ddmito3OYnFLroBzugz056PFTDgCA/7dvav1R68Jad9R6qIwaoHO6z0m1NVbu/NjkrzX5eoh9fpLDZfq5jNaP3x+PAxn/huyNHEzwXhovlMVtxvbHHmjy1qVl8ZEks8x6xlzf9gGATSj+0A9L2a4yagbaP/sz0/jGZnos5h+Tw3UQ+70oh3PITc2rKYtmbh6/p/G9Zek+wvs5KP3LTXJVreNy2Li91us5BAA2l2gOrs1h54paNzTjH2p93IzjCFE2T7Oxmlay32vK0vX/SlmeP0tePl6VlbOFNA7RgF2Qwxnydlsx7+AcAgCbx+ll+p99FssemcPGeWW+7a2mlew31n2wJxs7toxOEbc+KKNl2jqgmf90raOacWi3Gcu27zsd6/sdfftq5fFltb6r9Wea92I3bmv8+i4AYKDiD/vvHE6RG4Psl9J/iq/Pcz31bBk1OvEe0PbauFni2Wuzvts0se5vZfEavE/3nl3ur3VJM26f9RbvLe0TR+12pKz9jpO+b84Xus+z2jBp17m51lfNeDzv5Vpbuukvuk8AYBOIP/O4xqlPvsD+7rK0mcjy/DgytB4+qvVWDueQv3f2TK2TcljdmYPGubUeTdl4P/n6ttak7zIpD5Mawedr3deMw9ll9p2uAMCAvF3r8xxWt+WgjBqBR3KYtM3Cid04PvvE6bppdcLiojPFfk7L4TLFEb1pzVC4qdb2HJbp691a6/qUxfKXl9HjQSaZtM1JeZjUsI2n45EnOQMANpH4Az+jGd9Tlt4xGmK5aY+aeKwsbQbaGxTWUt7vPGLdaK5m2ZODMn2/+bRqiOXjtOs03+ag81IOGn1N2pXNdNzdOzbtOwMAA3ZdGV17lo8IrUTcnLBep97Wownp28epOWj0Lf9CDnrEkcV4Dt488jVpcf3c2MXNdN8YANiPvdN9xrVvaynu4Oxrjlbb7hzM8EQO5jDP73kzBwAA82jvplwrcXfpPA3OSix3P8tdbpJ45MdyTtOGu3IAADA00Rx9mMM1dEQOkr5nq+2LbTnosTMHAABDFA3bPHeUAgCwzlZ6+hEAgDWWG7a+R5IAALBB4k7ML5vxr93nriYDAGADxdG19mG+7dG21XymHAAAc4gXmI8bs3w6tB1Peik7AADr4PFan5Wl7+RsG7ZbmmkAAAZi3LBdvVcKAMCg7Ki1NYcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZP8BxSrvq6R7OWEAAAAASUVORK5CYII=>

[image20]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADEAAAAWCAYAAABpNXSSAAACHklEQVR4Xu2WS0hVURSGlyVlKoTRJJASxJEaCEoSzhMnNbNEnakTadqguYOghAYOAikInDZIgtSBPQiECJpFPnCigkqJ0oN81P+79vasszRMCT0X7gc/7PWve9l7nbP22VskT548+7EA/TZahZahJeOd3/l1RuEin3sTvBPNXfeJrHEJmvEmGBAtoM8nssgLqMh5naIFjDg/s1S6uE60gFnn5wznRAv44RO5wglJvkT/whmo0IwzQSygwPk3XEzWoSrRN7cCbabTx8Mv0QLOOr8Huuo8nh18axHuqX4THwtzogXU+ITs3VreK5HdxR8pr0QXddMnwD1ozZuStB3PkTLj34ImoFroAzQJVYccY94CbkNPoPbgk9fQS+ir8Qj//xjqhh4Yn+3OG8Y290UX83AnrTRK8nZaXY6wleYlKYZnChkN46kQE+a7zLgU+iRJ+9E7HcbXoOIw/ib6W/IGuhvGJNUJ/IxuQFshEcWY/vfkp3/lGfTTxJ9FFxOxE6YmB73BGxNdS3Pwm4If4fhUGD+V9EM6FHdczIkfmdhOztbhJZKwJXgzsDDmojxso0ET+4I6THxgGqCPzvNP108YYXteMTHhl89eOnlTqBBtndii3KvsiguiZxJb9mLIHYph6LJomw1BXyR9PW+D3osumO1hv1i+2Mi46E2Zm5oLjXBPcN+Vi55Bb4N/MsSLIf7vTEMt3swl6kWfNlviSPgDR7aF2QPCd6cAAAAASUVORK5CYII=>

[image21]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAYCAYAAADkgu3FAAABOUlEQVR4Xu2TvUoDQRSFBzGoJGhn7TvYikUa0UQQC2vRSqwjaGNlae8bhBgs/XkAO9FCC61FCwtBO4P4c87s2XC5GVRICov94LD3nHt3M5mdDaGgoGDQ7EKTLhuTBsoXNJfIjlzWF7WQPdTDbNqH/XAVen9oJZGNQi/K91yPu/EIPUMjrteFN1667E65hQvKeYdaqsehW9Pz93VhYymRnSeyiuptecJFrqsmzKeMjyyHrFFyObMF1akDcQx1VHN20fS4fQ3jIzchG9w02YeyIWg/pI84+2VTz5veE3RgfIRD97pSD8rP5A/lLa/QhPGcqxvPf7RjfMQP/cY1NKy6rSsXat/RJ1Q1Ph6A/IX+hSa0Bq1CG9Cb8lnoRDXpeeZFKvyBfHtz2UPC+jRk39mMySM8+1s+LPg3fANyL06AhQ89AAAAAABJRU5ErkJggg==>

[image22]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAzCAYAAAAq0lQuAAAE90lEQVR4Xu3dWchuUxgA4G2eZaYkGUKGyAUXckGSWaLEUVzIhbiRUCKFlAslueFGhlIiKWUeUoYLY3JBGcqcKUNkXq9v7c76339/w9/5zvGdzvPU21rvu75/f//l297fXqvrAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYIOyaYmjcnFGn+bCgM1LHJaLAAAboi1LfF/i4bxQvFvin1ysfujGr02ykr95IhcAADZUe3XDjdT13XA9vN+NX5vk9lyY4tdcAADYEPUN2xZN7bxufMMWd+VCrJ3YLkzxTS7MYOj7AQAWwp91jIblzRKXN2vzFg3bJSX+ampfduMbtp/q+Gw3vD7O0Ge/rWOsbV3H1u8pBwBYCOc3876B+aWpfdjM52HvOuZmaVzD9l4zH1ofJ3/2rmberz3a1MIrKQcAWDi5yQl/50K1TYkzJsQ4+9YxrnthiedrPtSwxXdErY0zl3xivHyt1ri1x0tsl4sAAItgqxLHlvis5rGNRtipG/2+bJOaz8P+dewfSd5c86GGLb8E8GS39DOv1TyawBeaesjXChuXuK7EAzV/ulkLX6QcAGAhRGMTj0VjvKfWfq7jbXWcl7NLvNXkbVMVb3S2+W4pD7FfWq71j2/73+H18uciP6SOF5XYsUYr/w0AwDIPlXi9GzU1bzexWfuhtSDuooW403ZQU+8bmLa2aI6pY7zEcHdTv6BbvhnuuXXcZUl1NQ0bADBVNAz9Nhbh6xJfNfm6Fm9mvpCLC+SmZv5jM++tpAGLxm+PXAQAyA5o5vED+JU0HCy3Q4nDc3GMT3IBAGCSizvN2rwcmAsDVuUCAMAk+3Urb9Y+mhIAAMxJbJ/RNmv99hph22Y+L/FdYjgAAJY5qVveKLT5pIPMb50SAACsodigNjdr8dLBpXU+tGcYAADr0G/daB+x/nFcHNsUtV687bguxdYil9X5rEdBhThJ4OBcXMeOLLFRLg7IDTIAwBp5IxfWomdK7Frnsc/ZShqb2Lft5SaPa7V/f2XK14b7cmGC/kQHAIA1dnqJG3JxLckNVZtPu9t2Sre0YbuzW369MFSbh+9zYYqPcwEAYH0QzVR/3FO4v5lPa7RO7mZv2OL80nkb+q5Jdi5xSy4CACy667vVv6V7qalfUWsxRvTit3f7dKOD2f/oZm/Y+vpxJV7tlh7sfmOdX13z/L+M81nKd+9G54leXuLeWsv/T84BANYbH3RLG6uQm5vYaqRt0C5J+SwN27jrx7x/eWDoGlm8RftYqr1Vx6NLfN6NmsI7Vi//Z5ZrAwAslP1TnpuoVuTXNHk0bK80+aSG7dpmfkITvXi8+kudH9XUx9m7xD25WMXB8HGCxJCh/w8AYKG9mfKhhu3QOr5Y4qk6D9Gwvdbkkxq2oXkWa7el2gV1PGtJdeSdlPcNYPsdjzTzMOn7AQAWUjQwx6e8nW9f4sFUa+e/N3l8rl2Pu2a5QYrfqX1R58+1C8V33dI3OfcqcVCJq2r+U7MW8rUj36qpH96s9frHpgAA642t6xi/BzunXaii6cqiwduuG22aG48v2zNQZ3VqLozxaTM/rZmH3LDtWWKLOl/VLlQ3dLNtsgsAwAr0TdnQnbEjutEduFnlBg8AgDlo797FEVrZrKcXxPYlAAD8T2Jvt2n6R6UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAc/IvzZBSIy3LVlYAAAAASUVORK5CYII=>

[image23]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADkAAAAYCAYAAABA6FUWAAABvElEQVR4Xu2WzytEURTHj18pIlnY2MxCWUhZKVlIWVgrWVhgocjawsaP7KwIK78pNhYKC2JjIZZS/gRZKaH85nznnsuZ401jLGZmcT/17b3zObc39857980QBQKBQPoscD45T5xa0wM1nHNyY45ML+cpIDfxfqmrpNa0GNdg6pwHk91V9YW4IuVQD6oavHDOjMtJ+sgtIM/4mDr3dxZHzaH4BOo5y5xSqcs445xpTr64TPNMPxMt5zSqnmeUIhbDrJDxxZx9Trc0Jjmr0hsTlw3wucglp47TJHWXGrMjzjJPxh/L0S9yQvVwR6MuYsG4jSRZ56yR+3bxtCySe1umwi+yVblecf7pOpHaMkPOV3sxLMcraWiGIlym8IvUYH/CbUm9KbVljpwvtA3IU+PuxGeDqEUCuEc5T7Ynlyjax2V7hBsxLgrs66k0kwr8DERNFO5azpul/tPbFZvZyk7lKsk9AplkgH7PqUJcj3KoO1QNHji3xsXfYPaCe8rd6EYGsU8S7tC7qsEB503Vft/GlIuDQbPG4V8FBiP4BrNBCbm78sr54Nwntr/BPyHs021y821LbAcCgUAg8C++ACJ1f/wZmzpQAAAAAElFTkSuQmCC>

[image24]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAYCAYAAAAcYhYyAAAA3klEQVR4Xu2TPQrCQBCFRxAEKy1sbTyCF9DSWwgeI4LgJSw9g402FhaewQsIdqKxEQR/ZpgsmTx2N7HPB4/svjcZZpeEqMZHg3VnfY2uhQrlTXkuay9r0oIR+BbJo0xJixLwHRvWEE1kQNpkiwHTZl3QDCFNUjSZFxox3MVZZqw5eFF8TXBfCjY5sXpm72ihYXlS3kQu+mgyS3S6PWlBP3v66LI+aFoWpC+fWRPIBHdcPHaBMWl4w8Agn7xME6RJ2kT+pxDBCarSoZL7qMKStcrWOxv8gxz3wTqAXwP8AMduNShEz6k7AAAAAElFTkSuQmCC>

[image25]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAlCAYAAAD/XbWoAAABBklEQVR4Xu3ZPWoCURQF4HEHZgNWYuMmUqbMdixthQTcjJVNIKQIgktwI4peIaPj9a+weGP4PjgM78xbwGGmqgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAo/kXlkFvlt9NPId+Sr0QEAUMgqss5ldbkDAKCAcWSbuo90BgCgoEF1PthG6QwAQGHNwZbH2zX7X6m38nq4CQDAw+qR1o90mi8AAGiHerC9nbS3v7ZN7mR4vAoAwKP2wyyPs5fIJtJNPQAABeSxVnvPBQAA7fH591yetAAAtEYvssglAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/zA601CNoF1qQzwAAAABJRU5ErkJggg==>

[image26]: <data:image/png;base64,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>

[image27]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFkAAAAYCAYAAACRD1FmAAADRUlEQVR4Xu2YS8hNURTHF/Is8syjEAMyUEoMZIAkAyQDBoYmMpAMyOMbmShGiAHJxEAkj/KITBAp8iZCnlFC3o/C+p+913fWXWfvc+69bh9q/2rVXv+1zr7n7LMf61yiRCKRSCSqaWN7z/aZbYmJVbGL7RfbE7YRJiZMZ7tLLm+viWn2k8u5zdbLxCyvrPAvgwc6pfybbOeVX8ZPtlnKxwDNVj5YSS5PWEouT9PVa/KSunh/aHuG46rXxf4606wQoA+FbxZaXysaNlDx2jkBDf64gLZR+WfZnikfbKZiX8IRisc6hBNsb9gG2EAAmRkWaNgGykAOVoEF+nDfnu99yzeq1dHernwwxeshKgd5LNsOymfKRLZDbJPaMxoHyw173kO27iZWBm40dLMxXYP4aSuS07f49hnvWx5RrsvWsD4PZ4z0+gKjg9JB7sR2nW0GuaTHlHfyg22Pb9dLP7bXbBfI9d0oscGM6RrE8bAW6Md9+533Lbco1yf4NvZuzSCvrzY6KB1knJ6d2eaSSxqtYtijohcaRrF9ZTtoAw0SG8yYLuAZEA/9PvT7qh3q5xrluky45Xk4AxMI+k6jg9JBliVxkYpJBwKaBVsLTuptNtAksUGI6RrEsc1ZoOMgAy+8b0EFI/oY316RhzMGeh0HrKV0kAUk3AloVReiXELOWhtokthvxnQN4ietSE6X2Rfbkx9QrmObQ3tNHs7A4Ql9sdFB3YO8KKDhzdeDzOitNtAgHyh8s9DsJLAgJ1ZdyLOt876lkerC1sqgcpBlNmrwtqD1MHoVKN4/kdtqmmEhFe8FQMOL1NjVgwG2104OaPD7B7SjyseEQUGgWUXFvoTKQUYlgAQU7kAOETxws/QmtwrO2UAd4LfxFSZs8prmrdeWKQ0DZycGVsZl5YOX5Eo2YQi561B2ClO9poEvpaAFz4l4tFxF8B7bDd/+yDasJqN5UHNeIdd/NxOL0ZPcfVwid+qjarHl4HhyNbhlJrlrD5N7EZhAIVBm4r+GY+TydVUlyMzdx/adbXdtOOMLuZeGr8OnbM/J9V34vwUdhTbzVvMnK+O/Zh4Vl0WixcgXEPa2wSaWaBHYw1Bd4I8Tu+8lEolEouP4DfXP/kk/3tRQAAAAAElFTkSuQmCC>

[image28]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGYAAAAYCAYAAAAI94jTAAADNUlEQVR4Xu2YW4hOURTHlzvlUogXt/IgtwclyXUeJEpIijx4IUreKOFRrvFCkdxKnij3iMitkJJCUkqTEkIKkbv1t86eWd9/9ne+8zXTfJPZv/o3s/9rnW/2Wevs8+09IolEIpFItB6vVH+cPqreqd46r39DdvvmuFg9vqnWUawSB8WufaEaQrEoSD7HpnJbLDaPA+0U1KI3jb+7cR6/VTPdGNfOcuMmDFU9Z1PZK3bxFg78h2xmI8I0sXpcdd6HzBvhvBibxPI8cyJeCRdU3clbKnbRZfJrxUjVYDYjdGCjINvYiNBZrCY7nPcl8/wqioGcJ2yK+WXvaziNx4ldUE9+LRgmNhe8BkIRVvgERw/VeDYLspONgmA+uU99BnKusCnm72YzRl+x5K8cqBFoCHNN9UM1iPzmzHkXGxXA6nksNr8iqxQ1PcummH+RTaajFH8CWovZbGT0U/2SxvlCU0oyqqOaxixR7VO9kXixmVDXkxwQ85+xyYQb5CdgfvZzo+q9WM6exrCMyjwUarrzY3QR2/21ZPPx9FYDXnesYxEvKI/XEq8Zg5zTbIr5t9j0YMuHpD7kr1RNcuP1Ei9qxa47tqsOsZkD8sNDc4JiDHZOlZgbEYrGXlAea8TmhXNgHsi5xKaYf4DNwEuxhDEckKZNmBzxDtO4Ej+l4OFKuSu21QzsF/v7C5wXwGGvK5sFKfIqOyo2dw9en+GhyQPxcruyRWyCG2LBxRwQ2xZ+Iq+TlE4Cr6bVbuyZKtb0e1LavEo34Sm3W3ok9jlrxQ6/+CJ+WpJRHUUaExpQ57zlmYf79GygMZrC9z0h4v0Dk0GAt2sTpXEVxbrpP4wbF1imuu7GuKaXqmf2e1HyVgDODkfEbhoFag5FGnNKdZO8z2L308154dC5ynlht+vPi6jdfTduANtLLE1s+cLTAGEMH+eGGMgZqFooVuwYXHyMR6u2Ss47tYYUaQzAzgr3Up/9RA19U8BYif8nZYbYNWfEmnenNNx88OFoynkOZAyQeGNA7PzRFijamDZNWFl5+Dh2PFgp3vfb7UQL8UDsiysP/K8N71Cce+qcj1X20I0TiUQikUi0An8B2z3a5z0RSwoAAAAASUVORK5CYII=>

[image29]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEcAAAAYCAYAAACoaOA9AAACcUlEQVR4Xu2XOYhUQRCGf09W8ABdVgOPRSOPRJBF1PUIjRQRNDJR1MBIBBFDwVXRRGFhEd3IyERQDAw8EhET8URYPBIvVBAFxduqrfdm6v1T044GPmZ9H/ww9Vf1m+6e7tc9QEVFRUW5vBD9dHoveiN67bzOWnX7s0b0EDauM5RrQIvOsylch+XWcaKN2S364eKdsDGGzBE9ZlPohzU6yIk2R8c0P/AOkTfMRVEHeVtgDS6RXxY6mFlsBoxig1iPeJV8RuxjHsWLYYVPyS+DblhfdBt8zD5v9wWOCaIlbBKXEU/CE8R+gamwok+cKAn/bsi5Ivoqmkl+K31+h3gS7iP2a4yGFSSL/jFr2ciYJvqOen9VKwoVMc3GdxuxXyNvyPtW96myX/QWVnOinsaCzNPOrnJ+xDjYqZjsyB8ylo0EzxF/9z3E/jBfYMkp5O8QLXPxPsQPGWIjwWHRKTYTaH3+w52lHLOSDaLZO+cRYh/PYIlFnEBjg+WBd5ri3/FNNJvNJtwQHXDxAOz7NzgvZ69oPJuErn7uvxKeVtcyczMnhCOiD+SNQfEhuk12udjTC5v4myhOYEMnEhxlI+Mu7Dl7YBdU3RZ6420FbacHD3uFS/CxzDzuTWEp6qtpE+UUPzievJytoqsu1jaTRBOzz62SWgmTRYOiB6JtlEvxEnZ058yA9Ul/6Bp69OkS1+NSk7k0Vl/vFRFaM120ETbgCJ4AjReK+kQnKVcG+r/xFewCrH2bW0z/PfownZgLnMjoQjw5SnQ/GVHkKyyFz5+DrRjv+6vAiOKWqIdNQv+b6ftI70Wrna+r7Y6LKyoqKv5rfgFVraQp9xQPcgAAAABJRU5ErkJggg==>

[image30]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGYAAAAYCAYAAAAI94jTAAADNUlEQVR4Xu2YWahNURjHP2NkKkSZy5PpQUky3qLkBUnhxQMiuqUkMjwoGeOFKAklD8KDMsULXiRCmSKFkmSKKGT+/tZe93z7f9c+Z+97b/ee3PWrf+es/7fO3vus8VtbJBKJRCKR5uOV6o/RJ9U71Vvj9a6r3bq5JK49PqgWUawcd1STVB1VA1QbVR9TNQLgRmfYVK6Ji83iQCsFbdEh+b4gKb8phTNpL+mBD31P1QgwWPWUTWW/uAts5cB/yBY2AlxQnSbvnLg2mkl+iMeqfaodqn4UC3Je1Ym8heJuiGlbDQxTDWQzQBs2crKdjQA/xbXJXOONSLzXxsviKhuVGErl0eJu9pz8lmCIuGf5rfqSfF9qKxg6q8awmZNdbATorzpKXo24Z7pFfojCHWPpKe5GXznQQqBDmMuqH+I2UEtjnnk3Gzm5KK69RnIgwG1xsw7LH/alZ+lwNm2ltDFVCzPYSOil+iXpzXRiqkYxGtIx7cTd9yYHMvhGZfy2YlYG/B/kdXp28rlB9V5cnb2lsAxPPDTUFOOHQEaD7K8pOx8ZTxGw3LGOBTyvLDBD8yxhWRwX1w5dOGBB6oZKPchfphpvyusk3KhP2CgDspJDbJYB9f2gOUkxZjIbAZBBsZBtsecV4oHqBJsF2STuP80jv46X4iqE1knuhAkB7zCVK4F1dhCbGVxXbTblA+LuP8d4nrXiDm8NochSdkrqp9cvqMz4gWVBwgFvGvn/QKaA4HwOKDtVn8nz66oHS1OtKVtwykWn35B05/EDliMrW7on7jqrxR1+76sepWoUI2/HrFEtJ6+vuPOJZT2V8aw4+Vsw6IJtgYdBYA/546Q0i0LTzF6MO86zWHXFlPGbbqquyfe8lJsB3VVHVA9VSyhWlDwdM1VKI5813dTDqxp4K4yHPXmVKfs3AXj+emDzwrKClNTeBGX4ODeEQB2MEhy00NghuPFRxmFsm+ogxaqBPB3DnWGFjNYzSsJvUnCQR128h8TnynS48eCi6JSzHEjoI+GOAaHzRzWQp2OqHj9KymHjyHgwU6xv0+1IE4FNbCybBN61Yf/BuafG+Jhld005EolEIpFIM/AXNnrWi12VxAcAAAAASUVORK5CYII=>

[image31]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGsAAAAYCAYAAAD9CQNjAAADlUlEQVR4Xu2ZWchNURTHlyHzPBQllDzIUOYhSV7IC0+m8CJDkbxJ8oZEKA8eDH2kvEgeyFxmIokSMt4XZMiYIfP6W3vfu+4653z33PPpdu9n/+pfZ//XPveeu/fZaw+XKBAIBAKB2uU567fSB9Zr1ivldcvXDlg2sL6zfrD2mlgp1pC092fWAhOLBZ1x2JrMZZLYNBsI5HnPGuauu1Lh5U7DHdYpVb7NuqTKEfqwHluT2U7ypettoIYZZY0GMpr1gtVeeSNJ2u2G8uLoQPGdCq+TNT1HWa2MN5/kppPGr3VasHKsi6wmxaFMIP2hnTAiNGlG102KrwNvlzU9/Ux5KMkNOeM3JpqybrGesFqbWLkcIBklmjSdlVQnyY/QhaTiFxtoxBwjmeB72EBGxpK0ITqxPpI6JckvAm9bqooOvJHN1XWtU0eymhtsA2WC9vtlzRiS2jrJL8JXsrl8uikDLFP7k4zEd6yfxeGKsZbkmcfYQANYR/KZE2wgBQcpfVskdUqSn+cbSYWOxl/MGmc87L0wCj2Y87aqcqWp94dlYCnJZ862gRKgrfDipiWpU5L8vzwlCQ6yAYq/yXptKdrJlcQ+T1b8KJ1kAynAyM4Zr9RzfaT4OvDuWhOcIwnOsgFmI8kHWnzPYx/WWfl4E6+S5HzsMR6wBroYypjEl7P2sOY6H5xnnWC9VR7A/XWsRawtykeaxokLthw4LTijYlnYTZLWB9hASrAwwcrSYjtitSnPoGgdAG+4NTe7wDbj4y3xo22miQGkwGdU6DTsyQB24rh+6MoA8YXquh3rHhXSJryW7noyq427/kRSF1yg4h+qfyDS90RVLofjJC9IdxsoAyywfDtYXVH1VjgPG2gNvCWqvMl5EbA8x+oHKxf9JSjDx1lVKQ6xvqryfZJG9+gvtg+xzHmnSZ5livPHO9+Da2xmwT6KvgzlgFF5nfWIogcBWdhJ0U7yWqXqAZwS2dGLVTTqXiMZnWhLu8DLzEpTRgPvUGXdeEh5OAwGSGVIWxqU0fgWpD+kJo/tuHmmXA44bvpnjVHN4MzL5mbbWLZhPUirOEfTYPWkD49xctKXJOX51Iq5FKO8J0nKQart7WKYM5Ei41L1f88R1hCS9Lif9YaK/zaZQ5Ji0DFIa3qFaDvVc5bkZB9zBzrEgzkL82Ivkn0LzvJAM1d+STK/YWGgR3YgJZgHplozUH2MIBk9SGWBQCBQ5fwBPb/9ZIE9pScAAAAASUVORK5CYII=>

[image32]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC0AAAAXCAYAAACf+8ZRAAABs0lEQVR4Xu2VzSsFYRSHj++PlBRF+dgJpawsJAs2dko2iH9ASRakWCEbKwsbYX2zx97Hhg2FEpFYkxIh/M49L973zJ2547pW5qknze+c47hm7jtEERERYbmDA7AEFsMeeOt0BLMG3+ExLFS1P4MXaiudjsTkkPRWm+ssc13x1WFo1kEa4EVzcBF2qFoQW/BaZfMkv88hF17CbZjhllLGsyQkPMcf1KbF5AnJhAfwAhao2k/xXRLA56MwqfIak3er3MMGvIfluhASXnIKj+AufIXZToeXJpK5UZWXmXxc5b6skixs1IUk8JI863rdZEG0k/QMq5xPIM6XVJ6UWZLBNl0ISR3J/JQuWNSS9IyovNTk0ypPyhDJYK8u+MDPpw1/X3j+ROU2fAhwz4TKq0zer3JfZkgG+NaF5YxkJt/KikzGJ1QQ3ON3enjOas0yfIH1uhCCK/igsk6SxX1Wxh+K76DNGzxU2RjJrC+bJK9b/samCt/Oc5U9wUeV8R/CNlhZq8ls+HpBZfFnaZ9kkX1Lf8MgybIb83PHLcfpgns6pO//bAw+wxW3LPBrPF1vwoiIiP/ABxh5YXqWgun2AAAAAElFTkSuQmCC>

[image33]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAYCAYAAAD3Va0xAAAAyUlEQVR4XmNgGAWkgglA/BGI/0PxdyB+hya2Cq6aCADThA7kGSDiu9AlcAGQ4uPoglCAyxIMEMEAUeiOLgEEnAwkGHSNAbfC9QwQuQB0CWwAl42ODBDxiegSuADMoA9A/B6If0D5l4FYGEkdXgALnyR0CVLBTQbs3sIG8KrDFT7YAF51IMk76IJoAGYZTkurGSAS6egSWMA5IPZHF5wMxJ8ZIDEEyldfgfgfigpMgNUl5ACqGOQExNeh7PvIEuSAX0B8Hl1wFOAHAB7dPhDeYPBsAAAAAElFTkSuQmCC>

[image34]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACYAAAAYCAYAAACWTY9zAAABs0lEQVR4Xu2VvyuFURjHv5QfA4MSi6JYlMFgMiKbMvoDDEYykizKoCwWJoOSkYzKxEB+lJCBkGxCfv/2fXrO6Z773Pca3Htfkk99uuc8z3nf99xznvO+wD//xMsYvaYfzgd6QV+CWI0f/BP4SViWoPFam4gLefiKDZIWaG7XJuKgC/rwNpsgU9DctInHwh6it1FIt8WxEPXwRvpKj008VmRSchLX6DZ9crGicFDc+PqSIg/Zd/GvqKQb9NYmssEBoicwCo1X2IRhlg7aYDaIqi9BVkHieTZhyNmWy41XbRDpJyxM0hm6g+QxZ/Qu6M/TfGi5bNEmugldZanltAxAb9xhE0idmG+v017XbqePrr3ofqOumaM99Dkil8QEvaGX0NN4Rd+SRgAN0IvPod/PUui2hjeUVRsO+nKATl27EKmr2Rz0Iyf2XTqRuiLFQf+Etrr2EHSlPOF1/XQh6GeMrMKRa5cg8bA+9yv9Ate+p/Wu7XOed1pGD4NYxixDP/ZSM1L88h7zVEFfzvZQyDd4POjLq0hqVf5czimH1pwgWy6n8FcwQrtpNXL0JciEOiRq7O/wCXxVc9Z3e2eUAAAAAElFTkSuQmCC>

[image35]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAmCAYAAAB5yccGAAACoElEQVR4Xu3dv4sVVxQH8IlJEQsTDGgtBiFCKgsbiTaC+gckqRIbmxQiWKrFdhFBsLMSSSGIpSAWNqKkiERNYmNrkYCaaCNY+Cv3sHfwvsPM291Ed93n5wOHuec789687Q7z3sx2HQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA761PcwAAMGuOlXrV9Dtq/1GTvUlfdJPnCx/UbEOT5WPGLPY4AIBVKwaeH1P2uObT/J+Bbui9c/Zl6sfk1wEAzJyhgSeykzkc8KzU5zlchLFzLtaHzXoprwMAWJXywHOw1JOULeRIqZ9zOEWcc1+q9nPMpf54qaOlPqv5nmZ/bL8utaabv1J4p+YAADPh225+4Dlb6kypU5O7l+ybUn/lcEAeEkPO2n5s3fcxsLU9AMDMiOHmpxw2/ssAd77U6RwmQ0NVztr+ebMeOm5j6gEAZsbYcBM3FHxfalPKp7lZ6nAORwydN2f5qtreUt81WS/2rU997/dSN5o+9kU9arKF5M8FALBs4of704aRFzkYEM9A64epxVrXDZ83srGbCV6W+rXUlVInmjzEcVtT32oHtvjKFgBgZuTBJ3uag7coPksMevG8tq9qv3PiiHHtwPZnqe3d67/tfl3He86V+qPml+t2bTf5tfAvpT7plvdvBwAYFb9D25/DFXI99fdKXUjZmPiqNjtUaktd98PbtboN8TDhEHev9g4064WGWQCAZbE5BysorqbFkHSpbrdN7p7qdrO+WrcxkH1c1/G4kNAPYefqts/6GxraIe1uNzwIAgCwRPEfG/7u5h/wG/4pdavUxdrvrtsQw2D4odRvdf2w1K66flC3Ia7wAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA76h/Aa3igIpB/OjfAAAAAElFTkSuQmCC>

[image36]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAF8AAAAYCAYAAACcESEhAAADBUlEQVR4Xu2YS+iNQRjGX6SIhBAW/hLKLcqGEhvZiJJyKRZSWAgL90tkixULt/QvysJlg4VsLLBQyi1KKEWycIkSuT6Pd4Y575k553zn+OucY371dOZ7Zr7vfPN+873fzIhkMplM0zAWOgLNC7yNQTnTBfSEvkPHoH7QTOgHtBP6ELT7H2C/z0JroGXQUmgJtNipGrug99BHaKWpi8I/nGFNUX+7Ndsc9jmlm0G7GA+gK8Hxfeh6cFxGp+iFY9DnW9GsdFjjL8AMMB0aD42GRjmlYuRhxoi1odffmh7/VGOk/GbiBvQU6m0r6qA7dMCa4A3Ux5qG2xKPF73j1vT44Mf+tJW4IJprh9mKBtkMrbVmhNQgTvm/2Cd/GngdLmnRWvDev0JTbEUdMOUmA2dIBTnl/2adlD+ARyUtWo89ov2Ya/wiPIFWWDNBKsgpP8psKXhCk7NatC/LbUUNFIlBKmYpXxZaw3FSEie0IFwwsi9bbUUVTkmxGKSCHPXnQxus6dgkkRNajFWifag1bViiQasAF6Ox9vQeWvMWdN6ajm9S/tEdKTqbOC26EvZchC6JfuSGO++x6HyZc19+O15CE6EtotOu164dOQQ9hwZA90SndQOD+qLsFu3wHFtRkGrB32GOF0m8Pb2pMZPqa/xzUr6lwNXvO1deL7p0Jvwd5MqE1xsD9XBlTtPICHfs+QwNdWV24oTokp50g966chG4J/UFmmAr6qRS8JkxWPfK+PS4LeHxM8kyONq4qGBQ2YAd5m9n0MZDv8N4C0RHu4fXCv8oLO+V0uvaGwoHwSR3XCscLOzDEFvRILyHF9YM4MJunPG40ON53Ia4A30SHUwNEQsG9zHChRk/aP5muTvq3w7Cm+ASnTClMCWFhNdnKrwcHFdiMNTLmu2GDT7z+H7oYOCxDdMN4Uxhm6nznBF9UL6e34nUG5MRzeP8EF4TDayHH8irog/DB54wHTENeZ4F5Wmi+yB+F/WoaM6/K5pDw/MyXQxHOmdFmX/MLNHgT7YVmUymnfgJ1MLPi2IJgmkAAAAASUVORK5CYII=>

[image37]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFcAAAAYCAYAAACPxmHVAAACz0lEQVR4Xu2YOYsVQRSFrysKbrgHooGRW6Dijgv+AQ3EJTExUNDAVMTMXUwUTNwwFkFQVDRRcAERN0QDUScRERU3UHG/x9s9c/t09et+/WTmDdQHh3l17u2u6uqqrqoRiUQikUhP8kr1x+mT6q3qjfNGd2b3fvaqfqh+qk5RrIwdYv3zRbWBYkHQeefYVG6KxVZwoBfzUTUr+T1KugZPFR6rrrjyI9UNV84xSfWcTeWIWKW7OdCNzGWjReapXquGOm+O2HPedV6IYRJ+CfBGsJlyQTWIvPViF10mv7sZqOpQXVf1yYZqgc8BngsjzlNl9N6XcA68Y2ymTKbyTLELOsjvSfqqHqheqAZTrFlOi41CT5XOLcop8nOMFEv8yoE24qLYgjKeAzVZIPbM6PRGFHVikZ8Bo6NSYptwUmy1n8GBJsHz/mYzQFHfFPkZ0iT+tq1M/m5XvRPLOdwVlqmJ90u11PkhBojtSkob0wS7xO63hAMVOCPW7ioUdWKR38l3sYTh5G9ULXTlbRK+0VM2GrBPdZzNFtgs1qZ1HCgBz/aBzQYUdWKR/4+XYsHpHJD8RYsC3gkql4GpPJHNGuwUa8tyDlRgvuQXbH4u5rOEc+A9YRNcEwuu5YCyX+yGnn6SrQDTfIsrexaLvbjbkn0BoQY2A0Y9TldTOFARLITYeTDcLnwGPaslnwPgzWbzYBI4RD7eajqa11AM+Aq481NwLLzqyrgGG/chye86XFK9V43hQBP0F6s/pFsub2vi4cDhgbfJlQ8kXg5stzBFsVL6SlCGj7NzCOSMU62S7EnHwxWiPE21R3WUYo3A4npH9UzyB506oG7u1FRYTzw4tfLswB4buZiNGP3fJL8BaAncHB17ngMJYyXcuQDTeYIPlIDj739tfLuTvulG+PhZsRHrfb+VizjuSfk/VPC/CXyPsS9e5nyM9oeuHIlEIpFIbf4CJ+LJWjwvNCcAAAAASUVORK5CYII=>

[image38]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAAAaCAYAAAAue6XIAAAB1klEQVR4Xu2XzysFURTHjyIiIjYWlFLkX/EjPzZSFoiNjbCRhYWUQiRlY2OFjZ0FhbK0wF5KfhQWyq/8yK/v6d775nTezHiL95oR3/o093zPvHdn7jtz5zyicC2AL5AtvCxwC+pt3AuuvHRC7rNnYF7lMiae0KlMxU7bYFGbZM4t0WamVAueRcyTV4rYqYOSb6LAx0u7isENOCKzYmPWn6bgyZcpOTcB3pWXVnE9ykl5nCfGayIn9QIulPcGppSXVvHDsCRifeFdIpbiXIWPV6S8VDSojSDJSavJrJjMzYjYaQscKy+fkssiVX1qI0hPYrwPxsl7yjvJ/LRSXJdc21rsf4i4HLSCTZADusE6eLX5PXusAZdkFupH8dbEX3ANSsnspz0iPwTuwCS4B80i58S7xwN4JG+VcsFK4gyiHXs8t0f3K/A212fHkcpd0AiZUqsi72Y3wDCYtfGoPUamEzIl1Si8QzI7zCmZLbMdzIl8JKoDbdqMq/rBgDb/jPgBiCv/+nXya9i5XYytZJ01kP8rORbSDTtv/C0ijlx+DTu/COQTvZo4O0KFNewujo3CGvYmilm98sUFNewHZPrY2CisYXerzPVbaMeRKqxh538Mu5Smjusb4WWYbm1svEEAAAAASUVORK5CYII=>

[image39]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHAAAAAYCAYAAAAiR3l8AAADl0lEQVR4Xu2YSchOURjHH8PCTFEUMpSFeShliwwpIRtlWMgQIgtJbMTGxrxQFrJWhjJTIgsWhhBS6luY5ynzeP4997zvef/fOfee+/o+lPOrf9/3Pv9znnvuufcM94gkEolEIvHP8J0Df5JtRm+Mfmb6aPSSYvsqpf8Oz0Q7ybYHOl5TQuSo40GXjc4Z/aD4kaw8crpxaEnmATeOHCH6SuO6DK71Tar50MfPjd45saWV0nViEzF9ROOn2PgL2IfYgY2MfqIdw4TuDeR5J4x6cpC4JFo/ZhSGrjVENH6ejTIgwQUOZoQunEdnDjQBs0XbcZqNjJNGozlo2CJabzUbhk+i3ig2JO6ebd+UKevDeq3YiGGWaOVJbBjaSv6FQ2wSnTaGs/Gb5LUlFG8p6vmmQpvvFhuGMxwgBhgdMtolmmNlrd2IorZDM9iIAY0PJT4o6k1nIxK89ag/lY06aRDNN4LigyU8MoGv80aKrj0+b40UT5/XjDpK/gvi4ruOxXp1jcBQ4rGi8e1s1MEc0VzL2CgJ3nrkeUTx+0btKOayV7TeAid2I/v7JPN6O17RwwBun4X60CVUBtM+4ofZiMUmfm30SqrrAm6wq1OuKRgvmhtTbL34OoJ/M21Ey+DeLPYhTc68s1VLrjv/+xhotN/5jZccOXzrrMW2+0Umd6c/0ylXCrv+zWejmcHO66vRbjYiwGeN2+Z5RhurdhD3wfeS2s52vYVGwxzPx02j9s7vFuJ/sVyKfB+hHXeFOxKfNLZcDD2M3hodYyOC1qJtsSMoZgsP8A2IelOkdrSBD6JeJ6Mv5PmwD8OnEEU+g5184VReJmlsuTwGiY68PWyUxLYbbz4+jGPoJlrHrnkuc7MYRvcD8pihRgc4KHooghzr2Mgo09dgq0TsP5DwLgcJe+GyDXAZJ1p3Axt1sko0H0YLRlQs9h42syFVD23NA7OWb2ormkbzPMbt78fkVcCbggKL2fBwxWgaByOwu89FbDQBZTrEclG0Drb+jD3pyWOiaJkJbGTYNuHzgrEeHnQMwbbsFD2Hw44T557vpXiuDSYLsEK0TpnRURbs4nCUVYb+Er6X5aI78RBYJx+KfrI8NVrreDglwpknvHui0zDaBz6LjiLEIXwCoc/z6CLFz6QUoZsOUbSLS+SD478dHKwXrAm3s/8bXCPRbGA67y56ODGGvLrAZuEqBxPNBo4esTysp3gikUgkEv8tvwBcYDZfUZprtQAAAABJRU5ErkJggg==>

[image40]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHAAAAAYCAYAAAAiR3l8AAADk0lEQVR4Xu2YWahOURTHl+HBTFGU4aI8yBCivFKGyJQHSjwYMpTygERKPJuLV8/KUMhUIg88GEJIqftgnknGTPvfOvv79ve/e5/p+66r7F+t7v3Wf+911lnn7OFskUgkEolE/hl+suNvssfYB2O/E/ti7C35Dldatw2vRItk84GdrmkhcsrRYNeNXTL2i/wnk/aI6fphqxMNuH7ECDFYWvZlcK0fUo2HGr829tHxram0LokNxDSJ+s+x0AbYh9iNhYQhooVhQvcG0rQzxvqzk7gm2j/PKAxda6So/zILRUCAK+xMCF24EfRjRwqLRPM4z0LCWWMT2GnYJdpvIwuGr6LaOBYk3z3b2hRp68NqHVjIw0LRztNYMHSW9AuXZZJozO0sZJCWS8jfXlTzTYU23j0WDBfYQQwzdtzYQdEY62rlFmTlDpvHQh6QfCjwMVFtLgslWSoabxULOWkW7T+G/CMkPDKBr3hjRdcen7ZJsqfPW8a6S/oL4uK7jsVqpUZgKLAdJXtZKMFW0VizWSgI3nrEeUb+x8a6kM/lkGi/5Y7vTvL3RaINdLSshwHcmoVq6BJqg2kf/hMs5MUGfm/snVTXBdxgb6ddGQ6IFmM8C3XgKwT/ZjqJtsG9WexDmp5oF6uS3Hb+9zHc2BHnN15yxPCtsxab95vE3J3+fKddIez6h6mtkRwV3S43sdAA8Fnj5rzE2I6qHMR98AOkttiutsLYaEfzcddYV+d3O/G/WC5Zuo/QjrvCA8kfNG87gC3xS2M9WWgAHUVzsSMozxYe4BsQ/WZI7WgDn0W1Hsa+k+bDPgyfhcjSGdQucyovEjRvOxdMMyjOIBbqxOaNNx8jPQ99RPvYNc9lceLD6H5CGjNKdIZhcCiCGFtYSChSa7Bbcuw/EPAhOwl74aIJuCARjBTf91YZ1ovmgtGCEZUXew87WZCqNpkFArOWb2rLmkbTNMat93PSKuBNQYOVLHi4YWwOO0uwQfSaM1koQZGCWK6K9sHWn7EnPWlMFW0zhYUEmxM+Lxir4UHnIZjLftFzOOw4ce75SbLn2mCwkiwQjbmMhQJgF4ejrCIMlfC9rBXdiYfAUvBU9JMF6/tmR8MpEc48oT0SnYaRH/gmOorgh+ETCDVPo5dkP5NChG66XvABHmkJjv/2sbMsWBPuJ/83u0Kk1cB03lf0cGIiaaXAZuEmOyOtxizR5WEb+SORSCQS+W/5A53mNnduvb3UAAAAAElFTkSuQmCC>

[image41]: <data:image/png;base64,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>

[image42]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAAAYCAYAAABZY7uwAAAB8klEQVR4Xu2WvUsdQRTFr19gSBMjaGsjpAkIsRAr0UawCAiKrZAiWAgBBRUEuxRqqY2lYGcISAobtbHyH7AQRBJEwQ+iXaKJ97y9kz1738uqoL4nzA8OM+fc3Xkz+zH7RCKRSCQSiUQiS6phHyot1P+kaiBfiSyrelxWK9l5z6uqyd/KL1WN6q+qm/JDy0CoX6TlimPfWszzBeXw363fbv5bWs5nRZLFA5zYlZYK/gv5HdUl+UoiXIAWSeZdn5YKfpT8uWqNfC7T1s5K+rQAPILwbyl7o1ogD+58Jx6ZKWtxE3kdbearKPuoGiAf+OMDBoMck8cV5x8CM6om68+p3kvxMeUG81kljzfAz3HLebAoxcdlQHGQ/JFlzLXzwB9TTl5JMp9wEwH8GfmQMS9VvSXyf+AAX4THJs2sOw/8ef8Dj3SzDwm80uM+dIxIdm/x9EnxfOCxzwZeqybJgx/W+nMzoDhhfSwEnk/Ypz6TO6iB99+P57mSpI7XthStcvsYYd/sMN9lPlwAgC8285n6eWPLO0kncGDZHmWNlnlyByW+qsZ8SHSqdn3o2Fb1+9CBbSLMedOyU/O/Jf1igzrJbit3Xcu9eJRBn4gPqg0S1oL2QXnOF8jzoGvBho0/XCeSfCXw+D5XhiRdy09Xi0QikbJxA3fSducJTXeQAAAAAElFTkSuQmCC>

[image43]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAI0AAAAYCAYAAADH9X5VAAAElElEQVR4Xu2aW6hVRRjHv9KKbhRWktnleAtU0qyHCq2QeohKxEh9EAkTFevBGz2YpsfqIbWHbj5pnW5UoqCIdjEVU5HSUERRLDHKsFQIrayIUr+/38w+3/rWzDlr7dh7n0Pzgz9rz/+bdZlZs2bNzNpEiUQikUgkEol6cTXrrDUVfVlfkeTZYGLV8B6rvzUdu1n3si5m3ciayzqZyVGMy1j7SK75EKt3NlzhSdZPrH9YL5lYGV4nOde/rMUm5rmctZ4k307WBdlwx+c61g8kBfAKcT9lY7ebdFG2sc5Q67kGZMPn6UrZ64H+zuQoRi/WMZVGQ8exXlYeWME6qtLvs35R6aL8yWpS6VB99nTepS59jUtfWMnRyQgV0gN/qvFwI780XlHuoHijAQdZS1gLWTeYWFFw/BkBz5YRaTRU6z1kvLZAj4h9flPeKudNUd5p1nKVBl+z/jJepyFUoaA7iY+txnex1dBeo/nCGlUQKg96Ff0AvOLSFnh4nZUB++xQ6U+cN0J5SI9RafCs84PcxnqL5J0GrmQ1k1x4R+ieQpUM5lHYb6GwX4R6NJqRlO9pNlP2RqK3DJUhVhdlsMe4z6WHKQ884fxuxqdLWOtY40gyvMB628XmO6/R2EJ6VlPYx+sj5BehvUazi2RQijo7zvouG64aW0ab9sT8oqwh2f8q5U13HsquGe38u4xPG93WN5oFKoYep8gFIh9mHCG9y3qH5OlHb7aMtVR2K0ysorZQ2H+VxMfgriy+0Qy0AYd9xyNvNbMnjb85Y5UXK3PMb4+7SWZQB0gaPsY6nudJjjlIeWCU89E2MjzjtvspfzFPB7xGEKuoDyjsv0Hi20FkEXyjwSu7CB+R5Pev9rJgWov9Jxk/VuaYX4ZNJMe41qUnuzRmnprHnf+A8SsguN14p5zfaGIVFRvTvElhvwi+0dinLkYzSX7dS5QB+w63JskrMFSGWF2U4U7KHsePae6p5BDGOz/aYyNop3LwZhsvBMZFi0qqDLGKGkri12L2ZJ86ELoOrK3Ae9D4RfiD1U+l+7Amut+fU/5cAB7Wk4ryFMk+GEJodFlw//C71OwJT4kN+vcswOgZXX6jCN0sD/zHjPc75RfBcDOwYNgevtEMsQESHyvCGqwH2Wu7nmTm0RaHKd/YMYD314hj2OMCeLOMhx43hq+7ZuVhBd3WKX6/ptLgY+cH2Uv54Frl/awDDcAWUPMZSVfu8WOEJuUNdl7sGJqHSfI9agMkA8mZKu1XiFuUB/y5uhjf8ym15rHSoEfBmMnzCOXz+IU63OAQ0yh///zni1uUF+pVkLYPZAVUOipEcxG1FgTffhoBZiVYRj/ihN+hmcoekhXNlSTXG3pV7GCdsKYC02cs7f9Ici5s4X2vM1Hr0/er2+KmWOaQTCwm2IDDNhQtC9ZrvmFtJYlfkQ2ffwugXKF9PS+SxH0+NMabMjmED0m+TWGLfJiK/+/RPVKtQY+VW9+oIZi0JGrAt9aoIfhGVS9upcBaSuK/g78X1OtTP/468Zw1a0iZ2VSiBDdbo4b0sEaNqdfDkEgkEolER+UcEvFpY+ppdB4AAAAASUVORK5CYII=>

[image44]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAAWCAYAAAALmlj4AAACLElEQVR4Xu2ZPUsdQRSGX6NI/AJFLVIoKiIELC1UBLExAUF/ggRURBtBCUmjhWIhkthaiIiFWElaQbiG/AkRbAQbmxQiip9zmBl39jh7d5e7ilzPAy935j1n517m7OzO7gUEQSg+BrkhFA+TSj+4+Up8UmrmppAdTUpnzDtXenB0pdQTygAOTczqdzgcy7zSNfSxCywmZAhN8EduGih2y02Hf0pfuJmCNujvqOQBIRt6oVdRFHZ1+qhWOuVmSrYQPb6QATfIf+/NV+B8KzspNDb9BuGFoAmu4KZDVIEnlH5yM4JppV2lfh6AHnuZm0I21MBfPBe72eLcc8PDKvSxDaafgx7P0gIdr3I8IUMG4C+eyx50zmfHO0JQtCi24R+bvFbT3jR94YX4hvgJnoPOGTP9dqW/QdhLI/Qx33kA2p9x2lEbvDJueOhKoXfJKOIL3A2dQ7tdIi6fyMGfNwTt28cqai8G4Sfo0r7GTQ/DKVRqjnlX2OLl4wN0zonSutLXcNgL5fvGPUbg05sravuef+n+Xs9NIT118BeCYwv2nwciuMTzce2JYlfshukTO+ZzynhW9PpUKBCayHJuMuyEU5GS0IfnBb5Q2nf6fxDkuLm1SLZDFxJCkzvLTQblLHEzhhEEJwa9yOgIh1FiYiR3R/4Lye6/QkJop0ur661wB7n/Zg6toiSPJa+BvVyPhlyhIGhnTDvct8AB9N+QnTwgFMaK0jg3heJCLotFwiPxiIQ3b+bIPQAAAABJRU5ErkJggg==>

[image45]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAUCAYAAAD/Rn+7AAAAjklEQVR4XmNgGAWjYBQMD2CGLjDYABsQPwDiI0DMiCo1uAATEF8E4vtAzIkmN+jAdiD+BMQS6BKDDcwH4j9ArIsuMdhAKxD/B2I7dInBArIZIA6MRJcYaNDCAHGYE7rEQIO5QPwbiDXRJQYa7ADi90Asii4xkABUOJ8B4rtAzIEmNygAqKob1DXIKCAXAAAvmRHWHz/sMwAAAABJRU5ErkJggg==>

[image46]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAWCAYAAACosj4+AAABhklEQVR4Xu2UvytHURjGnyIlyh+gbBZGJoMwWZRSVoPNZOFbIoNFGSQxKclM/gAGNotBGZSYsEj5MRDiPb3nXK/nnvPl2uh+6hm+z/Oct/M9994DlPwznkX1bBagV7QmmuXgN0yJ3kWXHPyAU9GVqNP/HoDO2s8aeW5Er2xa3ICgOspSdED7Qxx4XLbDpqGWjcC4aE40Ax1y/jWO0gbtjnFgOIB2UlTYCNhF4ZRqjBfDdV7YJKahvXYOPPdsOEZFC+b3PHTIifGYPWinh3xmCdpzTyBG9PRiZjilFN/lgTNob5AD6BPIzRgWrbApLEPLhxwILdDskYMI1TY+iUiWMwypYatQf5MDognpGY4HUNYv2rAGsQ5dsEt+eFGTX4jnGNrr48CT22xq55bcIqHVe+5GTtEA7Vxw4Anvz1EwukRbWZxmG7qQu7GNWlxW7UqYgHaylz0MLCJLt/dGyA8nk/3zBE8wM8NXUlSLbrGh2ftv+LyRr0WNtkS4L/NOdOsVvRhLSv40H2Pdhip+Ro0TAAAAAElFTkSuQmCC>

[image47]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEQAAAAWCAYAAAB5VTpOAAABa0lEQVR4Xu2Yq0sFQRTGP9BgsBsMikGLFv8Ak1XBLAiCVezaBDHcYjTYRAwmg2A0is1/wSbiA1+g4uMcz+696wd3d3YQ7syd+4MPhvPNWWYOZ2cfQI/ajIvmOJgqt6JN0ZTom7zkWEGrCDvZuK9lp4cW4DwbayE2Cl47LkTPsFzVC6zLngqxrebsyNDFNzjoiOZ+cFBYgHnrbMSALnyRgw4Mw3K32cjIOyUqJmGLnmbDgV1Y7iAbwizMu2EjdNZgCx9gw4GyDriGeSNshM4x2m+qCs1756CwCvOW2IgBbWmfggzB8r5E96IHWHE0dibqb86MjLK2LyM/P8bYqMER7BoTbHQS34L45hU5RIDnjO/GfPOCRzd1xcEKRmF5exTvCnRjBxys4BQB3vv/gT4JdGP6cefCpehRdAd7sryKPv/MiJz8LTWoQ62TLKNLD8Y6zBfG++gV5LcAJ9lYP9v1h1DSvMFeu2eQeHf8ACnHW90BypV5AAAAAElFTkSuQmCC>

[image48]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFwAAAAWCAYAAABNLPtSAAACGklEQVR4Xu2Xu0scURTGj4+YCIkgYpCABGMs7QRFTEgaSWUl2AiLhURslSDY2NikEFHJozKmEYuQ2ta/QSSoiY1YxCdRQVEx5/Pey545+5gd1wG9zg8+Zs535s4y38ye3SFKSLiPdGojIT4GWCPaDOFSG9fgKatBm75Tz9rSZgiLVFzgw6wLMueYUD3vwUU/0mYeHpJZU0zgoJbMObC9N7SzTrUZwjFrlkxYL1QvCp+o+Jt25zijaLP7NeszmZmPsLqC7UjcxLfkzoELrtRmHlxACB77o6KnaSQznzGvMYY0WP9F1K9U7R1PKNoThhHQYffd/J1PtwN8Yy2JWn/OM+thC/6wmlnfWTPuIN94S5lB5OOfqrF2WXkOed5xVYOvwvtrt2+s12Nr7+ijzCByscl6oDysxV87TSmZ3j6rV/Uc6EMnyn+s6my0RNCtIkWFBf6STDB4wqVcaNnYo3Qfeh5sX3nrdnvOqgm284If6kJ1q2ij3IFJch2TK/ASsf+ezDE7wquzHt4ywaqtvaeawi90jMLHgmTSejL0DdaUqKcpuG5B1K2sbtHzDlxohTYtg2T6enY7XOAy3BXWT1FXUeZNca/0jjlRYxR5DS50SJtk3iZ3WYdkZqzkh/URzgGZ+b4t+r8pfTN+scpED8DHD7YEL2Dwm5TvHR9YR9pMiBc8WeXaTIiPd6w1bSbEy0dWvzYT4iWljYSb4T946YkG3STRwwAAAABJRU5ErkJggg==>