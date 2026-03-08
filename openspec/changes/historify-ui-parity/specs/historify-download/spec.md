## ADDED Requirements

### Requirement: Advanced Sync Options
The system SHALL allow users to select multiple symbols, an interval (Daily/Intraday), and a date range for historical data synchronization.

#### Scenario: Trigger Intraday Sync
- **WHEN** user selects "15 Minute" interval and "Last 30 Days" preset and clicks "Sync Data"
- **THEN** system SHALL call `POST /api/historify/sync` with the corresponding parameters.

### Requirement: Date Range Presets
The system SHALL provide presets for common date ranges (Last 7 Days, Last 30 Days, Year to Date).

#### Scenario: Select Year to Date
- **WHEN** user selects "Year to Date"
- **THEN** system SHALL automatically calculate and populate the "From" and "To" date fields with January 1st of the current year and today's date respectively.
