# Research: R-Factor Engine Implementation

## Decision: Statistical Library Choice
- **Decision**: Use `mathjs` for its robust and performant statistical functions.
- **Rationale**: `mathjs` provides optimized routines for `mean`, `std`, and `zScore` that are well-tested and handle large arrays efficiently. This aligns with the "Library-First" constitution principle.
- **Alternatives considered**:
  - Custom implementation: Rejected to avoid maintenance overhead of basic math routines.
  - `simple-statistics`: A good alternative, but `mathjs` is more comprehensive and fits the "Deep Quant" analytical theme.

## Research: Data Mapping for 4 Factors
- **Volume**: Extracted directly from `Qty` and aggregated per symbol/day.
- **Open Interest (OI)**: Needs to be sourced from an external API or extracted separately as the current JSON only has trade execution data, not chain-wide OI.
  - **Action**: Researching MCP tool or external API for real-time NSE OI data.
- **Turnover**: Calculated as `Qty * Avg_Price`.
- **Spread**: Requires Tick-level data (Bid/Ask). The current Sensibull extractor only provides EOD/Intraday snapshot data.
  - **Action**: Identify a source for Bid/Ask spread data for NSE.

## Research: Validation against Deep Quant Document
- **PNB Case Study**: Volume Z-score of +4.41 on Feb 18, 2026.
- **Test Plan**: Create a mock dataset for PNB reflecting the values in the PDF (14M, 12M, etc.) and verify if the `mathjs` implementation yields ~+4.41.

## Summary of Unknowns
- [NEEDS CLARIFICATION] Source for live/historical Open Interest (OI) for NSE.
- [NEEDS CLARIFICATION] Source for Bid-Ask spread data for "Cheetah" regime detection.
- [NEEDS CLARIFICATION] Weighting vector ($W_V, W_{OI}, W_T, W_S$) for the Composite R-Factor Score. The PDF mentions OI is dominant but doesn't provide exact coefficients.
