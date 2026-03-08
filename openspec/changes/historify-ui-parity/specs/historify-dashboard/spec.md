## ADDED Requirements

### Requirement: Navigation Sidebar
The system SHALL include a persistent sidebar in the Historify layout for navigation between modules.

#### Scenario: Navigate to Settings
- **WHEN** user clicks the "Settings" link in the sidebar
- **THEN** system SHALL navigate to `/historify/settings`.

### Requirement: Data Quality Overview
The system SHALL display a summary of data quality (e.g., number of symbols, data gaps) on the dashboard.

#### Scenario: View dashboard stats
- **WHEN** user opens the Historify dashboard
- **THEN** system SHALL display the total count of symbols in the watchlist and recent sync activity.
