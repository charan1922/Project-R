## ADDED Requirements

### Requirement: Compute Relative Strength Vectors
The system SHALL compute 52-week rolling Z-scores for Price Relative and Momentum for 12 NSE sectors against a user-selected benchmark.

#### Scenario: Mathematical processing of raw prices
- **WHEN** given daily closing prices for a sector and benchmark
- **THEN** it calculates smoothed exponential moving averages, rolling means, and standard deviations to output normalized RS-Ratio and RS-Momentum

### Requirement: Tail Visualization
The system SHALL provide the trailing history (tails) for each sector.

#### Scenario: Rendering the RRG graph
- **WHEN** a user selects a tail length of 4 weeks
- **THEN** the API returns the current X/Y coordinate plus the 4 previous weekly coordinates for path rendering

### Requirement: Quadrant Classification
The system SHALL accurately classify each sector into one of 4 defined quadrants based on the 100-baseline cross.

#### Scenario: Identifying market leadership
- **WHEN** a sector has RS-Ratio > 100 and RS-Momentum > 100
- **THEN** it is mathematically classified as "Leading"
