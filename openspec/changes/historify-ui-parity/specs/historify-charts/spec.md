## ADDED Requirements

### Requirement: RSI Indicator Panel
The system SHALL display an RSI (Relative Strength Index) sub-panel below the main price chart.

#### Scenario: View chart with RSI
- **WHEN** user selects a symbol to view its chart
- **THEN** system SHALL fetch OHLC and RSI data from `/api/historify/chart-data` and render the RSI on a separate pane with a scale of 0-100.

### Requirement: Synced Time Scales
The system SHALL synchronize the time scale of the price chart and the RSI indicator panel.

#### Scenario: Zoom or Pan chart
- **WHEN** user pans the main price chart
- **THEN** the RSI panel SHALL automatically scroll to the same time range.
