# Institutional Trade Intelligence

This document outlines the implementation of institutional trade size analysis and "Whale" activity detection within the R-Factor engine.

## 1. Objective
The primary goal is to distinguish between **institutional block activity** (Smart Money) and **retail speculation** (Noise). High volume alone is ambiguous; by integrating transaction counts, we can calculate the **Average Trade Value (ATV)** to identify the presence of large players.

## 2. Data Source: NSE UDiFF Format
The system utilizes the **Unified Distilled File Format (UDiFF)** introduced by NSE in 2024.
- **Key Field**: `TtlNbOfTxsExctd` (Total Number of Transactions Executed).
- **Segments**: Extracted from both Capital Market (CM) and F&O Bhavcopy files.
- **Delivery**: Integrated from `MTO` files to provide "Strong Hands" confirmation.

## 3. Core Metrics

### Average Trade Value (ATV)
Computed for Equity, Futures, and Options:
```
ATV = Turnover / Total Number of Trades
```

### Institutional Z-Score
The engine computes a 20-day rolling Z-score for the ATV.
- **Z-Score > 1.5**: Indicates unusual institutional presence (Whale Activity).
- **Z-Score < 0**: Indicates high volume driven by many small trades (Retail Noise).

## 4. Detection Logic

### Whale Detection
A symbol is flagged as a **"Whale"** if it meets the following criteria:
1.  **High Turnover**: Turnover exceeds the 20-day average.
2.  **Size Divergence**: The ATV Z-score is > 1.5.
3.  **Visual Indicator**: Highlighted with a violet badge in the UI.

### Institutional Bias (buildup/unwinding)
By combining price action with Open Interest (OI) and trade size, we classify the institutional regime:
- **Long Buildup**: Price Up + OI Up + High ATV
- **Short Buildup**: Price Down + OI Up + High ATV
- **Short Covering**: Price Up + OI Down + High ATV
- **Unwinding**: Price Down + OI Down + High ATV

## 5. Confidence Scoring Impact
The R-Factor confidence score is dynamically adjusted based on trade size agreement:
- **Reward (+0.1 to +0.25)**: Multiple segments (Equity + Futures) show institutional support.
- **Penalty (-0.2)**: "Retail Pump" detection—high volume but significantly below-average trade sizes.

## 6. Implementation Architecture

### Data Layer (`lib/r-factor/types.ts`)
- `DailyStockData`: Expanded to include `eq_trades`, `fut_trades`, `opt_trades`, etc.
- `FactorData`: Includes `fut_avg_trade_size` and `opt_avg_trade_size`.

### Engine Layer (`lib/r-factor/engine.ts`)
- `computeZScores()`: Now calculates Z-scores for institutional trade sizes.
- `isWhale`: New logic for identifying institutional footprints.
- `calculateConfidence()`: Penalizes retail-driven volume spikes.

### UI Layer (`app/trading-lab/bhavcopy/page.tsx`)
- **Institutional Badges**: Visual "Whale" markers.
- **Bias Columns**: Real-time classification of long/short buildup.
- **Player Categorization**: 
    - **Whale**: > ₹10L avg trade or high-turnover block.
    - **Institutional**: > ₹5L avg trade.
    - **HNI/Pro**: > ₹1L avg trade.
    - **Retail**: < ₹50K avg trade.

## 7. Future Calibration
The coefficients for trade-size Z-scores are currently used for **Confidence** and **Regime Classification**. As more multi-day ground truth is captured, these features will be integrated directly into the core OLS regression model to further refine the R-Factor score accuracy.
