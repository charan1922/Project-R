# Deep Quant Lab Constitution

## Core Principles

### I. Data-Driven Alpha
Every trading signal must be derived from statistical anomalies, specifically using Z-score normalization and the R-Factor model. Discretionary "gut feelings" are secondary to verifiable data.

### II. Library-First Core Logic
Mathematical models, indicators, and data processing routines must be implemented as standalone, testable libraries. This ensures that the same logic used in backtesting is exactly what runs in live execution.

### III. Radical Observability
The system must expose the "why" behind every signal. Dashboards should visualize the underlying factors (Volume Z-score, OI Delta, etc.) to allow for human audit and system improvement.

### IV. Safety & Risk-First
Risk management parameters (position sizing based on regime, dynamic exits) are part of the core algorithm, not an afterthought. The system must prioritize capital preservation over aggressive returns.

### V. Empirical Verification
New strategies or modifications must be empirically reproduced in backtesting before being considered for implementation.

## Technical Standards
- **Stack**: Next.js 16 (React 19), TypeScript, Tailwind CSS 4.
- **Data**: JSON-centric storage for extracted trades, transitioning to SQLite/PostgreSQL for scale if needed.
- **Extraction**: Playwright for robust web-based data acquisition.

## Governance
This constitution guides all architectural decisions. Exceptions must be justified in the "Complexity Tracking" section of implementation plans.

**Version**: 1.0.0 | **Ratified**: 2026-02-22 | **Last Amended**: 2026-02-22
