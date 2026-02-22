# Feature Specification: R-Factor Engine

**Feature Branch**: `001-r-factor-engine`  
**Created**: 2026-02-22  
**Status**: Draft  
**Input**: User description: "Implement the 4-Factor Z-Score calculation engine for trading analysis."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Calculate Base Z-Scores (Priority: P1)

As a trader, I want the system to calculate the Z-score for Volume and Open Interest for any given symbol based on a 20-day lookback period, so I can identify statistical outliers (Blast trades).

**Why this priority**: This is the foundation of the entire Deep Quant strategy. Without base Z-scores, no signals can be generated.

**Independent Test**: Can be tested by providing a sample dataset (JSON) and verifying that the output Z-scores match manually calculated values.

**Acceptance Scenarios**:

1. **Given** 20 days of volume data for PNB, **When** I request the Z-score for today's volume, **Then** the engine should return a value representing the number of standard deviations from the 20-day mean.
2. **Given** invalid or missing data for the lookback period, **When** calculating Z-score, **Then** the system should return an appropriate error or null value.

---

### User Story 2 - Turnover & Spread Urgency Factors (Priority: P2)

As a trader, I want the engine to also calculate Z-scores for Cumulative Turnover and Bid-Ask Spread Urgency, so I can distinguish between "Elephant" and "Cheetah" market regimes.

**Why this priority**: These factors refine the signal quality and determine the execution protocol (Limit vs. Market orders).

**Independent Test**: Can be tested by verifying that "High Spread" scenarios yield high Spread Z-scores and "High Value" trades yield high Turnover Z-scores.

**Acceptance Scenarios**:

1. **Given** tick data with bid-ask spreads, **When** the spread widens significantly above its mean, **Then** the Spread Z-score should increase accordingly.

---

### User Story 3 - Composite R-Factor Score (Priority: P3)

As a trader, I want a single "Composite R-Factor Score" that weights all four factors, so I can quickly screen for the highest probability setups.

**Why this priority**: Simplifies the screening process for the final dashboard.

**Independent Test**: Can be tested by applying the weighting formula to individual Z-scores and verifying the result.

**Acceptance Scenarios**:

1. **Given** individual Z-scores for all 4 factors, **When** I request the composite score, **Then** the engine should return a weighted sum based on the "Intraday Boost" methodology.

---

### User Story 4 - Bulk Market Scanner (Priority: P2)

As a trader, I want to scan the entire F&O universe (approx. 200 stocks) for "Blast" trades and high R-Factor signals, so I can identify the best trading opportunities without manually checking each symbol.

**Why this priority**: Crucial for efficiency. Manually scanning 200 symbols is impossible for a human in real-time.

**Independent Test**: Can be tested by calling the bulk endpoint and verifying it returns a list of symbols with their corresponding R-Factor signals, filtered by a configurable threshold.

**Acceptance Scenarios**:

1. **Given** the F&O stock list, **When** I trigger a bulk scan, **Then** the system should return all stocks with a Volume Z-score > 2.0.
2. **Given** multiple simultaneous requests, **Then** the system should use caching to prevent API rate limiting from NSE.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST calculate 20-day rolling Mean and Standard Deviation for Volume, OI, Turnover, and Spread.
- **FR-002**: System MUST use Z-score formula: `(Current - Mean) / StdDev`.
- **FR-003**: System MUST support "Elephant" vs "Cheetah" regime detection based on Spread and Volume dynamics.
- **FR-004**: System MUST handle "Blast" trade activation (e.g., Z-Vol > 3.0).
- **FR-005**: System MUST provide a library interface (Node.js/TypeScript) for integration with the dashboard and extractors.

### Key Entities *(include if feature involves data)*

- **MarketSignal**: Represents the output for a single symbol at a specific time, containing all 4 Z-scores and the composite R-Factor.
- **LookbackBuffer**: A data structure holding the historical values needed for rolling calculations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Engine calculates Z-scores for 200+ F&O stocks in under 500ms from JSON data.
- **SC-002**: Accuracy of Z-score calculations must match a reference spreadsheet (Python/Excel) within 0.01 precision.
- **SC-003**: Successful identification of 95% of historical "Blast" trades mentioned in the Deep Quant document.
