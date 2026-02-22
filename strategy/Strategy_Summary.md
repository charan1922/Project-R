# Deep Quant Strategy Summary

## Core Concept: 4-Factor Z-Score R-Factor Model
The strategy quantifies "Smart Money" flow using statistical anomalies (Z-scores) across four key market variables.

### The 4 Factors
1.  **Volume Z-Score ($Z_{Vol}$)**:
    *   **Role**: Activation Gate.
    *   **Trigger**: $Z_{Vol} > 3.0$ (3 standard deviations above 20-day mean).
    *   **Meaning**: Statistically significant participation, flagging the asset as "in play".

2.  **Open Interest Delta ($Z_{OI}$)**:
    *   **Role**: Directional Compass ("Smart Money" Proxy).
    *   **Logic**: Option sellers are institutions.
        *   **Bullish**: Rising Put OI + Falling Put Premiums (Shorting Downside).
        *   **Bearish**: Rising Call OI + Falling Call Premiums (Shorting Upside).

3.  **Cumulative Turnover Integral ($Z_{Turn}$)**:
    *   **Role**: Quality Filter.
    *   **Logic**: Distinguishes high-value capital flow (e.g., Dixon, MRF) from low-quality penny stock volume.
    *   **Metric**: Area under the turnover curve.

4.  **Bid-Ask Spread Urgency ($Z_{Spread}$)**:
    *   **Role**: Regime Detector.
    *   **Logic**: Measures liquidity consumption urgency.
        *   **Wide Spread**: High urgency/panic ("Cheetah").
        *   **Stable Spread**: Absorbed flow ("Elephant").

## Market Regimes

### "Elephant" Regime
*   **Characteristics**: High Liquidity, Low Volatility, Deep Order Books.
*   **Examples**: PNB, HDFC Life, Reliance.
*   **Execution**: Limit Orders (passive accumulation).
*   **Confirmation**: Sustained volume over 15-30 mins.

### "Cheetah" Regime
*   **Characteristics**: High Beta, High Volatility, Thin Liquidity.
*   **Examples**: Dixon, Adani Ent (on news).
*   **Execution**: Market Orders (urgency is key).
*   **Confirmation**: Rapid spread expansion + price breakout.

## The "Blast" Protocol (Execution Logic)
Automates the trade entry based on the "Breakout Beacon" + "Intraday Boost".

1.  **Setup**: Price crosses Opening Range Breakout (ORB) level (e.g., 15-min High).
2.  **Trigger**: Composite R-Factor Score > Threshold (driven by Volume + OI).
3.  **Action**:
    *   **Long**: Price > ORB + Put OI Rising + $Z_{Vol} > 3$.
    *   **Short**: Price < ORB + Call OI Rising + $Z_{Vol} > 3$.
