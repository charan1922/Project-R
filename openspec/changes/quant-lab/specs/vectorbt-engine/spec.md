## ADDED Requirements

### Requirement: Multi-Entry Order Accumulation
The system SHALL support additive position accumulation based on dynamic allocation constraints (e.g., buying in fractional slabs).

#### Scenario: RSI Accumulation Strategy
- **WHEN** RSI triggers a 5% buy, followed by another 10% buy without hitting an exit
- **THEN** the engine averages the entry price and correctly calculates the PnL on the combined 15% holding

### Requirement: Indian Market Fee Modeling
The system SHALL automatically deduct realistic transaction fees based on the trading segment (Intraday, Delivery, Futures, Options) on every buy/sell event.

#### Scenario: Processing an Equity Delivery Trade
- **WHEN** a long trade is initiated and closed on different days
- **THEN** a 0.111% fee is applied to both the entry and exit legs, reducing the net PnL

### Requirement: Performance Metric Generation
The system SHALL generate high-level KPI metrics including Total Return, CAGR, Sharpe Ratio, and Max Drawdown for every run.

#### Scenario: Backtest completion
- **WHEN** the simulation reaches the end of the historical array
- **THEN** it outputs an equity curve alongside the calculated statistical metrics
